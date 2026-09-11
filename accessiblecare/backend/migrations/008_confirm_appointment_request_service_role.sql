-- ==============================================================================
-- Migration: 008_confirm_appointment_request_service_role.sql
-- Description: Make appointment-request confirmation compatible with the
--              backend's service-role Supabase client while preserving
--              authenticated staff authorization semantics.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.confirm_appointment_request(
    p_request_id UUID,
    p_department_id UUID,
    p_appointment_time TIMESTAMPTZ,
    p_doctor_name TEXT,
    p_staff_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_request public.appointment_requests%ROWTYPE;
    v_hospital_id UUID;
    v_appointment public.appointments%ROWTYPE;
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles
        WHERE id = p_staff_user_id
          AND role = 'STAFF'
    ) THEN
        RAISE EXCEPTION 'Staff access required' USING ERRCODE = '42501';
    END IF;

    SELECT hospital_id
    INTO v_hospital_id
    FROM public.staff_profiles
    WHERE user_id = p_staff_user_id
      AND is_active = true
    LIMIT 1;

    IF v_hospital_id IS NULL THEN
        RAISE EXCEPTION 'Staff hospital could not be resolved' USING ERRCODE = '42501';
    END IF;

    SELECT *
    INTO v_request
    FROM public.appointment_requests
    WHERE id = p_request_id
      AND hospital_id = v_hospital_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Appointment request not found' USING ERRCODE = 'P0002';
    END IF;

    IF v_request.status <> 'PENDING' THEN
        RAISE EXCEPTION 'Only pending requests can be confirmed' USING ERRCODE = '23514';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.departments
        WHERE id = p_department_id
          AND hospital_id = v_hospital_id
    ) THEN
        RAISE EXCEPTION 'Department does not belong to staff hospital' USING ERRCODE = '23503';
    END IF;

    INSERT INTO public.appointments (
        hospital_id,
        patient_id,
        department_id,
        doctor_name,
        appointment_time,
        status,
        source
    )
    VALUES (
        v_hospital_id,
        v_request.patient_id,
        p_department_id,
        p_doctor_name,
        p_appointment_time,
        'SCHEDULED',
        'MANUAL'
    )
    RETURNING * INTO v_appointment;

    UPDATE public.appointment_requests
    SET status = 'CONFIRMED',
        appointment_id = v_appointment.id,
        reviewed_by = p_staff_user_id,
        reviewed_at = now(),
        updated_at = now()
    WHERE id = v_request.id;

    RETURN jsonb_build_object(
        'request_id', v_request.id,
        'appointment_id', v_appointment.id,
        'status', 'CONFIRMED'
    );
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_appointment_request(UUID, UUID, TIMESTAMPTZ, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.confirm_appointment_request(UUID, UUID, TIMESTAMPTZ, TEXT, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.confirm_appointment_request(UUID, UUID, TIMESTAMPTZ, TEXT, UUID) TO authenticated, service_role;
