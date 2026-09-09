-- ==============================================================================
-- Migration: 004_harden_rls_policies.sql
-- Description: Harden Supabase Row Level Security (RLS) Policies
-- - Removes overly permissive client insert policy on escalations
-- - Enforces hospital scoping for STAFF across all domain entities
-- - Prevents cross-hospital data leakage
-- - Preserves SECURITY DEFINER helpers with fixed search_path
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. REMOVE OVERLY PERMISSIVE ESCALATION INSERT POLICY
-- Escalations are backend/agent-controlled workflow records.
-- Direct client insertions by arbitrary authenticated users are prohibited.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS escalations_insert_authenticated ON public.escalations;


-- ------------------------------------------------------------------------------
-- 2. HARDEN INTERPRETER PROFILES (SELECT)
-- Staff can read interpreter profiles ONLY for their own hospital.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS interpreter_profiles_select ON public.interpreter_profiles;

CREATE POLICY interpreter_profiles_select
    ON public.interpreter_profiles FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND hospital_id = public.get_auth_staff_hospital_id()
        )
    );


-- ------------------------------------------------------------------------------
-- 3. HARDEN INTERPRETER AVAILABILITY (SELECT)
-- Staff can read availability ONLY for interpreters belonging to their own hospital.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS interpreter_availability_select ON public.interpreter_availability;

CREATE POLICY interpreter_availability_select
    ON public.interpreter_availability FOR SELECT
    TO authenticated
    USING (
        interpreter_id = public.get_auth_interpreter_id()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND interpreter_id IN (
                SELECT ip.id
                FROM public.interpreter_profiles ip
                WHERE ip.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 4. HARDEN ACCESSIBILITY PROFILES (SELECT)
-- Staff can read accessibility profiles ONLY for patients associated with their own hospital.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS accessibility_profiles_select ON public.accessibility_profiles;

CREATE POLICY accessibility_profiles_select
    ON public.accessibility_profiles FOR SELECT
    TO authenticated
    USING (
        patient_id = public.get_auth_patient_id()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND patient_id IN (
                SELECT pp.id
                FROM public.patient_profiles pp
                WHERE pp.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 5. HARDEN ESCALATIONS (SELECT)
-- Staff: Limited to escalations belonging to appointments/visits in their hospital.
-- Patient: Limited to escalations belonging to their own appointments/visits.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS escalations_select ON public.escalations;

CREATE POLICY escalations_select
    ON public.escalations FOR SELECT
    TO authenticated
    USING (
        (
            public.get_auth_user_role() = 'STAFF'
            AND (
                appointment_id IN (
                    SELECT a.id
                    FROM public.appointments a
                    WHERE a.hospital_id = public.get_auth_staff_hospital_id()
                )
                OR accessibility_visit_id IN (
                    SELECT v.id
                    FROM public.accessibility_visits v
                    JOIN public.appointments a ON a.id = v.appointment_id
                    WHERE a.hospital_id = public.get_auth_staff_hospital_id()
                )
            )
        )
        OR (
            appointment_id IN (
                SELECT a.id
                FROM public.appointments a
                WHERE a.patient_id = public.get_auth_patient_id()
            )
            OR accessibility_visit_id IN (
                SELECT v.id
                FROM public.accessibility_visits v
                WHERE v.patient_id = public.get_auth_patient_id()
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 6. HARDEN ESCALATIONS (UPDATE)
-- Staff can update ONLY escalations belonging to their own hospital.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS escalations_update_staff ON public.escalations;

CREATE POLICY escalations_update_staff
    ON public.escalations FOR UPDATE
    TO authenticated
    USING (
        public.get_auth_user_role() = 'STAFF'
        AND (
            appointment_id IN (
                SELECT a.id
                FROM public.appointments a
                WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
            OR accessibility_visit_id IN (
                SELECT v.id
                FROM public.accessibility_visits v
                JOIN public.appointments a ON a.id = v.appointment_id
                WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    )
    WITH CHECK (
        public.get_auth_user_role() = 'STAFF'
        AND (
            appointment_id IN (
                SELECT a.id
                FROM public.appointments a
                WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
            OR accessibility_visit_id IN (
                SELECT v.id
                FROM public.accessibility_visits v
                JOIN public.appointments a ON a.id = v.appointment_id
                WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 7. HARDEN PROFILES (SELECT)
-- Staff can read profiles of users ONLY within their own hospital care network.
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
                   OR pp.hospital_id IS NULL
            )
            OR id IN (
                SELECT ip.user_id
                FROM public.interpreter_profiles ip
                WHERE ip.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 8. HARDEN INTERPRETER REQUEST GROUPS (SELECT)
-- Staff access scoped to visits within their own hospital.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS interpreter_request_groups_select ON public.interpreter_request_groups;

CREATE POLICY interpreter_request_groups_select
    ON public.interpreter_request_groups FOR SELECT
    TO authenticated
    USING (
        (
            public.get_auth_user_role() = 'STAFF'
            AND accessibility_visit_id IN (
                SELECT v.id
                FROM public.accessibility_visits v
                JOIN public.appointments a ON a.id = v.appointment_id
                WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
        OR (
            public.get_auth_user_role() = 'INTERPRETER'
            AND id IN (
                SELECT r.request_group_id
                FROM public.interpreter_requests r
                WHERE r.interpreter_id = public.get_auth_interpreter_id()
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 9. HARDEN INTERPRETER REQUESTS (SELECT)
-- Staff can read candidate requests ONLY for visits within their own hospital.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS interpreter_requests_select ON public.interpreter_requests;

CREATE POLICY interpreter_requests_select
    ON public.interpreter_requests FOR SELECT
    TO authenticated
    USING (
        interpreter_id = public.get_auth_interpreter_id()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND request_group_id IN (
                SELECT g.id
                FROM public.interpreter_request_groups g
                JOIN public.accessibility_visits v ON v.id = g.accessibility_visit_id
                JOIN public.appointments a ON a.id = v.appointment_id
                WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 10. HARDEN VIDEO SESSIONS (SELECT)
-- Staff access scoped strictly to video sessions within their own hospital.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS video_sessions_select ON public.video_sessions;

CREATE POLICY video_sessions_select
    ON public.video_sessions FOR SELECT
    TO authenticated
    USING (
        (
            public.get_auth_user_role() = 'STAFF'
            AND interpreter_request_id IN (
                SELECT r.id
                FROM public.interpreter_requests r
                JOIN public.interpreter_request_groups g ON g.id = r.request_group_id
                JOIN public.accessibility_visits v ON v.id = g.accessibility_visit_id
                JOIN public.appointments a ON a.id = v.appointment_id
                WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
        OR (
            public.get_auth_user_role() = 'INTERPRETER'
            AND interpreter_request_id IN (
                SELECT r.id
                FROM public.interpreter_requests r
                WHERE r.interpreter_id = public.get_auth_interpreter_id()
                  AND r.assignment_status = 'ASSIGNED'
            )
        )
        OR (
            public.get_auth_user_role() = 'PATIENT'
            AND interpreter_request_id IN (
                SELECT r.id
                FROM public.interpreter_requests r
                JOIN public.interpreter_request_groups g ON g.id = r.request_group_id
                JOIN public.accessibility_visits v ON v.id = g.accessibility_visit_id
                WHERE v.patient_id = public.get_auth_patient_id()
                  AND r.assignment_status = 'ASSIGNED'
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 11. HARDEN FEEDBACK (SELECT)
-- Staff access scoped strictly to feedback for appointments in their own hospital.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS feedback_select ON public.feedback;

CREATE POLICY feedback_select
    ON public.feedback FOR SELECT
    TO authenticated
    USING (
        patient_id = public.get_auth_patient_id()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND appointment_id IN (
                SELECT a.id
                FROM public.appointments a
                WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 12. HARDEN AUDIT LOGS (SELECT)
-- Staff access scoped to audit logs for appointments/actors in their own hospital.
-- ------------------------------------------------------------------------------

DROP POLICY IF EXISTS audit_logs_select_staff ON public.audit_logs;

CREATE POLICY audit_logs_select_staff
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (
        public.get_auth_user_role() = 'STAFF'
        AND (
            appointment_id IN (
                SELECT a.id
                FROM public.appointments a
                WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
            OR (
                appointment_id IS NULL
                AND actor_id IN (
                    SELECT sp.user_id
                    FROM public.staff_profiles sp
                    WHERE sp.hospital_id = public.get_auth_staff_hospital_id()
                )
            )
        )
    );
