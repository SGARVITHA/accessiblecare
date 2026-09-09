# Backend Architecture & Development Conventions

## 1. Overview & Architecture Principles

AccessibleCare's backend is a modular, production-ready system powered by FastAPI, Supabase PostgreSQL, and Supabase Auth. It serves as the single authoritative source of truth for application business logic, access control, and orchestration between patients, staff, interpreters, and AI agents.

### Core Architectural Pillars
- **Authoritative Backend**: Authorization, state transitions, and business rules execute exclusively in FastAPI.
- **Strict Separation of Concerns**: Routes remain thin; business logic resides strictly in services; database interactions flow through controlled access points; agents operate strictly via bounded tools.
- **Security & Privacy**: Zero client-side access to database tables or service keys; strict secret isolation and sanitization in error handling and logging.
- **Deterministic AI Boundaries**: The Accessibility Orchestrator Agent assists and coordinates via LangGraph, but is strictly prohibited from direct database mutations, clinical decision-making, or bypassing human staff approvals.

---

## 2. Package Responsibilities

The backend codebase under `backend/app/` is partitioned into distinct packages with well-defined boundaries:

```
backend/app/
├── agents/    # LangGraph agent definitions, state graphs, and reasoning nodes
├── api/       # HTTP route endpoints, request dispatching, and response transport
├── core/      # Centralized configuration, authentication, Supabase client, shared infrastructure
├── models/    # Domain models and database table representations (when needed)
├── rag/       # Retrieval-Augmented Generation: policy indexing, vector store, document retrieval
├── schemas/   # Pydantic request, response, and validation schemas
├── services/  # Authoritative business and application domain logic
└── tools/     # Narrowly scoped, typed, auditable tools exposed to the agent
```

### Detailed Package Roles
- `app.api`: HTTP endpoints and transport handling only. Validates request parameters via Pydantic schemas, injects user identity via dependencies, invokes services, and returns formatted responses. Must contain no business logic.
- `app.schemas`: Pydantic models for request bodies, query parameters, and response payloads. Handles data serialization, deserialization, and structural validation. Agent internal states are kept decoupled from API schemas.
- `app.services`: The core business engine of AccessibleCare. Contains all business rules, orchestration routines, coordination logic, and data manipulation workflows.
- `app.models`: Domain models and table schemas. Used when explicit Pythonic representations of database entities or internal domain representations are required.
- `app.tools`: Typed, sandboxed functions exposed to the LangGraph Accessibility Orchestrator Agent. Each tool wraps a service or controlled data query with strict input/output validation.
- `app.agents`: The LangGraph state graphs, node transitions, conditional edges, and checkpointing logic for the Accessibility Orchestrator Agent.
- `app.rag`: Accessibility policy indexing, document retrieval, embedding generation, and vector search. Operates through its own service/tool boundary.
- `app.core`: Foundational infrastructure: settings management (`config.py`), Supabase client factory (`supabase.py`), authentication/authorization guards (`auth.py`), and shared utility functions.

---

## 3. Dependency Direction & Prohibited Paths

A clean unidirectional flow ensures modularity, testability, and security:

```
Client Requests:
    API (Routes)
        ↓
    Services (Business Logic)
        ↓
    Data Access & Infrastructure (Core / Supabase)

Agent Reasoning:
    Agent (LangGraph)
        ↓
    Tools (Sandboxed Operations)
        ↓
    Services & Data Access
```

### Dependency Rules:
1. **API Layer**: May depend on `schemas`, `services`, and `core` (e.g., auth dependencies). Must **not** perform direct database queries or instantiate external network clients directly.
2. **Services Layer**: May depend on `schemas`, `models`, `core` (Supabase client/config), and `rag`. Does **not** depend on `api` or `agents`.
3. **Agent Layer**: Defines LangGraph workflow nodes and state. May depend on `tools` and `schemas`. Must **never** access database clients or external APIs directly.
4. **Tools Layer**: May depend on `services`, `schemas`, and `rag`. Exposes typed interfaces to the agent.
5. **RAG Package**: Independently accessible through its own service/tool boundary without circular dependencies on `agents` or `api`.

### Strictly Prohibited Paths:
- ❌ **API Route → Direct Complex Database Logic**: Route handlers must delegate all domain logic and database transactions to services.
- ❌ **Agent → Direct Supabase Queries**: Agents must not query Supabase directly; all queries must go through declared, typed tools.
- ❌ **Agent → Arbitrary SQL**: The agent is strictly prohibited from generating or executing dynamic SQL against the database.
- ❌ **Frontend → Direct Database Operations**: The frontend must never perform direct Supabase application table queries; all data operations route through FastAPI.

---

## 4. API Route Patterns

Routes must be **thin transport controllers**. A route's responsibility is limited to:
1. Declaring HTTP path, method, status codes, and tags.
2. Specifying input parameters (path, query, body) validated via Pydantic schemas.
3. Authenticating and authorizing the caller using FastAPI `Depends()`.
4. Delegating to the relevant service method.
5. Returning the service result conforming to a Pydantic response schema.

### Route Blueprint Example:
```python
from fastapi import APIRouter, Depends, status
from app.core.auth import UserIdentity, get_current_user
from app.schemas.appointment import AppointmentCreate, AppointmentResponse
from app.services.appointment_service import create_appointment_service

router = APIRouter(prefix="/api/v1/appointments", tags=["appointments"])

@router.post("", response_model=AppointmentResponse, status_code=status.HTTP_201_CREATED)
async def create_appointment(
    payload: AppointmentCreate,
    current_user: UserIdentity = Depends(get_current_user),
):
    """Delegate appointment creation to the service layer."""
    return await create_appointment_service(payload=payload, user=current_user)
```

---

## 5. Pydantic Schema Conventions

- **Clear Categorization**: Separate schemas by domain entity under `app/schemas/` (e.g., `auth.py`, `patient.py`, `appointment.py`, `interpreter.py`).
- **Separation of API vs Agent State**:
  - API schemas (`...Request`, `...Response`, `...Filter`) handle public HTTP contracts.
  - Internal LangGraph agent state (`AgentState`, `ConversationState`) must remain separate in `app.agents` or internal schema modules. LangGraph state must not be forced to act as API contracts.
- **Validation**: Use Pydantic field validations (`Field(..., min_length=..., ge=...)`, `@field_validator`) to catch bad input at the system perimeter before reaching services.
- **Immutability & Safety**: Exclude database internal IDs or sensitive columns from creation/mutation schemas unless authorized.

---

## 6. Supabase Access Conventions

- **Centralized Client**: All Supabase interactions must utilize the centralized factory in `app.core.supabase` (`get_supabase_client()`).
- **No Multi-Client Fragmentation**: Never create ad-hoc, independently configured Supabase clients across modules.
- **Service-Role Key Isolation**: The backend uses `SUPABASE_SERVICE_ROLE_KEY` to perform authoritative, bypass-RLS operations where appropriate on behalf of verified users. This key must **never** be exposed to frontend code or logged.
- **Backend-Authoritative Access**: Every operation must verify the caller's role and ownership (e.g., ensuring a patient can only view their own appointments) within the backend service before executing queries.

---

## 7. Role of the Service Layer

Services house all business rules and orchestration workflows for AccessibleCare:
- Patient accessibility preference management
- Appointment lifecycle and booking rules
- Accessibility visit coordination
- Interpreter assignment and controlled parallel requests (`PARALLEL_TOP_N`)
- Human staff review and escalation gates
- Notification dispatching
- Audit event recording

*(Note: Business feature implementations are introduced in subsequent dedicated phases).*

---

## 8. Agent Boundary & Restrictions

The Accessibility Orchestrator Agent operates as an assistive coordinator using LangGraph, reasoning over context retrieved from tools.

### Allowed Agent Actions:
- Analyze patient accessibility requirements and matching criteria.
- Query approved clinic accessibility policies via RAG tools.
- Check interpreter eligibility and schedule availability via service-backed tools.
- Formulate proposed actions and dispatch human approval requests for staff review.

### Absolute Agent Restrictions:
The agent must **NOT**:
1. Execute arbitrary SQL or dynamic database statements.
2. Directly insert, update, or delete rows in database tables.
3. Invent, assume, or hallucinate availability or clinic capacities.
4. Bypass staff approval for any high-impact actions (e.g., confirmation, override, cancellation).
5. Perform clinical diagnoses, medical recommendations, or clinical decisions.
6. Modify or alter patient medical records.
7. Assign doctors or alter medical care teams.
8. Grant, approve, or forge patient consent.

---

## 9. Tool Boundary

Tools are the only bridge between the Accessibility Orchestrator Agent and application services:
- **Narrow Scope**: Each tool performs one specific, discrete action (e.g., `check_interpreter_availability`, `search_accessibility_policy`).
- **Strictly Typed**: Inputs and outputs must be strongly typed with Pydantic schemas or standard Python types.
- **Auditable**: Every tool invocation should log inputs and outputs (sanitized) to allow review of agent decisions.
- **Deterministic**: Tool execution must produce deterministic, reproducible outputs for given database states.
- **Authoritative Backing**: Tools must wrap authoritative application services; they never contain rogue SQL or bypass business logic.

---

## 10. Error-Handling Conventions

- **Consistent HTTP Exceptions**: Use FastAPI's `HTTPException` with clear status codes (`400 Bad Request`, `401 Unauthorized`, `403 Forbidden`, `404 Not Found`, `409 Conflict`, `422 Unprocessable Entity`).
- **Safe Error Messages**: Error details returned to clients must be user-friendly and actionable, without exposing:
  - Database schema details or SQL errors
  - Connection strings, credentials, or service keys
  - Internal server stack traces or framework internals
- **Sanitized Logging on Failure**: Exceptions must be caught and logged server-side with context, while returning sanitized messages to the caller.

---

## 11. Logging Conventions

- **Structured Output**: Log events with appropriate log levels (`DEBUG`, `INFO`, `WARNING`, `ERROR`, `CRITICAL`).
- **Contextual Fields**: Include operation identifiers, endpoint names, and user/request IDs where available.
- **Strict Secret Redaction**: The following must **NEVER** be printed or written to log files:
  - User passwords or credentials
  - Bearer tokens, refresh tokens, and JWTs
  - `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_ANON_KEY`
  - Third-party API keys (e.g., Google AI Studio, OpenAI)
  - Sensitive Protected Health Information (PHI) or Personally Identifiable Information (PII)

---

## 12. Configuration Conventions

- **Pydantic Settings**: All configuration is managed via `app.core.config.Settings` backed by `pydantic-settings`.
- **Environment Variable Driven**: All dynamic or sensitive settings (e.g., `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `CORS_ORIGINS`, `DATABASE_URL`) are read from environment variables or `.env`.
- **Zero Hardcoded Secrets**: No secret keys, credentials, or environment-specific URLs may be hardcoded into the source code.
- **Fail Fast**: If a critical configuration parameter is missing in production, the application must refuse startup or degrade gracefully with clear configuration errors.

---

## 13. Naming Conventions

Maintain consistency with standard Python and FastAPI idiomatic patterns:

| Entity | Convention | Example |
| :--- | :--- | :--- |
| **Files & Modules** | `snake_case.py` | `appointment_service.py`, `auth.py` |
| **Classes & Types** | `PascalCase` | `UserIdentity`, `AppointmentService` |
| **Functions & Methods** | `snake_case()` | `get_current_user()`, `verify_availability()` |
| **Constants & Enums** | `UPPER_SNAKE_CASE` | `PARALLEL_TOP_N`, `DEFAULT_PAGE_SIZE` |
| **API Route URLs** | Lowercase, hyphen-separated or plural nouns | `/api/v1/appointments`, `/api/auth/me` |
| **Pydantic Schemas** | `PascalCase` with intent suffix | `AppointmentCreate`, `ProfileResponse` |
| **Service Classes/Funcs** | `...Service` or `..._service()` | `AppointmentService`, `create_appointment()` |
| **Tools** | `snake_case` with verb/noun | `search_policy_docs`, `get_eligible_interpreters` |

---

## 14. Summary of Architecture Compliance

| Layer | Can Call | Cannot Call |
| :--- | :--- | :--- |
| **API** | `services`, `schemas`, `core` | Database directly, `agents` |
| **Services** | `core.supabase`, `models`, `schemas`, `rag` | `api`, `agents` |
| **Agents** | `tools`, `schemas` | `services` directly, `core.supabase` directly, arbitrary SQL |
| **Tools** | `services`, `rag`, `schemas` | `agents`, `api` |
| **RAG** | Embedding models, vector index | `agents`, `api` |
