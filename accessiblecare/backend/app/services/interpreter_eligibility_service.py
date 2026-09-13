"""Deterministic interpreter eligibility orchestration for Phase 4 B3.

This service starts from an accessibility visit and loads the authoritative
appointment, patient accessibility requirements, interpreter profiles,
capabilities, and availability needed by the deterministic eligibility
engine. It does not rank, assign, notify, or invoke AI.
"""

from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Any
from uuid import UUID

from fastapi import HTTPException

from app.core.supabase import get_supabase_client
from app.services.interpreter_eligibility import (
    EligibilityResult as RuleResult,
    InterpreterCandidate,
    evaluate_candidates,
)


# appointments currently store a point-in-time appointment_time rather than an
# end time/duration. Phase 4's deterministic MVP therefore uses the agreed
# 30-minute appointment window when evaluating availability overlap.
APPOINTMENT_WINDOW_MINUTES = 30


@dataclass(frozen=True)
class EligibleInterpreter:
    interpreter_id: str
    display_name: str
    classification: str
    matched_mode: str | None
    capabilities: tuple[str, ...]
    availability_date: str
    availability_start: str
    availability_end: str
    availability_mode: str


@dataclass(frozen=True)
class EligibilityResult:
    accessibility_visit_id: str
    appointment_id: str
    appointment_status: str
    appointment_time: str
    requested_mode: str | None
    remote_accepted: bool
    required_capability: str
    candidates: tuple[EligibleInterpreter, ...]
    exclusion_summary: dict[str, int]


class InterpreterEligibilityService:
    """Load visit context and return interpreters passing hard eligibility rules."""

    def __init__(self, supabase: Any | None = None) -> None:
        self.supabase = supabase or get_supabase_client()

    def _load_visit_context(self, accessibility_visit_id: UUID) -> dict[str, Any]:
        try:
            rows = (
                self.supabase.table("accessibility_visits")
                .select(
                    "id, appointment_id, patient_id, communication_preference, "
                    "interpreter_required, preferred_mode, remote_accepted, status"
                )
                .eq("id", str(accessibility_visit_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load accessibility visit") from exc

        if not rows:
            raise HTTPException(status_code=404, detail="Accessibility visit not found")
        return rows[0]

    def _load_appointment(self, appointment_id: UUID) -> dict[str, Any]:
        try:
            rows = (
                self.supabase.table("appointments")
                .select("id, hospital_id, patient_id, department_id, appointment_time, status")
                .eq("id", str(appointment_id))
                .limit(1)
                .execute()
                .data
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load appointment context") from exc

        if not rows:
            raise HTTPException(status_code=404, detail="Appointment linked to accessibility visit not found")
        return rows[0]

    def _load_interpreter_profiles(self) -> list[dict[str, Any]]:
        try:
            return (
                self.supabase.table("interpreter_profiles")
                .select("id, hospital_id, display_name, verification_status, is_active")
                .execute()
                .data
                or []
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load interpreter profiles") from exc

    def _load_capabilities(self, interpreter_ids: list[str]) -> list[dict[str, Any]]:
        if not interpreter_ids:
            return []
        try:
            return (
                self.supabase.table("interpreter_capabilities")
                .select("interpreter_id, capability, is_active")
                .in_("interpreter_id", interpreter_ids)
                .eq("is_active", True)
                .execute()
                .data
                or []
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load interpreter capabilities") from exc

    def _load_availability(self, interpreter_ids: list[str], appointment_time: datetime) -> list[dict[str, Any]]:
        if not interpreter_ids:
            return []
        try:
            return (
                self.supabase.table("interpreter_availability")
                .select("interpreter_id, date, start_time, end_time, mode, status")
                .in_("interpreter_id", interpreter_ids)
                .eq("date", appointment_time.date().isoformat())
                .execute()
                .data
                or []
            )
        except Exception as exc:
            raise HTTPException(status_code=503, detail="Unable to load interpreter availability") from exc

    @staticmethod
    def _parse_appointment_time(value: Any) -> datetime:
        if isinstance(value, datetime):
            return value
        try:
            return datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError as exc:
            raise HTTPException(status_code=503, detail="Appointment time is invalid") from exc

    @staticmethod
    def _normalise(value: Any) -> str:
        return str(value or "").strip().upper()

    @staticmethod
    def _build_candidates(
        profiles: list[dict[str, Any]],
        capabilities: list[dict[str, Any]],
        availability: list[dict[str, Any]],
    ) -> list[InterpreterCandidate]:
        capability_map: dict[str, list[str]] = {}
        for row in capabilities:
            interpreter_id = str(row["interpreter_id"])
            capability_map.setdefault(interpreter_id, []).append(str(row["capability"]))

        profiles_by_id = {str(row["id"]): row for row in profiles}
        candidates: list[InterpreterCandidate] = []

        for slot in availability:
            interpreter_id = str(slot["interpreter_id"])
            profile = profiles_by_id.get(interpreter_id)
            if profile is None:
                continue

            candidates.append(
                InterpreterCandidate(
                    interpreter_id=interpreter_id,
                    display_name=str(profile["display_name"]),
                    hospital_id=str(profile["hospital_id"]) if profile.get("hospital_id") else None,
                    verification_status=str(profile.get("verification_status") or ""),
                    is_active=bool(profile.get("is_active")),
                    capabilities=tuple(capability_map.get(interpreter_id, [])),
                    availability_date=datetime.fromisoformat(str(slot["date"])).date(),
                    availability_start=datetime.strptime(str(slot["start_time"]), "%H:%M:%S").time(),
                    availability_end=datetime.strptime(str(slot["end_time"]), "%H:%M:%S").time(),
                    availability_mode=str(slot.get("mode") or ""),
                    availability_status=str(slot.get("status") or ""),
                )
            )

        return candidates

    @staticmethod
    def _result_key(result: RuleResult) -> tuple[int, int, str]:
        return (
            0 if result.eligible else 1,
            0 if result.classification == "PREFERRED" else 1,
            result.display_name,
        )

    def get_eligible_interpreters(self, accessibility_visit_id: UUID) -> EligibilityResult:
        """Return only interpreters satisfying deterministic hard constraints."""
        visit = self._load_visit_context(accessibility_visit_id)
        appointment_id = UUID(str(visit["appointment_id"]))
        appointment = self._load_appointment(appointment_id)

        if str(appointment["patient_id"]) != str(visit["patient_id"]):
            raise HTTPException(status_code=409, detail="Accessibility visit patient does not match appointment")

        if not bool(visit["interpreter_required"]):
            return EligibilityResult(
                accessibility_visit_id=str(accessibility_visit_id),
                appointment_id=str(appointment_id),
                appointment_status=str(appointment["status"]),
                appointment_time=str(appointment["appointment_time"]),
                requested_mode=visit.get("preferred_mode"),
                remote_accepted=bool(visit["remote_accepted"]),
                required_capability=str(visit["communication_preference"]),
                candidates=(),
                exclusion_summary={"INTERPRETER_NOT_REQUIRED": 1},
            )

        appointment_time = self._parse_appointment_time(appointment["appointment_time"])
        appointment_end = appointment_time + timedelta(minutes=APPOINTMENT_WINDOW_MINUTES)
        profiles = self._load_interpreter_profiles()
        interpreter_ids = [str(row["id"]) for row in profiles]
        capabilities = self._load_capabilities(interpreter_ids)
        availability = self._load_availability(interpreter_ids, appointment_time)
        candidates = self._build_candidates(profiles, capabilities, availability)

        rule_results = evaluate_candidates(
            candidates,
            hospital_id=str(appointment["hospital_id"]),
            required_capability=str(visit["communication_preference"]),
            appointment_start=appointment_time,
            appointment_end=appointment_end,
            preferred_mode=visit.get("preferred_mode"),
            remote_accepted=bool(visit["remote_accepted"]),
        )

        # A single interpreter may have multiple availability slots. Keep one
        # deterministic result per interpreter, preserving the first eligible
        # slot selected by the already deterministic ordering.
        candidate_by_id: dict[str, list[InterpreterCandidate]] = {}
        for candidate in candidates:
            candidate_by_id.setdefault(candidate.interpreter_id, []).append(candidate)

        selected: dict[str, tuple[RuleResult, InterpreterCandidate]] = {}
        for result in sorted(rule_results, key=self._result_key):
            slots = candidate_by_id.get(result.interpreter_id, [])
            matching_slot = next(
                (slot for slot in slots if slot.availability_mode.upper() == (result.matched_mode or slot.availability_mode).upper()),
                slots[0] if slots else None,
            )
            if matching_slot is None or result.interpreter_id in selected:
                continue
            selected[result.interpreter_id] = (result, matching_slot)

        eligible = []
        exclusion_summary: dict[str, int] = {}
        for result, candidate in selected.values():
            if not result.eligible:
                for reason in result.reasons:
                    exclusion_summary[reason] = exclusion_summary.get(reason, 0) + 1
                continue
            eligible.append(
                EligibleInterpreter(
                    interpreter_id=result.interpreter_id,
                    display_name=result.display_name,
                    classification=result.classification,
                    matched_mode=result.matched_mode,
                    capabilities=candidate.capabilities,
                    availability_date=candidate.availability_date.isoformat(),
                    availability_start=candidate.availability_start.isoformat(),
                    availability_end=candidate.availability_end.isoformat(),
                    availability_mode=candidate.availability_mode,
                )
            )

        return EligibilityResult(
            accessibility_visit_id=str(accessibility_visit_id),
            appointment_id=str(appointment_id),
            appointment_status=str(appointment["status"]),
            appointment_time=appointment_time.isoformat(),
            requested_mode=visit.get("preferred_mode"),
            remote_accepted=bool(visit["remote_accepted"]),
            required_capability=str(visit["communication_preference"]),
            candidates=tuple(eligible),
            exclusion_summary=exclusion_summary,
        )
