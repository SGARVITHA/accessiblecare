# Data Access Security & Authorization Architecture

## 1. Executive Summary

AccessibleCare employs a defense-in-depth security model combining:
1. **Supabase Row Level Security (RLS)** to protect the PostgreSQL database against direct client access.
2. **Backend-Authoritative Authorization** in the FastAPI service layer for all application workflows.

Because the FastAPI backend communicates with Supabase using `SUPABASE_SERVICE_ROLE_KEY` to carry out authoritative multi-table orchestration and background agent operations, **the service-role client bypasses RLS by PostgreSQL design**.

Therefore, RLS alone does **NOT** provide authorization for backend requests. Backend authorization is strictly enforced within the application/service layer.

---

## 2. Two-Tier Security Model

```
Direct Client Access (Defense-in-Depth):
    Browser / Untrusted Client
        ↓
    Supabase PostgreSQL
        ↓
    [ Supabase Row Level Security (RLS) ]  <-- Hard perimeter guard

Application Business Access (Primary Operational Path):
    Browser / Frontend App
        ↓ (Bearer JWT)
    FastAPI Transport Layer (Authentication)
        ↓ (UserIdentity verified: ID, role from profiles)
    FastAPI Service Layer (Authorization & Scope Check)
        ↓ (Hospital-level, patient ownership, interpreter assignment check)
    Supabase Client (Authoritative Service-Role Execution)
        ↓
    Supabase PostgreSQL
```

---

## 3. Layer Responsibilities

### Layer 1: Supabase Row Level Security (RLS)
- **Target**: Direct client connections or potential token leakage to third parties.
- **Mechanism**: PostgreSQL RLS policies defined in `backend/migrations/003_rls_policies.sql`, `004_harden_rls_policies.sql`, and `005_finalize_rls_security.sql`.
- **Enforcement**:
  - All 19 application tables have RLS enabled (`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`).
  - Zero arbitrary `INSERT`/`UPDATE`/`DELETE` for authenticated users.
  - Recursion-free role lookup via `SECURITY DEFINER` helper functions (`get_auth_user_role()`, `get_auth_patient_id()`, `get_auth_staff_hospital_id()`, `get_auth_interpreter_id()`) with pinned `search_path = public, pg_temp`.
  - Sensitive audit logs and workflow coordinator tables have no client mutation policies.
  - Reference tables (`hospitals`, `departments`) are read-only to authenticated users.

### Layer 2: FastAPI Service-Layer Authorization
- **Target**: All application endpoints called by frontend clients.
- **Enforcement Principle**: **Never assume "Valid JWT == Access Granted"**.
  - **Authentication** (`get_current_user` in `app.core.auth`): Validates the Supabase JWT and retrieves the authoritative role and profile from `public.profiles`.
  - **Authorization** (`app.services.*`): The service layer must explicitly enforce data scoping:
    1. **Patient Ownership**: Ensure `patient_id == current_user.patient_id` when accessing patient preferences, appointments, check-ins, messages, or feedback.
    2. **Hospital Scoping for Staff**: Ensure `resource.hospital_id == current_user.hospital_id` to prevent cross-hospital data leakage.
    3. **Interpreter Scope**: Ensure `interpreter_id == current_user.interpreter_id` and that the interpreter is assigned to the requested visit before exposing appointment or video session details.
    4. **Audit Immutability**: All high-impact actions must record actor identity, action type, and target entity in `audit_logs` using the service-role client.

---

## 4. Crucial Security Invariants

1. **Frontend Role Selection is Untrusted**:
   - The frontend role selector is purely a navigation/UI convenience.
   - The backend resolves user role exclusively from `public.profiles` using the verified `auth.users.id`.
2. **Service-Role Key Remains Backend-Only**:
   - `SUPABASE_SERVICE_ROLE_KEY` must never be shared, bundled into the frontend, or committed to source control.
   - Frontend only uses `VITE_SUPABASE_ANON_KEY` for Supabase Auth session management.
3. **No Dynamic SQL**:
   - SQL queries generated dynamically by AI agents or untrusted input are strictly prohibited.
4. **Least-Privilege Helpers**:
   - `SECURITY DEFINER` functions in PostgreSQL are locked with explicit `SET search_path = public, pg_temp` to prevent schema search-path hijacking.
