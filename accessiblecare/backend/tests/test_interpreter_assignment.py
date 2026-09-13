import unittest
from uuid import UUID

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.services.interpreter_assignment import InterpreterAssignmentService

STAFF_USER_ID = "11111111-1111-1111-1111-111111111111"
STAFF_ID = "99999999-9999-9999-9999-999999999999"
HOSPITAL_ID = "22222222-2222-2222-2222-222222222222"
OTHER_HOSPITAL_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
GROUP_ID = "44444444-4444-4444-4444-444444444444"
VISIT_ID = "33333333-3333-3333-3333-333333333333"
APPOINTMENT_ID = "88888888-8888-8888-8888-888888888888"
REQUEST_ID = UUID("55555555-5555-5555-5555-555555555555")
INTERPRETER_ID = "66666666-6666-6666-6666-666666666666"

STAFF = UserIdentity(id=STAFF_USER_ID, role="STAFF", full_name="Staff")
PATIENT = UserIdentity(
    id="77777777-7777-7777-7777-777777777777",
    role="PATIENT",
    full_name="Patient",
)


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table, db):
        self.table = table
        self.db = db
        self.filters = []
        self.operation = "select"

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.filters.append((key, str(value)))
        return self

    def limit(self, _value):
        return self

    def execute(self):
        rows = self.db.setdefault(self.table, [])
        matched = []
        for row in rows:
            if all(str(row.get(key)) == expected for key, expected in self.filters):
                matched.append(dict(row))
        return FakeResponse(matched)


class FakeRpc:
    def __init__(self, response):
        self.response = response
        self.calls = []

    def rpc(self, function_name, params):
        self.calls.append((function_name, params))
        return self

    def execute(self):
        return FakeResponse(self.response)


class FakeSupabase:
    def __init__(self, db, rpc_result):
        self.db = db
        self.rpc_client = FakeRpc(rpc_result)

    def table(self, name):
        return FakeQuery(name, self.db)

    def rpc(self, function_name, params):
        return self.rpc_client.rpc(function_name, params)


class FailingRpcSupabase(FakeSupabase):
    def rpc(self, function_name, params):
        self.rpc_client.calls.append((function_name, params))
        raise RuntimeError("database unavailable")


class InterpreterAssignmentServiceTests(unittest.TestCase):
    def setUp(self):
        self.db = {
            "staff_profiles": [
                {
                    "id": STAFF_ID,
                    "user_id": STAFF_USER_ID,
                    "hospital_id": HOSPITAL_ID,
                    "is_active": True,
                }
            ],
            "interpreter_requests": [
                {
                    "id": str(REQUEST_ID),
                    "request_group_id": GROUP_ID,
                    "interpreter_id": INTERPRETER_ID,
                    "response_status": "ACCEPTED",
                    "assignment_status": "UNASSIGNED",
                    "assigned_at": None,
                    "assigned_by": None,
                }
            ],
            "interpreter_request_groups": [
                {
                    "id": GROUP_ID,
                    "accessibility_visit_id": VISIT_ID,
                    "status": "PENDING",
                }
            ],
            "accessibility_visits": [
                {
                    "id": VISIT_ID,
                    "appointment_id": APPOINTMENT_ID,
                    "patient_id": PATIENT.id,
                }
            ],
            "appointments": [
                {
                    "id": APPOINTMENT_ID,
                    "hospital_id": HOSPITAL_ID,
                    "patient_id": PATIENT.id,
                    "status": "SCHEDULED",
                }
            ],
        }
        self.rpc_result = {
            "request_id": str(REQUEST_ID),
            "request_group_id": GROUP_ID,
            "accessibility_visit_id": VISIT_ID,
            "appointment_id": APPOINTMENT_ID,
            "interpreter_id": INTERPRETER_ID,
            "response_status": "ACCEPTED",
            "assignment_status": "ASSIGNED",
            "group_status": "CONFIRMED",
            "assigned_at": "2026-09-13T09:00:00+00:00",
            "assigned_by": STAFF_ID,
        }
        self.supabase = FakeSupabase(self.db, self.rpc_result)
        self.service = InterpreterAssignmentService(self.supabase)

    def test_staff_can_assign_accepted_request_through_rpc(self):
        result = self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(result["assignment_status"], "ASSIGNED")
        self.assertEqual(result["group_status"], "CONFIRMED")
        self.assertEqual(
            self.supabase.rpc_client.calls,
            [
                (
                    "assign_interpreter_request",
                    {"p_request_id": str(REQUEST_ID), "p_staff_id": STAFF_ID},
                )
            ],
        )

    def test_non_staff_cannot_assign(self):
        with self.assertRaises(HTTPException) as ctx:
            self.service.assign(PATIENT, REQUEST_ID)

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(self.supabase.rpc_client.calls, [])

    def test_unregistered_staff_profile_is_rejected(self):
        self.db["staff_profiles"] = []

        with self.assertRaises(HTTPException) as ctx:
            self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(self.supabase.rpc_client.calls, [])

    def test_cross_hospital_assignment_is_rejected(self):
        self.db["appointments"][0]["hospital_id"] = OTHER_HOSPITAL_ID

        with self.assertRaises(HTTPException) as ctx:
            self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(self.supabase.rpc_client.calls, [])

    def test_request_must_be_accepted_before_assignment(self):
        self.db["interpreter_requests"][0]["response_status"] = "PENDING"

        with self.assertRaises(HTTPException) as ctx:
            self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(self.supabase.rpc_client.calls, [])

    def test_confirmed_group_cannot_be_reassigned(self):
        self.db["interpreter_request_groups"][0]["status"] = "CONFIRMED"

        with self.assertRaises(HTTPException) as ctx:
            self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(self.supabase.rpc_client.calls, [])

    def test_already_assigned_request_is_idempotent(self):
        self.db["interpreter_requests"][0].update(
            {
                "assignment_status": "ASSIGNED",
                "assigned_at": "2026-09-13T09:00:00+00:00",
                "assigned_by": STAFF_ID,
            }
        )
        self.db["interpreter_request_groups"][0]["status"] = "CONFIRMED"

        result = self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(result["assignment_status"], "ASSIGNED")
        self.assertEqual(result["group_status"], "CONFIRMED")
        self.assertEqual(result["assigned_by"], STAFF_ID)
        self.assertEqual(self.supabase.rpc_client.calls, [])

    def test_non_unassigned_request_is_rejected(self):
        self.db["interpreter_requests"][0]["assignment_status"] = "NOT_SELECTED"

        with self.assertRaises(HTTPException) as ctx:
            self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(self.supabase.rpc_client.calls, [])

    def test_missing_request_is_rejected(self):
        self.db["interpreter_requests"] = []

        with self.assertRaises(HTTPException) as ctx:
            self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(self.supabase.rpc_client.calls, [])

    def test_rpc_failure_is_returned_as_service_unavailable(self):
        self.service = InterpreterAssignmentService(FailingRpcSupabase(self.db, self.rpc_result))

        with self.assertRaises(HTTPException) as ctx:
            self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(ctx.exception.status_code, 503)

    def test_invalid_rpc_result_is_rejected(self):
        self.service = InterpreterAssignmentService(self.supabase)
        self.supabase.rpc_client.response = "invalid"

        with self.assertRaises(HTTPException) as ctx:
            self.service.assign(STAFF, REQUEST_ID)

        self.assertEqual(ctx.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
