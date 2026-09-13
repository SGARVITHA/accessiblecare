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
        self.operation = "select"
        self.payload = None
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

    def insert(self, payload):
        self.operation = "insert"
        self.payload = payload
        return self

    def delete(self):
        self.operation = "delete"
        return self

    def execute(self):
        rows = self.db.setdefault(self.table, [])

        def matches(row):
            for key, expected in self.filters:
                actual = str(row.get(key))
                if isinstance(expected, set):
                    if actual not in expected:
                        return False
                elif actual != expected:
                    return False
            return True

        matched = [row for row in rows if matches(row)]

        if self.operation == "insert":
            payload_rows = self.payload if isinstance(self.payload, list) else [self.payload]
            inserted = []
            for payload in payload_rows:
                row = dict(payload)
                if self.table == "interpreter_request_groups":
                    row.setdefault("id", GROUP_ID)
                elif self.table == "interpreter_requests":
                    row.setdefault("id", REQUEST_ID)
                rows.append(row)
                inserted.append(dict(row))
            return FakeResponse(inserted)

        if self.operation == "delete":
            self.db[self.table] = [row for row in rows if not matches(row)]
            return FakeResponse([])

        if self.order_key:
            matched.sort(key=lambda row: str(row.get(self.order_key) or ""))
        return FakeResponse([dict(row) for row in matched])


class FakeSupabase:
    def __init__(self, db):
        self.db = db

    def table(self, name):
        return FakeQuery(name, self.db)


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
        self.assertEqual(result.requests[0].interpreter_id, INTERPRETER_ID)
        self.assertEqual(result.requests[0].response_status, "PENDING")
        self.assertEqual(result.requests[0].assignment_status, "UNASSIGNED")

    def test_non_staff_cannot_start_request_group(self):
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_request_group_for_staff(PATIENT, VISIT_ID)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_staff_cannot_start_request_for_another_hospital(self):
        self.db["appointments"][0]["hospital_id"] = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_request_group_for_staff(STAFF, VISIT_ID)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_duplicate_active_group_is_reused(self):
        self.db["interpreter_request_groups"] = [
            {
                "id": GROUP_ID,
                "accessibility_visit_id": str(VISIT_ID),
                "requested_mode": "IN_PERSON",
                "strategy": "PARALLEL_TOP_N",
                "candidate_limit": 5,
                "status": "PENDING",
            }
        ]
        self.db["interpreter_requests"] = [
            {
                "id": REQUEST_ID,
                "request_group_id": GROUP_ID,
                "interpreter_id": INTERPRETER_ID,
                "response_status": "PENDING",
                "assignment_status": "UNASSIGNED",
            }
        ]

        result = self.service.create_request_group_for_staff(STAFF, VISIT_ID)
        self.assertEqual(result.request_group_id, GROUP_ID)
        self.assertEqual(len(self.db["interpreter_request_groups"]), 1)
        self.assertEqual(len(self.db["interpreter_requests"]), 1)

    def test_candidate_limit_is_bounded(self):
        with self.assertRaises(HTTPException) as ctx:
            self.service.create_request_group_for_staff(STAFF, VISIT_ID, candidate_limit=6)
        self.assertEqual(ctx.exception.status_code, 400)


if __name__ == "__main__":
    unittest.main()
