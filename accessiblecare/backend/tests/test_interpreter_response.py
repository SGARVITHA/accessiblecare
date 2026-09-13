import unittest
from uuid import UUID

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.services.interpreter_response import InterpreterResponseService

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
        self.update_payload = None

    def select(self, *_args):
        return self

    def update(self, payload):
        self.update_payload = payload
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

        if self.update_payload is not None:
            if self.db.get("update_error"):
                raise RuntimeError("update failed")
            for row in matched:
                row.update(self.update_payload)
            return FakeResponse(matched)

        return FakeResponse(matched)


class FakeSupabase:
    def __init__(self, db):
        self.db = db

    def table(self, name):
        return FakeQuery(name, self.db)


class InterpreterResponseTests(unittest.TestCase):
    def setUp(self):
        self.db = {
            "interpreter_profiles": [
                {
                    "id": INTERPRETER_ID,
                    "user_id": INTERPRETER_USER_ID,
                    "is_active": True,
                    "verification_status": "VERIFIED",
                }
            ],
            "interpreter_requests": [
                {
                    "id": str(REQUEST_ID),
                    "interpreter_id": INTERPRETER_ID,
                    "response_status": "PENDING",
                    "assignment_status": "UNASSIGNED",
                    "responded_at": None,
                }
            ],
        }
        self.service = InterpreterResponseService(FakeSupabase(self.db))

    def test_interpreter_can_accept_pending_request(self):
        result = self.service.respond(INTERPRETER, REQUEST_ID, "ACCEPTED")

        self.assertEqual(result["request_id"], str(REQUEST_ID))
        self.assertEqual(result["interpreter_id"], INTERPRETER_ID)
        self.assertEqual(result["response_status"], "ACCEPTED")
        self.assertEqual(result["assignment_status"], "UNASSIGNED")
        self.assertIsNotNone(result["responded_at"])
        self.assertIn("+00:00", result["responded_at"])

    def test_interpreter_can_decline_pending_request(self):
        result = self.service.respond(INTERPRETER, REQUEST_ID, "DECLINED")

        self.assertEqual(result["response_status"], "DECLINED")
        self.assertEqual(result["assignment_status"], "UNASSIGNED")

    def test_patient_and_staff_are_rejected(self):
        for user in (PATIENT, STAFF):
            with self.subTest(role=user.role):
                with self.assertRaises(HTTPException) as ctx:
                    self.service.respond(user, REQUEST_ID, "ACCEPTED")
                self.assertEqual(ctx.exception.status_code, 403)

    def test_invalid_response_status_is_rejected(self):
        with self.assertRaises(HTTPException) as ctx:
            self.service.respond(INTERPRETER, REQUEST_ID, "ASSIGNED")
        self.assertEqual(ctx.exception.status_code, 400)

    def test_missing_interpreter_profile_is_rejected(self):
        self.db["interpreter_profiles"] = []

        with self.assertRaises(HTTPException) as ctx:
            self.service.respond(INTERPRETER, REQUEST_ID, "ACCEPTED")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_inactive_interpreter_is_rejected(self):
        self.db["interpreter_profiles"][0]["is_active"] = False

        with self.assertRaises(HTTPException) as ctx:
            self.service.respond(INTERPRETER, REQUEST_ID, "ACCEPTED")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_unverified_interpreter_is_rejected(self):
        self.db["interpreter_profiles"][0]["verification_status"] = "PENDING"

        with self.assertRaises(HTTPException) as ctx:
            self.service.respond(INTERPRETER, REQUEST_ID, "ACCEPTED")
        self.assertEqual(ctx.exception.status_code, 403)

    def test_another_interpreter_cannot_respond_to_request(self):
        other = UserIdentity(
            id="99999999-9999-9999-9999-999999999998",
            role="INTERPRETER",
            full_name="Other",
        )
        self.db["interpreter_profiles"].append(
            {
                "id": "33333333-3333-3333-3333-333333333334",
                "user_id": other.id,
                "is_active": True,
                "verification_status": "VERIFIED",
            }
        )

        with self.assertRaises(HTTPException) as ctx:
            self.service.respond(other, REQUEST_ID, "ACCEPTED")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_non_pending_request_is_rejected(self):
        self.db["interpreter_requests"][0]["response_status"] = "ACCEPTED"

        with self.assertRaises(HTTPException) as ctx:
            self.service.respond(INTERPRETER, REQUEST_ID, "DECLINED")
        self.assertEqual(ctx.exception.status_code, 409)

    def test_already_responded_request_cannot_be_changed(self):
        self.db["interpreter_requests"][0]["response_status"] = "DECLINED"

        with self.assertRaises(HTTPException) as ctx:
            self.service.respond(INTERPRETER, REQUEST_ID, "ACCEPTED")
        self.assertEqual(ctx.exception.status_code, 409)

    def test_missing_request_is_rejected(self):
        self.db["interpreter_requests"] = []

        with self.assertRaises(HTTPException) as ctx:
            self.service.respond(INTERPRETER, REQUEST_ID, "ACCEPTED")
        self.assertEqual(ctx.exception.status_code, 404)

    def test_update_failure_is_translated_to_service_unavailable(self):
        self.db["update_error"] = True

        with self.assertRaises(HTTPException) as ctx:
            self.service.respond(INTERPRETER, REQUEST_ID, "ACCEPTED")
        self.assertEqual(ctx.exception.status_code, 503)

    def test_response_does_not_assign_interpreter(self):
        result = self.service.respond(INTERPRETER, REQUEST_ID, "ACCEPTED")

        self.assertEqual(result["assignment_status"], "UNASSIGNED")
        self.assertEqual(self.db["interpreter_requests"][0]["assignment_status"], "UNASSIGNED")


if __name__ == "__main__":
    unittest.main()
