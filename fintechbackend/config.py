"""Environment-backed settings with production safety checks."""

import json
from urllib.parse import urlparse

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

DEVELOPMENT_SECRET = "vaultic-local-development-secret-not-for-production"


class Settings(BaseSettings):
    """Central configuration object for Vaultic backend."""

    model_config = SettingsConfigDict(
        env_file=(".env", ".env.local"),
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )

    DATABASE_URL: str = "sqlite:///./finova_core.db"
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_PRE_PING: bool = True

    SECRET_KEY: str = ""
    VAULTIC_SECRET_KEY: str = ""
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    VAULTIC_WEBHOOK_SECRET: str = ""

    CORS_ORIGINS: str = (
        "http://localhost:3000,http://127.0.0.1:3000,"
        "http://localhost:3001,http://127.0.0.1:3001"
    )

    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30
    WEBSOCKET_MAX_CONNECTIONS: int = 100

    NLP_MODEL_NAME: str = "en_core_web_sm"
    ML_MODEL_PATH: str = "./ml/models/merchant_classifier.pkl"

    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL_NAME: str = "gemini-3.8-flash"
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://127.0.0.1:8001/auth/google/callback"
    GOOGLE_USE_SYSTEM_PROXY: bool = True
    FRONTEND_BASE_URL: str = "http://localhost:3000"

    LOG_LEVEL: str = "INFO"
    DEBUG_MODE: bool = False
    API_V1_PREFIX: str = "/api/v1"
    API_TITLE: str = "Vaultic - Autonomous Decision Intelligence"
    ENVIRONMENT: str = "development"

    @field_validator("GOOGLE_REDIRECT_URI")
    @classmethod
    def normalize_google_redirect_uri(cls, value: str) -> str:
        return value.strip()

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() == "production"

    @property
    def signing_secret(self) -> str:
        secret = self.VAULTIC_SECRET_KEY or self.SECRET_KEY
        if self.is_production:
            if len(secret) < 32 or secret == DEVELOPMENT_SECRET:
                raise RuntimeError(
                    "Set SECRET_KEY or VAULTIC_SECRET_KEY to a unique random "
                    "value of at least 32 characters in production."
                )
            return secret
        return secret or DEVELOPMENT_SECRET

    @property
    def cors_origins(self) -> list[str]:
        value = self.CORS_ORIGINS.strip()
        if not value:
            return []

        if value.startswith("["):
            parsed = json.loads(value)
            if not isinstance(parsed, list) or not all(
                isinstance(origin, str) for origin in parsed
            ):
                raise ValueError("CORS_ORIGINS must be a JSON string array or comma-separated URLs.")
            origins = [origin.strip().rstrip("/") for origin in parsed]
        else:
            origins = [origin.strip().rstrip("/") for origin in value.split(",") if origin.strip()]

        if "*" in origins:
            raise ValueError("Wildcard CORS origins are not allowed.")
        if self.is_production and not origins:
            raise RuntimeError("Production requires at least one explicit CORS origin.")

        for origin in origins:
            parsed_origin = urlparse(origin)
            if (
                parsed_origin.scheme not in {"http", "https"}
                or not parsed_origin.netloc
                or parsed_origin.path
                or parsed_origin.query
                or parsed_origin.fragment
                or parsed_origin.username
                or parsed_origin.password
            ):
                raise ValueError(f"Invalid CORS origin: {origin!r}")
            try:
                _ = parsed_origin.port
            except ValueError as error:
                raise ValueError(f"Invalid CORS origin: {origin!r}") from error

        if self.is_production and any(
            urlparse(origin).scheme != "https" for origin in origins
        ):
            raise RuntimeError("Production CORS origins must use HTTPS.")
        return origins

    def validate_production_configuration(self) -> None:
        """Fail startup for unsafe or incomplete production settings."""
        if not self.is_production:
            return

        _ = self.signing_secret
        _ = self.cors_origins
        database_url = self.DATABASE_URL.lower()
        if not database_url.startswith(
            ("postgres://", "postgresql://", "postgresql+psycopg2://")
        ):
            raise RuntimeError("Production requires a managed PostgreSQL DATABASE_URL.")

        frontend = urlparse(self.FRONTEND_BASE_URL)
        if frontend.scheme != "https" or not frontend.netloc or frontend.path not in ("", "/"):
            raise RuntimeError("FRONTEND_BASE_URL must be an HTTPS origin in production.")
        try:
            _ = frontend.port
        except ValueError as error:
            raise RuntimeError("FRONTEND_BASE_URL must be a valid HTTPS origin.") from error

        if self.VAULTIC_WEBHOOK_SECRET and len(self.VAULTIC_WEBHOOK_SECRET) < 32:
            raise RuntimeError("VAULTIC_WEBHOOK_SECRET must be at least 32 characters.")

        if self.GOOGLE_CLIENT_ID or self.GOOGLE_CLIENT_SECRET:
            callback = urlparse(self.GOOGLE_REDIRECT_URI)
            if (
                not self.GOOGLE_CLIENT_ID
                or not self.GOOGLE_CLIENT_SECRET
                or callback.scheme != "https"
                or not callback.netloc
            ):
                raise RuntimeError(
                    "Configured Google OAuth requires both credentials and an HTTPS redirect URI."
                )

settings = Settings()


def get_database_url() -> str:
    return settings.DATABASE_URL


def is_production() -> bool:
    return settings.is_production


def is_debug() -> bool:
    return settings.DEBUG_MODE or settings.ENVIRONMENT.lower() == "development"
