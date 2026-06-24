"""Application configuration loaded from environment variables (.env)."""
from functools import lru_cache
from typing import List, Optional

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    # App
    APP_NAME: str = "Last-Minute Life Saver API"
    ENV: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: str = "*"

    # Supabase
    SUPABASE_URL: Optional[str] = None
    SUPABASE_KEY: Optional[str] = None
    SUPABASE_JWT_SECRET: Optional[str] = None

    # Direct Postgres (e.g. Neon) — used when Supabase isn't configured but a
    # plain Postgres connection string is available. Auth in this mode uses
    # locally-issued JWTs (same as the SQLite fallback), not Supabase Auth.
    DATABASE_URL: Optional[str] = None

    # LLM providers
    GROQ_API_KEY: Optional[str] = None
    ANTHROPIC_API_KEY: Optional[str] = None
    OPENAI_API_KEY: Optional[str] = None

    # Google Calendar OAuth
    GOOGLE_CLIENT_ID: Optional[str] = None
    GOOGLE_CLIENT_SECRET: Optional[str] = None
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/calendar/callback"

    # Redis
    REDIS_URL: Optional[str] = "redis://localhost:6379/0"

    # JWT (local fallback auth)
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # Local fallback DB
    SQLITE_PATH: str = "lmls_local.db"

    @property
    def cors_origins_list(self) -> List[str]:
        if self.CORS_ORIGINS == "*":
            return ["*"]
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def use_supabase(self) -> bool:
        return bool(self.SUPABASE_URL and self.SUPABASE_KEY)

    @property
    def use_postgres(self) -> bool:
        return bool(self.DATABASE_URL) and not self.use_supabase


@lru_cache
def get_settings() -> Settings:
    return Settings()
