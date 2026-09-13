"""Staff-owned appointment detail service."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.core.supabase import get_supabase_client


class StaffAppointmentService:
    def __init__(self, supabase: Any | None = None) -> None:
        self.supabase = supabase or get_supabase_client()

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
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to verify staff profile") from exc
        if not rows:
            raise HTTPException(status_code=403, detail="Staff profile is not registered in AccessibleCare")
        return UUID(str(rows[0]["hospital_id"]))

    def get(self, current_user: UserIdentity, appointment_id: UUID) -> dict[str, Any]:
        hospital_id = self._staff_hospital_id(current_user)
        try:
            rows = (
                self.supabase.table("appointments")
                .select(
                    "id, external_id, patient_id, hospital_id, department_id, doctor_name, "
                    "appointment_time, status, source, hospitals(name, location), departments(name)"
                )
                .eq("id", str(appointment_id))
                .eq("hospital_id", str(hospital_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load appointment") from exc
        if not rows:
            raise HTTPException(status_code=404, detail="Appointment not found")

        row = rows[0]
        hospital = row.get("hospitals") or {}
        department = row.get("departments") or {}
        return {
            "id": row["id"],
            "external_id": row.get("external_id"),
            "department": department.get("name"),
            "hospital": hospital.get("name"),
            "hospital_location": hospital.get("location"),
            "doctor_name": row.get("doctor_name"),
            "appointment_time": str(row["appointment_time"]),
            "status": row["status"],
            "source": row["source"],
        }
