"""
Migration: Create customer_queries table for RBAC system.
Run this script once from the project root:
    python backend/migrate_customer_queries.py
"""
import asyncio
import sys
from pathlib import Path

# Ensure repo root is in sys.path
repo_root = Path(__file__).resolve().parent.parent
if str(repo_root) not in sys.path:
    sys.path.insert(0, str(repo_root))

from sqlalchemy.ext.asyncio import create_async_engine
from backend.app.core.config import settings
from backend.app.models.schema_models import Base  # noqa: F401 – registers all models
# Import CustomerQuery explicitly so SQLAlchemy sees it
from backend.app.models.schema_models import CustomerQuery  # noqa: F401

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS customer_queries (
    id              SERIAL PRIMARY KEY,
    customer_name   VARCHAR(128) NOT NULL DEFAULT 'Customer',
    original_query  TEXT NOT NULL,
    status          VARCHAR(32) NOT NULL DEFAULT 'pending_review',
    ai_suggested_answer TEXT,
    final_answer    TEXT,
    pipeline_query_id INT REFERENCES query_history(id) ON DELETE SET NULL,
    submitted_at    TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
)
"""

CREATE_INDEX_SQL = """
CREATE INDEX IF NOT EXISTS idx_customer_queries_status
    ON customer_queries (status)
"""


async def migrate():
    import sqlalchemy
    print(f"Connecting to: {settings.DATABASE_URL[:40]}...")
    engine = create_async_engine(settings.DATABASE_URL, echo=True)
    async with engine.begin() as conn:
        await conn.execute(sqlalchemy.text(CREATE_TABLE_SQL))
        await conn.execute(sqlalchemy.text(CREATE_INDEX_SQL))
    await engine.dispose()
    print("✅  customer_queries table created (or already exists).")


if __name__ == "__main__":
    asyncio.run(migrate())
