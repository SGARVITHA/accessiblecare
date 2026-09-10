# Patient Appointment + Accessibility Vertical Slice

**Status:** Phase 2B implemented

## Scope

This slice covers only:

`PATIENT → existing appointment → appointment details → accessibility setup → accessibility visit → accessibility status`

Interpreter coordination, fallback, Realtime, Event Outbox, video, LangGraph, Gemini, RAG, and appointment booking are outside this slice.

## Endpoints

All endpoints below require the FastAPI Bearer JWT and resolve the patient from `patient_profiles.user_id` using the authenticated backend identity.

- `GET /api/patients/me/appointments`
- `GET /api/appointments/{appointment_id}`
- `GET /api/accessibility/profile`
- `PUT /api/accessibility/profile`
- `POST /api/appointments/{appointment_id}/accessibility`
- `POST /api/appointments/{appointment_id}/accessibility/confirm`
- `GET /api/appointments/{appointment_id}/accessibility/status`

The appointment path accepts either the internal appointment UUID or the hospital `external_id` (for example `A501`). The response never exposes another patient's appointment.

## Authorization

The backend derives `patient_id` from the authenticated user. Client-supplied patient IDs are not accepted as ownership inputs. Appointment reads and accessibility operations require the appointment to belong to that patient. Backend operations use the service-role Supabase client only after these checks.

## Accessibility state

A newly created `accessibility_visits` record is written with `CREATED`. The explicit confirmation operation moves only `CREATED → PREFERENCES_CONFIRMED`. Clients cannot submit an arbitrary accessibility status.

If no visit exists, the status endpoint returns:

```json
{"configured": false, "status": "NOT_CONFIGURED", "visit": null}
```

## Audit actions

The service creates backend-generated audit records for:

- `ACCESSIBILITY_PROFILE_CREATED`
- `ACCESSIBILITY_PROFILE_UPDATED`
- `ACCESSIBILITY_VISIT_CREATED`
- `ACCESSIBILITY_PREFERENCES_CONFIRMED`

## Schema boundary

`appointments` stores one `appointment_time`; it does not store an explicit start/end interval. This slice does not change that schema or invent a duration.

`accessibility_profiles` and `accessibility_visits` store the fields currently present in the database. UI-only fields that have no database column are not persisted by this slice.
