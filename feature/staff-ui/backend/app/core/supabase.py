"""Supabase client initialization module for trusted backend operations."""

from typing import Any, Optional
from app.core.config import settings

try:
    from supabase import Client, create_client
except ImportError:
    Client = Any  # type: ignore
    create_client = None  # type: ignore

_supabase_client: Optional[Any] = None


def get_supabase_client() -> Any:
    """Initialize or retrieve the backend Supabase client using service role key.

    Returns:
        Supabase client instance.

    Raises:
        ValueError: If Supabase configuration is missing.
        RuntimeError: If supabase library is not installed.
    """
    global _supabase_client

    if _supabase_client is not None:
        return _supabase_client

    supabase_url = settings.SUPABASE_URL
    supabase_service_key = settings.SUPABASE_SERVICE_ROLE_KEY

    if not supabase_url or not supabase_service_key:
        raise ValueError(
            "Supabase configuration is missing. Ensure SUPABASE_URL and "
            "SUPABASE_SERVICE_ROLE_KEY are configured in backend/.env"
        )

    if create_client is None:
        raise RuntimeError(
            "The 'supabase' Python package is not installed in the environment."
        )

    _supabase_client = create_client(supabase_url, supabase_service_key)
    return _supabase_client
