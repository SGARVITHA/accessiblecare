"""Interpreter-controlled assignment cancellation for Phase 4 B7.

This service only cancels an existing assignment and reopens a confirmed
request group according to the existing Phase 4 state machine. It does not
select, assign, notify, escalate, or invoke any agentic workflow.
"""

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
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Interpreter role required",
            )

        interpreter_id = self._interpreter_identity(current_user)
        request = self._load_request(request_id, interpreter_id)

        if request.get("assignment_status") != "ASSIGNED":
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Only an assigned interpreter request can be cancelled",
            )

        group_id = UUID(str(request["request_group_id"]))
        group = self._load_group(group_id)
        visit = self._load_visit(UUID(str(group["accessibility_visit_id"])))
        appointment = self._load_appointment(UUID(str(visit["appointment_id"])))

        try:
            result = (
                self.supabase.table("interpreter_requests")
                .update({"assignment_status": "CANCELLED"})
                .eq("id", str(request_id))
                .eq("interpreter_id", interpreter_id)
                .eq("assignment_status", "ASSIGNED")
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to cancel interpreter assignment",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Interpreter assignment was already changed",
            )

        # Existing state-machine semantics define CONFIRMED as an assigned
        # request group and OPEN as eligible for another orchestration cycle.
        # Do not invent a new group state and do not trigger that next cycle here.
        resulting_group_status = str(group["status"])
        if resulting_group_status == "CONFIRMED":
            try:
                group_result = (
                    self.supabase.table("interpreter_request_groups")
                    .update({"status": "OPEN"})
                    .eq("id", str(group_id))
                    .eq("status", "CONFIRMED")
                    .execute()
                )
            except Exception as exc:
                raise HTTPException(
                    status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                    detail="Assignment was cancelled but request group could not be reopened",
                ) from exc

            if not group_result.data:
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Interpreter request group was already changed",
                )
            resulting_group_status = "OPEN"

        self._write_audit_log(
            actor_id=current_user.id,
            appointment_id=UUID(str(appointment["id"])),
            request_id=request_id,
            request_group_id=group_id,
            interpreter_id=interpreter_id,
            previous_assignment_status="ASSIGNED",
            resulting_group_status=resulting_group_status,
        )

        updated = self._load_request(request_id, interpreter_id)
        return {
            "request_id": str(updated["id"]),
            "request_group_id": str(updated["request_group_id"]),
            "accessibility_visit_id": str(group["accessibility_visit_id"]),
            "appointment_id": str(appointment["id"]),
            "interpreter_id": interpreter_id,
            "response_status": str(updated["response_status"]),
            "assignment_status": str(updated["assignment_status"]),
            "group_status": resulting_group_status,
            "assigned_at": updated.get("assigned_at"),
            "assigned_by": updated.get("assigned_by"),
        }

    def _interpreter_identity(self, current_user: UserIdentity) -> str:
        try:
            rows = (
                self.supabase.table("interpreter_profiles")
                .select("id")
                .eq("user_id", current_user.id)
                .limit(1)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to verify interpreter profile",
            ) from exc

        if not rows:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Interpreter profile not found",
            )
        return str(rows[0]["id"])

    def _load_request(self, request_id: UUID, interpreter_id: str) -> dict[str, Any]:
        try:
            rows = (
                self.supabase.table("interpreter_requests")
                .select(
                    "id, request_group_id, interpreter_id, response_status, "
                    "assignment_status, assigned_at, assigned_by"
                )
                .eq("id", str(request_id))
                .eq("interpreter_id", interpreter_id)
                .limit(1)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to load interpreter request",
            ) from exc

        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interpreter request not found",
            )
        return rows[0]

    def _load_group(self, group_id: UUID) -> dict[str, Any]:
        try:
            rows = (
                self.supabase.table("interpreter_request_groups")
                .select("id, accessibility_visit_id, status")
                .eq("id", str(group_id))
                .limit(1)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to load interpreter request group",
            ) from exc

        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Interpreter request group not found",
            )
        return rows[0]

    def _load_visit(self, visit_id: UUID) -> dict[str, Any]:
        try:
            rows = (
                self.supabase.table("accessibility_visits")
                .select("id, appointment_id")
                .eq("id", str(visit_id))
                .limit(1)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to load accessibility visit",
            ) from exc

        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Accessibility visit not found",
            )
        return rows[0]

    def _load_appointment(self, appointment_id: UUID) -> dict[str, Any]:
        try:
            rows = (
                self.supabase.table("appointments")
                .select("id, hospital_id")
                .eq("id", str(appointment_id))
                .limit(1)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Unable to load appointment",
            ) from exc

        if not rows:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Appointment not found",
            )
        return rows[0]

    def _write_audit_log(
        self,
        *,
        actor_id: str,
        appointment_id: UUID,
        request_id: UUID,
        request_group_id: UUID,
        interpreter_id: str,
        previous_assignment_status: str,
        resulting_group_status: str,
    ) -> None:
        try:
            result = (
                self.supabase.table("audit_logs")
                .insert(
                    {
                        "actor_id": actor_id,
                        "appointment_id": str(appointment_id),
                        "action": "INTERPRETER_ASSIGNMENT_CANCELLED",
                        "entity_type": "interpreter_request",
                        "entity_id": str(request_id),
                        "metadata": {
                            "request_group_id": str(request_group_id),
                            "interpreter_id": interpreter_id,
                            "previous_assignment_status": previous_assignment_status,
                            "resulting_group_status": resulting_group_status,
                        },
                    }
                )
                .execute()
            )
        except Exception as exc:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Interpreter assignment was cancelled but audit logging failed",
            ) from exc

        if not result.data:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Interpreter assignment was cancelled but audit logging failed",
            )
