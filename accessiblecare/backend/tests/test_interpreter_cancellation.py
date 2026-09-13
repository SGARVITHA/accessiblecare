import unittest
from uuid import UUID

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.services.interpreter_cancellation import InterpreterCancellationService

INTERPRETER_USER_ID = "11111111-1111-1111-1111-111111111111"
INTERPRETER_ID = "33333333-3333-3333-3333-333333333333"
REQUEST_ID = UUID("99999999-9999-9999-9999-999999999999")

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

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.filters.append((key, str(value)))
        return self

    def limit(self, _value):
        return self

    def execute(self):
        rows = self.db.get(self.table, [])
        matched = [
            dict(row)
            for row in rows
            if all(str(row.get(key)) == expected for key, expected in self.filters)
        ]
        return FakeResponse(matched)


class FakeRpcQuery:
    def __init__(self, db, name, payload):
        self.db = db
        self.name = name
        self.payload = payload

    def execute(self):
        self.db["rpc_calls"].append((self.name, self.payload))
        if self.db.get("rpc_error"):
            raise RuntimeError("rpc failed")
        return FakeResponse(self.db.get("rpc_result"))


class FakeSupabase:
    def __init__(self, db):
        self.db = db

    def table(self, name):
        return FakeQuery(name, self.db)

    def rpc(self, name, payload):
        return FakeRpcQuery(self.db, name, payload)


class InterpreterCancellationTests(unittest.TestCase):
    def setUp(self):
        self.db = {
            "interpreter_profiles": [
                {"id": INTERPRETER_ID, "user_id": INTERPRETER_USER_ID}
            ],
            "interpreter_requests": [
                {
                    "id": str(REQUEST_ID),
                    "request_group_id": "44444444-4444-4444-4444-444444444444",
                    "interpreter_id": INTERPRETER_ID,
                    "response_status": "ACCEPTED",
                    "assignment_status": "ASSIGNED",
                    "assigned_at": "2026-09-13T10:00:00+00:00",
                    "assigned_by": STAFF.id,
                }
            ],
            "rpc_calls": [],
            "rpc_result": {
                "request_id": str(REQUEST_ID),
                "request_group_id": "44444444-4444-4444-4444-444444444444",
                "accessibility_visit_id": "55555555-5555-5555-5555-555555555555",
                "appointment_id": "66666666-6666-6666-6666-666666666666",
                "interpreter_id": INTERPRETER_ID,
                "response_status": "ACCEPTED",
                "assignment_status": "CANCELLED",
                "group_status": "OPEN",
                "assigned_at": "2026-09-13T10:00:00+00:00",
                "assigned_by": STAFF.id,
            },
        }
        self.service = InterpreterCancellationService(FakeSupabase(self.db))

    def test_assigned_interpreter_can_cancel_own_assignment(self):
        result = self.service.cancel(INTERPRETER, REQUEST_ID)

        self.assertEqual(result["assignment_status"], "CANCELLED")
        self.assertEqual(result["group_status"], "OPEN")
        self.assertEqual(self.db["rpc_calls"][0][0], "cancel_interpreter_assignment")

    def test_patient_and_staff_are_rejected_before_rpc(self):
        for user in (PATIENT, STAFF):
            with self.subTest(role=user.role):
                with self.assertRaises(HTTPException) as ctx:
                    self.service.cancel(user, REQUEST_ID)
                self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(self.db["rpc_calls"], [])

    def test_missing_interpreter_profile_is_rejected(self):
        self.db["interpreter_profiles"] = []
        with self.assertRaises(HTTPException) as ctx:
            self.service.cancel(INTERPRETER, REQUEST_ID)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_another_interpreter_cannot_cancel_request(self):
        other = UserIdentity(id="99999999-9999-9999-9999-999999999998", role="INTERPRETER", full_name="Other")
        with self.assertRaises(HTTPException) as ctx:
            self.service.cancel(other, REQUEST_ID)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(self.db["rpc_calls"], [])

    def test_non_assigned_request_is_rejected_before_rpc(self):
        self.db["interpreter_requests"][0]["assignment_status"] = "UNASSIGNED"
        with self.assertRaises(HTTPException) as ctx:
            self.service.cancel(INTERPRETER, REQUEST_ID)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(self.db["rpc_calls"], [])

    def test_rpc_failure_is_translated_to_service_unavailable(self):
        self.db["rpc_error"] = True
        with self.assertRaises(HTTPException) as ctx:
            self.service.cancel(INTERPRETER, REQUEST_ID)
        self.assertEqual(ctx.exception.status_code, 503)

    def test_invalid_rpc_response_is_rejected(self):
        self.db["rpc_result"] = "invalid"
        with self.assertRaises(HTTPException) as ctx:
            self.service.cancel(INTERPRETER, REQUEST_ID)
        self.assertEqual(ctx.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
