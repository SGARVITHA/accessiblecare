-- ==============================================================================
-- Migration: 003_rls_policies.sql
-- Description: Supabase Row Level Security (RLS) Policies & Data Access Security
-- Foundation for all 19 AccessibleCare application tables.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. SECURITY DEFINER HELPER FUNCTIONS
-- Fixed search_path to prevent search-path injection.
-- Functions execute with owner privileges to safely inspect roles without recursion.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_auth_patient_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id FROM public.patient_profiles WHERE user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION public.get_auth_staff_hospital_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT hospital_id FROM public.staff_profiles WHERE user_id = auth.uid() AND is_active = true;
$$;

CREATE OR REPLACE FUNCTION public.get_auth_interpreter_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id FROM public.interpreter_profiles WHERE user_id = auth.uid() AND is_active = true;
$$;

-- Revoke default public execution and grant specifically to authenticated users
REVOKE ALL ON FUNCTION public.get_auth_user_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated;

REVOKE ALL ON FUNCTION public.get_auth_patient_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_patient_id() TO authenticated;

REVOKE ALL ON FUNCTION public.get_auth_staff_hospital_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_staff_hospital_id() TO authenticated;

REVOKE ALL ON FUNCTION public.get_auth_interpreter_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auth_interpreter_id() TO authenticated;


-- ------------------------------------------------------------------------------
-- 2. ENABLE ROW LEVEL SECURITY ON ALL 19 APPLICATION TABLES
-- ------------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hospitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interpreter_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.accessibility_visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interpreter_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interpreter_request_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interpreter_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.video_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.escalations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;


-- ------------------------------------------------------------------------------
-- 3. POLICIES: 1. IDENTITY DOMAIN
-- ------------------------------------------------------------------------------

-- Table: profiles
-- Self-read and staff read
CREATE POLICY profiles_select_self
    ON public.profiles FOR SELECT
    TO authenticated
    USING (id = auth.uid());

CREATE POLICY profiles_select_staff
    ON public.profiles FOR SELECT
    TO authenticated
    USING (public.get_auth_user_role() = 'STAFF');

CREATE POLICY profiles_insert_self
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (id = auth.uid());

CREATE POLICY profiles_update_self
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Table: hospitals
-- Reference data: readable by authenticated users, mutations backend-only
CREATE POLICY hospitals_select_authenticated
    ON public.hospitals FOR SELECT
    TO authenticated
    USING (true);

-- Table: departments
-- Reference data: readable by authenticated users, mutations backend-only
CREATE POLICY departments_select_authenticated
    ON public.departments FOR SELECT
    TO authenticated
    USING (true);

-- Table: staff_profiles
CREATE POLICY staff_profiles_select
    ON public.staff_profiles FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR (public.get_auth_user_role() = 'STAFF' AND hospital_id = public.get_auth_staff_hospital_id())
    );

-- Table: patient_profiles
CREATE POLICY patient_profiles_select
    ON public.patient_profiles FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND (hospital_id = public.get_auth_staff_hospital_id() OR hospital_id IS NULL)
        )
    );

CREATE POLICY patient_profiles_insert_self
    ON public.patient_profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY patient_profiles_update_self
    ON public.patient_profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Table: interpreter_profiles
CREATE POLICY interpreter_profiles_select
    ON public.interpreter_profiles FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid()
        OR public.get_auth_user_role() = 'STAFF'
    );

CREATE POLICY interpreter_profiles_insert_self
    ON public.interpreter_profiles FOR INSERT
    TO authenticated
    WITH CHECK (user_id = auth.uid());

CREATE POLICY interpreter_profiles_update_self
    ON public.interpreter_profiles FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ------------------------------------------------------------------------------
-- 4. POLICIES: 2. ACCESSIBILITY DOMAIN
-- ------------------------------------------------------------------------------

-- Table: accessibility_profiles
CREATE POLICY accessibility_profiles_select
    ON public.accessibility_profiles FOR SELECT
    TO authenticated
    USING (
        patient_id = public.get_auth_patient_id()
        OR public.get_auth_user_role() = 'STAFF'
    );

CREATE POLICY accessibility_profiles_insert_self
    ON public.accessibility_profiles FOR INSERT
    TO authenticated
    WITH CHECK (patient_id = public.get_auth_patient_id());

CREATE POLICY accessibility_profiles_update_self
    ON public.accessibility_profiles FOR UPDATE
    TO authenticated
    USING (patient_id = public.get_auth_patient_id())
    WITH CHECK (patient_id = public.get_auth_patient_id());

-- Table: appointments
CREATE POLICY appointments_select
    ON public.appointments FOR SELECT
    TO authenticated
    USING (
        patient_id = public.get_auth_patient_id()
        OR (public.get_auth_user_role() = 'STAFF' AND hospital_id = public.get_auth_staff_hospital_id())
        OR (
            public.get_auth_user_role() = 'INTERPRETER'
            AND id IN (
                SELECT v.appointment_id
                FROM public.accessibility_visits v
                JOIN public.interpreter_request_groups g ON g.accessibility_visit_id = v.id
                JOIN public.interpreter_requests r ON r.request_group_id = g.id
                WHERE r.interpreter_id = public.get_auth_interpreter_id()
                  AND r.assignment_status = 'ASSIGNED'
            )
        )
    );

-- Table: accessibility_visits
CREATE POLICY accessibility_visits_select
    ON public.accessibility_visits FOR SELECT
    TO authenticated
    USING (
        patient_id = public.get_auth_patient_id()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND appointment_id IN (
                SELECT a.id FROM public.appointments a WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
        OR (
            public.get_auth_user_role() = 'INTERPRETER'
            AND id IN (
                SELECT g.accessibility_visit_id
                FROM public.interpreter_request_groups g
                JOIN public.interpreter_requests r ON r.request_group_id = g.id
                WHERE r.interpreter_id = public.get_auth_interpreter_id()
            )
        )
    );

-- Table: check_ins
CREATE POLICY check_ins_select
    ON public.check_ins FOR SELECT
    TO authenticated
    USING (
        patient_id = public.get_auth_patient_id()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND appointment_id IN (
                SELECT a.id FROM public.appointments a WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    );

CREATE POLICY check_ins_insert_self
    ON public.check_ins FOR INSERT
    TO authenticated
    WITH CHECK (patient_id = public.get_auth_patient_id());


-- ------------------------------------------------------------------------------
-- 5. POLICIES: 3. INTERPRETER COORDINATION DOMAIN
-- ------------------------------------------------------------------------------

-- Table: interpreter_availability
CREATE POLICY interpreter_availability_select
    ON public.interpreter_availability FOR SELECT
    TO authenticated
    USING (
        interpreter_id = public.get_auth_interpreter_id()
        OR public.get_auth_user_role() = 'STAFF'
    );

CREATE POLICY interpreter_availability_insert_self
    ON public.interpreter_availability FOR INSERT
    TO authenticated
    WITH CHECK (interpreter_id = public.get_auth_interpreter_id());

CREATE POLICY interpreter_availability_update_self
    ON public.interpreter_availability FOR UPDATE
    TO authenticated
    USING (interpreter_id = public.get_auth_interpreter_id())
    WITH CHECK (interpreter_id = public.get_auth_interpreter_id());

CREATE POLICY interpreter_availability_delete_self
    ON public.interpreter_availability FOR DELETE
    TO authenticated
    USING (interpreter_id = public.get_auth_interpreter_id());

-- Table: interpreter_request_groups
CREATE POLICY interpreter_request_groups_select
    ON public.interpreter_request_groups FOR SELECT
    TO authenticated
    USING (
        public.get_auth_user_role() = 'STAFF'
        OR (
            public.get_auth_user_role() = 'INTERPRETER'
            AND id IN (
                SELECT r.request_group_id
                FROM public.interpreter_requests r
                WHERE r.interpreter_id = public.get_auth_interpreter_id()
            )
        )
    );

-- Table: interpreter_requests
CREATE POLICY interpreter_requests_select
    ON public.interpreter_requests FOR SELECT
    TO authenticated
    USING (
        interpreter_id = public.get_auth_interpreter_id()
        OR public.get_auth_user_role() = 'STAFF'
    );

CREATE POLICY interpreter_requests_update_response
    ON public.interpreter_requests FOR UPDATE
    TO authenticated
    USING (interpreter_id = public.get_auth_interpreter_id())
    WITH CHECK (interpreter_id = public.get_auth_interpreter_id());


-- ------------------------------------------------------------------------------
-- 6. POLICIES: 4. COMMUNICATION DOMAIN
-- ------------------------------------------------------------------------------

-- Table: communication_messages
CREATE POLICY communication_messages_select
    ON public.communication_messages FOR SELECT
    TO authenticated
    USING (
        sender_id = auth.uid()
        OR receiver_id = auth.uid()
        OR (
            public.get_auth_user_role() = 'STAFF'
            AND appointment_id IN (
                SELECT a.id FROM public.appointments a WHERE a.hospital_id = public.get_auth_staff_hospital_id()
            )
        )
    );

CREATE POLICY communication_messages_insert_sender
    ON public.communication_messages FOR INSERT
    TO authenticated
    WITH CHECK (sender_id = auth.uid());

-- Table: notifications
CREATE POLICY notifications_select_self
    ON public.notifications FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());

CREATE POLICY notifications_update_self
    ON public.notifications FOR UPDATE
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());


-- ------------------------------------------------------------------------------
-- 7. POLICIES: 5. VIDEO SESSIONS DOMAIN
-- ------------------------------------------------------------------------------

-- Table: video_sessions
CREATE POLICY video_sessions_select
    ON public.video_sessions FOR SELECT
    TO authenticated
    USING (
        public.get_auth_user_role() = 'STAFF'
        OR (
            public.get_auth_user_role() = 'INTERPRETER'
            AND interpreter_request_id IN (
                SELECT r.id FROM public.interpreter_requests r
                WHERE r.interpreter_id = public.get_auth_interpreter_id()
                  AND r.assignment_status = 'ASSIGNED'
            )
        )
        OR (
            public.get_auth_user_role() = 'PATIENT'
            AND interpreter_request_id IN (
                SELECT r.id FROM public.interpreter_requests r
                JOIN public.interpreter_request_groups g ON g.id = r.request_group_id
                JOIN public.accessibility_visits v ON v.id = g.accessibility_visit_id
                WHERE v.patient_id = public.get_auth_patient_id()
                  AND r.assignment_status = 'ASSIGNED'
            )
        )
    );


-- ------------------------------------------------------------------------------
-- 8. POLICIES: 6. EXCEPTIONS & AUDIT DOMAIN
-- ------------------------------------------------------------------------------

-- Table: escalations
CREATE POLICY escalations_select
    ON public.escalations FOR SELECT
    TO authenticated
    USING (
        public.get_auth_user_role() = 'STAFF'
        OR (
            appointment_id IN (
                SELECT a.id FROM public.appointments a WHERE a.patient_id = public.get_auth_patient_id()
            )
        )
    );

CREATE POLICY escalations_insert_authenticated
    ON public.escalations FOR INSERT
    TO authenticated
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY escalations_update_staff
    ON public.escalations FOR UPDATE
    TO authenticated
    USING (public.get_auth_user_role() = 'STAFF')
    WITH CHECK (public.get_auth_user_role() = 'STAFF');

-- Table: audit_logs
-- Strictly read-only for Staff; mutations are exclusively backend service-role
CREATE POLICY audit_logs_select_staff
    ON public.audit_logs FOR SELECT
    TO authenticated
    USING (public.get_auth_user_role() = 'STAFF');

-- Table: feedback
CREATE POLICY feedback_select
    ON public.feedback FOR SELECT
    TO authenticated
    USING (
        patient_id = public.get_auth_patient_id()
        OR public.get_auth_user_role() = 'STAFF'
    );

CREATE POLICY feedback_insert_self
    ON public.feedback FOR INSERT
    TO authenticated
    WITH CHECK (patient_id = public.get_auth_patient_id());
