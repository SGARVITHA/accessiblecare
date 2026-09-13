"""Interpreter assignment cancellation endpoint for Phase 4 B7."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.auth import UserIdentity, get_current_user
from app.services.interpreter_cancellation import InterpreterCancellationService

router = APIRouter(prefix="/api/interpreters/me/assignments", tags=["interpreter-assignments"])


def get_service() -> InterpreterCancellationService:
    return InterpreterCancellationService()


@router.post("/{request_id}/cancel")
async def cancel_assignment(
    request_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: InterpreterCancellationService = Depends(get_service),
):
    return service.cancel(current_user, request_id)
