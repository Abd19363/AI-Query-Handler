from typing import List, Dict, Any, Optional
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from backend.app.models.schema_models import QueryKnowledge
from backend.app.core.config import settings
from backend.app.core.logging import logger

class VectorSearchService:
    async def search_similar(
        self,
        session: AsyncSession,
        query_embedding: List[float],
        top_k: Optional[int] = None,
        threshold: Optional[float] = None
    ) -> List[Dict[str, Any]]:
        """
        Step 4: Perform Semantic Similarity Search using pgvector.
        Uses cosine distance operator `<=>`.
        Cosine similarity = 1 - cosine_distance.
        """
        k = top_k or settings.TOP_K_MATCHES
        sim_threshold = threshold if threshold is not None else settings.SIMILARITY_THRESHOLD

        # QueryKnowledge.embedding.cosine_distance(query_embedding) utilizes pgvector's `<=>` operator and HNSW index
        distance_col = QueryKnowledge.embedding.cosine_distance(query_embedding).label("distance")

        stmt = (
            select(
                QueryKnowledge.id,
                QueryKnowledge.canonical_query,
                QueryKnowledge.answer,
                QueryKnowledge.category,
                QueryKnowledge.conditions,
                distance_col
            )
            .order_by(distance_col)
            .limit(k)
        )

        result = await session.execute(stmt)
        rows = result.all()

        matches = []
        for row in rows:
            dist = float(row.distance)
            # Cosine similarity is 1.0 - distance
            similarity = round(1.0 - dist, 4)
            matches.append({
                "id": row.id,
                "canonical_query": row.canonical_query,
                "answer": row.answer,
                "category": row.category,
                "conditions": row.conditions or {},
                "distance": round(dist, 4),
                "similarity_score": similarity,
                "is_above_threshold": similarity >= sim_threshold
            })

        logger.info(
            f"[STEP 4: VECTOR SEARCH] Retrieved {len(matches)} historical knowledge records. "
            f"Best similarity: {matches[0]['similarity_score'] if matches else 'None'} "
            f"(Threshold: {sim_threshold})"
        )
        return matches

vector_search_service = VectorSearchService()
