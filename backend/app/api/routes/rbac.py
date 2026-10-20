"""
RBAC Routes — Customer Portal & Admin/Shopkeeper Portal
========================================================
Flow:
  1. Customer submits query  → POST /api/customer/queries
  2. Admin sees pending list → GET  /api/admin/queries?status=pending
  3. Admin clicks "Process"  → POST /api/admin/queries/{id}/process
     (runs the full 7-step AI pipeline in the background, stores result)
  4. Admin reviews result    → GET  /api/admin/queries/{id}
  5. Admin sends answer      → POST /api/admin/queries/{id}/send
  6. Customer polls / gets   → GET  /api/customer/queries/{id}
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, update
from backend.app.core.database import get_db
from backend.app.models.schema_models import CustomerQuery, QueryHistory, QueryResponse
from backend.app.schemas.schemas import (
    CustomerQuerySubmitRequest,
    CustomerQueryResponse,
    AdminQueryListItem,
    AdminSendAnswerRequest,
    AdminQueryDetail,
)
from backend.app.services.pipeline import pipeline_service
from backend.app.core.logging import logger

router = APIRouter(tags=["rbac"])


# ===========================================================================
# CUSTOMER ENDPOINTS
# ===========================================================================

@router.post(
    "/customer/queries",
    response_model=CustomerQueryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Customer: submit a new toy-store inquiry",
)
async def customer_submit_query(
    request: CustomerQuerySubmitRequest,
    db: AsyncSession = Depends(get_db),
):
    if not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Query text cannot be empty.",
        )
    record = CustomerQuery(
        customer_name=request.customer_name or "Customer",
        original_query=request.query.strip(),
        status="pending_review",
    )
    db.add(record)
    await db.flush()
    await db.commit()
    await db.refresh(record)
    logger.info(f"[CUSTOMER] New query submitted: #{record.id} by {record.customer_name}")
    return CustomerQueryResponse(
        id=record.id,
        original_query=record.original_query,
        customer_name=record.customer_name,
        status=record.status,
        submitted_at=record.submitted_at,
        answer=record.final_answer,
    )


@router.get(
    "/customer/queries/{query_id}",
    response_model=CustomerQueryResponse,
    summary="Customer: check status / get answer for a submitted query",
)
async def customer_get_query(
    query_id: int,
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(CustomerQuery, query_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Query #{query_id} not found.")
    return CustomerQueryResponse(
        id=record.id,
        original_query=record.original_query,
        customer_name=record.customer_name,
        status=record.status,
        submitted_at=record.submitted_at,
        answer=record.final_answer,
    )


@router.get(
    "/customer/queries",
    response_model=List[CustomerQueryResponse],
    summary="Customer: list my submitted queries",
)
async def customer_list_queries(
    customer_name: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CustomerQuery).order_by(desc(CustomerQuery.submitted_at)).limit(limit)
    if customer_name:
        stmt = stmt.where(CustomerQuery.customer_name == customer_name)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        CustomerQueryResponse(
            id=r.id,
            original_query=r.original_query,
            customer_name=r.customer_name,
            status=r.status,
            submitted_at=r.submitted_at,
            answer=r.final_answer,
        )
        for r in rows
    ]


# ===========================================================================
# ADMIN / SHOPKEEPER ENDPOINTS
# ===========================================================================

@router.get(
    "/admin/queries",
    response_model=List[AdminQueryListItem],
    summary="Admin: list all customer queries (filterable by status)",
)
async def admin_list_queries(
    status_filter: Optional[str] = Query(None, alias="status"),
    limit: int = Query(50, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    stmt = select(CustomerQuery).order_by(desc(CustomerQuery.submitted_at)).limit(limit)
    if status_filter:
        stmt = stmt.where(CustomerQuery.status == status_filter)
    result = await db.execute(stmt)
    rows = result.scalars().all()
    return [
        AdminQueryListItem(
            id=r.id,
            customer_name=r.customer_name,
            original_query=r.original_query,
            status=r.status,
            ai_answer=r.ai_suggested_answer,
            final_answer=r.final_answer,
            pipeline_query_id=r.pipeline_query_id,
            submitted_at=r.submitted_at,
        )
        for r in rows
    ]


@router.post(
    "/admin/queries/{query_id}/process",
    response_model=AdminQueryDetail,
    summary="Admin: run AI pipeline on a customer query to get a suggested answer",
)
async def admin_process_query(
    query_id: int,
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(CustomerQuery, query_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Customer query #{query_id} not found.")
    if record.status not in ("pending_review", "ai_processed"):
        raise HTTPException(
            status_code=409,
            detail=f"Query is in '{record.status}' state and cannot be re-processed.",
        )

    # Run the full 7-step AI pipeline
    try:
        pipeline_result = await pipeline_service.process_query(
            session=db,
            raw_query=record.original_query,
            source="customer",
        )
    except Exception as e:
        logger.error(f"[ADMIN PROCESS] Pipeline error for CustomerQuery #{query_id}: {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"AI pipeline error: {str(e)}")

    # Store the AI suggestion back on the CustomerQuery row
    record.ai_suggested_answer = pipeline_result["answer"]
    record.pipeline_query_id = pipeline_result["query_id"]
    record.status = "ai_processed"
    await db.commit()
    await db.refresh(record)

    logger.info(f"[ADMIN] Pipeline processed CustomerQuery #{query_id}; suggested answer stored.")
    return AdminQueryDetail(
        id=record.id,
        customer_name=record.customer_name,
        original_query=record.original_query,
        status=record.status,
        ai_answer=record.ai_suggested_answer,
        final_answer=record.final_answer,
        pipeline_query_id=record.pipeline_query_id,
        submitted_at=record.submitted_at,
        pipeline_metadata=pipeline_result.get("metadata"),
    )


@router.get(
    "/admin/queries/{query_id}",
    response_model=AdminQueryDetail,
    summary="Admin: get full detail of a customer query including AI suggestion",
)
async def admin_get_query(
    query_id: int,
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(CustomerQuery, query_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Customer query #{query_id} not found.")
    return AdminQueryDetail(
        id=record.id,
        customer_name=record.customer_name,
        original_query=record.original_query,
        status=record.status,
        ai_answer=record.ai_suggested_answer,
        final_answer=record.final_answer,
        pipeline_query_id=record.pipeline_query_id,
        submitted_at=record.submitted_at,
        pipeline_metadata=None,
    )


@router.post(
    "/admin/queries/{query_id}/send",
    response_model=AdminQueryDetail,
    summary="Admin: approve & send final answer to the customer",
)
async def admin_send_answer(
    query_id: int,
    request: AdminSendAnswerRequest,
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(CustomerQuery, query_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Customer query #{query_id} not found.")
    if record.status not in ("ai_processed", "pending_review"):
        raise HTTPException(
            status_code=409,
            detail=f"Query is in '{record.status}' state; cannot send answer.",
        )

    record.final_answer = request.answer.strip()
    record.status = "answered"
    await db.commit()
    await db.refresh(record)
    logger.info(f"[ADMIN] Sent answer for CustomerQuery #{query_id} → status=answered")
    return AdminQueryDetail(
        id=record.id,
        customer_name=record.customer_name,
        original_query=record.original_query,
        status=record.status,
        ai_answer=record.ai_suggested_answer,
        final_answer=record.final_answer,
        pipeline_query_id=record.pipeline_query_id,
        submitted_at=record.submitted_at,
        pipeline_metadata=None,
    )


@router.delete(
    "/admin/queries/{query_id}",
    status_code=status.HTTP_200_OK,
    summary="Admin: delete a customer query",
)
async def admin_delete_query(
    query_id: int,
    db: AsyncSession = Depends(get_db),
):
    record = await db.get(CustomerQuery, query_id)
    if not record:
        raise HTTPException(status_code=404, detail=f"Customer query #{query_id} not found.")
    await db.delete(record)
    await db.commit()
    logger.info(f"[ADMIN] Deleted CustomerQuery #{query_id}")
    return {"deleted": True, "id": query_id}


@router.delete(
    "/admin/queries",
    status_code=status.HTTP_200_OK,
    summary="Admin: clear all customer queries",
)
async def admin_clear_all_queries(
    db: AsyncSession = Depends(get_db),
):
    from sqlalchemy import delete
    await db.execute(delete(CustomerQuery))
    await db.commit()
    logger.info("[ADMIN] Cleared all customer queries.")
    return {"deleted_all": True}

