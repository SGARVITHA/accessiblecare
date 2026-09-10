"""Authentication and identity verification module using Supabase Auth."""

from typing import Literal, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import BaseModel

from app.core.supabase import get_supabase_client

security_scheme = HTTPBearer(auto_error=False)

AllowedRole = Literal["PATIENT", "STAFF", "INTERPRETER"]
ALLOWED_ROLES: frozenset[str] = frozenset({"PATIENT", "STAFF", "INTERPRETER"})


class UserIdentity(BaseModel):
    """Authenticated user identity with authoritative role resolved from profiles table."""

    id: str
    email: Optional[str] = None
    role: AllowedRole
    full_name: Optional[str] = None
    phone: Optional[str] = None


async def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security_scheme),
) -> UserIdentity:
    """Validate Supabase JWT and resolve identity and role from trusted profile data.

    Authentication and authorization are fail-closed: a valid Supabase JWT without a
    valid application profile/role is not granted a default role.
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

    # The role must come from the trusted backend profile, never client input.
    try:
        profile_res = (
            supabase.table("profiles")
            .select("role, full_name, phone")
            .eq("id", user_id)
            .execute()
        )
    except Exception:
        # Do not fail open to PATIENT when the authorization data cannot be read.
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to verify authorization identity",
        )

    if not profile_res.data:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user is not registered in AccessibleCare",
        )

    profile = profile_res.data[0]
    role_value = profile.get("role")

    if not isinstance(role_value, str):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user has no valid AccessibleCare role",
        )

    role = role_value.strip().upper()
    if role not in ALLOWED_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Authenticated user has no valid AccessibleCare role",
        )

    return UserIdentity(
        id=user_id,
        email=user.email,
        role=role,  # type: ignore[arg-type]
        full_name=profile.get("full_name"),
        phone=profile.get("phone"),
    )
