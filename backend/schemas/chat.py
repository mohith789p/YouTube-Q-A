from pydantic import BaseModel, Field
from typing import Optional, List

class ChatRequest(BaseModel):
    video_id: str
    message: str

class ChatResponse(BaseModel):
    answer: str
    sources: Optional[List[str]] = []


class MarkdownResponse(BaseModel):
    markdown: str = Field(
        description="The answer formatted as structured Markdown."
    )