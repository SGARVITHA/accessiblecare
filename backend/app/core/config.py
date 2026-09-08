import os
from functools import lru_cache
from pathlib import Path
from typing import List
from pydantic import BaseModel, Field


def _load_env_files() -> None:
    """Load environment variables from local .env files if present."""
    base_dir = Path(__file__).resolve().parents[2]  # backend directory
    root_dir = base_dir.parent                      # repo root directory

    try:
        from dotenv import load_dotenv
        for env_path in [root_dir / ".env", base_dir / ".env"]:
            if env_path.is_file():
                load_dotenv(dotenv_path=env_path, override=True)
    except ImportError:
        for env_path in [root_dir / ".env", base_dir / ".env"]:
            if env_path.is_file():
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            line = line.strip()
                            if not line or line.startswith("#") or "=" not in line:
                                continue
                            key, val = line.split("=", 1)
                            key, val = key.strip(), val.strip()
                            if (val.startswith('"') and val.endswith('"')) or (
                                val.startswith("'") and val.endswith("'")
                            ):
                                val = val[1:-1]
                            if key:
                                os.environ[key] = val
                except Exception:
                    pass


_load_env_files()


class Settings(BaseModel):
    """Application and environment configuration settings."""

    APP_NAME: str = Field(
        default_factory=lambda: os.getenv("APP_NAME", "AccessibleCare API")
    )
    APP_VERSION: str = Field(
        default_factory=lambda: os.getenv("APP_VERSION", "0.1.0")
    )
    ENVIRONMENT: str = Field(
        default_factory=lambda: os.getenv("ENVIRONMENT", "development")
    )
    API_HOST: str = Field(
        default_factory=lambda: os.getenv("API_HOST", "127.0.0.1")
    )
    API_PORT: int = Field(
        default_factory=lambda: int(os.getenv("API_PORT", os.getenv("PORT", "8000")))
    )

    # CORS settings
    CORS_ORIGINS: List[str] = Field(
        default_factory=lambda: [
            origin.strip()
            for origin in os.getenv(
                "CORS_ORIGINS",
                "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
            ).split(",")
            if origin.strip()
        ]
    )

    # Supabase (Backend only)
    SUPABASE_URL: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_URL", "")
    )
    SUPABASE_ANON_KEY: str = Field(
        default_factory=lambda: os.getenv(
            "SUPABASE_ANON_KEY", os.getenv("SUPABASE_KEY", "")
        )
    )
    SUPABASE_SERVICE_ROLE_KEY: str = Field(
        default_factory=lambda: os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    )

    # Google / Gemini API (Backend only)
    GOOGLE_API_KEY: str = Field(
        default_factory=lambda: os.getenv(
            "GOOGLE_API_KEY", os.getenv("GEMINI_API_KEY", "")
        )
    )


@lru_cache
def get_settings() -> Settings:
    """Return cached application settings."""
    return Settings()


settings = get_settings()
