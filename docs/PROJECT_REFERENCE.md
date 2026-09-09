# Project Reference — AccessibleCare

## Product Positioning & Mission
> "AccessibleCare is an agentic accessibility orchestration platform that coordinates a Deaf patient's communication needs across the hospital journey—from booking and check-in to interpreter support and follow-up—while keeping clinical decisions and high-risk communication under human control."

**Tagline**: *"Accessible communication, coordinated care."*

**Core Principle**:
- **LLM**: Reasoning & Orchestration
- **Backend**: Canonical Truth
- **Human**: Accountability & Clinical Safety

---

## Core Architectural Layers
1. **Frontend**: React 19 + TypeScript + Vite + Vanilla CSS
2. **API Layer**: Python + FastAPI (`/api/*`)
3. **Agent Layer**: LangGraph Accessibility Orchestrator + Gemini
4. **Tools Layer**: Supabase DB tools, RAG search (pgvector), notification adapters
5. **Persistence & Auth**: Supabase PostgreSQL + Supabase Auth + RLS Security

---

## Current Subsystem Status

### 1. Patient UI Experience — COMPLETE & LOCKED
- **Status**: Complete & Verified (`npm run build` PASS, `npm run lint` PASS).
- **Architecture**: React + TypeScript + Vanilla CSS design system.
- **Data Integration**: Driven by centralized `patientService.ts` and canonical demo mock data (`P1024` / Rohan).
- **Screens Implemented**:
  - Patient Dashboard (`/patient`)
  - Appointment Details (`/patient/appointments/:id`)
  - Accessibility Setup (`/patient/accessibility`)
  - Interpreter Status (`/patient/interpreter`)
  - Quick Communication (`/patient/communication`)

### 2. FastAPI Backend Endpoints — PENDING INTEGRATION
- Infrastructure established in `backend/app/api/`.
- Health endpoints (`/health`, `/health/supabase`) verified.
- FastAPI patient endpoints (`/api/patient/*`) to be connected in subsequent backend integration phase.

### 3. Staff & Interpreter Portals — PENDING
- Staff Dashboard (`/staff`) and Interpreter Portal (`/interpreter`) layouts and placeholder routes ready for implementation.

### 4. LangGraph / RAG / Event Infrastructure — PENDING
- Agent graphs, pgvector RAG, and real-time outbox event infrastructure to be implemented.

---

## Security & Architecture Boundaries
- **API Boundary**: Frontend communicates exclusively through `/api/*`. No direct client database manipulation or un-gated LLM invocations.
- **Privacy & Patient Boundary**: Patient UI presents accessibility outcomes and actions only; internal agent reasoning, matching scores, and orchestration mechanics remain strictly hidden.
- **Clinical Safety Boundary**: Routine administrative communication is handled via Quick Communication; all clinical discussions require qualified sign language interpreters.
- **Human Accountability**: All high-risk care decisions and interpreter dispatch confirmations require human-in-the-loop oversight.
