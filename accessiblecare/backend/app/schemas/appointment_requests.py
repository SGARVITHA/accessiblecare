"""Pydantic schemas for appointment request workflow."""

from datetime import date, datetime, time
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, model_validator

from app.schemas.patient_workflow import CommunicationPreference, InterpreterMode


class AppointmentRequestCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")

    department_id: UUID
    preferred_date: date
    preferred_time: Optional[time] = None
    preferred_time_window: Optional[str] = None
    communication_preference: CommunicationPreference
    interpreter_required: bool = False
    preferred_interpreter_mode: Optional[InterpreterMode] = None
    remote_accepted: bool = True
    companion_present: bool = False
    companion_assists_communication: bool = False

    @model_validator(mode="after")
    def validate_preferences(self):
        if self.preferred_time is None and not self.preferred_time_window:
            raise ValueError("Either preferred_time or preferred_time_window is required")
        if not self.interpreter_required:
            self.preferred_interpreter_mode = None
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
    preferred_date: date
    preferred_time: Optional[time] = None
    preferred_time_window: Optional[str] = None
    communication_preference: CommunicationPreference
    interpreter_required: bool
    preferred_interpreter_mode: Optional[InterpreterMode] = None
    remote_accepted: bool
    companion_present: bool
    companion_assists_communication: bool
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
