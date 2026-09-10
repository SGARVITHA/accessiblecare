"""Pydantic schemas for the patient appointment/accessibility vertical slice."""

from enum import Enum
from typing import Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict


class CommunicationPreference(str, Enum):
    ISL = "ISL"
    TEXT = "TEXT"
    SPEECH_TO_TEXT = "SPEECH_TO_TEXT"
    COMBINATION = "COMBINATION"


class InterpreterMode(str, Enum):
    IN_PERSON = "IN_PERSON"
    REMOTE = "REMOTE"
    EITHER = "EITHER"


class AppointmentResponse(BaseModel):
    id: UUID
    external_id: Optional[str] = None
    department: Optional[str] = None
    hospital: Optional[str] = None
    hospital_location: Optional[str] = None
    doctor_name: Optional[str] = None
    appointment_time: str
    status: str
    source: str


class AccessibilityProfileRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    communication_preference: CommunicationPreference
    interpreter_required: bool = False
    preferred_interpreter_mode: Optional[InterpreterMode] = None
    remote_accepted: bool = True
    companion_preference: Optional[str] = None


class AccessibilityProfileResponse(AccessibilityProfileRequest):
    id: UUID
    patient_id: UUID
    created_at: str
    updated_at: str


class AccessibilityVisitRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    communication_preference: CommunicationPreference
    interpreter_required: bool = False
    preferred_mode: Optional[InterpreterMode] = None
    remote_accepted: bool = True
    companion_present: bool = False


class AccessibilityVisitResponse(BaseModel):
    id: UUID
    appointment_id: UUID
    patient_id: UUID
    communication_preference: CommunicationPreference
    interpreter_required: bool
    preferred_mode: Optional[InterpreterMode] = None
    remote_accepted: bool
    companion_present: bool
    status: str
    created_at: str
    updated_at: str


class AccessibilityStatusResponse(BaseModel):
    configured: bool
    status: str
    visit: Optional[AccessibilityVisitResponse] = None
