from fastapi import APIRouter
from backend.app.core.database import check_db_health
from backend.app.schemas.schemas import HealthResponse

router = APIRouter(tags=["health"])

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Report backend application status and database connectivity.
    """
    db_healthy = await check_db_health()
    return {
        "status": "healthy" if db_healthy else "degraded",
        "database": db_healthy
    }
