"""Authentication verification and patient profile endpoints."""

from pydantic import BaseModel, field_validator
from fastapi import APIRouter, Depends, HTTPException, status

from app.core.auth import UserIdentity, get_current_user
from app.core.supabase import get_supabase_client

router = APIRouter(prefix="/api/auth", tags=["auth"])


class ProfileUpdateRequest(BaseModel):
    """Editable contact identity for the authenticated patient."""

    full_name: str
    phone: str

    @field_validator("full_name", "phone")
    @classmethod
    def validate_required_text(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("This field is required")
        return value


@router.get("/me")
async def get_me(current_user: UserIdentity = Depends(get_current_user)):
    """Retrieve authenticated user identity and profile."""
    return {
        "id": current_user.id,
        "role": current_user.role,
        "full_name": current_user.full_name,
        "phone": current_user.phone,
    }


@router.put("/me/profile")
async def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: UserIdentity = Depends(get_current_user),
):
    """Update the authenticated user's own contact profile.

    The user id is always taken from the verified JWT identity; it is never
    accepted from the client payload.
    """
    if current_user.role != "PATIENT":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only patients can update this profile",
        )

    supabase = get_supabase_client()
    try:
        result = (
            supabase.table("profiles")
            .update({
                "full_name": payload.full_name,
                "phone": payload.phone,
                "updated_at": "now()",
            })
            .eq("id", current_user.id)
            .eq("role", "PATIENT")
            .execute()
        )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Unable to update your profile right now",
        )

    if not result.data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Patient profile could not be found",
        )

    row = result.data[0]
    return {
        "id": current_user.id,
        "role": current_user.role,
        "full_name": row.get("full_name"),
        "phone": row.get("phone"),
    }


@router.get("/me/role")
async def get_my_role(current_user: UserIdentity = Depends(get_current_user)):
    """Retrieve authenticated user authoritative role."""
    return {
        "role": current_user.role,
    }
