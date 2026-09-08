-- ==============================================================================
-- Migration: 001_initial_schema.sql
-- Description: Initial AccessibleCare PostgreSQL Schema
-- Tables:
--   1. Identity: profiles, hospitals, departments, staff_profiles, patient_profiles, interpreter_profiles
--   2. Accessibility: accessibility_profiles, appointments, accessibility_visits, check_ins
--   3. Interpreter Coordination: interpreter_availability, interpreter_request_groups, interpreter_requests
--   4. Communication: communication_messages, notifications
--   5. Video: video_sessions
--   6. Exceptions / Audit: escalations, audit_logs, feedback
-- ==============================================================================

-- Enable UUID extension if not already available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. IDENTITY
-- ==============================================================================

-- Master user profile tied to Supabase auth.users
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hospital facilities
CREATE TABLE IF NOT EXISTS hospitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Hospital departments / wards
CREATE TABLE IF NOT EXISTS departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    location TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Staff profiles
CREATE TABLE IF NOT EXISTS staff_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    designation TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patient profiles
CREATE TABLE IF NOT EXISTS patient_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Interpreter profiles
CREATE TABLE IF NOT EXISTS interpreter_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    hospital_id UUID REFERENCES hospitals(id) ON DELETE SET NULL,
    display_name TEXT NOT NULL,
    verification_status TEXT NOT NULL DEFAULT 'PENDING',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 2. ACCESSIBILITY
-- ==============================================================================

-- Patient ongoing accessibility preferences
CREATE TABLE IF NOT EXISTS accessibility_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL UNIQUE REFERENCES patient_profiles(id) ON DELETE CASCADE,
    communication_preference TEXT NOT NULL,
    interpreter_required BOOLEAN NOT NULL DEFAULT false,
    preferred_interpreter_mode TEXT,
    remote_accepted BOOLEAN NOT NULL DEFAULT true,
    companion_preference TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Appointments scheduled
CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hospital_id UUID NOT NULL REFERENCES hospitals(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments(id) ON DELETE SET NULL,
    doctor_name TEXT,
    appointment_time TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL DEFAULT 'SCHEDULED',
    source TEXT NOT NULL DEFAULT 'MANUAL',
    external_id TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Specific accessibility requirements for a scheduled appointment visit
CREATE TABLE IF NOT EXISTS accessibility_visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    communication_preference TEXT NOT NULL,
    interpreter_required BOOLEAN NOT NULL DEFAULT false,
    preferred_mode TEXT,
    remote_accepted BOOLEAN NOT NULL DEFAULT true,
    companion_present BOOLEAN NOT NULL DEFAULT false,
    status TEXT NOT NULL DEFAULT 'PENDING',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Check-in events
CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CHECKED_IN',
    checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 3. INTERPRETER COORDINATION
-- ==============================================================================

-- Interpreter scheduled working hours / availability slots
CREATE TABLE IF NOT EXISTS interpreter_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interpreter_id UUID NOT NULL REFERENCES interpreter_profiles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    mode TEXT NOT NULL DEFAULT 'IN_PERSON',
    status TEXT NOT NULL DEFAULT 'AVAILABLE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Orchestration group coordinating candidate requests for an accessibility visit
CREATE TABLE IF NOT EXISTS interpreter_request_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    accessibility_visit_id UUID NOT NULL REFERENCES accessibility_visits(id) ON DELETE CASCADE,
    requested_mode TEXT NOT NULL,
    strategy TEXT NOT NULL DEFAULT 'BROADCAST',
    candidate_limit INT NOT NULL DEFAULT 5,
    status TEXT NOT NULL DEFAULT 'PENDING',
    approved_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
    approved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    closed_at TIMESTAMPTZ
);

-- Candidate requests sent to individual interpreters
CREATE TABLE IF NOT EXISTS interpreter_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    request_group_id UUID NOT NULL REFERENCES interpreter_request_groups(id) ON DELETE CASCADE,
    interpreter_id UUID NOT NULL REFERENCES interpreter_profiles(id) ON DELETE CASCADE,
    response_status TEXT NOT NULL DEFAULT 'PENDING',
    assignment_status TEXT NOT NULL DEFAULT 'UNASSIGNED',
    requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    responded_at TIMESTAMPTZ,
    assigned_at TIMESTAMPTZ,
    assigned_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- ==============================================================================
-- 4. COMMUNICATION
-- ==============================================================================

-- Patient/Staff/Interpreter communication messages
CREATE TABLE IF NOT EXISTS communication_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    receiver_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    message_type TEXT NOT NULL DEFAULT 'TEXT',
    status TEXT NOT NULL DEFAULT 'SENT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- User notifications
CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'UNREAD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    read_at TIMESTAMPTZ
);

-- ==============================================================================
-- 5. VIDEO
-- ==============================================================================

-- Video session integration
CREATE TABLE IF NOT EXISTS video_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interpreter_request_id UUID NOT NULL REFERENCES interpreter_requests(id) ON DELETE CASCADE,
    provider TEXT NOT NULL DEFAULT 'DAILY',
    meeting_url TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'READY', 'ACTIVE', 'ENDED', 'FAILED')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- 6. EXCEPTIONS / AUDIT
-- ==============================================================================

-- Escalations for delayed, missing, or rejected accommodations
CREATE TABLE IF NOT EXISTS escalations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    accessibility_visit_id UUID REFERENCES accessibility_visits(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    reason TEXT NOT NULL,
    priority TEXT NOT NULL DEFAULT 'MEDIUM',
    status TEXT NOT NULL DEFAULT 'OPEN',
    assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolution TEXT
);

-- Audit logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
    appointment_id UUID REFERENCES appointments(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id UUID,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Patient / Family feedback
CREATE TABLE IF NOT EXISTS feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES patient_profiles(id) ON DELETE CASCADE,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    category TEXT,
    comment TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ==============================================================================
-- INDEXES
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_appointments_patient_id ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_hospital_id ON appointments(hospital_id);
CREATE INDEX IF NOT EXISTS idx_appointments_appointment_time ON appointments(appointment_time);
CREATE INDEX IF NOT EXISTS idx_accessibility_visits_appointment_id ON accessibility_visits(appointment_id);
CREATE INDEX IF NOT EXISTS idx_interpreter_availability_interpreter_date ON interpreter_availability(interpreter_id, date);
CREATE INDEX IF NOT EXISTS idx_interpreter_requests_request_group ON interpreter_requests(request_group_id);
CREATE INDEX IF NOT EXISTS idx_interpreter_requests_interpreter ON interpreter_requests(interpreter_id);
CREATE INDEX IF NOT EXISTS idx_escalations_status ON escalations(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_audit_logs_appointment_id ON audit_logs(appointment_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_feedback_patient_appointment ON feedback(patient_id, appointment_id);
