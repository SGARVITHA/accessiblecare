import unittest
from uuid import UUID

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.services.interpreter_cancellation import InterpreterCancellationService

INTERPRETER_USER_ID = "11111111-1111-1111-1111-111111111111"
OTHER_INTERPRETER_ID = "22222222-2222-2222-2222-222222222222"
INTERPRETER_ID = "33333333-3333-3333-3333-333333333333"
GROUP_ID = "44444444-4444-4444-4444-444444444444"
VISIT_ID = "55555555-5555-5555-5555-555555555555"
APPOINTMENT_ID = "66666666-6666-6666-6666-666666666666"

INTERPRETER = UserIdentity(id=INTERPRETER_USER_ID, role="INTERPRETER", full_name="Interpreter")
PATIENT = UserIdentity(id="77777777-7777-7777-7777-777777777777", role="PATIENT", full_name="Patient")
STAFF = UserIdentity(id="88888888-8888-8888-8888-888888888888", role="STAFF", full_name="Staff")


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table, db):
        self.table = table
        self.db = db
        self.filters = []
        self.operation = "select"
        self.payload = None

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.filters.append(("eq", key, str(value)))
        return self

    def limit(self, _value):
        return self

    def update(self, payload):
        self.operation = "update"
        self.payload = payload
        return self

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def execute(self):
        rows = self.db.setdefault(self.table, [])
        matched = [row for row in rows if all(str(row.get(key)) == value for op, key, value in self.filters if op == "eq")]

        if self.operation == "update":
            for row in matched:
                row.update(self.payload)
            return FakeResponse([dict(row) for row in matched])

        if self.operation == "insert":
            row = dict(self.payload)
            rows.append(row)
            return FakeResponse([dict(row)])

        return FakeResponse([dict(row) for row in matched])


class FakeSupabase:
    def __init__(self, db):
        self.db = db

    def table(self, name):
        return FakeQuery(name, self.db)


class InterpreterCancellationTests(unittest.TestCase):
    def setUp(self):
        self.db = {
            "interpreter_profiles": [
                {"id": INTERPRETER_ID, "user_id": INTERPRETER_USER_ID}
            ],
            "interpreter_requests": [
                {
                    "id": "99999999-9999-9999-9999-999999999999",
                    "request_group_id": GROUP_ID,
                    "interpreter_id": INTERPRETER_ID,
                    "response_status": "ACCEPTED",
                    "assignment_status": "ASSIGNED",
                    "assigned_at": "2026-09-13T10:00:00+00:00",
                    "assigned_by": STAFF.id,
                },
                {
                    "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                    "request_group_id": GROUP_ID,
                    "interpreter_id": OTHER_INTERPRETER_ID,
                    "response_status": "ACCEPTED",
                    "assignment_status": "NOT_SELECTED",
                },
            ],
            "interpreter_request_groups": [
                {
                    "id": GROUP_ID,
                    "accessibility_visit_id": VISIT_ID,
                    "status": "CONFIRMED",
                }
            ],
            "accessibility_visits": [
                {"id": VISIT_ID, "appointment_id": APPOINTMENT_ID}
            ],
            "appointments": [
                {"id": APPOINTMENT_ID, "hospital_id": "hospital-1"}
            ],
            "audit_logs": [],
        }
        self.request_id = UUID("99999999-9999-9999-9999-999999999999")
        self.service = InterpreterCancellationService(FakeSupabase(self.db))

    def test_assigned_interpreter_can_cancel_own_assignment(self):
        result = self.service.cancel(INTERPRETER, self.request_id)

        self.assertEqual(result["assignment_status"], "CANCELLED")
        self.assertEqual(result["group_status"], "OPEN")
        self.assertEqual(self.db["interpreter_requests"][0]["response_status"], "ACCEPTED")
        self.assertEqual(self.db["interpreter_requests"][0]["assigned_at"], "2026-09-13T10:00:00+00:00")
        self.assertEqual(self.db["interpreter_requests"][0]["assigned_by"], STAFF.id)

    def test_patient_and_staff_are_rejected(self):
        for user in (PATIENT, STAFF):
            with self.subTest(role=user.role):
                with self.assertRaises(HTTPException) as ctx:
                    self.service.cancel(user, self.request_id)
                self.assertEqual(ctx.exception.status_code, 403)

    def test_another_interpreter_cannot_cancel_request(self):
        with self.assertRaises(HTTPException) as ctx:
            self.service.cancel(
                UserIdentity(id="99999999-9999-9999-9999-999999999998", role="INTERPRETER"),
                self.request_id,
            )
        self.assertEqual(ctx.exception.status_code, 403)

    def test_non_assigned_request_cannot_be_cancelled(self):
        self.db["interpreter_requests"][0]["assignment_status"] = "UNASSIGNED"
        with self.assertRaises(HTTPException) as ctx:
            self.service.cancel(INTERPRETER, self.request_id)
        self.assertEqual(ctx.exception.status_code, 409)

    def test_cancellation_creates_audit_log(self):
        self.service.cancel(INTERPRETER, self.request_id)
        self.assertEqual(len(self.db["audit_logs"]), 1)
        audit = self.db["audit_logs"][0]
        self.assertEqual(audit["action"], "INTERPRETER_ASSIGNMENT_CANCELLED")
        self.assertEqual(audit["entity_type"], "interpreter_request")
        self.assertEqual(audit["entity_id"], str(self.request_id))
        self.assertEqual(audit["metadata"]["previous_assignment_status"], "ASSIGNED")
        self.assertEqual(audit["metadata"]["resulting_group_status"], "OPEN")

    def test_group_is_not_changed_from_non_confirmed_state(self):
        self.db["interpreter_request_groups"][0]["status"] = "OPEN"
        self.service.cancel(INTERPRETER, self.request_id)
        self.assertEqual(self.db["interpreter_request_groups"][0]["status"], "OPEN")


if __name__ == "__main__":
    unittest.main()
