# Architecture Decision Records (ADR)

## ADR 001: Architecture Boundary and Access Isolation
- **Context**: Ensuring patient safety, security, and strict boundary separation between UI, orchestrator, and data store.
- **Decision**: Frontend communicates solely with FastAPI endpoints. All LLM/orchestrator invocations (LangGraph, Gemini) and direct Supabase database operations are gated behind backend services and tools.
- **Status**: Accepted.

## ADR 002: Monorepo Structure
- **Context**: Single repository containing both frontend and backend for coherent coordination.
- **Decision**: Organize into `frontend/`, `backend/`, and `docs/` with explicit type and contract boundaries.
- **Status**: Accepted.
