"""Interpreter response workflow for Phase 4 B5."""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

from app.core.auth import UserIdentity
from app.core.supabase import get_supabase_client


class InterpreterResponseService:
    """Record ACCEPTED or DECLINED for the authenticated interpreter's request."""

    def __init__(self, supabase: Any | None = None) -> None:
        self.supabase = supabase or get_supabase_client()

    def respond(self, current_user: UserIdentity, request_id: UUID, response_status: str) -> dict[str, Any]:
        if current_user.role != "INTERPRETER":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Interpreter role required")

        if response_status not in {"ACCEPTED", "DECLINED"}:
            raise HTTPException(status_code=400, detail="Response must be ACCEPTED or DECLINED")

        try:
            interpreter_rows = (
                self.supabase.table("interpreter_profiles")
                .select("id, is_active, verification_status")
                .eq("user_id", current_user.id)
                .limit(1)
                .execute().data or []
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to verify interpreter profile") from exc

        if not interpreter_rows:
            raise HTTPException(status_code=403, detail="Interpreter profile not found")
        interpreter = interpreter_rows[0]
        if not interpreter.get("is_active") or interpreter.get("verification_status") != "VERIFIED":
            raise HTTPException(status_code=403, detail="Interpreter profile is not active and verified")

        interpreter_id = str(interpreter["id"])
        try:
            rows = (
                self.supabase.table("interpreter_requests")
                .select("id, interpreter_id, response_status, assignment_status, responded_at")
                .eq("id", str(request_id))
                .eq("interpreter_id", interpreter_id)
                .limit(1)
                .execute().data or []
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load interpreter request") from exc

        if not rows:
            raise HTTPException(status_code=404, detail="Interpreter request not found")
        if rows[0].get("response_status") != "PENDING":
            raise HTTPException(status_code=409, detail="Interpreter request is no longer pending")

        responded_at = datetime.now(timezone.utc).isoformat()
        try:
            result = (
                self.supabase.table("interpreter_requests")
                .update({"response_status": response_status, "responded_at": responded_at})
                .eq("id", str(request_id))
                .eq("interpreter_id", interpreter_id)
                .eq("response_status", "PENDING")
                .execute()
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to record interpreter response") from exc

        if not result.data:
            raise HTTPException(status_code=409, detail="Interpreter request was already responded to")

        updated = result.data[0]
        return {
            "request_id": str(updated["id"]),
            "interpreter_id": interpreter_id,
            "response_status": str(updated["response_status"]),
            "assignment_status": str(updated["assignment_status"]),
            "responded_at": updated.get("responded_at"),
        }
