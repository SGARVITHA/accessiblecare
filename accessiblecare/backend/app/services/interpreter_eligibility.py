"""Deterministic interpreter eligibility for Phase 4 orchestration.

This module performs only explicit eligibility checks. It does not rank
interpreters with AI and does not assign an interpreter.
"""

from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Literal


CandidateClass = Literal["PREFERRED", "FALLBACK", "INELIGIBLE"]


@dataclass(frozen=True)
class InterpreterCandidate:
    interpreter_id: str
    display_name: str
    hospital_id: str | None
    verification_status: str
    is_active: bool
    capabilities: tuple[str, ...]
    availability_date: date
    availability_start: time
    availability_end: time
    availability_mode: str
    availability_status: str = "AVAILABLE"


@dataclass(frozen=True)
class EligibilityResult:
    interpreter_id: str
    display_name: str
    classification: CandidateClass
    eligible: bool
    reasons: tuple[str, ...]
    matched_mode: str | None = None


def _normalise(value: str | None) -> str:
    return (value or "").strip().upper()


def _time_window(start: datetime, end: datetime) -> tuple[datetime, datetime]:
    if end <= start:
        raise ValueError("Appointment end must be after appointment start")
    return start, end


def _overlaps(
    appointment_start: datetime,
    appointment_end: datetime,
    availability_date: date,
    availability_start: time,
    availability_end: time,
) -> bool:
    if availability_end <= availability_start:
        return False
    slot_start = datetime.combine(availability_date, availability_start, tzinfo=appointment_start.tzinfo)
    slot_end = datetime.combine(availability_date, availability_end, tzinfo=appointment_start.tzinfo)
    return slot_start <= appointment_start and slot_end >= appointment_end


def _compatible_modes(
    preferred_mode: str | None,
    remote_accepted: bool,
    candidate_mode: str,
) -> tuple[bool, bool, str | None]:
    preferred = _normalise(preferred_mode)
    mode = _normalise(candidate_mode)

    if mode not in {"IN_PERSON", "REMOTE"}:
        return False, False, None

    if mode == "REMOTE" and not remote_accepted:
        return False, False, None

    if preferred == "IN_PERSON":
        if mode == "IN_PERSON":
            return True, True, mode
        if mode == "REMOTE" and remote_accepted:
            return True, False, mode
        return False, False, None

    if preferred == "REMOTE":
        return (mode == "REMOTE" and remote_accepted), False, mode if mode == "REMOTE" and remote_accepted else None

    if preferred == "EITHER" or not preferred:
        return True, False, mode

    return False, False, None


def evaluate_candidate(
    candidate: InterpreterCandidate,
    *,
    hospital_id: str,
    required_capability: str,
    appointment_start: datetime,
    appointment_end: datetime,
    preferred_mode: str | None,
    remote_accepted: bool,
) -> EligibilityResult:
    reasons: list[str] = []
    required = _normalise(required_capability)

    if candidate.hospital_id != hospital_id:
        reasons.append("DIFFERENT_HOSPITAL")
    if not candidate.is_active:
        reasons.append("INTERPRETER_INACTIVE")
    if _normalise(candidate.verification_status) != "VERIFIED":
        reasons.append("INTERPRETER_NOT_VERIFIED")
    if required not in {_normalise(value) for value in candidate.capabilities}:
        reasons.append("CAPABILITY_NOT_SUPPORTED")
    if candidate.availability_date != appointment_start.date():
        reasons.append("NO_DATE_OVERLAP")
    elif not _overlaps(
        appointment_start,
        appointment_end,
        candidate.availability_date,
        candidate.availability_start,
        candidate.availability_end,
    ):
        reasons.append("NO_TIME_OVERLAP")
    else:
        try:
            _, _, matched_mode = _compatible_modes(preferred_mode, remote_accepted, candidate.availability_mode)
            compatible, preferred, matched_mode = _compatible_modes(preferred_mode, remote_accepted, candidate.availability_mode)
        except Exception:
            compatible, preferred, matched_mode = False, False, None
        if not compatible:
            reasons.append("MODE_INCOMPATIBLE")
        elif preferred:
            return EligibilityResult(
                interpreter_id=candidate.interpreter_id,
                display_name=candidate.display_name,
                classification="PREFERRED",
                eligible=True,
                reasons=("ALL_HARD_FILTERS_PASSED",),
                matched_mode=matched_mode,
            )
        else:
            return EligibilityResult(
                interpreter_id=candidate.interpreter_id,
                display_name=candidate.display_name,
                classification="FALLBACK",
                eligible=True,
                reasons=("ALL_HARD_FILTERS_PASSED",),
                matched_mode=matched_mode,
            )

    return EligibilityResult(
        interpreter_id=candidate.interpreter_id,
        display_name=candidate.display_name,
        classification="INELIGIBLE",
        eligible=False,
        reasons=tuple(reasons),
    )


def evaluate_candidates(
    candidates: list[InterpreterCandidate],
    *,
    hospital_id: str,
    required_capability: str,
    appointment_start: datetime,
    appointment_end: datetime,
    preferred_mode: str | None,
    remote_accepted: bool,
) -> list[EligibilityResult]:
    """Evaluate all candidates without performing ranking or assignment."""
    _time_window(appointment_start, appointment_end)
    results = [
        evaluate_candidate(
            candidate,
            hospital_id=hospital_id,
            required_capability=required_capability,
            appointment_start=appointment_start,
            appointment_end=appointment_end,
            preferred_mode=preferred_mode,
            remote_accepted=remote_accepted,
        )
        for candidate in candidates
    ]
    return sorted(results, key=lambda result: (not result.eligible, result.classification != "PREFERRED", result.display_name))
