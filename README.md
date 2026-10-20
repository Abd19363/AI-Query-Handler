# AI Query Handler with Persistent Embedding Cache & pgvector Similarity Search

A complete, production-grade AI Query Handling System demonstrating **persistent embedding caching, vector indexing with pgvector, semantic similarity search, and safe AI answer reuse** to prevent redundant LLM and embedding API calls.

---

## 1. System Architecture

```
                                      +------------------------------------+
                                      |   Next.js Frontend (JSX / Vanilla) |
                                      |     - Method A: Manual Query Entry |
                                      |     - Method B: AI-Generated Query|
                                      |     - Metrics & Visual Pipeline    |
                                      +-----------------+------------------+
                                                        |  HTTP / REST
                                                        v
                                      +------------------------------------+
                                      |       FastAPI Backend Engine       |
                                      +-----------------+------------------+
                                                        |
         +----------------------------------------------+-----------------------------------------------+
         |                                              |                                               |
         v                                              v                                               v
+------------------+                          +--------------------+                          +-------------------+
| 1. Normalization |                          | 2. Embedding Cache |                          | 4. Vector Search  |
| Whitespace clean |                          | Lookup in Postgres |                          | pgvector HNSW <=> |
| Canonical Hash   |                          | (Hit: skip API)    |                          | Cosine Similarity |
+------------------+                          +--------------------+                          +-------------------+
         |                                              |                                               |
         v                                              v                                               v
+------------------+                          +--------------------+                          +-------------------+
| 3. Query History |                          | 5. Reuse Decision  |                          | 6. AI Generation  |
| Audit logging    |                          | Safety check on    |                          | LLM or Cached     |
| Each submission  |                          | terms/dates/claims |                          | Response          |
+------------------+                          +--------------------+                          +-------------------+
                                                        |
                                                        v
                                              +--------------------+
                                              | 7. Persist & Metric|
                                              | query_responses    |
                                              | query_knowledge    |
                                              | system_metrics     |
                                              +--------------------+
```

---

## 2. The 7-Step Query Processing Pipeline

Every query (whether manually entered or AI-generated) follows the exact same 7-step pipeline:

1. **Step 1: Normalize Input:**
   - Cleans repeated internal whitespace and trims margins without stripping punctuation or critical words.
   - Computes deterministic SHA-256 hash incorporating the model name and model version (`cache_key = {model}:{version}:{hash}`).
2. **Step 2: Check Embedding Cache:**
   - Queries the PostgreSQL table `embedding_cache` using the cache key.
   - **Cache HIT:** Reuses stored 768-dimensional vector; does **not** call the embedding model.
   - **Cache MISS:** Calls the embedding model, generates the vector, and atomically inserts it into `embedding_cache`.
3. **Step 3: Store Query in History:**
   - Logs an audit entry in `query_history` with query source (`manual` or `ai_generated`), cache status, and processing state.
4. **Step 4: Perform Semantic Similarity Search:**
   - Uses PostgreSQL `pgvector` HNSW index with cosine distance operator `<=>`.
   - Cosine distance $d \in [0, 2]$. Cosine similarity $s = 1.0 - d$.
   - Retrieves top-$K$ candidates from `query_knowledge`.
5. **Step 5: Decide Whether to Reuse an Answer:**
   - **Case A (Exact Match):** If identical canonical query exists in knowledge, reuses stored answer directly.
   - **Case B (Semantic Match):** If similarity $\ge$ threshold, parses and validates business conditions (e.g., purchase dates, elapsed days, warranty length). Reuses the answer **only** if terms match. If conditions differ (e.g., 10 days vs 90 days), safely routes to fresh LLM reasoning.
   - **Case C (No Match):** Low relevance or new intent -> sends to LLM.
6. **Step 6: Generate or Reuse Response:**
   - Reused answers skip LLM generation.
   - New queries are processed by the LLM with shopkeeper guidelines: distinguish facts from assumptions, verify proof of purchase, and identify missing customer info.
7. **Step 7: Persist Results & Update Metrics:**
   - Saves record into `query_responses`.
   - Stores new reusable entries in `query_knowledge` with pgvector embeddings.
   - Atomically updates operational metrics in `system_metrics`.

---

## 3. Database Schema

The database runs on PostgreSQL 16 with pgvector:

| Table | Purpose | Key Columns / Constraints |
|---|---|---|
| `embedding_cache` | Persistent query vectors | `cache_key` (UNIQUE), `normalized_query_hash`, `embedding` (VECTOR(768)), `embedding_model` |
| `query_knowledge` | Reusable canonical knowledge | `canonical_query`, `answer`, `embedding` (VECTOR(768)), `conditions` (JSONB), HNSW Index |
| `query_history` | Audit log of all submissions | `original_query`, `normalized_query`, `source`, `embedding_cache_hit`, `answer_reused` |
| `query_responses` | Answers linked to queries | `query_id` (FK), `answer_text`, `response_source` (`llm_generated` / `reused_knowledge`) |
| `system_metrics` | Operational counters | `metric_name` (UNIQUE), `metric_value` (Atomic counter) |

---

## 4. Environment Setup

### Prerequisites
- Python 3.11+
- Node.js 18+ and npm
- PostgreSQL 16 with `pgvector` extension (running on port **4469**)

### Backend Configuration (`backend/.env`)
```env
AI_PROVIDER=gemini
GEMINI_API_KEY=your_api_key_here
LLM_MODEL=gemini-1.5-flash
EMBEDDING_MODEL=gemini-embedding-001
EMBEDDING_DIMENSIONS=768
DATABASE_URL=postgresql+asyncpg://postgres:your_password@localhost:4469/db_ai_query
DATABASE_URL_SYNC=postgresql://postgres:your_password@localhost:4469/db_ai_query
HOST=127.0.0.1
PORT=8000
SIMILARITY_THRESHOLD=0.82
TOP_K_MATCHES=3
```

### Frontend Configuration (`frontend/.env.local`)
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

---

## 5. Running the Application

### 1. Initialize Database Schema
If not already created:
```powershell
& "C:\Program Files\PostgreSQL\16\bin\psql.exe" -p 4469 -U postgres -d db_ai_query -f "d:\AI-Query-Handling\schema.sql"
```

### 2. Run Backend
```powershell
cd d:\AI-Query-Handling
python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
```
API Documentation will be live at: `http://localhost:8000/docs`

### 3. Run Frontend
In a new terminal window:
```powershell
cd d:\AI-Query-Handling\frontend
npm run dev
```
Open your browser at: `http://localhost:3000`

---

## 6. Running Automated Tests

Run the complete 9-scenario automated test suite:
```powershell
cd d:\AI-Query-Handling
python -m pytest backend/tests/test_pipeline.py -v
```

Verified Test Scenarios:
1. **Test 1:** First-time query creates embedding and stores new answer.
2. **Test 2:** Identical query reuses embedding cache (0 embedding API calls) and reuses answer.
3. **Test 3:** Semantically similar query retrieved via vector index.
4. **Test 4:** Unrelated query does not trigger inappropriate reuse.
5. **Test 5:** Different business conditions (e.g., 90 days vs 30 days) safely bypass answer reuse.
6. **Test 6:** AI-generated query workflow (Method B).
7. **Test 7:** PostgreSQL database persistence.
8. **Test 8:** Concurrent duplicate submissions without race conditions.
9. **Test 9:** Whitespace normalization and input validation.
