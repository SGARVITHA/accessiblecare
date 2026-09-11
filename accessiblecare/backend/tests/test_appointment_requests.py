import unittest
from datetime import date, datetime, time
from uuid import UUID, uuid4

from fastapi import HTTPException

from app.core.auth import UserIdentity
from app.schemas.appointment_requests import (
    AppointmentRequestConfirm,
    AppointmentRequestCreate,
    AppointmentRequestReject,
)
from app.schemas.patient_workflow import CommunicationPreference, InterpreterMode
from app.services.appointment_requests import AppointmentRequestService


PATIENT_ID = UUID("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
PATIENT_USER_ID = "11111111-1111-1111-1111-111111111111"
STAFF_USER_ID = "22222222-2222-2222-2222-222222222222"
OTHER_STAFF_USER_ID = "33333333-3333-3333-3333-333333333333"
HOSPITAL_ID = UUID("44444444-4444-4444-4444-444444444444")
OTHER_HOSPITAL_ID = UUID("55555555-5555-5555-5555-555555555555")
DEPARTMENT_ID = UUID("66666666-6666-6666-6666-666666666666")
OTHER_DEPARTMENT_ID = UUID("77777777-7777-7777-7777-777777777777")
REQUEST_ID = UUID("88888888-8888-8888-8888-888888888888")
OTHER_REQUEST_ID = UUID("99999999-9999-9999-9999-999999999999")

PATIENT = UserIdentity(id=PATIENT_USER_ID, role="PATIENT", full_name="Demo Patient")
STAFF = UserIdentity(id=STAFF_USER_ID, role="STAFF", full_name="Hospital Staff")
OTHER_STAFF = UserIdentity(id=OTHER_STAFF_USER_ID, role="STAFF", full_name="Other Staff")


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


class FakeRpc:
    def __init__(self, db, params):
        self.db = db
        self.params = params

    def execute(self):
        request_id = self.params["p_request_id"]
        request_rows = [
            row for row in self.db.get("appointment_requests", [])
            if row["id"] == request_id
        ]
        if not request_rows:
            raise Exception("Appointment request not found")
        request = request_rows[0]
        if request["status"] != "PENDING":
            raise Exception("Only pending requests can be confirmed")

        department_rows = [
            row for row in self.db.get("departments", [])
            if row["id"] == self.params["p_department_id"]
        ]
        if not department_rows or department_rows[0]["hospital_id"] != HOSPITAL_ID.__str__():
            raise Exception("Department does not belong to staff hospital")

        appointment = {
            "id": str(uuid4()),
            "hospital_id": HOSPITAL_ID.__str__(),
            "patient_id": request["patient_id"],
            "department_id": self.params["p_department_id"],
            "doctor_name": self.params["p_doctor_name"],
            "appointment_time": self.params["p_appointment_time"],
            "status": "SCHEDULED",
            "source": "MANUAL",
        }
        self.db.setdefault("appointments", []).append(appointment)
        request.update({
            "status": "CONFIRMED",
            "appointment_id": appointment["id"],
            "reviewed_by": STAFF_USER_ID,
            "reviewed_at": datetime.now().isoformat(),
        })
        return FakeResponse({
            "request_id": request_id,
            "appointment_id": appointment["id"],
            "status": "CONFIRMED",
        })


class FakeSupabase:
    def __init__(self, db):
        self.db = db

    def table(self, name):
        return FakeQuery(name, self.db)

    def rpc(self, _name, params):
        return FakeRpc(self.db, params)


class AppointmentRequestTests(unittest.TestCase):
    def setUp(self):
        self.db = {
            "patient_profiles": [{"id": str(PATIENT_ID), "user_id": PATIENT_USER_ID}],
            "staff_profiles": [
                {"user_id": STAFF_USER_ID, "hospital_id": str(HOSPITAL_ID), "is_active": True},
                {"user_id": OTHER_STAFF_USER_ID, "hospital_id": str(OTHER_HOSPITAL_ID), "is_active": True},
            ],
            "departments": [
                {"id": str(DEPARTMENT_ID), "hospital_id": str(HOSPITAL_ID)},
                {"id": str(OTHER_DEPARTMENT_ID), "hospital_id": str(OTHER_HOSPITAL_ID)},
            ],
            "appointment_requests": [
                {
                    "id": str(REQUEST_ID),
                    "patient_id": str(PATIENT_ID),
                    "hospital_id": str(HOSPITAL_ID),
                    "department_id": str(DEPARTMENT_ID),
                    "preferred_date": "2026-09-20",
                    "preferred_time": "10:00:00",
                    "preferred_time_window": None,
                    "communication_preference": "ISL",
                    "interpreter_required": True,
                    "preferred_interpreter_mode": "EITHER",
                    "remote_accepted": True,
                    "companion_present": False,
                    "companion_assists_communication": False,
                    "status": "PENDING",
                    "appointment_id": None,
                    "reviewed_by": None,
                    "reviewed_at": None,
                    "created_at": "2026-09-10T10:00:00+00:00",
                    "updated_at": "2026-09-10T10:00:00+00:00",
                },
                {
                    "id": str(OTHER_REQUEST_ID),
                    "patient_id": str(PATIENT_ID),
                    "hospital_id": str(OTHER_HOSPITAL_ID),
                    "department_id": str(OTHER_DEPARTMENT_ID),
                    "preferred_date": "2026-09-21",
                    "preferred_time": "11:00:00",
                    "preferred_time_window": None,
                    "communication_preference": "TEXT",
                    "interpreter_required": False,
                    "preferred_interpreter_mode": None,
                    "remote_accepted": True,
                    "companion_present": False,
                    "companion_assists_communication": False,
                    "status": "PENDING",
                    "appointment_id": None,
                    "reviewed_by": None,
                    "reviewed_at": None,
                    "created_at": "2026-09-10T11:00:00+00:00",
                    "updated_at": "2026-09-10T11:00:00+00:00",
                },
            ],
            "appointments": [],
        }
        self.service = AppointmentRequestService(FakeSupabase(self.db))

    def _create_payload(self):
        return AppointmentRequestCreate(
            department_id=DEPARTMENT_ID,
            preferred_date=date(2026, 9, 20),
            preferred_time=time(10, 0),
            communication_preference=CommunicationPreference.ISL,
            interpreter_required=True,
            preferred_interpreter_mode=InterpreterMode.EITHER,
            remote_accepted=True,
            companion_present=True,
            companion_assists_communication=True,
        )

    def test_patient_creates_pending_request_without_client_hospital_id(self):
        created = self.service.create(PATIENT, self._create_payload())
        self.assertEqual(created["status"], "PENDING")
        self.assertEqual(created["patient_id"], str(PATIENT_ID))
        stored = self.db["appointment_requests"][-1]
        self.assertEqual(stored["hospital_id"], str(HOSPITAL_ID))
        self.assertTrue(stored["companion_assists_communication"])

    def test_patient_cannot_read_another_patient_request(self):
        other_patient = UserIdentity(
            id="aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
            role="PATIENT",
            full_name="Other Patient",
        )
        self.db["patient_profiles"].append({
            "id": str(uuid4()),
            "user_id": other_patient.id,
        })
        with self.assertRaises(HTTPException) as ctx:
            self.service.get_patient_request(other_patient, REQUEST_ID)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_staff_cannot_read_other_hospital_request(self):
        with self.assertRaises(HTTPException) as ctx:
            self.service.get_staff_request(STAFF, OTHER_REQUEST_ID)
        self.assertEqual(ctx.exception.status_code, 404)

    def test_staff_confirmation_creates_appointment_and_confirms_request(self):
        payload = AppointmentRequestConfirm(
            department_id=DEPARTMENT_ID,
            appointment_time=datetime(2026, 9, 20, 10, 30),
            doctor_name="Dr. Demo",
        )
        result = self.service.confirm(STAFF, REQUEST_ID, payload)
        self.assertEqual(result["status"], "CONFIRMED")
        self.assertEqual(len(self.db["appointments"]), 1)
        self.assertEqual(self.db["appointment_requests"][0]["status"], "CONFIRMED")
        self.assertEqual(
            self.db["appointment_requests"][0]["appointment_id"],
            self.db["appointments"][0]["id"],
        )

    def test_confirming_already_confirmed_request_is_rejected(self):
        payload = AppointmentRequestConfirm(
            department_id=DEPARTMENT_ID,
            appointment_time=datetime(2026, 9, 20, 10, 30),
        )
        self.service.confirm(STAFF, REQUEST_ID, payload)
        with self.assertRaises(HTTPException) as ctx:
            self.service.confirm(STAFF, REQUEST_ID, payload)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(len(self.db["appointments"]), 1)

    def test_staff_cannot_confirm_request_from_other_hospital(self):
        payload = AppointmentRequestConfirm(
            department_id=OTHER_DEPARTMENT_ID,
            appointment_time=datetime(2026, 9, 20, 10, 30),
        )
        with self.assertRaises(HTTPException) as ctx:
            self.service.confirm(STAFF, OTHER_REQUEST_ID, payload)
        self.assertEqual(ctx.exception.status_code, 404)
        self.assertEqual(len(self.db["appointments"]), 0)

    def test_patient_cannot_confirm_request(self):
        payload = AppointmentRequestConfirm(
            department_id=DEPARTMENT_ID,
            appointment_time=datetime(2026, 9, 20, 10, 30),
        )
        with self.assertRaises(HTTPException) as ctx:
            self.service.confirm(PATIENT, REQUEST_ID, payload)
        self.assertEqual(ctx.exception.status_code, 403)

    def test_rejected_request_cannot_be_confirmed(self):
        rejected = self.service.reject(STAFF, REQUEST_ID, AppointmentRequestReject())
        self.assertEqual(rejected["status"], "REJECTED")
        payload = AppointmentRequestConfirm(
            department_id=DEPARTMENT_ID,
            appointment_time=datetime(2026, 9, 20, 10, 30),
        )
        with self.assertRaises(HTTPException) as ctx:
            self.service.confirm(STAFF, REQUEST_ID, payload)
        self.assertEqual(ctx.exception.status_code, 409)
        self.assertEqual(len(self.db["appointments"]), 0)

    def test_invalid_request_schema_requires_time_or_window(self):
        with self.assertRaises(ValueError):
            AppointmentRequestCreate(
                department_id=DEPARTMENT_ID,
                preferred_date=date(2026, 9, 20),
                communication_preference=CommunicationPreference.ISL,
            )


if __name__ == "__main__":
    unittest.main()
