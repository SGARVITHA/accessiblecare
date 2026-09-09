# Demo Flow — AccessibleCare

## Canonical Demo Profile & Context
- **Patient**: Rohan (MRN: `P1024`)
- **Appointment ID**: `A501`
- **Doctor**: Dr Sharma
- **Department**: ENT / Otolaryngology
- **Scheduled Time**: Today, 10:30 AM – 11:00 AM
- **Location**: Outpatient Block B, Room 204
- **Primary Language**: Indian Sign Language (ISL)
- **Preferred Mode**: In-person
- **Remote Fallback**: Accepted (VRI tablet active)
- **Assigned Interpreter**: Anitha Rajan (Certified Level 3 ISL Interpreter)

---

## Current Frontend Patient Demo Journey

1. **Authentication & Role Redirect**:
   - User logs in via `/login` as a Patient.
   - App automatically redirects to `/patient` (Patient Dashboard).

2. **Patient Dashboard (`/patient`)**:
   - Patient views next upcoming ENT consultation with Dr Sharma.
   - Patient observes confirmed ISL interpreter notice and active next action.

3. **Appointment Details (`/patient/appointments/A501`)**:
   - Patient clicks "View Details" to view visit schedule, room location, and arrival steps.
   - Patient triggers online check-in confirmation ("Confirm Arrival & Check In Now").

4. **Accessibility Setup (`/patient/accessibility`)**:
   - Patient opens Accessibility Setup to review or adjust preferences.
   - Patient verifies ISL as primary preference, in-person interpreter preference, VRI remote fallback toggle, and visual queue alert preferences.
   - Patient saves updated preferences.

5. **Interpreter Status (`/patient/interpreter`)**:
   - Patient checks assigned interpreter status card.
   - Patient confirms Anitha Rajan (ISL Level 3 Specialist) is assigned, arriving at Floor 2 Reception Desk by 10:15 AM, with VRI remote backup active.

6. **Quick Communication (`/patient/communication`)**:
   - Upon arriving at the hospital desk, patient uses pre-configured phrase cards (e.g., "Arrived at Reception", "Request Wayfinding", "Where is my Interpreter?").
   - Patient observes explicit clinical safety boundary reminding them that medical discussions will be conducted through their certified interpreter.

---

## Planned End-to-End Workflow (Future Phases)

When FastAPI backend endpoints, LangGraph orchestrator, and real-time outbox infrastructure are connected:

1. **Agentic Dispatch & Booking**:
   - Patient accessibility request triggers LangGraph matching agent to locate available certified ISL interpreters.
2. **Realtime Dispatch Outbox**:
   - Event outbox broadcasts confirmation event via Supabase Realtime to both patient UI and staff dashboard.
3. **Staff & Interpreter Portals**:
   - Reception staff monitors live arrival queue; interpreter accepts and confirms dispatch on Interpreter Mobile UI.
4. **Clinical Encounter**:
   - Qualified human interpreter facilitates clinical consultation; high-risk decisions verified by human clinician.
