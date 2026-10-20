-- ========================================================
-- AI Query Handler Database Schema (PostgreSQL + pgvector)
-- ========================================================

-- 1. Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Embedding Cache Table
-- Stores computed embeddings mapped to canonical hashes to prevent redundant API calls
CREATE TABLE IF NOT EXISTS embedding_cache (
    id SERIAL PRIMARY KEY,
    cache_key VARCHAR(128) NOT NULL,
    normalized_query_hash VARCHAR(64) NOT NULL,
    embedding VECTOR(768) NOT NULL,
    embedding_model VARCHAR(64) NOT NULL,
    model_version VARCHAR(32) DEFAULT 'v1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_cache_key UNIQUE (cache_key)
);

CREATE INDEX IF NOT EXISTS idx_embedding_cache_hash ON embedding_cache (normalized_query_hash);

-- 3. Query Knowledge Table
-- Reusable canonical semantic answers with vector representation
CREATE TABLE IF NOT EXISTS query_knowledge (
    id SERIAL PRIMARY KEY,
    canonical_query TEXT NOT NULL,
    answer TEXT NOT NULL,
    embedding VECTOR(768) NOT NULL,
    embedding_model VARCHAR(64) NOT NULL,
    category VARCHAR(64) DEFAULT 'general',
    conditions JSONB DEFAULT '{}'::jsonb,
    answer_version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- HNSW Vector Index for fast cosine similarity search
CREATE INDEX IF NOT EXISTS idx_query_knowledge_hnsw 
ON query_knowledge 
USING hnsw (embedding vector_cosine_ops);

-- 4. Query History Table
-- Audit log of every submission (both manual and AI-generated)
CREATE TABLE IF NOT EXISTS query_history (
    id SERIAL PRIMARY KEY,
    original_query TEXT NOT NULL,
    normalized_query TEXT NOT NULL,
    source VARCHAR(32) NOT NULL, -- 'manual' or 'ai_generated'
    embedding_cache_hit BOOLEAN DEFAULT FALSE,
    answer_reused BOOLEAN DEFAULT FALSE,
    processing_status VARCHAR(32) DEFAULT 'completed', -- 'completed', 'failed', 'processing'
    processing_time_ms FLOAT DEFAULT 0.0,
    matched_knowledge_id INT REFERENCES query_knowledge(id) ON DELETE SET NULL,
    similarity_score FLOAT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Query Responses Table
-- Stores generated or reused answers linked to history
CREATE TABLE IF NOT EXISTS query_responses (
    id SERIAL PRIMARY KEY,
    query_id INT NOT NULL REFERENCES query_history(id) ON DELETE CASCADE,
    answer_text TEXT NOT NULL,
    response_source VARCHAR(32) NOT NULL, -- 'llm_generated' or 'reused_knowledge'
    model_name VARCHAR(64),
    matched_knowledge_id INT REFERENCES query_knowledge(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. System Metrics Table
-- Tracks operational statistics
CREATE TABLE IF NOT EXISTS system_metrics (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(64) NOT NULL UNIQUE,
    metric_value BIGINT DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Initialize metrics counters
INSERT INTO system_metrics (metric_name, metric_value) VALUES
    ('total_queries', 0),
    ('embedding_cache_hits', 0),
    ('embedding_cache_misses', 0),
    ('answer_cache_hits', 0),
    ('answer_cache_misses', 0),
    ('embedding_api_calls', 0),
    ('llm_api_calls', 0)
ON CONFLICT (metric_name) DO NOTHING;
