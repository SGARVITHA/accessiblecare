"""Staff-controlled interpreter assignment endpoints for Phase 4 B6."""

from uuid import UUID

from fastapi import APIRouter, Depends

from app.core.auth import UserIdentity, get_current_user
from app.services.interpreter_assignment import InterpreterAssignmentService

router = APIRouter(prefix="/api/staff/interpreters", tags=["interpreter-assignment"])


def get_service() -> InterpreterAssignmentService:
    return InterpreterAssignmentService()


@router.post("/requests/{request_id}/assign")
async def assign_interpreter(
    request_id: UUID,
    current_user: UserIdentity = Depends(get_current_user),
    service: InterpreterAssignmentService = Depends(get_service),
):
    return service.assign(current_user, request_id)
