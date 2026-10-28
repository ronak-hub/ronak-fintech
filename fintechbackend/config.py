"""
Pydantic BaseSettings configuration loader for Vaultic backend.
Reads from .env and establishes secure, environment-agnostic configuration.
"""

from pydantic_settings import BaseSettings
from typing import Optional
import os


class Settings(BaseSettings):
    """Central configuration object for Vaultic backend."""

    # --- DATABASE CONFIGURATION ---
    DATABASE_URL: str = os.getenv("DATABASE_URL", "sqlite:///./finova_core.db")
    DB_POOL_SIZE: int = 10
    DB_MAX_OVERFLOW: int = 20
    DB_POOL_PRE_PING: bool = True  # Test connections before using
    
    # --- AUTHENTICATION & SECURITY ---
    SECRET_KEY: str = os.getenv("VAULTIC_SECRET_KEY") or os.getenv("SECRET_KEY") or "vaultic-dev-secret-key-change-in-production"
    ALGORITHM: str = os.getenv("VAULTIC_JWT_ALGORITHM", "HS256")
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Webhook security token (VAULTIC_WEBHOOK_SECRET)
    VAULTIC_WEBHOOK_SECRET: str = os.getenv("VAULTIC_WEBHOOK_SECRET") or "default-webhook-token-change-in-production"
    
    # --- CORS CONFIGURATION ---
    CORS_ORIGINS: list = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8001",
        "http://127.0.0.1:8001",
        # Local dev Next.js (Turbopack) may run on 3001 when 3000 is occupied
        "http://localhost:3001",
        "http://127.0.0.1:3001"
    ]
    
    # --- WEBSOCKET CONFIGURATION ---
    WEBSOCKET_HEARTBEAT_INTERVAL: int = 30  # seconds
    WEBSOCKET_MAX_CONNECTIONS: int = 100
    
    # --- ML/NLP CONFIGURATION ---
    NLP_MODEL_NAME: str = "en_core_web_sm"  # spaCy model
    ML_MODEL_PATH: str = "./ml/models/merchant_classifier.pkl"
    
    # --- EXTERNAL API KEYS ---
    GOOGLE_API_KEY: str = ""  # Google Maps/Places API key
    # OAuth client credentials for Google Sign-In (OAuth 2.0)
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    # Redirect URI for Google OAuth callback (ensure matches Google Console)
    GOOGLE_REDIRECT_URI: str = "http://127.0.0.1:8001/auth/google/callback"
    
    # --- LOGGING ---
    LOG_LEVEL: str = "INFO"
    DEBUG_MODE: bool = False
    
    # --- API CONFIGURATION ---
    API_V1_PREFIX: str = "/api/v1"
    API_TITLE: str = "Vaultic - Autonomous Decision Intelligence"
    
    # --- ENVIRONMENT ---
    ENVIRONMENT: str = "development"  # development, staging, production
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = True


# Global settings instance
settings = Settings()


def get_database_url() -> str:
    """Returns the appropriate database URL based on environment."""
    return settings.DATABASE_URL


def is_production() -> bool:
    """Check if running in production."""
    return settings.ENVIRONMENT == "production"


def is_debug() -> bool:
    """Check if debug mode is enabled."""
    return settings.DEBUG_MODE or settings.ENVIRONMENT == "development"
