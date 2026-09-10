import unittest
from uuid import UUID, uuid4
from unittest.mock import patch

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.schemas.patient_workflow import AccessibilityProfileRequest, AccessibilityVisitRequest, CommunicationPreference, InterpreterMode
from app.services.patient_workflow import PatientWorkflowService


PATIENT_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
APPOINTMENT_ID = UUID("bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb")
OTHER_APPOINTMENT_ID = UUID("cccccccc-cccc-cccc-cccc-cccccccccccc")
VISIT_ID = UUID("dddddddd-dddd-dddd-dddd-dddddddddddd")
PROFILE_ID = UUID("eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee")

USER = UserIdentity(id="11111111-1111-1111-1111-111111111111", role="PATIENT", full_name="Demo Patient")


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table, db):
        self.table = table
        self.db = db
        self.filters = {}
        self.operation = "select"
        self.payload = None

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.filters[key] = str(value)
        return self

    def limit(self, _value):
        return self

    def order(self, *_args, **_kwargs):
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = payload
        return self

    def execute(self):
        rows = self.db.get(self.table, [])
        for key, value in self.filters.items():
            rows = [row for row in rows if str(row.get(key)) == value]

        if self.operation == "insert":
            row = dict(self.payload)
            row.setdefault("id", str(uuid4()))
            self.db.setdefault(self.table, []).append(row)
            return FakeResponse([row])

        if self.operation == "update":
            for row in rows:
                row.update(self.payload)
            return FakeResponse(rows)

        return FakeResponse(rows)


class FakeSupabase:
    def __init__(self, rows):
        self.db = rows

    def table(self, name):
        return FakeQuery(name, self.db)


class PatientWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.db = {
            "patient_profiles": [{"id": str(PATIENT_ID), "user_id": USER.id}],
            "appointments": [
                {
                    "id": str(APPOINTMENT_ID),
                    "external_id": "A501",
                    "patient_id": str(PATIENT_ID),
                    "hospital_id": str(uuid4()),
                    "department_id": str(uuid4()),
                    "doctor_name": "Dr. Sharma",
                    "appointment_time": "2026-09-11T10:30:00+05:30",
                    "status": "SCHEDULED",
                    "source": "MANUAL",
                    "hospitals": {"name": "Demo Hospital", "location": "Outpatient Block B"},
                    "departments": {"name": "ENT"},
                }
            ],
            "accessibility_profiles": [],
            "accessibility_visits": [],
            "audit_logs": [],
        }
        self.service = PatientWorkflowService(FakeSupabase(self.db))

    def test_patient_reads_only_own_appointments(self):
        rows = self.service.list_appointments(USER)
        self.assertEqual(len(rows), 1)
        self.assertEqual(rows[0]["external_id"], "A501")

    def test_other_patient_appointment_is_hidden(self):
        with self.assertRaises(HTTPException) as ctx:
            self.service.get_appointment(USER, str(OTHER_APPOINTMENT_ID))
        self.assertEqual(ctx.exception.status_code, 404)

    def test_profile_create_and_update_are_patient_owned(self):
        payload = AccessibilityProfileRequest(
            communication_preference=CommunicationPreference.ISL,
            interpreter_required=True,
            preferred_interpreter_mode=InterpreterMode.IN_PERSON,
            remote_accepted=True,
            companion_preference="PRESENT",
        )
        created = self.service.upsert_accessibility_profile(USER, payload)
        self.assertEqual(created["patient_id"], str(PATIENT_ID))
        updated = self.service.upsert_accessibility_profile(USER, payload.model_copy(update={"remote_accepted": False}))
        self.assertEqual(updated["remote_accepted"], False)
        self.assertEqual(len(self.db["audit_logs"]), 2)

    def test_accessibility_visit_happy_path_and_duplicate(self):
        payload = AccessibilityVisitRequest(
            communication_preference=CommunicationPreference.ISL,
            interpreter_required=True,
            preferred_mode=InterpreterMode.IN_PERSON,
            remote_accepted=True,
            companion_present=False,
        )
        created = self.service.create_accessibility_visit(USER, "A501", payload)
        self.assertEqual(created["status"], "CREATED")
        confirmed = self.service.confirm_accessibility_visit(USER, "A501")
        self.assertEqual(confirmed["status"], "PREFERENCES_CONFIRMED")
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_accessibility_visit(USER, "A501", payload)
        self.assertEqual(ctx.exception.status_code, 409)

    def test_invalid_values_are_rejected_by_schema(self):
        with self.assertRaises(ValueError):
            AccessibilityVisitRequest(communication_preference="INVALID")

    def test_other_patient_cannot_create_visit(self):
        payload = AccessibilityVisitRequest(communication_preference=CommunicationPreference.ISL)
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_accessibility_visit(USER, str(OTHER_APPOINTMENT_ID), payload)
        self.assertEqual(ctx.exception.status_code, 404)


if __name__ == "__main__":
    unittest.main()
