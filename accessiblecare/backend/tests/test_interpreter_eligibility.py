import unittest
from datetime import date, datetime, time, timezone

from app.services.interpreter_eligibility import (
    InterpreterCandidate,
    evaluate_candidate,
    evaluate_candidates,
)


START = datetime(2026, 9, 13, 10, 30, tzinfo=timezone.utc)
END = datetime(2026, 9, 13, 11, 0, tzinfo=timezone.utc)
BASE = dict(
    hospital_id="hospital-1",
    verification_status="VERIFIED",
    is_active=True,
    capabilities=("ISL",),
    availability_date=date(2026, 9, 13),
    availability_start=time(10, 0),
    availability_end=time(11, 30),
    availability_mode="IN_PERSON",
)


class InterpreterEligibilityTests(unittest.TestCase):
    def candidate(self, interpreter_id="i1", display_name="Anitha", **overrides):
        values = {**BASE, "interpreter_id": interpreter_id, "display_name": display_name}
        values.update(overrides)
        return InterpreterCandidate(**values)

    def test_matching_candidate_is_preferred_for_preferred_mode(self):
        result = evaluate_candidate(
            self.candidate(),
            hospital_id="hospital-1",
            required_capability="ISL",
            appointment_start=START,
            appointment_end=END,
            preferred_mode="IN_PERSON",
            remote_accepted=True,
        )
        self.assertTrue(result.eligible)
        self.assertEqual(result.classification, "PREFERRED")
        self.assertEqual(result.matched_mode, "IN_PERSON")

    def test_remote_can_be_fallback_when_in_person_is_preferred(self):
        result = evaluate_candidate(
            self.candidate(availability_mode="REMOTE"),
            hospital_id="hospital-1",
            required_capability="ISL",
            appointment_start=START,
            appointment_end=END,
            preferred_mode="IN_PERSON",
            remote_accepted=True,
        )
        self.assertTrue(result.eligible)
        self.assertEqual(result.classification, "FALLBACK")
        self.assertEqual(result.matched_mode, "REMOTE")

    def test_remote_is_ineligible_when_patient_does_not_accept_remote(self):
        result = evaluate_candidate(
            self.candidate(availability_mode="REMOTE"),
            hospital_id="hospital-1",
            required_capability="ISL",
            appointment_start=START,
            appointment_end=END,
            preferred_mode="IN_PERSON",
            remote_accepted=False,
        )
        self.assertFalse(result.eligible)
        self.assertIn("MODE_INCOMPATIBLE", result.reasons)

    def test_hard_filters_are_enforced(self):
        for override, reason in (
            ({"hospital_id": "hospital-2"}, "DIFFERENT_HOSPITAL"),
            ({"is_active": False}, "INTERPRETER_INACTIVE"),
            ({"verification_status": "PENDING"}, "INTERPRETER_NOT_VERIFIED"),
            ({"capabilities": ("ASL",)}, "CAPABILITY_NOT_SUPPORTED"),
            ({"availability_status": "UNAVAILABLE"}, "AVAILABILITY_NOT_AVAILABLE"),
            ({"availability_start": time(8, 0), "availability_end": time(10, 15)}, "NO_TIME_OVERLAP"),
        ):
            with self.subTest(reason=reason):
                result = evaluate_candidate(
                    self.candidate(**override),
                    hospital_id="hospital-1",
                    required_capability="ISL",
                    appointment_start=START,
                    appointment_end=END,
                    preferred_mode="IN_PERSON",
                    remote_accepted=True,
                )
                self.assertFalse(result.eligible)
                self.assertIn(reason, result.reasons)

    def test_candidates_are_deterministically_ordered_preferred_then_fallback_then_ineligible(self):
        results = evaluate_candidates(
            [
                self.candidate(interpreter_id="i3", display_name="Zara", availability_mode="REMOTE"),
                self.candidate(interpreter_id="i2", display_name="Bala"),
                self.candidate(interpreter_id="i1", display_name="Anitha"),
                self.candidate(interpreter_id="i4", display_name="Maya", hospital_id="hospital-2"),
            ],
            hospital_id="hospital-1",
            required_capability="ISL",
            appointment_start=START,
            appointment_end=END,
            preferred_mode="IN_PERSON",
            remote_accepted=True,
        )
        self.assertEqual([r.display_name for r in results], ["Anitha", "Bala", "Zara", "Maya"])
        self.assertEqual(results[-1].classification, "INELIGIBLE")

    def test_invalid_appointment_window_is_rejected(self):
        with self.assertRaises(ValueError):
            evaluate_candidates(
                [self.candidate()],
                hospital_id="hospital-1",
                required_capability="ISL",
                appointment_start=END,
                appointment_end=START,
                preferred_mode="IN_PERSON",
                remote_accepted=True,
            )


if __name__ == "__main__":
    unittest.main()
