import os
from typing import List, Union
from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import field_validator

class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env"),
        env_file_encoding="utf-8",
        extra="ignore"
    )

    # Server Settings
    HOST: str = "127.0.0.1"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: Union[List[str], str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://postgres:abdr54321@localhost:4469/db_ai_query"
    DATABASE_URL_SYNC: str = "postgresql://postgres:abdr54321@localhost:4469/db_ai_query"

    # AI Provider: 'gemini' | 'openai' | 'mock'
    AI_PROVIDER: str = "gemini"
    GEMINI_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # Models
    LLM_MODEL: str = "gemini-1.5-flash"
    EMBEDDING_MODEL: str = "text-embedding-004"
    EMBEDDING_DIMENSIONS: int = 768
    EMBEDDING_MODEL_VERSION: str = "v1"

    # Semantic Search & Thresholds
    SIMILARITY_THRESHOLD: float = 0.82
    TOP_K_MATCHES: int = 3

    # Business Rules Context
    STORE_DOMAIN: str = "Toy Store Customer Support & Inquiries"

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v):
        if isinstance(v, str):
            if v.startswith("[") and v.endswith("]"):
                import json
                try:
                    return json.loads(v)
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return v

settings = Settings()
