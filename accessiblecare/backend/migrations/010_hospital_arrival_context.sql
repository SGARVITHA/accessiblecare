-- ============================================================================== 
-- Migration: 010_hospital_arrival_context.sql
-- Description: Establishes an opaque hospital-arrival token for QR/deep-link context.
-- The token identifies the hospital context without exposing or trusting a client-
-- supplied hospital UUID. Patients do not manually choose hospital_id.
-- ============================================================================== 

ALTER TABLE public.hospitals
    ADD COLUMN IF NOT EXISTS arrival_context_token UUID NOT NULL DEFAULT gen_random_uuid();

CREATE UNIQUE INDEX IF NOT EXISTS idx_hospitals_arrival_context_token
    ON public.hospitals(arrival_context_token);

COMMENT ON COLUMN public.hospitals.arrival_context_token IS
    'Opaque token embedded in a hospital QR/deep link to establish arrival context for AccessibleCare visit intake.';
