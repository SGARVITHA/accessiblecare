# AccessibleCare

AccessibleCare is an AI-powered, accessible healthcare platform designed to assist patients and orchestrate care workflows seamlessly.

## Architecture

- **Frontend**: React + TypeScript + Vite
- **Backend**: FastAPI
- **Agent Orchestrator**: LangGraph + Gemini
- **Database & Auth**: Supabase
- **Knowledge & Retrieval**: RAG

```
Frontend (React + TS + Vite)
        ↓
FastAPI Backend
        ↓
Business Services
        ↓
Supabase

Agent Workflow:
FastAPI → Accessibility Orchestrator → LangGraph → Tools → Supabase / RAG / Notifications
```

## Project Structure

```
accessiblecare/
├── frontend/          # React + TypeScript + Vite web application
├── backend/           # FastAPI backend and LangGraph agent orchestrator
├── docs/              # Architectural docs, decisions, and API contracts
├── .gitignore
├── .env.example
└── README.md
```
