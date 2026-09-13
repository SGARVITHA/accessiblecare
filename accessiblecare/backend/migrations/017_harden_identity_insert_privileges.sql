-- ==============================================================================
-- Migration: 017_harden_identity_insert_privileges.sql
-- Description: Prevent authenticated clients from creating authoritative identity
--              and tenancy records directly. Patient profiles are provisioned by
--              the auth.users registration trigger; staff/interpreter profiles
--              are administrator/backend managed.
-- ==============================================================================

-- profiles.role is authoritative and profiles are provisioned by the patient
-- registration trigger. The authenticated API must not create arbitrary profile
-- rows with a chosen role.
REVOKE INSERT ON TABLE public.profiles FROM authenticated;

-- patient_profiles.hospital_id is authoritative tenancy data. The patient
-- registration trigger creates the row with hospital_id unset; the backend/admin
-- controls later hospital association.
REVOKE INSERT ON TABLE public.patient_profiles FROM authenticated;

-- interpreter_profiles contains hospital affiliation, verification status, and
-- activation state. These records must be provisioned by staff/admin/backend,
-- not by the interpreter through the authenticated Data API.
REVOKE INSERT ON TABLE public.interpreter_profiles FROM authenticated;

-- No application behavior is changed here: patient self-registration continues
-- through the SECURITY DEFINER auth.users trigger, while interpreter/staff
-- provisioning remains backend/admin controlled.
