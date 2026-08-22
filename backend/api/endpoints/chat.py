from fastapi import APIRouter, HTTPException, status

from schemas.chat import ChatRequest, ChatResponse
from services.rag_service import get_response

router = APIRouter()


@router.post("/chat", response_model=ChatResponse, status_code=status.HTTP_200_OK)
async def chat(payload: ChatRequest) -> ChatResponse:
    try:
        return await get_response(
            video_id=payload.video_id,
            query=payload.message,
        )

    except HTTPException:
        # Re-raise standard HTTP exceptions created downstream (400, 404)
        raise

    except Exception as e:
        # Catch unexpected infrastructure/LLM runtime errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"RAG execution failed: {str(e)}"
        )