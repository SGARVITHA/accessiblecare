# AccessibleCare UI Implementation Guide

**Project:** AccessibleCare  
**Purpose:** Staff and Interpreter UI implementation  
**Status:** Implementation specification  
**Frontend:** React + TypeScript + Vite  
**Design source:** Stitch  
**Architecture source of truth:** Existing AccessibleCare repository

---
# AccessibleCare UI Implementation Guide

IMPORTANT:
This document is an implementation instruction, not the complete
system specification.

Before making ANY code changes, read the following documents
in this exact order:

1. PROJECT_REFERENCE.md
2. CURRENT_STATE.md
3. DECISIONS.md
4. BACKEND_ARCHITECTURE.md
5. API_CONTRACT.md
6. DATA_ACCESS_SECURITY.md
7. DEMO_FLOW.md
8. UI_IMPLEMENTATION_GUIDE.md
9. STAFF_UI_SPEC.md
10. INTERPRETER_UI_SPEC.md

These documents collectively define the existing AccessibleCare
system.


Do not rely on assumptions when these documents contain the answer.
Do not invent architecture that is not documented.
Do not replace existing architecture with generated Stitch code.
## 1. Purpose

This document defines the rules for implementing the Staff and Interpreter interfaces of AccessibleCare.

The implementation must extend the existing AccessibleCare frontend.

Do NOT create a separate application.

Do NOT replace the existing architecture with generated Stitch code.

Stitch is used as the visual/design reference.

The existing repository is the technical and architectural source of truth.

---

# 2. Product Context

AccessibleCare is an accessibility orchestration platform for Deaf patients across the hospital journey.

The system coordinates:

- patient accessibility preferences
- interpreter requirements
- interpreter availability
- interpreter requests
- staff approval
- interpreter assignment
- check-in accessibility
- routine communication
- remote interpretation sessions
- escalation
- feedback
- auditability

AccessibleCare is NOT:

- an AI sign-language translator
- a diagnostic system
- a medical-advice system
- a replacement for qualified interpreters
- an autonomous clinical decision system
- a replacement for the hospital HIS/EHR

Core principle:

> LLM = reasoning  
> Backend = truth  
> Human = accountability

---

# 3. Existing Frontend Architecture

The application is a single React + TypeScript + Vite application.

Role-based areas:

```text
/patient
/staff
/interpreter