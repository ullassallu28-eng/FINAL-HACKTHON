from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
import os


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql://bioshield:bioshield@localhost:5432/bioshield"
    JWT_SECRET: str = "change-me-to-a-long-random-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_EXPIRE_MINUTES: int = 60
    JWT_REFRESH_EXPIRE_DAYS: int = 7

    APP_NAME: str = "AgriSentinel API"
    APP_ENV: str = "development"
    DEBUG: bool = True
    CORS_ORIGINS: str = "http://localhost:5173,http://127.0.0.1:5173"

    UPLOAD_DIR: str = "uploads"
    MAX_UPLOAD_SIZE_MB: int = 10
    STORAGE_BASE_URL: str = "http://localhost:8000/uploads"
    PUBLIC_API_URL: str = ""

    OPENAI_API_KEY: str = ""
    OPENAI_VISION_MODEL: str = "gpt-4o-mini"

    DEFAULT_DISTRICT_ID: str = "district-ranchi"

    API_V1_PREFIX: str = "/api/v1"

    @property
    def public_api_base(self) -> str:
        explicit = self.PUBLIC_API_URL.strip()
        if explicit:
            return explicit.rstrip("/")
        render_url = os.getenv("RENDER_EXTERNAL_URL", "").strip()
        if render_url:
            return render_url.rstrip("/")
        storage = self.STORAGE_BASE_URL.rstrip("/")
        if storage.endswith("/uploads"):
            return storage[: -len("/uploads")]
        return "http://localhost:8000"

    @field_validator("DATABASE_URL")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        # Render Postgres uses postgres:// — SQLAlchemy expects postgresql://
        if value.startswith("postgres://"):
            return value.replace("postgres://", "postgresql://", 1)
        return value

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]


settings = Settings()
