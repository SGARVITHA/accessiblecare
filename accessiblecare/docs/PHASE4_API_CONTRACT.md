# AccessibleCare — Phase 4 Interpreter API Contract

**Status:** Phase 4 implemented
**Branch:** `clone1`
**Last Updated:** 2026-09-13

This document is the Phase 4 implementation addendum to `docs/API_CONTRACT.md`. It records the interpreter-orchestration endpoints that are now implemented and supersedes the older Phase 0-only endpoint status for these routes.

## Security boundary

All Phase 4 endpoints require a valid Supabase Bearer JWT. The backend resolves the authoritative application role from `public.profiles`; the frontend never supplies a role for authorization.

Interpreter identity is resolved from the authenticated user through `interpreter_profiles`. Staff hospital scope is resolved from the authenticated user through `staff_profiles`. Client-supplied interpreter IDs or hospital IDs are not trusted for authorization.

## Implemented endpoints

### Start interpreter coordination — staff

`POST /api/interpreters/staff/visits/{accessibility_visit_id}/requests`

Starts a bounded interpreter request group for an accessibility visit.

Rules:
- STAFF role required.
- Staff must have an active `staff_profiles` row.
- The accessibility visit's appointment must belong to the staff member's hospital.
- Eligibility is determined by the deterministic B3 service.
- At most 5 eligible candidates are selected.
- The request group strategy is `PARALLEL_TOP_N`.
- Individual requests begin as `response_status=PENDING` and `assignment_status=UNASSIGNED`.
- No interpreter is assigned by this endpoint.
- If an existing group for the visit is `PENDING` or `ACTIVE`, that active group is reused.
- An existing `OPEN` group is not reused; starting coordination after `OPEN` creates a new request group for a new coordination cycle.
- No AI ranking, notification, fallback, escalation, Realtime, RAG, LangGraph, Gemini, or video behavior is performed here.

### Interpreter response

`POST /api/interpreters/me/requests/{request_id}/accept`

`POST /api/interpreters/me/requests/{request_id}/decline`

Rules:
- INTERPRETER role required.
- The backend resolves the interpreter profile from the authenticated user.
- The request must belong to that interpreter.
- Only `response_status=PENDING` may transition to `ACCEPTED` or `DECLINED`.
- Responding does not assign the interpreter.

### Staff assignment

`POST /api/interpreters/staff/requests/{request_id}/assign`

Rules:
- STAFF role required.
- Staff hospital scope is enforced server-side.
- The selected request must have `response_status=ACCEPTED`.
- The selected request becomes `assignment_status=ASSIGNED`.
- Other requests in the same group become `NOT_SELECTED`.
- The request group becomes `CONFIRMED`.
- Assignment history remains on `interpreter_requests`.

### Interpreter cancellation

`POST /api/interpreters/me/assignments/{request_id}/cancel`

Rules:
- INTERPRETER role required.
- The backend resolves the interpreter profile from the authenticated user.
- The request must belong to that interpreter.
- Only `assignment_status=ASSIGNED` may be cancelled.
- The request becomes `CANCELLED`; assignment history is preserved.
- If the group is `CONFIRMED`, it reopens to `OPEN`.
- No automatic reassignment is performed.
- An audit-log entry is created with action `INTERPRETER_ASSIGNMENT_CANCELLED`.
- No fallback, notification, Realtime, event-outbox, escalation, AI, RAG, LangGraph, Gemini, or video behavior is performed here.

## Phase 4 state model

```text
B3 eligibility
    ↓
B4 staff starts coordination
    ↓
request group: PENDING
individual requests: PENDING / UNASSIGNED
    ↓
interpreters respond
    ├── ACCEPTED
    └── DECLINED
    ↓
staff selects an accepted request
    ↓
selected request: ASSIGNED
other requests: NOT_SELECTED
request group: CONFIRMED
    ↓
assigned interpreter may cancel
    ↓
request: CANCELLED
request group: OPEN
    ↓
B4 starts another coordination attempt
    ↓
new request group: PENDING
```

### Coordination-cycle semantics

One `interpreter_request_groups` row represents one interpreter-coordination cycle for an accessibility visit.

- `PENDING` and `ACTIVE` represent an in-progress cycle and are eligible for duplicate-request reuse.
- `CONFIRMED` represents a cycle with a human-approved assignment.
- `OPEN` represents a previously confirmed cycle that has been reopened after assignment cancellation. It is not reused for a later coordination attempt.
- A later B4 invocation after `OPEN` creates a new request group. Previous requests and their outcomes remain attached to the earlier group for audit/history.

Example:

```text
Cycle 1 / Group G1
 ├── Anitha → ASSIGNED → CANCELLED
 ├── Priya  → NOT_SELECTED
 └── G1     → OPEN

Cycle 2 / Group G2
 ├── newly selected eligible requests
 └── G2     → PENDING
```

`REQUEST` and `ASSIGNMENT` are deliberately separate concepts. There is no `assigned_interpreter_id` column on `accessibility_visits`.

## Explicit Phase 4 boundary

Phase 4 does not implement:
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

Those remain outside the Phase 4 implementation boundary.

## Verification status

Repository-level implementation and static contract checks are complete. Runtime Supabase/FastAPI end-to-end execution remains environment-dependent and is not claimed as passed without a live configured runtime.

The dedicated deterministic eligibility and request-initiation tests are included under `accessiblecare/backend/tests/`.
