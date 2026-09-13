"""Interpreter request orchestration endpoints for Phase 4."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.auth import UserIdentity, get_current_user
from app.services.interpreter_assignment import InterpreterAssignmentService
from app.services.interpreter_requests import InterpreterRequestService
from app.services.interpreter_response import InterpreterResponseService

router = APIRouter(prefix="/api/interpreters", tags=["interpreter-requests"])


def get_request_service() -> InterpreterRequestService:
    return InterpreterRequestService()


def get_response_service() -> InterpreterResponseService:
    return InterpreterResponseService()


def get_assignment_service() -> InterpreterAssignmentService:
    return InterpreterAssignmentService()


@router.post("/staff/visits/{accessibility_visit_id}/requests")
async def create_interpreter_request_group(
    accessibility_visit_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: InterpreterRequestService = Depends(get_request_service),
):
    return service.create_request_group_for_staff(current_user, accessibility_visit_id)


@router.post("/me/requests/{request_id}/accept")
async def accept_request(
    request_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: InterpreterResponseService = Depends(get_response_service),
):
    return service.respond(current_user, request_id, "ACCEPTED")


@router.post("/me/requests/{request_id}/decline")
async def decline_request(
    request_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: InterpreterResponseService = Depends(get_response_service),
):
    return service.respond(current_user, request_id, "DECLINED")


@router.post("/staff/requests/{request_id}/assign")
async def assign_interpreter(
    request_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: InterpreterAssignmentService = Depends(get_assignment_service),
):
    return service.assign(current_user, request_id)
