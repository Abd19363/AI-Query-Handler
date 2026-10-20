from fastapi import APIRouter, HTTPException, status
from backend.app.schemas.schemas import QueryGenerateRequest, QueryGenerateResponse
from backend.app.services.llm_service import llm_service
from backend.app.core.logging import logger

router = APIRouter(prefix="/queries", tags=["generation"])

@router.post("/generate", response_model=QueryGenerateResponse)
async def generate_query(request: QueryGenerateRequest):
    """
    Method B: Generate a realistic, relevant scenario query using the LLM.
    Returns the generated query to the client for user review/editing.
    """
    try:
        topic = request.topic.strip() if request.topic else "shopkeeper business scenario"
        generated_text = await llm_service.generate_realistic_query(topic)
        
        return {
            "generated_query": generated_text,
            "topic": topic
        }
    except Exception as e:
        logger.error(f"Failed to generate query: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate query scenario: {str(e)}"
        )
