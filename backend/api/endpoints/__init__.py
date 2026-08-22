from fastapi import APIRouter
from api.endpoints.ingestion import router as ingestion_router
from api.endpoints.chat import router as chat_router

api_router = APIRouter()

api_router.include_router(ingestion_router, prefix="/v1", tags=["Ingestion"])
api_router.include_router(chat_router,prefix="/v1", tags=["Chat"])