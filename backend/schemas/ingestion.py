from pydantic import BaseModel, Field, HttpUrl

class IngestRequest(BaseModel):
    url: HttpUrl = Field(..., description="YouTube video URL")

class IngestResponse(BaseModel):
    status: str
    video_id: str
    title: str
    message: str