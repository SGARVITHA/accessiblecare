"""Interpreter request response and staff assignment endpoints for Phase 4."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.auth import UserIdentity, get_current_user
from app.services.interpreter_assignment import InterpreterAssignmentService
from app.services.interpreter_response import InterpreterResponseService

router = APIRouter(prefix="/api/interpreters", tags=["interpreter-requests"])


def get_response_service() -> InterpreterResponseService:
    return InterpreterResponseService()


def get_assignment_service() -> InterpreterAssignmentService:
    return InterpreterAssignmentService()


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
