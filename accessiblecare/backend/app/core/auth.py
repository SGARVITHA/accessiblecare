"""Authentication and identity verification module using Supabase Auth."""

from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.supabase import get_supabase_client

security_scheme = HTTPBearer(auto_error=False)


class UserIdentity(BaseModel):
    """Authenticated user identity with authoritative role resolved from profiles table."""

    id: str
    email: Optional[str] = None
    role: str
    full_name: Optional[str] = None
    phone: Optional[str] = None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> UserIdentity:
    """Validate Supabase JWT and resolve user identity and role from database profiles.

    Args:
        credentials: Bearer token from the Authorization header.

    Returns:
        UserIdentity instance.

    Raises:
        HTTPException: 401 Unauthorized if token is missing, invalid, or expired.
    """
    if not credentials or not credentials.credentials:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = credentials.credentials
    supabase = get_supabase_client()

    try:
        user_response = supabase.auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user_response or not user_response.user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User identity could not be verified",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = user_response.user
    user_id = str(user.id)

    # Authoritative role resolution from database profiles table (never from client input)
    try:
        profile_res = (
            supabase.table("profiles")
            .select("role, full_name, phone")
            .eq("id", user_id)
            .execute()
        )
        if profile_res.data and len(profile_res.data) > 0:
            profile = profile_res.data[0]
            role = profile.get("role", "PATIENT")
            full_name = profile.get("full_name")
            phone = profile.get("phone")
        else:
            role = "PATIENT"
            full_name = None
            phone = None
    except Exception:
        role = "PATIENT"
        full_name = None
        phone = None

    return UserIdentity(
        id=user_id,
        email=user.email,
        role=role,
        full_name=full_name,
        phone=phone,
    )
