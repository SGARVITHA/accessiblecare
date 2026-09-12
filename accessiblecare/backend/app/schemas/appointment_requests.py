"""Pydantic schemas for the AccessibleCare visit-request workflow."""

from datetime import datetime
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, field_validator, model_validator

from app.schemas.patient_workflow import CommunicationPreference, InterpreterMode


class AppointmentRequestCreate(BaseModel):
    """Patient intake submitted after arriving at the hospital."""

    model_config = ConfigDict(extra="forbid")

    department_id: UUID
    reason_for_visit: str
    communication_preference: CommunicationPreference
    interpreter_required: bool = False
    preferred_interpreter_mode: Optional[InterpreterMode] = None
    remote_accepted: bool = True
    companion_present: bool = False
    companion_assists_communication: bool = False
    accessibility_note: Optional[str] = None

    @field_validator("reason_for_visit")
    @classmethod
    def validate_reason(cls, value: str) -> str:
        value = value.strip()
        if not value:
            raise ValueError("Reason for visit is required")
        return value

    @field_validator("accessibility_note")
    @classmethod
    def normalize_note(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        value = value.strip()
        return value or None

    @model_validator(mode="after")
    def validate_preferences(self):
        if not self.interpreter_required:
            self.preferred_interpreter_mode = None
            self.remote_accepted = False
        if not self.companion_present:
            self.companion_assists_communication = False
        return self


class AppointmentRequestResponse(BaseModel):
    id: UUID
    patient_id: UUID
    patient_name: Optional[str] = None
    patient_phone: Optional[str] = None
    hospital: Optional[str] = None
    department: Optional[str] = None
    reason_for_visit: str
    communication_preference: CommunicationPreference
    interpreter_required: bool
    preferred_interpreter_mode: Optional[InterpreterMode] = None
    remote_accepted: bool
    companion_present: bool
    companion_assists_communication: bool
    accessibility_note: Optional[str] = None
    status: str
    appointment_id: Optional[UUID] = None
    reviewed_by: Optional[UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


class AppointmentRequestConfirm(BaseModel):
    model_config = ConfigDict(extra="forbid")

    department_id: Optional[UUID] = None
    appointment_time: datetime
    doctor_name: Optional[str] = None


class AppointmentRequestReject(BaseModel):
    model_config = ConfigDict(extra="forbid")
