"""Patient appointment and accessibility workflow endpoints."""

from fastapi import APIRouter, Depends, status

from app.core.auth import UserIdentity, get_current_user
from app.schemas.patient_workflow import (
    AccessibilityProfileRequest,
    AccessibilityProfileResponse,
    AccessibilityStatusResponse,
    AccessibilityVisitRequest,
    AccessibilityVisitResponse,
    AppointmentResponse,
)
from app.services.patient_workflow import PatientWorkflowService

router = APIRouter(prefix="/api", tags=["patient-workflow"])


def get_service() -> PatientWorkflowService:
    return PatientWorkflowService()


@router.get("/patients/me/appointments", response_model=list[AppointmentResponse])
async def list_my_appointments(
    current_user: UserIdentity = Depends(get_current_user),
    service: PatientWorkflowService = Depends(get_service),
):
    return service.list_appointments(current_user)


@router.get("/appointments/{appointment_id}", response_model=AppointmentResponse)
async def get_my_appointment(
    appointment_id: str,
    current_user: UserIdentity = Depends(get_current_user),
    service: PatientWorkflowService = Depends(get_service),
):
    return service.get_appointment(current_user, appointment_id)


@router.get("/accessibility/profile", response_model=AccessibilityProfileResponse)
async def get_my_accessibility_profile(
    current_user: UserIdentity = Depends(get_current_user),
    service: PatientWorkflowService = Depends(get_service),
):
    return service.get_accessibility_profile(current_user)


@router.put("/accessibility/profile", response_model=AccessibilityProfileResponse)
async def update_my_accessibility_profile(
    payload: AccessibilityProfileRequest,
    current_user: UserIdentity = Depends(get_current_user),
    service: PatientWorkflowService = Depends(get_service),
):
    return service.upsert_accessibility_profile(current_user, payload)


@router.post(
    "/appointments/{appointment_id}/accessibility",
    response_model=AccessibilityVisitResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_accessibility_visit(
    appointment_id: str,
    payload: AccessibilityVisitRequest,
    current_user: UserIdentity = Depends(get_current_user),
    service: PatientWorkflowService = Depends(get_service),
):
    return service.create_accessibility_visit(current_user, appointment_id, payload)


@router.post("/appointments/{appointment_id}/accessibility/confirm", response_model=AccessibilityVisitResponse)
async def confirm_accessibility_visit(
    appointment_id: str,
    current_user: UserIdentity = Depends(get_current_user),
    service: PatientWorkflowService = Depends(get_service),
):
    return service.confirm_accessibility_visit(current_user, appointment_id)


@router.get("/appointments/{appointment_id}/accessibility/status", response_model=AccessibilityStatusResponse)
async def get_accessibility_status(
    appointment_id: str,
    current_user: UserIdentity = Depends(get_current_user),
    service: PatientWorkflowService = Depends(get_service),
):
    return service.get_accessibility_status(current_user, appointment_id)
