from fastapi import APIRouter, HTTPException, status
from fastapi.concurrency import run_in_threadpool

from schemas.ingestion import IngestRequest, IngestResponse
from services.ingestion_service import process_video_transcript

router = APIRouter()

@router.post(
    "/ingest",
    response_model=IngestResponse,
    status_code=status.HTTP_200_OK,
    summary="Ingest and Index YouTube Video Transcript",
)
async def ingest_transcript(payload: IngestRequest) -> IngestResponse:
    try:
        # Offload synchronous transcript fetching and vector embedding to threadpool
        return await run_in_threadpool(
            process_video_transcript, str(payload.url)
        )

    except HTTPException:
        # Re-raise standard HTTP exceptions explicitly raised downstream (e.g., 400, 404, 530)
        raise

    except Exception as e:
        # Fallback catch for unexpected unhandled runtime errors
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Transcript processing pipeline failed: {str(e)}",
        )