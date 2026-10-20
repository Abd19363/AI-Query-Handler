from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from pgvector.sqlalchemy import Vector
from backend.app.core.database import Base
from backend.app.core.config import settings

class EmbeddingCache(Base):
    __tablename__ = "embedding_cache"

    id = Column(Integer, primary_key=True, index=True)
    cache_key = Column(String(128), unique=True, nullable=False, index=True)
    normalized_query_hash = Column(String(64), nullable=False, index=True)
    embedding = Column(Vector(settings.EMBEDDING_DIMENSIONS), nullable=False)
    embedding_model = Column(String(64), nullable=False)
    model_version = Column(String(32), default="v1")
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    last_used_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class QueryKnowledge(Base):
    __tablename__ = "query_knowledge"

    id = Column(Integer, primary_key=True, index=True)
    canonical_query = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    embedding = Column(Vector(settings.EMBEDDING_DIMENSIONS), nullable=False)
    embedding_model = Column(String(64), nullable=False)
    category = Column(String(64), default="general")
    conditions = Column(JSONB, default=dict)
    answer_version = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    matched_histories = relationship("QueryHistory", back_populates="matched_knowledge")
    matched_responses = relationship("QueryResponse", back_populates="matched_knowledge")


class QueryHistory(Base):
    __tablename__ = "query_history"

    id = Column(Integer, primary_key=True, index=True)
    original_query = Column(Text, nullable=False)
    normalized_query = Column(Text, nullable=False)
    source = Column(String(32), nullable=False)  # 'manual' | 'ai_generated'
    embedding_cache_hit = Column(Boolean, default=False)
    answer_reused = Column(Boolean, default=False)
    processing_status = Column(String(32), default="completed")
    processing_time_ms = Column(Float, default=0.0)
    matched_knowledge_id = Column(Integer, ForeignKey("query_knowledge.id", ondelete="SET NULL"), nullable=True)
    similarity_score = Column(Float, nullable=True)
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    matched_knowledge = relationship("QueryKnowledge", back_populates="matched_histories")
    response = relationship("QueryResponse", back_populates="query", uselist=False, cascade="all, delete-orphan")


class QueryResponse(Base):
    __tablename__ = "query_responses"

    id = Column(Integer, primary_key=True, index=True)
    query_id = Column(Integer, ForeignKey("query_history.id", ondelete="CASCADE"), nullable=False, unique=True)
    answer_text = Column(Text, nullable=False)
    response_source = Column(String(32), nullable=False)  # 'llm_generated' | 'reused_knowledge'
    model_name = Column(String(64), nullable=True)
    matched_knowledge_id = Column(Integer, ForeignKey("query_knowledge.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), default=datetime.utcnow)

    # Relationships
    query = relationship("QueryHistory", back_populates="response")
    matched_knowledge = relationship("QueryKnowledge", back_populates="matched_responses")


class SystemMetrics(Base):
    __tablename__ = "system_metrics"

    id = Column(Integer, primary_key=True, index=True)
    metric_name = Column(String(64), unique=True, nullable=False)
    metric_value = Column(Integer, default=0)
    updated_at = Column(DateTime(timezone=True), default=datetime.utcnow, onupdate=datetime.utcnow)


class CustomerQuery(Base):
    """
    RBAC: Stores customer portal submissions.
    Flow: pending_review → ai_processed → answered
    """
    __tablename__ = "customer_queries"

    id = Column(Integer, primary_key=True, index=True)
    customer_name = Column(String(128), default="Customer", nullable=False)
    original_query = Column(Text, nullable=False)
    # Status: 'pending_review' | 'ai_processed' | 'answered'
    status = Column(String(32), default="pending_review", nullable=False, index=True)
    # AI pipeline suggestion (set by admin after processing)
    ai_suggested_answer = Column(Text, nullable=True)
    # Final answer approved and sent by admin to customer
    final_answer = Column(Text, nullable=True)
    # Foreign key to the QueryHistory record created by the pipeline
    pipeline_query_id = Column(
        Integer,
        ForeignKey("query_history.id", ondelete="SET NULL"),
        nullable=True
    )
    submitted_at = Column(DateTime(timezone=True), default=datetime.utcnow)
