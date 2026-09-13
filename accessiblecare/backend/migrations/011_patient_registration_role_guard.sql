-- ==============================================================================
-- Migration: 011_patient_registration_role_guard.sql
-- Description: Restrict automatic auth-user provisioning to explicit patient
-- self-registration. Staff and interpreter accounts remain administrator-managed.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_patient_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    patient_name TEXT;
    patient_phone TEXT;
BEGIN
    -- Only the public patient registration flow sets this marker. Staff and
    -- interpreter accounts remain administrator-controlled and are ignored.
    IF UPPER(COALESCE(NEW.raw_user_meta_data ->> 'accessiblecare_role', '')) <> 'PATIENT' THEN
        RETURN NEW;
    END IF;

    patient_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '');
    patient_phone := NULLIF(TRIM(COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone', '')), '');

    IF patient_name IS NULL THEN
        RAISE EXCEPTION 'Patient name is required for registration';
    END IF;

    INSERT INTO public.profiles (id, role, full_name, phone)
    VALUES (NEW.id, 'PATIENT', patient_name, patient_phone)
    ON CONFLICT (id) DO UPDATE
    SET full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, public.profiles.phone),
        updated_at = now();

    INSERT INTO public.patient_profiles (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_patient_registration() FROM PUBLIC;
