"""Patient-owned appointment and accessibility workflow services."""

from typing import Any
from uuid import UUID

from fastapi import HTTPException, status

from app.core.auth import UserIdentity
from app.core.supabase import get_supabase_client
from app.schemas.patient_workflow import AccessibilityProfileRequest, AccessibilityVisitRequest


class PatientWorkflowService:
    def __init__(self, supabase: Any | None = None) -> None:
        self.supabase = supabase or get_supabase_client()

    def _patient_id(self, current_user: UserIdentity) -> UUID:
        if current_user.role != "PATIENT":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Patient access required")
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

    def _owned_appointment(self, patient_id: UUID, appointment_ref: str) -> dict[str, Any]:
        """Resolve a patient-owned appointment by internal UUID or hospital reference."""
        try:
            query = (
                self.supabase.table("appointments")
                .select(
                    "id, external_id, patient_id, hospital_id, department_id, doctor_name, "
                    "appointment_time, status, source, hospitals(name, location), departments(name)"
                )
                .eq("patient_id", str(patient_id))
            )
            try:
                UUID(appointment_ref)
                query = query.eq("id", appointment_ref)
            except ValueError:
                query = query.eq("external_id", appointment_ref)
            rows = query.limit(1).execute().data
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to load appointment")
        if not rows:
            raise HTTPException(status_code=404, detail="Appointment not found")
        return rows[0]

    @staticmethod
    def _appointment_response(row: dict[str, Any]) -> dict[str, Any]:
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

    def list_appointments(self, current_user: UserIdentity) -> list[dict[str, Any]]:
        patient_id = self._patient_id(current_user)
        try:
            rows = (
                self.supabase.table("appointments")
                .select(
                    "id, external_id, patient_id, hospital_id, department_id, doctor_name, "
                    "appointment_time, status, source, hospitals(name, location), departments(name)"
                )
                .eq("patient_id", str(patient_id))
                .order("appointment_time", desc=False)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to load appointments")
        return [self._appointment_response(row) for row in rows]

    def get_appointment(self, current_user: UserIdentity, appointment_ref: str) -> dict[str, Any]:
        patient_id = self._patient_id(current_user)
        return self._appointment_response(self._owned_appointment(patient_id, appointment_ref))

    def get_accessibility_profile(self, current_user: UserIdentity) -> dict[str, Any]:
        patient_id = self._patient_id(current_user)
        try:
            rows = (
                self.supabase.table("accessibility_profiles")
                .select(
                    "id, patient_id, communication_preference, interpreter_required, "
                    "preferred_interpreter_mode, remote_accepted, companion_preference"
                )
                .eq("patient_id", str(patient_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to load accessibility profile")
        if not rows:
            raise HTTPException(status_code=404, detail="Accessibility profile is not configured")
        return rows[0]

    def upsert_accessibility_profile(
        self, current_user: UserIdentity, payload: AccessibilityProfileRequest
    ) -> dict[str, Any]:
        patient_id = self._patient_id(current_user)
        values = {
            "patient_id": str(patient_id),
            "communication_preference": payload.communication_preference.value,
            "interpreter_required": payload.interpreter_required,
            "preferred_interpreter_mode": (
                payload.preferred_interpreter_mode.value if payload.preferred_interpreter_mode else None
            ),
            "remote_accepted": payload.remote_accepted,
            "companion_preference": payload.companion_preference,
        }
        try:
            existing = (
                self.supabase.table("accessibility_profiles")
                .select("id")
                .eq("patient_id", str(patient_id))
                .limit(1)
                .execute()
                .data
            )
            if existing:
                result = (
                    self.supabase.table("accessibility_profiles")
                    .update(values)
                    .eq("id", existing[0]["id"])
                    .eq("patient_id", str(patient_id))
                    .execute()
                )
                action = "ACCESSIBILITY_PROFILE_UPDATED"
            else:
                result = self.supabase.table("accessibility_profiles").insert(values).execute()
                action = "ACCESSIBILITY_PROFILE_CREATED"
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to save accessibility profile")
        if not result.data:
            raise HTTPException(status_code=503, detail="Accessibility profile could not be saved")
        row = result.data[0]
        self._audit(
            current_user.id,
            None,
            action,
            "accessibility_profiles",
            row["id"],
            {"patient_id": str(patient_id)},
        )
        return row

    def create_accessibility_visit(
        self, current_user: UserIdentity, appointment_ref: str, payload: AccessibilityVisitRequest
    ) -> dict[str, Any]:
        patient_id = self._patient_id(current_user)
        appointment = self._owned_appointment(patient_id, appointment_ref)
        appointment_id = str(appointment["id"])
        values = {
            "appointment_id": appointment_id,
            "patient_id": str(patient_id),
            "communication_preference": payload.communication_preference.value,
            "interpreter_required": payload.interpreter_required,
            "preferred_mode": payload.preferred_mode.value if payload.preferred_mode else None,
            "remote_accepted": payload.remote_accepted,
            "companion_present": payload.companion_present,
            "status": "CREATED",
        }
        try:
            existing = (
                self.supabase.table("accessibility_visits")
                .select("id")
                .eq("appointment_id", appointment_id)
                .limit(1)
                .execute()
                .data
            )
            if existing:
                raise HTTPException(status_code=409, detail="Accessibility setup already exists for this appointment")
            result = self.supabase.table("accessibility_visits").insert(values).execute()
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to create accessibility visit")
        if not result.data:
            raise HTTPException(status_code=503, detail="Accessibility visit could not be created")
        row = result.data[0]
        self._audit(
            current_user.id,
            appointment_id,
            "ACCESSIBILITY_VISIT_CREATED",
            "accessibility_visits",
            row["id"],
            {"status": "CREATED"},
        )
        return row

    def confirm_accessibility_visit(
        self, current_user: UserIdentity, appointment_ref: str
    ) -> dict[str, Any]:
        patient_id = self._patient_id(current_user)
        appointment = self._owned_appointment(patient_id, appointment_ref)
        appointment_id = str(appointment["id"])
        try:
            rows = (
                self.supabase.table("accessibility_visits")
                .select("*")
                .eq("appointment_id", appointment_id)
                .eq("patient_id", str(patient_id))
                .limit(1)
                .execute()
                .data
            )
            if not rows:
                raise HTTPException(status_code=404, detail="Accessibility setup is not configured")
            row = rows[0]
            if row["status"] != "CREATED":
                raise HTTPException(
                    status_code=409,
                    detail="Accessibility preferences cannot be confirmed from the current state",
                )
            result = (
                self.supabase.table("accessibility_visits")
                .update({"status": "PREFERENCES_CONFIRMED"})
                .eq("id", row["id"])
                .eq("patient_id", str(patient_id))
                .eq("status", "CREATED")
                .execute()
            )
        except HTTPException:
            raise
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to confirm accessibility preferences")
        if not result.data:
            raise HTTPException(status_code=409, detail="Accessibility preferences could not be confirmed")
        updated = result.data[0]
        self._audit(
            current_user.id,
            appointment_id,
            "ACCESSIBILITY_PREFERENCES_CONFIRMED",
            "accessibility_visits",
            updated["id"],
            {"status": "PREFERENCES_CONFIRMED"},
        )
        return updated

    def get_accessibility_status(
        self, current_user: UserIdentity, appointment_ref: str
    ) -> dict[str, Any]:
        patient_id = self._patient_id(current_user)
        appointment = self._owned_appointment(patient_id, appointment_ref)
        appointment_id = str(appointment["id"])
        try:
            rows = (
                self.supabase.table("accessibility_visits")
                .select("*")
                .eq("appointment_id", appointment_id)
                .eq("patient_id", str(patient_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception:
            raise HTTPException(status_code=503, detail="Unable to load accessibility status")
        if not rows:
            return {"configured": False, "status": "NOT_CONFIGURED", "visit": None}
        return {"configured": True, "status": rows[0]["status"], "visit": rows[0]}

    def _audit(
        self,
        actor_id: str,
        appointment_id: str | None,
        action: str,
        entity_type: str,
        entity_id: str,
        metadata: dict[str, Any],
    ) -> None:
        try:
            self.supabase.table("audit_logs").insert(
                {
                    "actor_id": actor_id,
                    "appointment_id": appointment_id,
                    "action": action,
                    "entity_type": entity_type,
                    "entity_id": entity_id,
                    "metadata": metadata,
                }
            ).execute()
        except Exception:
            # The primary workflow operation remains authoritative if audit persistence fails.
            pass
