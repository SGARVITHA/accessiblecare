-- ==============================================================================
-- Migration: 009_accessible_visit_request.sql
-- Description: Correct Phase 3 request semantics for patients already at hospital.
-- Scope: accessible visit intake -> staff appointment confirmation.
-- Patients do not choose appointment date/time; staff creates the actual appointment.
-- This migration does not alter the existing appointments/accessibility schema.
-- ==============================================================================

-- Phase 3 requests are visit-intake requests, not appointment bookings.
ALTER TABLE public.appointment_requests
    DROP CONSTRAINT IF EXISTS appointment_requests_time_preference_check;

ALTER TABLE public.appointment_requests
    ADD COLUMN IF NOT EXISTS reason_for_visit TEXT,
    ADD COLUMN IF NOT EXISTS accessibility_note TEXT;

-- Preserve any legacy rows while making the field mandatory for all new/current rows.
UPDATE public.appointment_requests
SET reason_for_visit = 'Not provided in legacy request'
WHERE reason_for_visit IS NULL OR btrim(reason_for_visit) = '';

ALTER TABLE public.appointment_requests
    ALTER COLUMN reason_for_visit SET NOT NULL;

ALTER TABLE public.appointment_requests
    DROP COLUMN IF EXISTS preferred_date,
    DROP COLUMN IF EXISTS preferred_time,
    DROP COLUMN IF EXISTS preferred_time_window;

COMMENT ON TABLE public.appointment_requests IS
    'Accessible visit requests submitted by patients at the hospital; staff supplies the actual appointment details during confirmation.';

COMMENT ON COLUMN public.appointment_requests.reason_for_visit IS
    'Patient-provided reason for requesting a doctor visit.';

COMMENT ON COLUMN public.appointment_requests.accessibility_note IS
    'Optional patient-provided accessibility instruction for hospital staff.';
