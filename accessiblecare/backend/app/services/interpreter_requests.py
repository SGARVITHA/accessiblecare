"""Controlled interpreter request orchestration for Phase 4 B4.

This service takes deterministic B3 eligible candidates and creates a bounded
PARALLEL_TOP_N request group. It does not assign an interpreter, notify users,
rank candidates with AI, or perform fallback/escalation logic.
"""

from dataclasses import dataclass
from typing import Any
from uuid import UUID

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.core.supabase import get_supabase_client
from app.services.interpreter_eligibility_service import (
    EligibilityResult,
    InterpreterEligibilityService,
)


DEFAULT_CANDIDATE_LIMIT = 5
PARALLEL_TOP_N = "PARALLEL_TOP_N"


@dataclass(frozen=True)
class InterpreterRequestSummary:
    request_id: str
    interpreter_id: str
    display_name: str
    response_status: str
    assignment_status: str


@dataclass(frozen=True)
class InterpreterRequestGroupResult:
    request_group_id: str
    accessibility_visit_id: str
    requested_mode: str
    strategy: str
    candidate_limit: int
    status: str
    requests: tuple[InterpreterRequestSummary, ...]


class InterpreterRequestService:
    """Create bounded interpreter requests from deterministic B3 eligibility."""

    def __init__(
        self,
        supabase: Any | None = None,
        eligibility_service: InterpreterEligibilityService | None = None,
    ) -> None:
        self.supabase = supabase or get_supabase_client()
        self.eligibility_service = eligibility_service or InterpreterEligibilityService(self.supabase)

    def create_request_group_for_staff(
        self,
        current_user: UserIdentity,
        accessibility_visit_id: UUID,
        *,
        candidate_limit: int = DEFAULT_CANDIDATE_LIMIT,
    ) -> InterpreterRequestGroupResult:
        """Start interpreter coordination for a staff member's hospital-scoped visit."""
        hospital_id = self._staff_hospital_id(current_user)
        self._verify_visit_hospital(accessibility_visit_id, hospital_id)
        return self.create_request_group(accessibility_visit_id, candidate_limit=candidate_limit)

    def create_request_group(
        self,
        accessibility_visit_id: UUID,
        *,
        candidate_limit: int = DEFAULT_CANDIDATE_LIMIT,
    ) -> InterpreterRequestGroupResult:
        if candidate_limit < 1 or candidate_limit > DEFAULT_CANDIDATE_LIMIT:
            raise HTTPException(status_code=400, detail="Candidate limit must be between 1 and 5")

        eligibility: EligibilityResult = self.eligibility_service.get_eligible_interpreters(accessibility_visit_id)
        if not eligibility.candidates:
            raise HTTPException(status_code=409, detail="No eligible interpreters are available")

        selected = eligibility.candidates[:candidate_limit]
        requested_mode = eligibility.requested_mode or "EITHER"
        candidates_payload = [{"interpreter_id": candidate.interpreter_id} for candidate in selected]

        try:
            rpc_result = self.supabase.rpc(
                "create_interpreter_request_group",
                {
                    "p_accessibility_visit_id": str(accessibility_visit_id),
                    "p_requested_mode": requested_mode,
                    "p_candidate_limit": candidate_limit,
                    "p_candidates": candidates_payload,
                },
            ).execute()
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to create interpreter request group") from exc

        result = rpc_result.data
        if isinstance(result, list):
            result = result[0] if result else {}
        if not isinstance(result, dict) or not result.get("request_group_id"):
            raise HTTPException(status_code=503, detail="Interpreter request group returned an invalid result")

        return self._load_group(UUID(str(result["request_group_id"])))

    def _staff_hospital_id(self, current_user: UserIdentity) -> UUID:
        if current_user.role != "STAFF":
            raise HTTPException(status_code=403, detail="Staff access required")
        try:
            rows = (
                self.supabase.table("staff_profiles")
                .select("hospital_id")
                .eq("user_id", current_user.id)
                .eq("is_active", True)
                .limit(1)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to verify staff profile") from exc
        if not rows:
            raise HTTPException(status_code=403, detail="Staff profile is not registered in AccessibleCare")
        return UUID(str(rows[0]["hospital_id"]))

    def _verify_visit_hospital(self, accessibility_visit_id: UUID, hospital_id: UUID) -> None:
        try:
            visits = (
                self.supabase.table("accessibility_visits")
                .select("id, appointment_id")
                .eq("id", str(accessibility_visit_id))
                .limit(1)
                .execute()
                .data
                or []
            )
            if not visits:
                raise HTTPException(status_code=404, detail="Accessibility visit not found")

            appointments = (
                self.supabase.table("appointments")
                .select("id, hospital_id")
                .eq("id", str(visits[0]["appointment_id"]))
                .eq("hospital_id", str(hospital_id))
                .limit(1)
                .execute()
                .data
                or []
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to verify accessibility visit") from exc
        if not appointments:
            raise HTTPException(status_code=404, detail="Accessibility visit not found")

    def _load_group(self, group_id: UUID) -> InterpreterRequestGroupResult:
        try:
            groups = (
                self.supabase.table("interpreter_request_groups")
                .select("id, accessibility_visit_id, requested_mode, strategy, candidate_limit, status")
                .eq("id", str(group_id))
                .limit(1)
                .execute()
                .data
                or []
            )
            if not groups:
                raise HTTPException(status_code=404, detail="Interpreter request group not found")

            requests = (
                self.supabase.table("interpreter_requests")
                .select("id, interpreter_id, response_status, assignment_status, interpreter_profiles(display_name)")
                .eq("request_group_id", str(group_id))
                .order("requested_at")
                .execute()
                .data
                or []
            )
        except HTTPException:
            raise
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load interpreter request group") from exc

        summaries = tuple(
            InterpreterRequestSummary(
                request_id=str(row["id"]),
                interpreter_id=str(row["interpreter_id"]),
                display_name=str((row.get("interpreter_profiles") or {}).get("display_name") or ""),
                response_status=str(row["response_status"]),
                assignment_status=str(row["assignment_status"]),
            )
            for row in requests
        )
        group = groups[0]
        return InterpreterRequestGroupResult(
            request_group_id=str(group["id"]),
            accessibility_visit_id=str(group["accessibility_visit_id"]),
            requested_mode=str(group["requested_mode"]),
            strategy=str(group["strategy"]),
            candidate_limit=int(group["candidate_limit"]),
            status=str(group["status"]),
            requests=summaries,
        )
