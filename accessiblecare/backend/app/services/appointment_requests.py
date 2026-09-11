"""Appointment request workflow services for patients and hospital staff."""

from datetime import datetime, timezone
from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

from app.core.auth import UserIdentity
from app.core.supabase import get_supabase_client
from app.schemas.appointment_requests import (
    AppointmentRequestConfirm,
    AppointmentRequestCreate,
    AppointmentRequestReject,
)


class AppointmentRequestService:
    def __init__(self, supabase: Any | None = None) -> None:
        self.supabase = supabase or get_supabase_client()

    def _patient_id(self, current_user: UserIdentity) -> UUID:
        if current_user.role != "PATIENT":
            raise HTTPException(status_code=403, detail="Patient access required")
        try:
            rows = (
                self.supabase.table("patient_profiles")
                .select("id")
                .eq("user_id", current_user.id)
                .limit(1)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to verify patient profile")
        if not rows:
            raise HTTPException(status_code=403, detail="Patient profile is not registered in AccessibleCare")
        return UUID(str(rows[0]["id"]))

    def _staff_hospital_id(self, current_user: UserIdentity) -> UUID:
        if current_user.role != "STAFF":
            raise HTTPException(status_code=403, detail="Staff access required")
        try:
            rows = (
                self.supabase.table("staff_profiles")
                .select("hospital_id")
                .eq("user_id", current_user.id)
                .eq("is_active", True)
                .limit(1)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to verify staff profile")
        if not rows:
            raise HTTPException(status_code=403, detail="Staff profile is not registered in AccessibleCare")
        return UUID(str(rows[0]["hospital_id"]))

    @staticmethod
    def _request_select() -> str:
        return (
            "id, patient_id, hospital_id, department_id, preferred_date, preferred_time, "
            "preferred_time_window, communication_preference, interpreter_required, "
            "preferred_interpreter_mode, remote_accepted, companion_present, "
            "companion_assists_communication, status, appointment_id, reviewed_by, reviewed_at, "
            "created_at, updated_at, patient_profiles(profiles(full_name, phone)), "
            "hospitals(name), departments(name)"
        )

    @staticmethod
    def _response(row: dict[str, Any]) -> dict[str, Any]:
        patient = row.get("patient_profiles") or {}
        profile = patient.get("profiles") or {}
        hospital = row.get("hospitals") or {}
        department = row.get("departments") or {}
        return {
            "id": row["id"],
            "patient_id": row["patient_id"],
            "patient_name": profile.get("full_name"),
            "patient_phone": profile.get("phone"),
            "hospital": hospital.get("name"),
            "department": department.get("name"),
            "preferred_date": row["preferred_date"],
            "preferred_time": row.get("preferred_time"),
            "preferred_time_window": row.get("preferred_time_window"),
            "communication_preference": row["communication_preference"],
            "interpreter_required": row["interpreter_required"],
            "preferred_interpreter_mode": row.get("preferred_interpreter_mode"),
            "remote_accepted": row["remote_accepted"],
            "companion_present": row["companion_present"],
            "companion_assists_communication": row["companion_assists_communication"],
            "status": row["status"],
            "appointment_id": row.get("appointment_id"),
            "reviewed_by": row.get("reviewed_by"),
            "reviewed_at": row.get("reviewed_at"),
            "created_at": row["created_at"],
            "updated_at": row["updated_at"],
        }

    def create(self, current_user: UserIdentity, payload: AppointmentRequestCreate) -> dict[str, Any]:
        patient_id = self._patient_id(current_user)
        try:
            department_rows = (
                self.supabase.table("departments")
                .select("id, hospital_id")
                .eq("id", str(payload.department_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to verify department")
        if not department_rows:
            raise HTTPException(status_code=404, detail="Department not found")

        hospital_id = department_rows[0]["hospital_id"]
        values = {
            "patient_id": str(patient_id),
            "hospital_id": hospital_id,
            "department_id": str(payload.department_id),
            "preferred_date": payload.preferred_date.isoformat(),
            "preferred_time": payload.preferred_time.isoformat() if payload.preferred_time else None,
            "preferred_time_window": payload.preferred_time_window,
            "communication_preference": payload.communication_preference.value,
            "interpreter_required": payload.interpreter_required,
            "preferred_interpreter_mode": (
                payload.preferred_interpreter_mode.value if payload.preferred_interpreter_mode else None
            ),
            "remote_accepted": payload.remote_accepted,
            "companion_present": payload.companion_present,
            "companion_assists_communication": payload.companion_assists_communication,
            "status": "PENDING",
        }
        try:
            result = self.supabase.table("appointment_requests").insert(values).execute()
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to submit appointment request")
        if not result.data:
            raise HTTPException(status_code=503, detail="Appointment request could not be created")
        return self._response(result.data[0])

    def list_patient_requests(self, current_user: UserIdentity) -> list[dict[str, Any]]:
        patient_id = self._patient_id(current_user)
        try:
            rows = (
                self.supabase.table("appointment_requests")
                .select(self._request_select())
                .eq("patient_id", str(patient_id))
                .order("created_at", desc=True)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to load appointment requests")
        return [self._response(row) for row in rows]

    def get_patient_request(self, current_user: UserIdentity, request_id: UUID) -> dict[str, Any]:
        patient_id = self._patient_id(current_user)
        try:
            rows = (
                self.supabase.table("appointment_requests")
                .select(self._request_select())
                .eq("id", str(request_id))
                .eq("patient_id", str(patient_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to load appointment request")
        if not rows:
            raise HTTPException(status_code=404, detail="Appointment request not found")
        return self._response(rows[0])

    def list_staff_requests(self, current_user: UserIdentity) -> list[dict[str, Any]]:
        hospital_id = self._staff_hospital_id(current_user)
        try:
            rows = (
                self.supabase.table("appointment_requests")
                .select(self._request_select())
                .eq("hospital_id", str(hospital_id))
                .order("created_at", desc=True)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to load appointment requests")
        return [self._response(row) for row in rows]

    def get_staff_request(self, current_user: UserIdentity, request_id: UUID) -> dict[str, Any]:
        hospital_id = self._staff_hospital_id(current_user)
        try:
            rows = (
                self.supabase.table("appointment_requests")
                .select(self._request_select())
                .eq("id", str(request_id))
                .eq("hospital_id", str(hospital_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to load appointment request")
        if not rows:
            raise HTTPException(status_code=404, detail="Appointment request not found")
        return self._response(rows[0])

    def confirm(
        self, current_user: UserIdentity, request_id: UUID, payload: AppointmentRequestConfirm
    ) -> dict[str, Any]:
        hospital_id = self._staff_hospital_id(current_user)
        try:
            rows = (
                self.supabase.table("appointment_requests")
                .select("*")
                .eq("id", str(request_id))
                .eq("hospital_id", str(hospital_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to load appointment request")
        if not rows:
            raise HTTPException(status_code=404, detail="Appointment request not found")
        request = rows[0]
        if request["status"] != "PENDING":
            raise HTTPException(status_code=409, detail="Only pending requests can be confirmed")

        department_id = payload.department_id or UUID(str(request["department_id"]))
        try:
            department_rows = (
                self.supabase.table("departments")
                .select("id, hospital_id")
                .eq("id", str(department_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to verify department")
        if not department_rows or str(department_rows[0]["hospital_id"]) != str(hospital_id):
            raise HTTPException(status_code=400, detail="Department does not belong to staff hospital")

        appointment_values = {
            "hospital_id": str(hospital_id),
            "patient_id": request["patient_id"],
            "department_id": str(department_id),
            "doctor_name": payload.doctor_name,
            "appointment_time": payload.appointment_time.isoformat(),
            "status": "SCHEDULED",
            "source": "MANUAL",
        }
        try:
            appointment_result = self.supabase.table("appointments").insert(appointment_values).execute()
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to create appointment")
        if not appointment_result.data:
            raise HTTPException(status_code=503, detail="Appointment could not be created")
        appointment = appointment_result.data[0]

        reviewed_at = datetime.now(timezone.utc).isoformat()
        try:
            request_result = (
                self.supabase.table("appointment_requests")
                .update(
                    {
                        "status": "CONFIRMED",
                        "appointment_id": appointment["id"],
                        "reviewed_by": current_user.id,
                        "reviewed_at": reviewed_at,
                    }
                )
                .eq("id", str(request_id))
                .eq("hospital_id", str(hospital_id))
                .eq("status", "PENDING")
                .execute()
        except Exception:
            raise HTTPException(
                status_code=503,
                detail="Appointment was created but request confirmation could not be recorded",
            )
        if not request_result.data:
            raise HTTPException(
                status_code=409,
                detail="Appointment was created but request was no longer pending",
            )

        return {
            "request": self._response(request_result.data[0]),
            "appointment": appointment,
        }

    def reject(
        self, current_user: UserIdentity, request_id: UUID, payload: AppointmentRequestReject
    ) -> dict[str, Any]:
        hospital_id = self._staff_hospital_id(current_user)
        try:
            rows = (
                self.supabase.table("appointment_requests")
                .select("*")
                .eq("id", str(request_id))
                .eq("hospital_id", str(hospital_id))
                .eq("status", "PENDING")
                .limit(1)
                .execute()
                .data
            )
            if not rows:
                raise HTTPException(status_code=404, detail="Pending appointment request not found")
            result = (
                self.supabase.table("appointment_requests")
                .update(
                    {
                        "status": "REJECTED",
                        "reviewed_by": current_user.id,
                        "reviewed_at": datetime.now(timezone.utc).isoformat(),
                    }
                )
                .eq("id", str(request_id))
                .eq("hospital_id", str(hospital_id))
                .eq("status", "PENDING")
                .execute()
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to reject appointment request")
        if not result.data:
            raise HTTPException(status_code=409, detail="Appointment request could not be rejected")
        return self._response(result.data[0])
