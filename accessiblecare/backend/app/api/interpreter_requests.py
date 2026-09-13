"""Interpreter request response endpoints for Phase 4 B5."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.auth import UserIdentity, get_current_user
from app.services.interpreter_response import InterpreterResponseService

router = APIRouter(prefix="/api/interpreters/me/requests", tags=["interpreter-requests"])


def get_service() -> InterpreterResponseService:
    return InterpreterResponseService()


@router.post("/{request_id}/accept")
async def accept_request(
    request_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: InterpreterResponseService = Depends(get_service),
):
    return service.respond(current_user, request_id, "ACCEPTED")


@router.post("/{request_id}/decline")
async def decline_request(
    request_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: InterpreterResponseService = Depends(get_service),
):
    return service.respond(current_user, request_id, "DECLINED")
