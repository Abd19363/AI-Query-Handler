from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from backend.app.core.database import get_db
from backend.app.models.schema_models import SystemMetrics, QueryHistory
from backend.app.schemas.schemas import MetricsResponse

router = APIRouter(prefix="/metrics", tags=["metrics"])

@router.get("", response_model=MetricsResponse)
async def get_metrics(db: AsyncSession = Depends(get_db)):
    """
    Retrieve operational metrics: embedding cache hit rate, answer reuse rate,
    API calls avoided, and average query latency.
    """
    # 1. Fetch metrics from system_metrics table
    stmt = select(SystemMetrics)
    result = await db.execute(stmt)
    metrics_map = {row.metric_name: row.metric_value for row in result.scalars().all()}

    total_queries = metrics_map.get("total_queries", 0)
    emb_hits = metrics_map.get("embedding_cache_hits", 0)
    emb_misses = metrics_map.get("embedding_cache_misses", 0)
    ans_hits = metrics_map.get("answer_cache_hits", 0)
    ans_misses = metrics_map.get("answer_cache_misses", 0)
    emb_api_calls = metrics_map.get("embedding_api_calls", 0)
    llm_api_calls = metrics_map.get("llm_api_calls", 0)

    # Calculate hit rates
    total_emb_lookups = emb_hits + emb_misses
    emb_hit_rate = round((emb_hits / total_emb_lookups * 100), 2) if total_emb_lookups > 0 else 0.0

    total_ans_lookups = ans_hits + ans_misses
    ans_hit_rate = round((ans_hits / total_ans_lookups * 100), 2) if total_ans_lookups > 0 else 0.0

    # 2. Calculate average processing time from QueryHistory
    avg_stmt = select(func.avg(QueryHistory.processing_time_ms))
    avg_res = await db.execute(avg_stmt)
    avg_time = avg_res.scalar() or 0.0

    return {
        "total_queries": total_queries,
        "embedding_cache_hits": emb_hits,
        "embedding_cache_misses": emb_misses,
        "embedding_cache_hit_rate_pct": emb_hit_rate,
        "answer_cache_hits": ans_hits,
        "answer_cache_misses": ans_misses,
        "answer_cache_hit_rate_pct": ans_hit_rate,
        "embedding_api_calls": emb_api_calls,
        "llm_api_calls": llm_api_calls,
        "avg_processing_time_ms": round(float(avg_time), 2)
    }
