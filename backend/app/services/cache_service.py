from datetime import datetime
from typing import Tuple, List, Optional
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert as pg_insert
from backend.app.models.schema_models import EmbeddingCache
from backend.app.services.normalizer import compute_cache_key
from backend.app.services.embedding_service import embedding_service
from backend.app.core.config import settings
from backend.app.core.logging import logger

class EmbeddingCacheService:
    async def get_or_create_embedding(
        self,
        session: AsyncSession,
        normalized_query: str
    ) -> Tuple[List[float], bool, str]:
        """
        Step 2: Check persistent embedding cache in PostgreSQL.
        Returns:
            - embedding: List[float]
            - cache_hit: bool (True if retrieved from cache, False if newly generated)
            - cache_key: str
        """
        model_name = settings.EMBEDDING_MODEL
        model_version = settings.EMBEDDING_MODEL_VERSION
        cache_key, content_hash = compute_cache_key(normalized_query, model_name, model_version)

        # 1. Lookup in PostgreSQL embedding_cache
        stmt = select(EmbeddingCache).where(EmbeddingCache.cache_key == cache_key)
        result = await session.execute(stmt)
        cached_entry = result.scalar_one_or_none()

        if cached_entry is not None:
            # Cache Hit!
            logger.info(f"[STEP 2: EMBEDDING CACHE HIT] Reusing cached embedding for key: {cache_key[:24]}...")
            
            # Update last_used_at asynchronously
            await session.execute(
                update(EmbeddingCache)
                .where(EmbeddingCache.id == cached_entry.id)
                .values(last_used_at=datetime.utcnow())
            )
            # Embedding can be returned as numpy array or list from pgvector
            emb_vector = list(cached_entry.embedding)
            return emb_vector, True, cache_key

        # 2. Cache Miss: Call embedding generation service
        logger.info(f"[STEP 2: EMBEDDING CACHE MISS] Generating new embedding for key: {cache_key[:24]}...")
        new_embedding = await embedding_service.get_embedding(normalized_query)

        # 3. Insert into PostgreSQL with atomic ON CONFLICT DO NOTHING to handle concurrent requests
        insert_stmt = (
            pg_insert(EmbeddingCache)
            .values(
                cache_key=cache_key,
                normalized_query_hash=content_hash,
                embedding=new_embedding,
                embedding_model=model_name,
                model_version=model_version,
                created_at=datetime.utcnow(),
                last_used_at=datetime.utcnow(),
            )
            .on_conflict_do_update(
                index_elements=["cache_key"],
                set_={"last_used_at": datetime.utcnow()}
            )
        )
        await session.execute(insert_stmt)
        await session.flush()

        return new_embedding, False, cache_key

embedding_cache_service = EmbeddingCacheService()
