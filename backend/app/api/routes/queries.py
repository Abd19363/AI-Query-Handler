from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from backend.app.core.database import get_db
from backend.app.schemas.schemas import (
    QuerySubmitRequest,
    QuerySubmitResponse,
    HistoryItemResponse
)
from backend.app.services.pipeline import pipeline_service
from backend.app.models.schema_models import QueryHistory, QueryResponse
from backend.app.core.logging import logger

router = APIRouter(prefix="/queries", tags=["queries"])

@router.post("", response_model=QuerySubmitResponse, status_code=status.HTTP_201_CREATED)
async def submit_query(
    request: QuerySubmitRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Submit and process a query through the full 7-step pipeline.
    Works identically for Manual (Method A) and AI-generated (Method B) queries.
    """
    if not request.query.strip():
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Query text cannot be empty or solely whitespace."
        )

    try:
        result = await pipeline_service.process_query(
            session=db,
            raw_query=request.query,
            source=request.source
        )
        return result
    except Exception as e:
        logger.error(f"Error processing query: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"An error occurred while processing your query: {str(e)}"
        )

@router.get("/history", response_model=List[HistoryItemResponse])
async def get_query_history(
    limit: int = Query(25, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve audit history of previously submitted queries with metadata.
    """
    stmt = (
        select(QueryHistory, QueryResponse.answer_text, QueryResponse.response_source)
        .outerjoin(QueryResponse, QueryHistory.id == QueryResponse.query_id)
        .order_by(desc(QueryHistory.submitted_at))
        .limit(limit)
        .offset(offset)
    )
    result = await db.execute(stmt)
    rows = result.all()

    history = []
    for hist, answer_text, resp_src in rows:
        history.append({
            "id": hist.id,
            "original_query": hist.original_query,
            "normalized_query": hist.normalized_query,
            "source": hist.source,
            "answer": answer_text,
            "response_source": resp_src,
            "embedding_cache_hit": hist.embedding_cache_hit,
            "answer_reused": hist.answer_reused,
            "processing_status": hist.processing_status,
            "processing_time_ms": hist.processing_time_ms,
            "matched_knowledge_id": hist.matched_knowledge_id,
            "similarity_score": hist.similarity_score,
            "submitted_at": hist.submitted_at
        })
    return history

@router.get("/{query_id}", response_model=HistoryItemResponse)
async def get_query_detail(
    query_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve specific query details and its associated answer.
    """
    stmt = (
        select(QueryHistory, QueryResponse.answer_text, QueryResponse.response_source)
        .outerjoin(QueryResponse, QueryHistory.id == QueryResponse.query_id)
        .where(QueryHistory.id == query_id)
    )
    result = await db.execute(stmt)
    row = result.first()
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=f"Query #{query_id} not found.")

    hist, answer_text, resp_src = row
    return {
        "id": hist.id,
        "original_query": hist.original_query,
        "normalized_query": hist.normalized_query,
        "source": hist.source,
        "answer": answer_text,
        "response_source": resp_src,
        "embedding_cache_hit": hist.embedding_cache_hit,
        "answer_reused": hist.answer_reused,
        "processing_status": hist.processing_status,
        "processing_time_ms": hist.processing_time_ms,
        "matched_knowledge_id": hist.matched_knowledge_id,
        "similarity_score": hist.similarity_score,
        "submitted_at": hist.submitted_at
    }
