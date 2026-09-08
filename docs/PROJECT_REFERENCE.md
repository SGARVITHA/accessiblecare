# Project Reference

## Overview
AccessibleCare is an accessible healthcare platform designed to empower patients with seamless assistance, appointment management, health records, and AI-driven accessibility orchestration.

## Core Architectural Layers
1. **Frontend**: React + TypeScript + Vite
2. **API Layer**: FastAPI
3. **Agent Layer**: LangGraph Accessibility Orchestrator + Gemini
4. **Tools Layer**: Supabase DB tools, RAG search, notification adapters
5. **Persistence**: Supabase (PostgreSQL + Auth + Storage)

## Architecture & Communication Boundaries
- The frontend interacts strictly with the FastAPI backend.
- The frontend does NOT directly control LangGraph, Gemini, or execute unrestricted Supabase database operations.
- The backend services manage business logic and orchestrate agent interactions safely.
