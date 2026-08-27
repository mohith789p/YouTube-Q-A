import re
import requests
from typing import Dict, List

from urllib.parse import parse_qs, urlparse

from fastapi import HTTPException, status
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from youtube_transcript_api import (
    IpBlocked,
    NoTranscriptFound,
    PoTokenRequired,
    RequestBlocked,
    TranscriptsDisabled,
    VideoUnavailable,
    YouTubeTranscriptApi,
)

from core.dependencies import chroma_client, embedding_model
from schemas.ingestion import IngestResponse

VIDEO_ID_PATTERN = re.compile(r"^[a-zA-Z0-9_-]{11}$")

QUOTA_THRESHOLDS = {
    "gemini_embedding": {
        "rpm": 80,
        "tpm": 24_000,
        "rpd": 800,
    },

    "gemini_flash": {
        "rpm": 4,
        "tpm": 200_000,
        "rpd": 16,
    },
}

def get_video_title(url: str) -> str:
    try:
        response = requests.get(
            "https://www.youtube.com/oembed",
            params={
                "url": url,
                "format": "json"
            },
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10
        )
        if response.status_code == 200:
            return response.json().get("title", "YouTube Video")
    except Exception:
        pass
    return "YouTube Video"

def get_video_id(url: str) -> str:
    parsed_url = urlparse(url)
    hostname = parsed_url.hostname

    if (
        parsed_url.scheme not in {"http", "https"}
        or hostname not in {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}
        or parsed_url.username is not None
        or parsed_url.password is not None
        or parsed_url.port is not None
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube URL format.",
        )

    video_id = None
    if hostname in {"youtube.com", "www.youtube.com", "m.youtube.com"}:
        if parsed_url.path == "/watch":
            video_id = parse_qs(parsed_url.query).get("v", [None])[0]
        elif parsed_url.path.startswith("/shorts/"):
            raw_path = parsed_url.path.rstrip("/")
            video_id = raw_path.removeprefix("/shorts/").split("/")[0]
        elif parsed_url.path.startswith("/embed/"):
            raw_path = parsed_url.path.rstrip("/")
            video_id = raw_path.removeprefix("/embed/").split("/")[0]
            
    elif hostname == "youtu.be":
        raw_path = parsed_url.path.strip("/")
        video_id = raw_path.split("/")[0] if raw_path else None

    if not video_id or not VIDEO_ID_PATTERN.fullmatch(video_id):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid YouTube URL format or missing Video ID.",
        )
    return video_id


def is_video_ingested(collection_name: str) -> bool:
    """Check if the video collection exists in ChromaDB and contains embeddings."""
    try:
        # Check against existing collections list first to avoid unhandled errors
        existing_collections = [col.name for col in chroma_client.list_collections()]
        if collection_name not in existing_collections:
            return False
        
        collection = chroma_client.get_collection(name=collection_name)
        return collection.count() > 0
    except Exception:
        # Log error in production monitoring before returning False
        return False


def fetch_transcript_documents(video_id: str) -> List[Dict[str, str | float]]:
    """Fetch raw timed transcript segments using youtube-transcript-api."""
    try:
        return YouTubeTranscriptApi().fetch(video_id, languages=["en"])
    except (TranscriptsDisabled, NoTranscriptFound):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No English captions or subtitles available for this video.",
        )
    except VideoUnavailable:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="The requested YouTube video is unavailable.",
        )
    except (IpBlocked, RequestBlocked):
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="YouTube blocked transcript requests from datacenter IPs. Please try another video.",
        )
    except PoTokenRequired:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="YouTube requires a Proof-of-Origin (PoToken) verification token.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract transcript: {str(e)}",
        )
        
def process_video_transcript(raw_url: str) -> IngestResponse:
    video_id = get_video_id(raw_url)
    video_title = get_video_title(raw_url)
    clean_video_id = video_id.strip()
    collection_name = f"youtube_{clean_video_id}"

    # 1. Early exit if already processed
    if is_video_ingested(collection_name):
        return IngestResponse(
            status="already_exists",
            video_id=video_id,
            title=video_title,
            message=f"Video '{video_id}' is already indexed in collection '{collection_name}'. Skipping re-ingestion.",
        )

    # 2. Extract timed captions
    raw_segments = fetch_transcript_documents(video_id)

    # Build LangChain Document objects while maintaining timestamp metadata
    text = " ".join([item.text for item in raw_segments])

    # 3. Chunk documents
    splitter = RecursiveCharacterTextSplitter(chunk_size=1000, chunk_overlap=200)
    chunks = splitter.split_text(text)

    # Check len of chunks and enforce Gemini API rate limiting thresholds
    # 1000 characters per chunk corresponds to ~250 tokens per chunk
    max_chunks_by_tpm = QUOTA_THRESHOLDS["gemini_embedding"]["tpm"] // 250
    max_chunks_by_rpd = QUOTA_THRESHOLDS["gemini_embedding"]["rpd"]
    max_allowed_chunks = min(max_chunks_by_tpm, max_chunks_by_rpd)

    if len(chunks) > max_allowed_chunks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Video transcript is too long. Please retry with a shorter video.",
        )

    docs = [
        Document(
            page_content=chunk,
            metadata={"video_id": video_id}
        )
        for chunk in chunks
    ]

    # 4. Index in ChromaDB
    try:
        print(len(docs))
        Chroma.from_documents(
            ids=[f"{video_id}_{idx}" for idx in range(len(docs))],
            documents=docs,
            embedding=embedding_model,
            collection_name=collection_name,
            client=chroma_client,
        )

        return IngestResponse(
            status="success",
            video_id=video_id,
            title=video_title,
            message=f"Successfully extracted {len(chunks)} chunks and indexed in collection '{collection_name}'.",
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"ChromaDB indexing failed: {str(e)}",
        )