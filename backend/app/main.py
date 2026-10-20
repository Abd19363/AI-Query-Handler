import sys
from pathlib import Path
from contextlib import asynccontextmanager

# Ensure repository root is in sys.path regardless of execution directory
repo_root = Path(__file__).resolve().parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent
for p in (repo_root, backend_dir):
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.app.core.config import settings
from backend.app.core.logging import logger
from backend.app.core.database import check_db_health
from backend.app.api.routes import queries, generation, metrics, health, rbac

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    logger.info("Starting AI Query Handling System Backend...")
    db_ok = await check_db_health()
    if db_ok:
        logger.info("PostgreSQL & pgvector connected successfully!")
    else:
        logger.warning("PostgreSQL connection check failed! Please verify DATABASE_URL in .env")
    yield
    # Shutdown
    logger.info("Shutting down AI Query Handling System Backend...")

app = FastAPI(
    title="AI Query Handler API",
    description="Intelligent AI Query Handling System with Embedding Cache & pgvector Similarity Search",
    version="1.0.0",
    lifespan=lifespan
)

# CORS Middleware
origins = settings.CORS_ORIGINS if isinstance(settings.CORS_ORIGINS, list) else [settings.CORS_ORIGINS]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers under /api
app.include_router(queries.router, prefix="/api")
app.include_router(generation.router, prefix="/api")
app.include_router(metrics.router, prefix="/api")
app.include_router(health.router, prefix="/api")
app.include_router(rbac.router, prefix="/api")

@app.get("/")
async def root():
    return {
        "name": "AI Query Handling System API",
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/api/health"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.HOST, port=settings.PORT, reload=True)
