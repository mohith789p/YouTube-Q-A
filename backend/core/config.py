from functools import lru_cache
import json
from typing import Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    APP_NAME: str = "YouTube RAG Backend API"
    VERSION: str = "1.0.0"
    DESCRIPTION: str = "Backend service for YouTube video transcript processing and RAG chat."
    
    GOOGLE_API_KEY: str = ""
    EMBEDDING_MODEL: str = "models/text-embedding-004"
    GEMINI_MODEL: str = "gemini-2.5-flash"
    CHROMA_PERSIST_DIR: str = "./database/chroma_db"
    
    ALLOWED_ORIGINS: Union[list[str], str] = [
        "http://localhost:5173",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
    ]

    @field_validator("ALLOWED_ORIGINS", mode="before")
    @classmethod
    def parse_allowed_origins(cls, v: Union[str, list[str]]) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [origin.strip() for origin in v.split(",") if origin.strip()]
        return v

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()