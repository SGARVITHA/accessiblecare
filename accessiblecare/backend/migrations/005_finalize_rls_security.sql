-- ==============================================================================
-- Migration: 005_finalize_rls_security.sql
-- Description: Finalize Supabase RLS Policy Hardening
-- - Removes `OR pp.hospital_id IS NULL` to enforce strict staff hospital scoping
-- - Removes `escalations_update_staff` to make escalations strictly backend-managed
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. HARDEN PROFILES (SELECT) FOR STAFF
-- Remove `OR pp.hospital_id IS NULL`. Staff visibility of patient profiles
-- strictly requires `hospital_id = public.get_auth_staff_hospital_id()`.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS profiles_select_staff ON public.profiles;

CREATE POLICY profiles_select_staff
    ON public.profiles FOR SELECT
    TO authenticated
    USING (
        public.get_auth_user_role() = 'STAFF'
        AND (
            id IN (
                SELECT sp.user_id
                FROM public.staff_profiles sp
                WHERE sp.hospital_id = public.get_auth_staff_hospital_id()
            )
            OR id IN (
                SELECT pp.user_id
                FROM public.patient_profiles pp
                WHERE pp.hospital_id = public.get_auth_staff_hospital_id()
            )
            OR id IN (
                SELECT ip.user_id
                FROM public.interpreter_profiles ip
                WHERE ip.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 2. HARDEN PATIENT PROFILES (SELECT) FOR STAFF
-- Ensure direct patient_profiles access also strictly requires matching hospital_id.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS patient_profiles_select ON public.patient_profiles;

CREATE POLICY patient_profiles_select
    ON public.patient_profiles FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND hospital_id = public.get_auth_staff_hospital_id()
        )
    );


-- ------------------------------------------------------------------------------
-- 3. REMOVE AUTHENTICATED CLIENT UPDATE POLICY ON ESCALATIONS
-- Escalations are backend/agent-controlled workflow records.
-- All mutation/update operations must be performed by the backend service role.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS escalations_update_staff ON public.escalations;
