"""Authentication verification endpoints."""

from fastapi import APIRouter, Depends
from app.core.auth import UserIdentity, get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
async def get_me(current_user: UserIdentity = Depends(get_current_user)):
    """Retrieve authenticated user identity and profile."""
    return {
        "id": current_user.id,
        "role": current_user.role,
        "full_name": current_user.full_name,
    }


@router.get("/me/role")
async def get_my_role(current_user: UserIdentity = Depends(get_current_user)):
    """Retrieve authenticated user authoritative role."""
    return {
        "role": current_user.role,
    }
