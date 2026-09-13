import unittest
from uuid import UUID

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.services.interpreter_requests import InterpreterRequestService
from app.services.interpreter_eligibility_service import EligibilityResult, EligibleInterpreter

STAFF_USER_ID = "11111111-1111-1111-1111-111111111111"
STAFF_HOSPITAL_ID = "22222222-2222-2222-2222-222222222222"
VISIT_ID = UUID("33333333-3333-3333-3333-333333333333")
GROUP_ID = "44444444-4444-4444-4444-444444444444"
REQUEST_ID = "55555555-5555-5555-5555-555555555555"
INTERPRETER_ID = "66666666-6666-6666-6666-666666666666"

STAFF = UserIdentity(id=STAFF_USER_ID, role="STAFF", full_name="Staff")
PATIENT = UserIdentity(id="77777777-7777-7777-7777-777777777777", role="PATIENT", full_name="Patient")


class FakeResponse:
    def __init__(self, data):
        self.data = data


class FakeQuery:
    def __init__(self, table, db):
        self.table = table
        self.db = db
        self.filters = []
        self.order_key = None

    def select(self, *_args):
        return self

    def eq(self, key, value):
        self.filters.append((key, str(value)))
        return self

    def in_(self, key, values):
        self.filters.append((key, {str(value) for value in values}))
        return self

    def limit(self, _value):
        return self

    def order(self, key):
        self.order_key = key
        return self

    def execute(self):
        rows = self.db.get(self.table, [])
        matched = []
        for row in rows:
            ok = True
            for key, expected in self.filters:
                actual = str(row.get(key))
                if isinstance(expected, set):
                    ok = actual in expected
                else:
                    ok = actual == expected
                if not ok:
                    break
            if ok:
                matched.append(dict(row))
        if self.order_key:
            matched.sort(key=lambda row: str(row.get(self.order_key) or ""))
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


class FakeEligibilityService:
    def __init__(self, candidates=None):
        self.candidates = tuple(candidates or [])

    def get_eligible_interpreters(self, accessibility_visit_id):
        return EligibilityResult(
            accessibility_visit_id=str(accessibility_visit_id),
            appointment_id="88888888-8888-8888-8888-888888888888",
            appointment_status="SCHEDULED",
            appointment_time="2026-09-13T10:00:00+00:00",
            requested_mode="IN_PERSON",
            remote_accepted=False,
            required_capability="ISL",
            candidates=self.candidates,
            exclusion_summary={},
        )


class InterpreterRequestServiceTests(unittest.TestCase):
    def setUp(self):
        self.db = {
            "staff_profiles": [
                {"id": "99999999-9999-9999-9999-999999999999", "user_id": STAFF_USER_ID, "hospital_id": STAFF_HOSPITAL_ID, "is_active": True}
            ],
            "accessibility_visits": [
                {"id": str(VISIT_ID), "appointment_id": "88888888-8888-8888-8888-888888888888"}
            ],
            "appointments": [
                {"id": "88888888-8888-8888-8888-888888888888", "hospital_id": STAFF_HOSPITAL_ID}
            ],
            "interpreter_request_groups": [],
            "interpreter_requests": [],
            "rpc_calls": [],
            "rpc_result": {"request_group_id": GROUP_ID, "created": True},
        }
        candidate = EligibleInterpreter(
            interpreter_id=INTERPRETER_ID,
            display_name="Anitha",
            classification="PREFERRED",
            matched_mode="IN_PERSON",
            capabilities=("ISL",),
            availability_date="2026-09-13",
            availability_start="09:45:00",
            availability_end="11:30:00",
            availability_mode="IN_PERSON",
        )
        self.db["interpreter_request_groups"] = [{
            "id": GROUP_ID,
            "accessibility_visit_id": str(VISIT_ID),
            "requested_mode": "IN_PERSON",
            "strategy": "PARALLEL_TOP_N",
            "candidate_limit": 5,
            "status": "PENDING",
        }]
        self.db["interpreter_requests"] = [{
            "id": REQUEST_ID,
            "request_group_id": GROUP_ID,
            "interpreter_id": INTERPRETER_ID,
            "response_status": "PENDING",
            "assignment_status": "UNASSIGNED",
            "requested_at": "2026-09-13T09:00:00+00:00",
            "interpreter_profiles": {"display_name": "Anitha"},
        }]
        self.service = InterpreterRequestService(
            FakeSupabase(self.db),
            FakeEligibilityService([candidate]),
        )

    def test_staff_can_start_bounded_request_group(self):
        result = self.service.create_request_group_for_staff(STAFF, VISIT_ID)
        self.assertEqual(result.strategy, "PARALLEL_TOP_N")
        self.assertEqual(result.candidate_limit, 5)
        self.assertEqual(result.status, "PENDING")
        self.assertEqual(len(result.requests), 1)
        self.assertEqual(self.db["rpc_calls"][0][0], "create_interpreter_request_group")
        self.assertEqual(self.db["rpc_calls"][0][1]["p_accessibility_visit_id"], str(VISIT_ID))
        self.assertEqual(self.db["rpc_calls"][0][1]["p_candidate_limit"], 5)
        self.assertEqual(self.db["rpc_calls"][0][1]["p_candidates"], [{"interpreter_id": INTERPRETER_ID}])

    def test_non_staff_cannot_start_request_group(self):
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_request_group_for_staff(PATIENT, VISIT_ID)
        self.assertEqual(ctx.exception.status_code, 403)
        self.assertEqual(self.db["rpc_calls"], [])

    def test_staff_cannot_start_request_for_another_hospital(self):
        self.db["appointments"][0]["hospital_id"] = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_request_group_for_staff(STAFF, VISIT_ID)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(self.db["rpc_calls"], [])

    def test_duplicate_active_group_is_reused_by_rpc(self):
        self.db["rpc_result"] = {"request_group_id": GROUP_ID, "created": False}
        result = self.service.create_request_group_for_staff(STAFF, VISIT_ID)
        self.assertEqual(result.request_group_id, GROUP_ID)
        self.assertEqual(len(self.db["rpc_calls"]), 1)

    def test_open_group_starts_new_coordination_cycle(self):
        self.db["interpreter_request_groups"][0]["status"] = "OPEN"
        self.db["rpc_result"] = {"request_group_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", "created": True}
        self.db["interpreter_request_groups"].append({
            "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "accessibility_visit_id": str(VISIT_ID),
            "requested_mode": "IN_PERSON",
            "strategy": "PARALLEL_TOP_N",
            "candidate_limit": 5,
            "status": "PENDING",
        })
        self.db["interpreter_requests"].append({
            "id": "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
            "request_group_id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
            "interpreter_id": INTERPRETER_ID,
            "response_status": "PENDING",
            "assignment_status": "UNASSIGNED",
            "requested_at": "2026-09-13T09:01:00+00:00",
            "interpreter_profiles": {"display_name": "Anitha"},
        })
        result = self.service.create_request_group_for_staff(STAFF, VISIT_ID)
        self.assertEqual(result.request_group_id, "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
        self.assertEqual(result.status, "PENDING")

    def test_candidate_limit_is_bounded(self):
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_request_group_for_staff(STAFF, VISIT_ID, candidate_limit=6)
        self.assertEqual(ctx.exception.status_code, 400)
        self.assertEqual(self.db["rpc_calls"], [])

    def test_rpc_failure_is_translated_to_service_unavailable(self):
        self.db["rpc_error"] = True
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_request_group_for_staff(STAFF, VISIT_ID)
        self.assertEqual(ctx.exception.status_code, 503)

    def test_invalid_rpc_response_is_rejected(self):
        self.db["rpc_result"] = "invalid"
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_request_group_for_staff(STAFF, VISIT_ID)
        self.assertEqual(ctx.exception.status_code, 503)


if __name__ == "__main__":
    unittest.main()
