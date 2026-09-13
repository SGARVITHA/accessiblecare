-- ==============================================================================
-- Migration: 015_identity_mutation_hardening.sql
-- Description: Prevent authenticated clients from modifying authoritative
-- identity, tenancy, verification, and activation fields.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PROFILES
-- role is backend/admin controlled. Patients may still edit their own
-- presentation/contact fields through the Data API.
-- ------------------------------------------------------------------------------

REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
GRANT UPDATE (full_name, phone) ON TABLE public.profiles TO authenticated;

-- Keep the existing row-level self-update policy; column privileges now prevent
-- clients from changing profiles.role.

-- ------------------------------------------------------------------------------
-- 2. PATIENT PROFILES
-- hospital_id is tenancy authority and must not be client-controlled.
-- There are no other mutable patient_profile fields in the current schema, so
-- authenticated clients receive no UPDATE privilege on this table.
-- ------------------------------------------------------------------------------

REVOKE UPDATE ON TABLE public.patient_profiles FROM authenticated;

-- ------------------------------------------------------------------------------
-- 3. INTERPRETER PROFILES
-- Hospital affiliation, verification, and activation are authoritative and
-- backend/admin controlled. display_name remains client-editable for the
-- interpreter's own profile.
-- ------------------------------------------------------------------------------

REVOKE UPDATE ON TABLE public.interpreter_profiles FROM authenticated;
GRANT UPDATE (display_name) ON TABLE public.interpreter_profiles TO authenticated;

-- Existing row-level self-update policy remains in place, but column-level
-- privileges prevent modification of hospital_id, verification_status, and
-- is_active by authenticated clients.
