import unittest
from uuid import UUID

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.services.appointment_requests import AppointmentRequestService

PATIENT_USER_ID = "11111111-1111-1111-1111-111111111111"
PROFILE_HOSPITAL_ID = UUID("44444444-4444-4444-4444-444444444444")
DEPLOYMENT_HOSPITAL_ID = UUID("55555555-5555-5555-5555-555555555555")

PATIENT = UserIdentity(id=PATIENT_USER_ID, role="PATIENT", full_name="Demo Patient")


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, rows):
        self.rows = rows

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.rows = [row for row in self.rows if str(row.get(key)) == str(value)]
        return self

    def limit(self, _value):
        return self

    def execute(self):
        return FakeResponse(self.rows)


class FakeSupabase:
    def __init__(self, patient_profiles):
        self.patient_profiles = patient_profiles

    def table(self, name):
        if name == "patient_profiles":
            return FakeQuery(list(self.patient_profiles))
        raise AssertionError(f"Unexpected table: {name}")


class HospitalContextTests(unittest.TestCase):
    def test_existing_patient_hospital_takes_precedence(self):
        service = AppointmentRequestService(FakeSupabase([
            {"user_id": PATIENT_USER_ID, "hospital_id": str(PROFILE_HOSPITAL_ID)}
        ]))
        service.settings.ACCESSIBLECARE_HOSPITAL_ID = DEPLOYMENT_HOSPITAL_ID

        resolved = service._patient_hospital_id(PATIENT)

        self.assertEqual(resolved, PROFILE_HOSPITAL_ID)

    def test_unassociated_patient_uses_backend_deployment_context(self):
        service = AppointmentRequestService(FakeSupabase([
            {"user_id": PATIENT_USER_ID, "hospital_id": None}
        ]))
        service.settings.ACCESSIBLECARE_HOSPITAL_ID = DEPLOYMENT_HOSPITAL_ID

        resolved = service._patient_hospital_id(PATIENT)

        self.assertEqual(resolved, DEPLOYMENT_HOSPITAL_ID)

    def test_missing_patient_hospital_and_deployment_context_fails_closed(self):
        service = AppointmentRequestService(FakeSupabase([
            {"user_id": PATIENT_USER_ID, "hospital_id": None}
        ]))
        service.settings.ACCESSIBLECARE_HOSPITAL_ID = None

        with self.assertRaises(HTTPException) as ctx:
            service._patient_hospital_id(PATIENT)

        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(
            ctx.exception.detail,
            "Hospital context is not configured for this visit",
        )


if __name__ == "__main__":
    unittest.main()
