import time
from typing import Dict, Any, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from backend.app.models.schema_models import (
    QueryHistory,
    QueryKnowledge,
    QueryResponse,
    SystemMetrics
)
from backend.app.services.normalizer import normalize_query_text
from backend.app.services.cache_service import embedding_cache_service
from backend.app.services.vector_search import vector_search_service
from backend.app.services.answer_policy import answer_policy_service
from backend.app.services.llm_service import llm_service
from backend.app.core.config import settings
from backend.app.core.logging import logger

class QueryPipelineService:
    async def process_query(
        self,
        session: AsyncSession,
        raw_query: str,
        source: str = "manual"
    ) -> Dict[str, Any]:
        """
        Executes the full 7-step query processing pipeline.
        """
        start_time = time.perf_counter()
        processing_path: List[str] = []

        # =====================================================================
        # STEP 1: Normalize the Input
        # =====================================================================
        normalized_query = normalize_query_text(raw_query)
        processing_path.append(f"Step 1: Normalized input text ({len(normalized_query)} chars)")
        logger.info(f"[STEP 1: NORMALIZE] Input query canonicalized.")

        # =====================================================================
        # STEP 2: Check Persistent Embedding Cache in PostgreSQL
        # =====================================================================
        embedding, emb_cache_hit, cache_key = await embedding_cache_service.get_or_create_embedding(
            session=session,
            normalized_query=normalized_query
        )
        emb_api_called = not emb_cache_hit
        if emb_cache_hit:
            processing_path.append("Step 2: Embedding Cache HIT (Reused stored vector, skipped embedding API)")
        else:
            processing_path.append("Step 2: Embedding Cache MISS (Called embedding model & cached in PostgreSQL)")

        # =====================================================================
        # STEP 3: Store Initial Query Record in query_history
        # =====================================================================
        history_record = QueryHistory(
            original_query=raw_query,
            normalized_query=normalized_query,
            source=source,
            embedding_cache_hit=emb_cache_hit,
            answer_reused=False,
            processing_status="processing",
            processing_time_ms=0.0
        )
        session.add(history_record)
        await session.flush()
        query_id = history_record.id
        processing_path.append(f"Step 3: Recorded query audit entry #{query_id} (Source: {source})")
        logger.info(f"[STEP 3: STORE QUERY] Initial history saved with ID: {query_id}")

        # =====================================================================
        # STEP 4: Perform Semantic Similarity Search via pgvector HNSW
        # =====================================================================
        similar_records = await vector_search_service.search_similar(
            session=session,
            query_embedding=embedding,
            top_k=settings.TOP_K_MATCHES,
            threshold=settings.SIMILARITY_THRESHOLD
        )
        best_match = similar_records[0] if similar_records else None
        best_sim = best_match["similarity_score"] if best_match else 0.0
        processing_path.append(
            f"Step 4: Vector search found {len(similar_records)} candidates (Top similarity: {best_sim:.3f})"
        )

        # Check if there is an exact canonical match
        is_exact = False
        if best_match and best_match["canonical_query"].strip().lower() == normalized_query.lower():
            is_exact = True

        # =====================================================================
        # STEP 5: Decide Whether to Reuse an Answer
        # =====================================================================
        can_reuse, reuse_reason = answer_policy_service.evaluate_reuse_safety(
            new_query=normalized_query,
            matched_record=best_match,
            is_exact_match=is_exact
        )
        processing_path.append(f"Step 5: Answer Reuse Decision -> {reuse_reason}")
        logger.info(f"[STEP 5: ANSWER REUSE] {reuse_reason}")

        # =====================================================================
        # STEP 6: Generate or Reuse AI Response
        # =====================================================================
        if can_reuse and best_match:
            final_answer = best_match["answer"]
            response_source = "reused_knowledge"
            llm_called = False
            matched_knowledge_id = best_match["id"]
            processing_path.append("Step 6: Reused historical answer directly (Skipped LLM API call)")
            logger.info(f"[STEP 6: REUSE ANSWER] Answer reused from Knowledge #{matched_knowledge_id}")
        else:
            final_answer = await llm_service.generate_response(
                query=normalized_query,
                retrieved_context=similar_records
            )
            response_source = "llm_generated"
            llm_called = True
            matched_knowledge_id = best_match["id"] if (best_match and best_sim >= settings.SIMILARITY_THRESHOLD) else None
            processing_path.append("Step 6: Generated fresh answer via LLM reasoning engine")
            logger.info(f"[STEP 6: LLM GENERATION] Generated new response via LLM.")

        # =====================================================================
        # STEP 7: Persist Results & Update Knowledge Base
        # =====================================================================
        # 1. Insert into query_responses
        response_record = QueryResponse(
            query_id=query_id,
            answer_text=final_answer,
            response_source=response_source,
            model_name=settings.LLM_MODEL if llm_called else "cached_knowledge",
            matched_knowledge_id=matched_knowledge_id
        )
        session.add(response_record)

        # 2. If freshly generated and no identical canonical query exists, store in query_knowledge
        if response_source == "llm_generated" and not is_exact:
            conditions = answer_policy_service.extract_business_conditions(normalized_query)
            new_knowledge = QueryKnowledge(
                canonical_query=normalized_query,
                answer=final_answer,
                embedding=embedding,
                embedding_model=settings.EMBEDDING_MODEL,
                category=conditions.get("intents", ["general"])[0] if conditions.get("intents") else "general",
                conditions=conditions,
                answer_version=1
            )
            session.add(new_knowledge)
            await session.flush()
            matched_knowledge_id = new_knowledge.id
            processing_path.append(f"Step 7: Persisted new reusable knowledge entry #{new_knowledge.id}")

        elapsed_ms = round((time.perf_counter() - start_time) * 1000, 2)

        # 3. Update query_history record
        history_record.answer_reused = can_reuse
        history_record.matched_knowledge_id = matched_knowledge_id
        history_record.similarity_score = best_sim if best_match else None
        history_record.processing_status = "completed"
        history_record.processing_time_ms = elapsed_ms
        processing_path.append(f"Step 7: Finished processing in {elapsed_ms}ms")

        # 4. Atomically update metrics in system_metrics
        await self._update_metrics(
            session=session,
            emb_cache_hit=emb_cache_hit,
            emb_api_called=emb_api_called,
            answer_reused=can_reuse,
            llm_called=llm_called
        )

        await session.commit()

        return {
            "query_id": query_id,
            "original_query": raw_query,
            "normalized_query": normalized_query,
            "answer": final_answer,
            "response_source": response_source,
            "metadata": {
                "source": source,
                "embedding_cache_hit": emb_cache_hit,
                "embedding_api_called": emb_api_called,
                "answer_reused": can_reuse,
                "llm_api_called": llm_called,
                "processing_time_ms": elapsed_ms,
                "matched_knowledge_id": matched_knowledge_id,
                "similarity_score": best_sim if best_match else None,
                "similarity_threshold": settings.SIMILARITY_THRESHOLD,
                "retrieved_records_count": len(similar_records),
                "processing_path": processing_path
            },
            "submitted_at": history_record.submitted_at
        }

    async def _update_metrics(
        self,
        session: AsyncSession,
        emb_cache_hit: bool,
        emb_api_called: bool,
        answer_reused: bool,
        llm_called: bool
    ):
        """
        Updates system metrics table atomically.
        """
        increments = {
            "total_queries": 1,
            "embedding_cache_hits": 1 if emb_cache_hit else 0,
            "embedding_cache_misses": 1 if not emb_cache_hit else 0,
            "answer_cache_hits": 1 if answer_reused else 0,
            "answer_cache_misses": 1 if not answer_reused else 0,
            "embedding_api_calls": 1 if emb_api_called else 0,
            "llm_api_calls": 1 if llm_called else 0,
        }

        for metric, delta in increments.items():
            if delta > 0:
                stmt = (
                    pg_insert(SystemMetrics)
                    .values(metric_name=metric, metric_value=delta)
                    .on_conflict_do_update(
                        index_elements=["metric_name"],
                        set_={"metric_value": SystemMetrics.metric_value + delta}
                    )
                )
                await session.execute(stmt)

pipeline_service = QueryPipelineService()
