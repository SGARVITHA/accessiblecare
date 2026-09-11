-- ==============================================================================
-- Migration: 006_appointment_requests.sql
-- Description: Appointment request lifecycle for the Phase 3 booking-request bridge.
-- Scope: patient request -> staff confirmation -> existing appointments table.
-- This migration does not alter the existing appointments/accessibility schema.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.appointment_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patient_profiles(id) ON DELETE CASCADE,
    hospital_id UUID NOT NULL REFERENCES public.hospitals(id) ON DELETE CASCADE,
    department_id UUID NOT NULL REFERENCES public.departments(id) ON DELETE RESTRICT,

    preferred_date DATE NOT NULL,
    preferred_time TIME,
    preferred_time_window TEXT,

    communication_preference TEXT NOT NULL,
    interpreter_required BOOLEAN NOT NULL DEFAULT false,
    preferred_interpreter_mode TEXT,
    remote_accepted BOOLEAN NOT NULL DEFAULT true,
    companion_present BOOLEAN NOT NULL DEFAULT false,
    companion_assists_communication BOOLEAN NOT NULL DEFAULT false,

    status TEXT NOT NULL DEFAULT 'PENDING',

    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT appointment_requests_status_check
        CHECK (status IN ('PENDING', 'CONFIRMED', 'REJECTED')),
    CONSTRAINT appointment_requests_time_preference_check
        CHECK (preferred_time IS NOT NULL OR preferred_time_window IS NOT NULL),
    CONSTRAINT appointment_requests_interpreter_mode_check
        CHECK (
            preferred_interpreter_mode IS NULL
            OR preferred_interpreter_mode IN ('IN_PERSON', 'REMOTE', 'EITHER')
        ),
    CONSTRAINT appointment_requests_review_check
        CHECK (
            (status = 'PENDING' AND appointment_id IS NULL AND reviewed_by IS NULL AND reviewed_at IS NULL)
            OR
            (status IN ('CONFIRMED', 'REJECTED'))
        )
);

CREATE INDEX IF NOT EXISTS idx_appointment_requests_patient
    ON public.appointment_requests(patient_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_requests_hospital_status
    ON public.appointment_requests(hospital_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_appointment_requests_department
    ON public.appointment_requests(department_id);

CREATE INDEX IF NOT EXISTS idx_appointment_requests_appointment
    ON public.appointment_requests(appointment_id);

ALTER TABLE public.appointment_requests ENABLE ROW LEVEL SECURITY;

-- Patients can read only their own requests.
CREATE POLICY appointment_requests_select_patient
    ON public.appointment_requests FOR SELECT
    TO authenticated
    USING (patient_id = public.get_auth_patient_id());

-- Staff can read only requests belonging to their hospital.
CREATE POLICY appointment_requests_select_staff
    ON public.appointment_requests FOR SELECT
    TO authenticated
    USING (
        public.get_auth_user_role() = 'STAFF'
        AND hospital_id = public.get_auth_staff_hospital_id()
    );

-- Patient inserts are ownership-scoped. The backend remains responsible for
-- deriving patient_id and hospital_id and performing all business validation.
CREATE POLICY appointment_requests_insert_patient
    ON public.appointment_requests FOR INSERT
    TO authenticated
    WITH CHECK (
        public.get_auth_user_role() = 'PATIENT'
        AND patient_id = public.get_auth_patient_id()
        AND hospital_id = (
            SELECT d.hospital_id
            FROM public.departments d
            WHERE d.id = department_id
        )
    );

-- No authenticated UPDATE/DELETE policies are intentionally provided.
-- Request lifecycle mutations are backend-controlled after authorization.
