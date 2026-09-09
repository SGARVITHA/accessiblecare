# Architecture Decision Records (ADR)

## ADR 001: Architecture Boundary and Access Isolation
- **Context**: Ensuring patient safety, security, and strict boundary separation between UI, orchestrator, and data store.
- **Decision**: Frontend communicates solely with FastAPI endpoints. All LLM/orchestrator invocations (LangGraph, Gemini) and direct Supabase database operations are gated behind backend services and tools.
- **Status**: Accepted.

## ADR 002: Monorepo Structure
- **Context**: Single repository containing both frontend and backend for coherent coordination.
- **Decision**: Organize into `frontend/`, `backend/`, and `docs/` with explicit type and contract boundaries.
- **Status**: Accepted.

## ADR 003: Patient UI Boundary & Privacy Isolation
- **Context**: Patients must receive clear, reassuring outcomes of accessibility coordination without being overwhelmed by AI internal mechanics.
- **Decision**: The patient interface strictly presents accessibility actions and status. Internal orchestration details—such as LangGraph agent states, candidate interpreter pools, ranking scores, internal request group IDs, backend logs, and model confidence metrics—must NEVER be exposed to the patient UI.
- **Status**: Accepted.

## ADR 004: Centralized Mock Service Boundary
- **Context**: Decoupling frontend Patient UI development from backend API endpoint availability.
- **Decision**: The Patient UI consumes data exclusively through a single centralized service abstraction (`patientService.ts`) powered by canonical demo data (Patient Rohan / P1024). Individual components or screens must not create ad-hoc mock datasets.
- **Status**: Accepted.

## ADR 005: Visual Design & Framework Boundary (Stitch MCP Integration)
- **Context**: Translating external Stitch visual designs into the application codebase.
- **Decision**: Stitch MCP serves as the visual reference for layout, hierarchy, typography, color palettes, and spacing. Standalone Stitch HTML code or CDN dependencies are not imported directly; all designs are natively recreated using React + TypeScript + Vanilla CSS design tokens.
- **Status**: Accepted.

## ADR 006: High-Risk Clinical Communication Boundary
- **Context**: Distinguishing routine administrative hospital interactions from clinical conversations.
- **Decision**: The Quick Communication screen is scoped exclusively to routine reception, arrival, and wayfinding needs. High-risk medical discussions (diagnosis, procedures, informed consent) explicitly enforce human-in-the-loop qualified sign language interpreter support.
- **Status**: Accepted.

## ADR 007: Human Accountability in Agentic Workflows
- **Context**: Maintaining safety and clinical accountability in AI-assisted care coordination.
- **Decision**: LLM components perform reasoning and recommendation, FastAPI backend maintains canonical truth, and human staff/interpreters retain full accountability for clinical decisions and dispatch confirmations.
- **Status**: Accepted.
