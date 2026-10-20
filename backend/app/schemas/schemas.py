from datetime import datetime
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field

# Request schemas
class QuerySubmitRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000, description="The user's question or feedback")
    source: str = Field("manual", description="'manual' or 'ai_generated'")

class QueryGenerateRequest(BaseModel):
    topic: Optional[str] = Field("", description="Optional topic or context, e.g. 'toy warranty complaint'")

# Response schemas
class MatchedRecord(BaseModel):
    id: int
    canonical_query: str
    similarity_score: float
    distance: float
    reused: bool

class QueryProcessingMetadata(BaseModel):
    source: str
    embedding_cache_hit: bool
    embedding_api_called: bool
    answer_reused: bool
    llm_api_called: bool
    processing_time_ms: float
    matched_knowledge_id: Optional[int] = None
    similarity_score: Optional[float] = None
    similarity_threshold: float
    retrieved_records_count: int
    processing_path: List[str]

class QuerySubmitResponse(BaseModel):
    query_id: int
    original_query: str
    normalized_query: str
    answer: str
    response_source: str  # 'llm_generated' or 'reused_knowledge'
    metadata: QueryProcessingMetadata
    submitted_at: datetime

class QueryGenerateResponse(BaseModel):
    generated_query: str
    topic: Optional[str] = None
    generated_at: datetime = Field(default_factory=datetime.utcnow)

class HistoryItemResponse(BaseModel):
    id: int
    original_query: str
    normalized_query: str
    source: str
    answer: Optional[str] = None
    response_source: Optional[str] = None
    embedding_cache_hit: bool
    answer_reused: bool
    processing_status: str
    processing_time_ms: float
    matched_knowledge_id: Optional[int] = None
    similarity_score: Optional[float] = None
    submitted_at: datetime

class MetricsResponse(BaseModel):
    total_queries: int
    embedding_cache_hits: int
    embedding_cache_misses: int
    embedding_cache_hit_rate_pct: float
    answer_cache_hits: int
    answer_cache_misses: int
    answer_cache_hit_rate_pct: float
    embedding_api_calls: int
    llm_api_calls: int
    avg_processing_time_ms: float

class HealthResponse(BaseModel):
    status: str
    database: bool
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# RBAC Customer & Admin Schemas
class CustomerQuerySubmitRequest(BaseModel):
    query: str = Field(..., min_length=1, max_length=5000, description="Customer toy inquiry or feedback")
    customer_name: Optional[str] = Field("Customer", description="Customer name or nickname")

class CustomerQueryResponse(BaseModel):
    id: int
    original_query: str
    customer_name: Optional[str] = "Customer"
    status: str  # 'pending_review', 'ai_processed', 'answered'
    submitted_at: datetime
    answer: Optional[str] = None

class AdminQueryListItem(BaseModel):
    id: int
    customer_name: Optional[str]
    original_query: str
    status: str
    ai_answer: Optional[str] = None
    final_answer: Optional[str] = None
    pipeline_query_id: Optional[int] = None
    submitted_at: datetime

class AdminQueryDetail(BaseModel):
    id: int
    customer_name: Optional[str]
    original_query: str
    status: str
    ai_answer: Optional[str] = None
    final_answer: Optional[str] = None
    pipeline_query_id: Optional[int] = None
    submitted_at: datetime
    pipeline_metadata: Optional[Dict[str, Any]] = None

class AdminSendAnswerRequest(BaseModel):
    answer: str = Field(..., min_length=1, description="Concise customer-facing answer to send to customer")
