"""Interpreter-controlled assignment cancellation for Phase 4 B7."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

from app.core.auth import UserIdentity
from app.core.supabase import get_supabase_client


class InterpreterCancellationService:
    """Cancel an assignment belonging to the authenticated interpreter."""

    def __init__(self, supabase: Any | None = None) -> None:
        self.supabase = supabase or get_supabase_client()

    def cancel(self, current_user: UserIdentity, request_id: UUID) -> dict[str, Any]:
        if current_user.role != "INTERPRETER":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Interpreter role required")

        interpreter_id = self._interpreter_identity(current_user)
        request = self._load_request(request_id, interpreter_id)
        if request.get("assignment_status") != "ASSIGNED":
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Only an assigned interpreter request can be cancelled")

        try:
            rpc_result = self.supabase.rpc(
                "cancel_interpreter_assignment",
                {"p_request_id": str(request_id), "p_interpreter_id": interpreter_id, "p_actor_id": current_user.id},
            ).execute()
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to cancel interpreter assignment") from exc

        if not rpc_result.data:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Interpreter assignment could not be cancelled")

        result = rpc_result.data
        if isinstance(result, list):
            result = result[0] if result else {}
        if not isinstance(result, dict):
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Interpreter cancellation returned an invalid result")
        return result

    def _interpreter_identity(self, current_user: UserIdentity) -> str:
        try:
            rows = (self.supabase.table("interpreter_profiles").select("id").eq("user_id", current_user.id).limit(1).execute().data or [])
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to verify interpreter profile") from exc
        if not rows:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Interpreter profile not found")
        return str(rows[0]["id"])

    def _load_request(self, request_id: UUID, interpreter_id: str) -> dict[str, Any]:
        try:
            rows = (self.supabase.table("interpreter_requests").select("id, request_group_id, interpreter_id, response_status, assignment_status, assigned_at, assigned_by").eq("id", str(request_id)).eq("interpreter_id", interpreter_id).limit(1).execute().data or [])
        except Exception as exc:
            raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="Unable to load interpreter request") from exc
        if not rows:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Interpreter request not found")
        return rows[0]
