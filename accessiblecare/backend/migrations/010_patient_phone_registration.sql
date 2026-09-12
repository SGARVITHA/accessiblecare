-- ==============================================================================
-- Migration: 010_patient_phone_registration.sql
-- Description: Create a patient profile automatically when a patient registers
-- through Supabase Phone Auth.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.handle_patient_registration()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    patient_name TEXT;
    patient_phone TEXT;
BEGIN
    patient_name := NULLIF(TRIM(COALESCE(NEW.raw_user_meta_data ->> 'full_name', '')), '');
    patient_phone := NULLIF(TRIM(COALESCE(NEW.phone, NEW.raw_user_meta_data ->> 'phone', '')), '');

    -- This trigger is intentionally limited to patient self-registration.
    -- Staff and interpreter accounts remain administrator-controlled.
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

DROP TRIGGER IF EXISTS on_patient_auth_user_created ON auth.users;

CREATE TRIGGER on_patient_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_patient_registration();

REVOKE ALL ON FUNCTION public.handle_patient_registration() FROM PUBLIC;
