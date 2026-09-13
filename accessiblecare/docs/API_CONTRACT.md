# API Contract Specification

**Project**: AccessibleCare
**Status**: Phase 4 — Interpreter orchestration implemented
**Last Updated**: 2026-09-13

---

## Purpose

Defines the communication protocols and interface boundaries between the React frontend, FastAPI backend, Supabase, and the future agent layer.

This document records the implemented foundation and Phase 4 interpreter-orchestration APIs. Features not listed as implemented remain future work.

## Architecture Boundary

```text
Frontend (React + TypeScript + Vite)
        |
        | HTTP + Bearer JWT
        v
FastAPI Backend
        |
        +-- authentication / role resolution
        +-- API routes
        +-- domain services
        |
        v
Supabase (PostgreSQL + Auth + RLS)

LangGraph / Gemini / RAG  [FUTURE]
        |
        v
Typed backend tools/services
```

Explicit constraints:

- Frontend communicates with business APIs exclusively through FastAPI.
- Frontend does not access Supabase business tables directly.
- Frontend does not invoke LangGraph, Gemini, RAG, or orchestration agents directly.
- Supabase JS on the frontend is used only for authentication session management.
- Backend service-role access is never exposed to the frontend.

## Authentication Contract

Every protected endpoint requires `Authorization: Bearer <access_token>`.

The backend verifies the Supabase JWT and resolves the authoritative role from `public.profiles`. The frontend never supplies a role as an authorization input.

Allowed roles:

- `PATIENT`
- `STAFF`
- `INTERPRETER`

## Standard Error Format

```json
{
  "detail": "Human-readable error description"
}
```

| HTTP Status | Meaning |
|---|---|
| `401` | Missing, invalid, or expired authentication token |
| `403` | Authenticated but not authorized |
| `404` | Resource does not exist or is not visible to caller |
| `409` | Valid request conflicts with the current workflow state |
| `422` | Request validation failure |
| `500` | Unexpected backend error |
| `503` | Required backend/database dependency unavailable |

## Currently Implemented Endpoints

### Health

`GET /health` — basic application liveness.

`GET /health/supabase` — backend Supabase configuration/client health.

### Authentication

`GET /api/auth/me` — authenticated identity and authoritative role.

`GET /api/auth/me/role` — authenticated user's authoritative role.

### Phase 3 patient appointment-request workflow

The existing Phase 3 patient request and staff confirmation endpoints remain implemented and are not changed by Phase 4 interpreter orchestration.

### Phase 4 interpreter orchestration

#### 1. Start interpreter coordination — staff

`POST /api/interpreters/staff/visits/{accessibility_visit_id}/requests`

Starts a bounded interpreter request group from the deterministic B3 eligibility result.

Authorization and rules:

- `STAFF` role required.
- Active `staff_profiles` row is required.
- The accessibility visit's appointment must belong to the staff member's hospital.
- The backend derives hospital scope; the client cannot provide a trusted hospital ID.
- Candidate selection is deterministic and bounded to a maximum of five eligible interpreters.
- Request-group strategy is `PARALLEL_TOP_N`.
- New requests begin with `response_status=PENDING` and `assignment_status=UNASSIGNED`.
- This endpoint does not assign an interpreter.

#### 2. Interpreter response

`POST /api/interpreters/me/requests/{request_id}/accept`

`POST /api/interpreters/me/requests/{request_id}/decline`

Authorization and rules:

- `INTERPRETER` role required.
- Interpreter identity is resolved from the authenticated user through `interpreter_profiles`.
- The request must belong to that interpreter.
- Only `PENDING` response status may transition to `ACCEPTED` or `DECLINED`.
- Accepting a request does not assign the interpreter.

#### 3. Staff assignment

`POST /api/interpreters/staff/requests/{request_id}/assign`

Authorization and rules:

- `STAFF` role required.
- Staff hospital scope is enforced server-side.
- The selected request must have `response_status=ACCEPTED`.
- Selected request becomes `assignment_status=ASSIGNED`.
- Other requests in the same group become `NOT_SELECTED`.
- Request group becomes `CONFIRMED`.
- Assignment history remains on `interpreter_requests`; no `assigned_interpreter_id` is added to `accessibility_visits`.

#### 4. Interpreter assignment cancellation

`POST /api/interpreters/me/assignments/{request_id}/cancel`

Authorization and rules:

- `INTERPRETER` role required.
- Interpreter identity is resolved from the authenticated user through `interpreter_profiles`.
- The request must belong to that interpreter.
- Only `assignment_status=ASSIGNED` may be cancelled.
- The request becomes `CANCELLED` and its assignment history is preserved.
- A `CONFIRMED` request group reopens to `OPEN`.
- An already `OPEN` group remains `OPEN`.
- No automatic reassignment is performed.
- An audit log entry is created with action `INTERPRETER_ASSIGNMENT_CANCELLED`.

## Phase 4 Domain State Values

### Interpreter request group

| Value | Meaning |
|---|---|
| `PENDING` | Request group has been created and is awaiting interpreter responses |
| `OPEN` | Group is open for further coordination after cancellation/reopening |
| `CONFIRMED` | Staff has selected an accepted interpreter |
| `WAITING` | Reserved workflow state for future coordination behavior |
| `CANDIDATE_AVAILABLE` | Reserved workflow state for future coordination behavior |
| `NO_MATCH` | No suitable interpreter available |
| `ESCALATED` | Reserved for future escalation workflow |
| `CANCELLED` | Group cancelled |
| `COMPLETED` | Coordination completed |

### Individual interpreter request — `response_status`

- `PENDING` — request sent, awaiting response.
- `ACCEPTED` — interpreter accepted.
- `DECLINED` — interpreter declined.
- `EXPIRED` — response window expired.

### Individual interpreter request — `assignment_status`

- `UNASSIGNED` — not assigned.
- `ASSIGNED` — formally assigned to this interpreter.
- `NOT_SELECTED` — another accepted interpreter was selected.
- `CANCELLED` — assignment was cancelled by the assigned interpreter.

### Interpreter profile verification

- `PENDING`
- `VERIFIED`
- `REJECTED`

## Phase 4 Security Model

| Layer | Responsibility |
|---|---|
| Frontend route protection | Navigation only; not a security boundary |
| Backend JWT verification | Verifies authenticated Supabase identity |
| Backend role resolution | Reads authoritative role from `public.profiles` |
| Staff profile lookup | Derives active staff hospital scope |
| Interpreter profile lookup | Derives interpreter identity from authenticated user |
| Supabase RLS | Enforces database access boundaries for authenticated client connections |
| Backend service-role client | Performs authoritative backend mutations only |

## Phase 4 Boundary

Phase 4 intentionally does **not** implement:

- LangGraph orchestration
- Gemini/LLM reasoning
- RAG
- automatic fallback selection
- notifications
- Supabase Realtime
- event outbox/workers
- escalation automation
- video-session creation
- medical or clinical decisions

The principle remains:

> **LLM = reasoning. Backend = truth. Human = accountability.**

## MVP Boundary

AccessibleCare is an accessibility orchestration layer around the hospital visit. It does not replace the hospital/HIS for patient registration, doctor appointment scheduling, clinical decisions, consent, medical records, interpreter credentialing, or emergency medical automation.

## Future Endpoints

The following remain future work unless explicitly listed in the implemented section above:

### Patient API

- `GET /api/patients/me`
- `GET /api/patients/me/appointments`
- `GET /api/appointments/{appointment_id}`
- `PUT /api/accessibility/profile`
- `POST /api/appointments/{appointment_id}/accessibility`
- `GET /api/appointments/{appointment_id}/accessibility/status`
- `POST /api/appointments/{appointment_id}/check-in`
- `POST /api/walk-ins`

### Staff API

- `GET /api/staff/dashboard`
- `GET /api/staff/appointments/{appointment_id}`
- `GET /api/staff/interpreters`
- `GET /api/staff/escalations`
- `POST /api/staff/escalations/{escalation_id}/resolve`

### Interpreter API

- `GET /api/interpreters/me/requests`
- `GET /api/interpreters/me/requests/{request_id}`
- `GET /api/interpreters/me/availability`
- `POST /api/interpreters/me/availability`
- `PUT /api/interpreters/me/availability/{id}`
- `GET /api/interpreters/me/assignments`

### Communication / video / notification APIs

These remain future work:

- appointment message APIs
- video-session APIs
- notification APIs

### Internal agent API

- `POST /api/agent/accessibility/start`
- `POST /api/agent/accessibility/{visit_id}/resume`

The agent API remains backend-internal; the frontend does not call it directly.

## Migration Sequence

```text
001_initial_schema.sql
        ↓
002_fix_request_strategy.sql
        ↓
003_rls_policies.sql
        ↓
004_harden_rls_policies.sql
        ↓
005_finalize_rls_security.sql
        ↓
012_interpreter_capabilities.sql
```

`012_interpreter_capabilities.sql` adds the structured interpreter capability table used by deterministic eligibility.

## Verification Status

Phase 4 B1–B7 implementation is present on branch `clone1` and is covered by repository-level inspection plus dedicated deterministic eligibility/request/cancellation tests.

A live Supabase/FastAPI end-to-end run is environment-dependent and must not be represented as passed unless executed against a configured runtime.

Known implementation boundary: B6 and B7 perform multiple database mutations rather than a single database transaction. This remains a concurrency/atomicity hardening item and is not treated as a Phase 4 feature gap without a demonstrated failure case.
