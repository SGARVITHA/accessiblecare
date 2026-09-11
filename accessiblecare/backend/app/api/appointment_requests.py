"""Appointment request endpoints for patients and hospital staff."""

from uuid import UUID

from fastapi import APIRouter, Depends, status

from app.core.auth import UserIdentity, get_current_user
from app.schemas.appointment_requests import (
    AppointmentRequestConfirm,
    AppointmentRequestCreate,
    AppointmentRequestReject,
    AppointmentRequestResponse,
)
from app.services.appointment_requests import AppointmentRequestService

router = APIRouter(prefix="/api", tags=["appointment-requests"])


def get_service() -> AppointmentRequestService:
    return AppointmentRequestService()


@router.post(
    "/appointment-requests",
    response_model=AppointmentRequestResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_appointment_request(
    payload: AppointmentRequestCreate,
    current_user: UserIdentity = Depends(get_current_user),
    service: AppointmentRequestService = Depends(get_service),
):
    return service.create(current_user, payload)


@router.get(
    "/patients/me/appointment-requests",
    response_model=list[AppointmentRequestResponse],
)
async def list_my_appointment_requests(
    current_user: UserIdentity = Depends(get_current_user),
    service: AppointmentRequestService = Depends(get_service),
):
    return service.list_patient_requests(current_user)


@router.get(
    "/appointment-requests/{request_id}",
    response_model=AppointmentRequestResponse,
)
async def get_my_appointment_request(
    request_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: AppointmentRequestService = Depends(get_service),
):
    return service.get_patient_request(current_user, request_id)


@router.get(
    "/staff/appointment-requests",
    response_model=list[AppointmentRequestResponse],
)
async def list_staff_appointment_requests(
    current_user: UserIdentity = Depends(get_current_user),
    service: AppointmentRequestService = Depends(get_service),
):
    return service.list_staff_requests(current_user)


@router.get(
    "/staff/appointment-requests/{request_id}",
    response_model=AppointmentRequestResponse,
)
async def get_staff_appointment_request(
    request_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: AppointmentRequestService = Depends(get_service),
):
    return service.get_staff_request(current_user, request_id)


@router.post(
    "/staff/appointment-requests/{request_id}/confirm",
)
async def confirm_appointment_request(
    request_id: UUID,
    payload: AppointmentRequestConfirm,
    current_user: UserIdentity = Depends(get_current_user),
    service: AppointmentRequestService = Depends(get_service),
):
    return service.confirm(current_user, request_id, payload)


@router.post(
    "/staff/appointment-requests/{request_id}/reject",
    response_model=AppointmentRequestResponse,
)
async def reject_appointment_request(
    request_id: UUID,
    payload: AppointmentRequestReject,
    current_user: UserIdentity = Depends(get_current_user),
    service: AppointmentRequestService = Depends(get_service),
):
    return service.reject(current_user, request_id, payload)
