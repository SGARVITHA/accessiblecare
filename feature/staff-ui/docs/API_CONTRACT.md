# API Contract Specification

**Project**: AccessibleCare
**Status**: Phase 0 — Foundation Locked
**Last Updated**: 2026-09-08

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture Boundary](#architecture-boundary)
3. [Authentication Contract](#authentication-contract)
4. [Security Boundary Clarification](#security-boundary-clarification)
5. [Standard Error Format](#standard-error-format)
6. [Currently Implemented Endpoints](#currently-implemented-endpoints)
7. [Role Access Matrix](#role-access-matrix)
8. [Domain Status Values](#domain-status-values)
9. [MVP Boundary](#mvp-boundary)
10. [Future Endpoints (Not Yet Implemented)](#future-endpoints-not-yet-implemented)
11. [Migration Sequence](#migration-sequence)
12. [Current vs Future Summary](#current-vs-future-summary)

---

## Overview

Defines the communication protocols and interface boundaries between:

- **Frontend** (React + TypeScript + Vite) and the **Backend** (FastAPI)
- **Backend** and the **Agent layer** (LangGraph — future)

This document reflects **only the currently implemented and locked Phase 0 foundation**. Future endpoints are explicitly marked `[FUTURE — NOT IMPLEMENTED]`.

---

## Architecture Boundary

```
Frontend (React)
      |
      | HTTP + Bearer JWT
      ↓
FastAPI Backend
      |
      ├─ app/core/auth.py   (JWT verification + role resolution)
      ├─ app/api/           (route handlers)
      ├─ app/services/      (business logic — future)
      └─ app/tools/         (typed DB tools — future)
            |
            ↓
      Supabase (PostgreSQL + Auth + Storage)
```

```
LangGraph Agent  [FUTURE]
      |
      ↓
Typed Agent Tools  [FUTURE]
      |
      ↓
Services / Infrastructure
      |
      ↓
Supabase
```

**Explicit constraints:**

- The frontend communicates **exclusively** with the FastAPI backend via HTTP.
- The frontend does **not** directly access Supabase business data (`supabase.from(...)` calls for application tables are forbidden in frontend code).
- The frontend does **not** directly invoke LangGraph, Gemini, or any orchestration agent.
- The frontend uses the Supabase JS client **only** for authentication session management (`auth.signInWithPassword`, `auth.signOut`, `auth.getSession`, `auth.onAuthStateChange`).
- All LLM/orchestrator invocations and direct Supabase database operations are gated behind backend services.

---

## Authentication Contract

### Flow

```
Supabase Auth (signInWithPassword)
      ↓
Bearer access token (JWT)
      ↓
FastAPI — Authorization: Bearer <token>
      ↓
supabase.auth.get_user(token)  [backend verification]
      ↓
Verified auth.users identity (user ID)
      ↓
public.profiles lookup  [authoritative role resolution]
      ↓
Authorized API behavior
```

### Rules

- Every protected endpoint requires `Authorization: Bearer <access_token>` in the request header.
- The access token is obtained exclusively from the active **Supabase Auth session** on the frontend.
- The **role** is **always resolved from `public.profiles`** by the backend. The frontend must never send a role claim as an authorization input.
- The frontend must **never** include the `SUPABASE_SERVICE_ROLE_KEY` or any backend secret in a request.
- Token expiry is managed by Supabase Auth. Expired tokens produce a `401 Unauthorized` response.

### Frontend environment variables (public client config only)

| Variable | Purpose |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for Supabase Auth only |
| `VITE_API_BASE_URL` | FastAPI backend base URL |

`SUPABASE_SERVICE_ROLE_KEY` is a **backend-only** secret and must never appear in frontend code or environment.

---

## Security Boundary Clarification

| Layer | Responsibility | Is it a security boundary? |
|---|---|---|
| Frontend route protection (`ProtectedRoute`) | Navigation gate only — redirects unauthenticated or wrong-role users | ❌ No. Not a security boundary. |
| Backend JWT verification (`core/auth.py`) | Validates the Supabase JWT and verifies the user exists in `auth.users` | ✅ Yes. Primary security boundary. |
| Backend role resolution (`public.profiles`) | Derives the user's authoritative role from the database — never from client input | ✅ Yes. Authoritative role boundary. |
| Database RLS (migrations 003–005) | Row-level data access enforcement for authenticated client connections | ✅ Yes. Additional enforcement layer. |
| Backend service-role client | Bypasses RLS; used exclusively by backend for authoritative mutations | ✅ Yes. Backend-only. |

**The service-role client is never exposed to the frontend.**

---

## Standard Error Format

All FastAPI error responses use the following shape:

```json
{
  "detail": "Human-readable error description"
}
```

| HTTP Status | Meaning |
|---|---|
| `401 Unauthorized` | Missing, invalid, or expired Bearer token |
| `403 Forbidden` | Authenticated but not authorized for this action/resource |
| `404 Not Found` | Resource does not exist or is not visible to the caller |
| `422 Unprocessable Entity` | Request validation failure (FastAPI default for schema errors) |
| `500 Internal Server Error` | Unexpected backend error |

---

## Currently Implemented Endpoints

### Health Endpoints

These endpoints do not require authentication.

---

#### `GET /health`

**Purpose**: Basic application liveness check.

**Authentication**: None required.

**Response** `200 OK`:
```json
{
  "status": "ok"
}
```

---

#### `GET /health/supabase`

**Purpose**: Backend Supabase client configuration and initialization check. For operational/internal use.

**Authentication**: None required.

**Response** `200 OK` (configured):
```json
{
  "status": "configured",
  "supabase": "client_initialized"
}
```

**Response** `200 OK` (misconfigured):
```json
{
  "status": "unconfigured",
  "supabase": "missing_credentials"
}
```

**Response** `200 OK` (error):
```json
{
  "status": "error",
  "supabase": "connection_failed"
}
```

> Note: This endpoint always returns HTTP 200. The `status` field indicates the actual health state.

---

### Authentication Endpoints

Prefix: `/api/auth`

All endpoints in this group require a valid `Authorization: Bearer <access_token>` header.

---

#### `GET /api/auth/me`

**Purpose**: Retrieve the authenticated user's verified identity and role, as resolved by the backend from `public.profiles`.

**Authentication**: Required — `Authorization: Bearer <access_token>`

**Role requirement**: Any authenticated user (PATIENT, STAFF, INTERPRETER).

**Response** `200 OK`:
```json
{
  "id": "<uuid>",
  "role": "PATIENT | STAFF | INTERPRETER",
  "full_name": "<string or null>"
}
```

**Errors**:

| Status | Condition |
|---|---|
| `401` | Missing, invalid, or expired token |

> The frontend uses this endpoint during authentication initialization to obtain the backend-verified role. The role returned here is authoritative for all access-control decisions.

---

#### `GET /api/auth/me/role`

**Purpose**: Retrieve only the authenticated user's authoritative role.

**Authentication**: Required — `Authorization: Bearer <access_token>`

**Role requirement**: Any authenticated user.

**Response** `200 OK`:
```json
{
  "role": "PATIENT | STAFF | INTERPRETER"
}
```

**Errors**:

| Status | Condition |
|---|---|
| `401` | Missing, invalid, or expired token |

---

## Role Access Matrix

### Current (Phase 0 — Foundation)

Only authentication identity endpoints exist. No business data endpoints are implemented yet.

| Role | `GET /api/auth/me` | `GET /api/auth/me/role` | `GET /health` | `GET /health/supabase` |
|---|---|---|---|---|
| PATIENT | ✅ Own identity | ✅ Own role | ✅ | ✅ |
| STAFF | ✅ Own identity | ✅ Own role | ✅ | ✅ |
| INTERPRETER | ✅ Own identity | ✅ Own role | ✅ | ✅ |

### Planned Business Data Access (Phase 1+) — Summary

The following describes the **intended access scope** per role, consistent with RLS policies (migrations 003–005). These are **not yet enforced by API endpoints** but are pre-enforced at the database level.

| Resource | PATIENT | STAFF | INTERPRETER |
|---|---|---|---|
| Own profile | Read/update own | Read hospital-scoped users | Read own |
| Patient profiles | Own only | Hospital-scoped only | — |
| Appointments | Own only | Hospital-scoped | Assigned appointments only |
| Accessibility visits | Own only | Hospital-scoped | Via assigned requests |
| Interpreter profiles | — | Hospital-scoped only | Own only |
| Interpreter availability | — | Hospital-scoped only | Own (CRUD) |
| Interpreter requests | — | Hospital-scoped | Own only |
| Check-ins | Own only | Hospital-scoped | — |
| Communication messages | Participant | Hospital-scoped | — |
| Notifications | Own only | — | Own only |
| Video sessions | Via own accessibility visit (assigned) | Hospital-scoped | Assigned sessions only |
| Escalations | Own appointments only | Hospital-scoped (read) | — |
| Audit logs | — | Hospital-scoped (read only) | — |
| Feedback | Own only | Hospital-scoped (read) | — |

**Escalations are backend/agent-controlled workflow records.** No authenticated client INSERT or UPDATE is permitted via RLS. All escalation mutations are performed by the backend service-role layer after explicit authorization.

---

## Domain Status Values

These are **application domain status values representing planned workflow states**. They are used by backend business logic as those workflows are implemented. They are **not all currently enforced by database CHECK constraints** (only `video_sessions.status` has a DB-level CHECK constraint). Backend services will validate these values through domain logic.

### Accessibility Visit Status

| Value | Meaning |
|---|---|
| `CREATED` | Visit record created, preferences not yet confirmed |
| `PREFERENCES_CONFIRMED` | Patient accessibility preferences locked |
| `COORDINATING` | Interpreter coordination in progress |
| `INTERPRETER_CONFIRMED` | Interpreter assigned and confirmed |
| `CHECKED_IN` | Patient has checked in |
| `IN_SERVICE` | Accessibility service actively in progress |
| `COMPLETED` | Visit successfully completed |
| `CANCELLED` | Visit cancelled |
| `ESCALATED` | Escalation raised due to unresolved accommodation |
| `RESOLVED` | Escalation resolved |

### Interpreter Request Group Status

| Value | Meaning |
|---|---|
| `WAITING_FOR_STAFF_APPROVAL` | Pending staff approval to initiate search |
| `OPEN` | Search in progress, requests sent |
| `WAITING` | Awaiting interpreter responses |
| `CANDIDATE_AVAILABLE` | At least one interpreter accepted |
| `CONFIRMED` | Interpreter assigned and confirmed |
| `NO_MATCH` | No suitable interpreter found |
| `ESCALATED` | Escalated due to inability to fulfil request |
| `CANCELLED` | Request group cancelled |
| `COMPLETED` | Successfully fulfilled |

### Individual Interpreter Request Status (response_status)

| Value | Meaning |
|---|---|
| `PENDING` | Request sent, awaiting response |
| `ACCEPTED` | Interpreter accepted the request |
| `DECLINED` | Interpreter declined |
| `EXPIRED` | Response window expired |

### Assignment Status (interpreter_requests.assignment_status)

| Value | Meaning |
|---|---|
| `UNASSIGNED` | Not yet assigned (DB default: `UNASSIGNED`) |
| `ASSIGNED` | Formally assigned to this interpreter |
| `NOT_SELECTED` | Another interpreter was selected |
| `CANCELLED` | Assignment cancelled |

### Check-in Status

| Value | Meaning |
|---|---|
| `CHECKED_IN` | Patient has checked in (DB default) |
| `COMPLETED` | Check-in process completed |

### Video Session Status

*This is the only status column currently enforced by a database CHECK constraint.*

| Value | DB Enforced? | Meaning |
|---|---|---|
| `CREATED` | ✅ | Session record created |
| `READY` | ✅ | Session ready for participants |
| `ACTIVE` | ✅ | Session ongoing |
| `ENDED` | ✅ | Session ended |
| `FAILED` | ✅ | Session creation/connection failed |

### Escalation Status

| Value | Meaning |
|---|---|
| `OPEN` | Escalation raised, unresolved (DB default) |
| `ASSIGNED` | Assigned to a staff member |
| `IN_PROGRESS` | Being actively worked |
| `RESOLVED` | Successfully resolved |
| `DISMISSED` | Closed without resolution |

### Escalation Priority

| Value | Meaning |
|---|---|
| `LOW` | Low priority |
| `MEDIUM` | Medium priority (DB default) |
| `HIGH` | High priority — time-sensitive |
| `CRITICAL` | Critical — immediate action required |

### Communication Message Status

| Value | Meaning |
|---|---|
| `SENT` | Message sent (DB default) |
| `DELIVERED` | Message delivered to recipient |
| `READ` | Message read by recipient |

### Notification Status

| Value | Meaning |
|---|---|
| `UNREAD` | Not yet read by user (DB default) |
| `READ` | Read by user |

### Interpreter Verification Status

| Value | Meaning |
|---|---|
| `PENDING` | Awaiting verification (DB default) |
| `VERIFIED` | Verified and approved |
| `REJECTED` | Verification rejected |

### Appointment Source

| Value | Meaning |
|---|---|
| `MANUAL` | Manually entered (DB default) |
| `HIS_SYNC` | Imported from Hospital Information System |

---

## MVP Boundary

AccessibleCare is the **accessibility orchestration layer** around the hospital visit. It does **not** own and is **not responsible for**:

| Responsibility | Owner |
|---|---|
| Patient registration | Hospital / HIS |
| Doctor appointment creation and scheduling | Hospital / HIS |
| Department and clinical pathway management | Hospital / HIS |
| Clinical decisions and diagnosis | Hospital clinical staff |
| Consent management | Hospital / clinical system |
| Medical records | Hospital / HIS |
| Interpreter professional qualification and approval | Hospital / credentialing authority |
| Emergency medical automation | Hospital emergency systems |

AccessibleCare's scope:

- Capturing and managing **patient accessibility preferences** for a scheduled appointment
- Coordinating **interpreter identification and request** workflows (initiated by backend/agent on staff approval)
- Managing **check-in** for accessible visits
- Providing **communication** between patient, staff, and interpreter within a visit context
- Managing **video sessions** for remote interpretation
- Raising and tracking **escalations** for unfulfilled accessibility accommodations
- AI-assisted **accessibility orchestration** (LangGraph agent — future)

---

## Future Endpoints (Not Yet Implemented)

The following endpoints are planned for Phase 1 and beyond. **None of these are currently implemented.** They are documented here to establish intent and prevent duplication.

All endpoints below require `Authorization: Bearer <access_token>` unless otherwise noted.

---

### Patient API `[FUTURE — NOT IMPLEMENTED]`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/patients/me` | Get own patient profile |
| `GET` | `/api/patients/me/appointments` | List own appointments |
| `GET` | `/api/appointments/{appointment_id}` | Get a specific appointment |
| `PUT` | `/api/accessibility/profile` | Update standing accessibility preferences |
| `POST` | `/api/appointments/{appointment_id}/accessibility` | Confirm accessibility preferences for a visit |
| `GET` | `/api/appointments/{appointment_id}/accessibility/status` | Poll accessibility visit status |
| `POST` | `/api/appointments/{appointment_id}/check-in` | Submit self check-in |
| `POST` | `/api/walk-ins` | Register as a walk-in patient |

---

### Staff API `[FUTURE — NOT IMPLEMENTED]`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/staff/dashboard` | Staff operational dashboard data |
| `GET` | `/api/staff/appointments/{appointment_id}` | View appointment accessibility detail |
| `GET` | `/api/staff/interpreters` | List hospital-scoped interpreters |
| `POST` | `/api/accessibility/{visit_id}/interpreter/search` | Trigger interpreter search |
| `POST` | `/api/accessibility/{visit_id}/interpreter/request` | Issue interpreter request |
| `POST` | `/api/accessibility/{visit_id}/interpreter/assign` | Assign a confirmed interpreter |
| `GET` | `/api/staff/escalations` | List hospital-scoped escalations |
| `POST` | `/api/staff/escalations/{escalation_id}/resolve` | Resolve an escalation |

---

### Interpreter API `[FUTURE — NOT IMPLEMENTED]`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/interpreters/me/requests` | List own incoming requests |
| `GET` | `/api/interpreters/me/requests/{request_id}` | Get a specific request |
| `POST` | `/api/interpreters/me/requests/{request_id}/accept` | Accept an interpreter request |
| `POST` | `/api/interpreters/me/requests/{request_id}/decline` | Decline an interpreter request |
| `GET` | `/api/interpreters/me/availability` | List own availability slots |
| `POST` | `/api/interpreters/me/availability` | Add an availability slot |
| `PUT` | `/api/interpreters/me/availability/{id}` | Update an availability slot |
| `GET` | `/api/interpreters/me/assignments` | List own assignments |
| `POST` | `/api/interpreters/me/assignments/{request_id}/cancel` | Cancel an assignment |

---

### Communication API `[FUTURE — NOT IMPLEMENTED]`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/appointments/{appointment_id}/messages` | Retrieve messages for an appointment |
| `POST` | `/api/appointments/{appointment_id}/messages` | Send a message within an appointment |

---

### Video Session API `[FUTURE — NOT IMPLEMENTED]`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/accessibility/{visit_id}/video-session` | Create a video session for a visit |
| `GET` | `/api/accessibility/{visit_id}/video-session` | Get video session details |

---

### Notifications API `[FUTURE — NOT IMPLEMENTED]`

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/notifications` | List own notifications |
| `POST` | `/api/notifications/{id}/read` | Mark a notification as read |

---

### Internal Agent API `[FUTURE — NOT IMPLEMENTED]`

| Method | Path | Purpose |
|---|---|---|
| `POST` | `/api/agent/accessibility/start` | Trigger the LangGraph accessibility orchestration agent for a visit |
| `POST` | `/api/agent/accessibility/{visit_id}/resume` | Resume an in-progress orchestration |

> The agent API is an internal backend interface. Frontend does **not** call these directly.

---

## Migration Sequence

Migrations must be applied in order. Each migration is cumulative and depends on the previous ones.

```
001_initial_schema.sql          — All 19 application tables + indexes
        ↓
002_fix_request_strategy.sql    — Corrects interpreter_request_groups.strategy default
        ↓
003_rls_policies.sql            — Enables RLS on all 19 tables; establishes base policies
        ↓
004_harden_rls_policies.sql     — Hospital-scopes staff access; hardens interpreter/escalation policies
        ↓
005_finalize_rls_security.sql   — Removes OR hospital_id IS NULL; removes escalation client update
```

> **Important**: Migrations 003, 004, and 005 are interdependent. Applying 003 alone results in a less restrictive RLS posture. All five migrations must be applied in sequence to reach the final locked security state.

---

## Current vs Future Summary

### Currently Implemented (Phase 0 — Locked)

| Area | Status |
|---|---|
| `GET /health` | ✅ Implemented |
| `GET /health/supabase` | ✅ Implemented |
| `GET /api/auth/me` | ✅ Implemented |
| `GET /api/auth/me/role` | ✅ Implemented |
| Backend JWT verification | ✅ Implemented (`core/auth.py`) |
| Backend role resolution from `public.profiles` | ✅ Implemented |
| Frontend Supabase Auth integration | ✅ Implemented |
| Frontend centralized API client | ✅ Implemented (`lib/api.ts`) |
| Protected role-based frontend routes | ✅ Implemented (`ProtectedRoute`) |
| RLS on all 19 tables | ✅ Applied (migrations 003–005) |
| Database schema (19 tables) | ✅ Applied (migrations 001–002) |

### Not Yet Implemented (Phase 1+)

| Area | Status |
|---|---|
| Patient appointment/accessibility APIs | 🔲 Future |
| Staff coordination APIs | 🔲 Future |
| Interpreter workflow APIs | 🔲 Future |
| Communication (messages) APIs | 🔲 Future |
| Video session APIs | 🔲 Future |
| Notification APIs | 🔲 Future |
| LangGraph accessibility orchestration agent | 🔲 Future |
| RAG / document search APIs | 🔲 Future |
| Feedback APIs | 🔲 Future |
