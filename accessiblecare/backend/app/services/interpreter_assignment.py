"""Staff-controlled interpreter assignment for Phase 4 B6.

An interpreter must first accept the request. Staff then selects one accepted
interpreter for the request group. Assignment remains a human-controlled
operation; this service does not perform ranking, fallback, notification,
realtime, escalation, or AI behavior.
"""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

from app.core.auth import UserIdentity
from app.core.supabase import get_supabase_client


class InterpreterAssignmentService:
    """Assign one accepted interpreter from a request group."""

    def __init__(self, supabase: Any | None = None) -> None:
        self.supabase = supabase or get_supabase_client()

    def assign(self, current_user: UserIdentity, request_id: UUID) -> dict[str, Any]:
        staff_id, hospital_id = self._staff_identity(current_user)
        request = self._load_request(request_id)
        group = self._load_group(UUID(str(request["request_group_id"])))
        visit = self._load_visit(UUID(str(group["accessibility_visit_id"])))
        appointment = self._load_appointment(UUID(str(visit["appointment_id"])))

        if str(appointment["hospital_id"]) != str(hospital_id):
            raise HTTPException(status_code=403, detail="Interpreter request is outside the staff hospital")
        if request.get("response_status") != "ACCEPTED":
            raise HTTPException(status_code=409, detail="Interpreter must accept the request before assignment")
        if request.get("assignment_status") == "ASSIGNED":
            return self._response(request, group, appointment)
        if group.get("status") == "CONFIRMED":
            raise HTTPException(status_code=409, detail="Interpreter request group is already confirmed")
        if request.get("assignment_status") != "UNASSIGNED":
            raise HTTPException(status_code=409, detail="Interpreter request is not assignable")

        try:
            rpc_result = self.supabase.rpc(
                "assign_interpreter_request",
                {"p_request_id": str(request_id), "p_staff_id": staff_id},
            ).execute()
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to assign interpreter") from exc

        result = rpc_result.data
        if isinstance(result, list):
            result = result[0] if result else {}
        if not isinstance(result, dict):
            raise HTTPException(status_code=503, detail="Interpreter assignment returned an invalid result")
        return result

    def _staff_identity(self, current_user: UserIdentity) -> tuple[str, UUID]:
        if current_user.role != "STAFF":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Staff access required")
        try:
            rows = (self.supabase.table("staff_profiles").select("id, hospital_id")
                    .eq("user_id", current_user.id).eq("is_active", True).limit(1).execute().data or [])
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to verify staff profile") from exc
        if not rows:
            raise HTTPException(status_code=403, detail="Staff profile is not registered in AccessibleCare")
        return str(rows[0]["id"]), UUID(str(rows[0]["hospital_id"]))

    def _load_request(self, request_id: UUID) -> dict[str, Any]:
        try:
            rows = (self.supabase.table("interpreter_requests").select(
                "id, request_group_id, interpreter_id, response_status, assignment_status, assigned_at, assigned_by"
            ).eq("id", str(request_id)).limit(1).execute().data or [])
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load interpreter request") from exc
        if not rows:
            raise HTTPException(status_code=404, detail="Interpreter request not found")
        return rows[0]

    def _load_group(self, group_id: UUID) -> dict[str, Any]:
        try:
            rows = (self.supabase.table("interpreter_request_groups").select(
                "id, accessibility_visit_id, status"
            ).eq("id", str(group_id)).limit(1).execute().data or [])
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load interpreter request group") from exc
        if not rows:
            raise HTTPException(status_code=404, detail="Interpreter request group not found")
        return rows[0]

    def _load_visit(self, visit_id: UUID) -> dict[str, Any]:
        try:
            rows = (self.supabase.table("accessibility_visits").select(
                "id, appointment_id, patient_id"
            ).eq("id", str(visit_id)).limit(1).execute().data or [])
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load accessibility visit") from exc
        if not rows:
            raise HTTPException(status_code=404, detail="Accessibility visit not found")
        return rows[0]

    def _load_appointment(self, appointment_id: UUID) -> dict[str, Any]:
        try:
            rows = (self.supabase.table("appointments").select(
                "id, hospital_id, patient_id, status"
            ).eq("id", str(appointment_id)).limit(1).execute().data or [])
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load appointment") from exc
        if not rows:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return rows[0]

    @staticmethod
    def _response(request: dict[str, Any], group: dict[str, Any], appointment: dict[str, Any]) -> dict[str, Any]:
        return {
            "request_id": str(request["id"]),
            "request_group_id": str(request["request_group_id"]),
            "accessibility_visit_id": str(group["accessibility_visit_id"]),
            "appointment_id": str(appointment["id"]),
            "interpreter_id": str(request["interpreter_id"]),
            "response_status": str(request["response_status"]),
            "assignment_status": str(request["assignment_status"]),
            "group_status": str(group["status"]),
            "assigned_at": request.get("assigned_at"),
            "assigned_by": request.get("assigned_by"),
        }
