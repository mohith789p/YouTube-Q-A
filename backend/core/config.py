from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "YouTube RAG Backend API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Backend service for YouTube video transcript processing and RAG chat."
    
    GOOGLE_API_KEY: str = ""
    EMBEDDING_MODEL : str = "gemini-embedding-001"
    GEMINI_MODEL : str = "gemini-2.5-flash"
    CHROMA_PERSIST_DIR: str = "./database/chroma_db"
    
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()