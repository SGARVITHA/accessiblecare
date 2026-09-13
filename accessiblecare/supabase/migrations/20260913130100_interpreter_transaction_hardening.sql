-- ==============================================================================
-- Migration: 013_interpreter_transaction_hardening.sql
-- Description: Atomic Phase 4 B6/B7 state transitions
-- ==============================================================================

-- B6: atomically assign an accepted interpreter, close the request group,
-- and mark the other requests as NOT_SELECTED.
CREATE OR REPLACE FUNCTION public.assign_interpreter_request(
    p_request_id UUID,
    p_staff_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request interpreter_requests%ROWTYPE;
    v_group interpreter_request_groups%ROWTYPE;
    v_visit accessibility_visits%ROWTYPE;
    v_appointment appointments%ROWTYPE;
    v_staff staff_profiles%ROWTYPE;
BEGIN
    SELECT * INTO v_staff
    FROM staff_profiles
    WHERE id = p_staff_id
      AND is_active = true
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'STAFF_PROFILE_NOT_FOUND';
    END IF;

    SELECT * INTO v_request
    FROM interpreter_requests
    WHERE id = p_request_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INTERPRETER_REQUEST_NOT_FOUND';
    END IF;

    SELECT * INTO v_group
    FROM interpreter_request_groups
    WHERE id = v_request.request_group_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INTERPRETER_REQUEST_GROUP_NOT_FOUND';
    END IF;

    SELECT * INTO v_visit
    FROM accessibility_visits
    WHERE id = v_group.accessibility_visit_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ACCESSIBILITY_VISIT_NOT_FOUND';
    END IF;

    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = v_visit.appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND';
    END IF;

    IF v_appointment.hospital_id <> v_staff.hospital_id THEN
        RAISE EXCEPTION 'STAFF_HOSPITAL_MISMATCH';
    END IF;

    IF v_request.response_status <> 'ACCEPTED' THEN
        RAISE EXCEPTION 'INTERPRETER_NOT_ACCEPTED';
    END IF;

    IF v_request.assignment_status = 'ASSIGNED' THEN
        RETURN jsonb_build_object(
            'request_id', v_request.id,
            'request_group_id', v_request.request_group_id,
            'accessibility_visit_id', v_group.accessibility_visit_id,
            'appointment_id', v_appointment.id,
            'interpreter_id', v_request.interpreter_id,
            'response_status', v_request.response_status,
            'assignment_status', v_request.assignment_status,
            'group_status', v_group.status,
            'assigned_at', v_request.assigned_at,
            'assigned_by', v_request.assigned_by
        );
    END IF;

    IF v_group.status = 'CONFIRMED' THEN
        RAISE EXCEPTION 'INTERPRETER_REQUEST_GROUP_CONFIRMED';
    END IF;

    IF v_request.assignment_status <> 'UNASSIGNED' THEN
        RAISE EXCEPTION 'INTERPRETER_REQUEST_NOT_ASSIGNABLE';
    END IF;

    UPDATE interpreter_requests
    SET assignment_status = 'ASSIGNED',
        assigned_at = now(),
        assigned_by = p_staff_id
    WHERE id = p_request_id;

    UPDATE interpreter_requests
    SET assignment_status = 'NOT_SELECTED'
    WHERE request_group_id = v_group.id
      AND id <> p_request_id
      AND assignment_status <> 'ASSIGNED';

    UPDATE interpreter_request_groups
    SET status = 'CONFIRMED',
        approved_by = p_staff_id,
        approved_at = now(),
        closed_at = now()
    WHERE id = v_group.id;

    SELECT * INTO v_request
    FROM interpreter_requests
    WHERE id = p_request_id;

    SELECT * INTO v_group
    FROM interpreter_request_groups
    WHERE id = v_group.id;

    RETURN jsonb_build_object(
        'request_id', v_request.id,
        'request_group_id', v_request.request_group_id,
        'accessibility_visit_id', v_group.accessibility_visit_id,
        'appointment_id', v_appointment.id,
        'interpreter_id', v_request.interpreter_id,
        'response_status', v_request.response_status,
        'assignment_status', v_request.assignment_status,
        'group_status', v_group.status,
        'assigned_at', v_request.assigned_at,
        'assigned_by', v_request.assigned_by
    );
END;
$$;

-- B7: atomically cancel the assigned interpreter, reopen a confirmed group,
-- and write the cancellation audit record.
CREATE OR REPLACE FUNCTION public.cancel_interpreter_assignment(
    p_request_id UUID,
    p_interpreter_id UUID,
    p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_request interpreter_requests%ROWTYPE;
    v_group interpreter_request_groups%ROWTYPE;
    v_visit accessibility_visits%ROWTYPE;
    v_appointment appointments%ROWTYPE;
BEGIN
    SELECT * INTO v_request
    FROM interpreter_requests
    WHERE id = p_request_id
      AND interpreter_id = p_interpreter_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INTERPRETER_REQUEST_NOT_FOUND';
    END IF;

    IF v_request.assignment_status <> 'ASSIGNED' THEN
        RAISE EXCEPTION 'INTERPRETER_ASSIGNMENT_NOT_CANCELLABLE';
    END IF;

    SELECT * INTO v_group
    FROM interpreter_request_groups
    WHERE id = v_request.request_group_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'INTERPRETER_REQUEST_GROUP_NOT_FOUND';
    END IF;

    SELECT * INTO v_visit
    FROM accessibility_visits
    WHERE id = v_group.accessibility_visit_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'ACCESSIBILITY_VISIT_NOT_FOUND';
    END IF;

    SELECT * INTO v_appointment
    FROM appointments
    WHERE id = v_visit.appointment_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'APPOINTMENT_NOT_FOUND';
    END IF;

    UPDATE interpreter_requests
    SET assignment_status = 'CANCELLED'
    WHERE id = p_request_id
      AND interpreter_id = p_interpreter_id
      AND assignment_status = 'ASSIGNED';

    IF v_group.status = 'CONFIRMED' THEN
        UPDATE interpreter_request_groups
        SET status = 'OPEN'
        WHERE id = v_group.id
          AND status = 'CONFIRMED';
        v_group.status := 'OPEN';
    END IF;

    INSERT INTO audit_logs (
        actor_id,
        appointment_id,
        action,
        entity_type,
        entity_id,
        metadata
    ) VALUES (
        p_actor_id,
        v_appointment.id,
        'INTERPRETER_ASSIGNMENT_CANCELLED',
        'interpreter_request',
        p_request_id,
        jsonb_build_object(
            'request_group_id', v_group.id,
            'interpreter_id', p_interpreter_id,
            'previous_assignment_status', 'ASSIGNED',
            'resulting_group_status', v_group.status
        )
    );

    SELECT * INTO v_request
    FROM interpreter_requests
    WHERE id = p_request_id;

    RETURN jsonb_build_object(
        'request_id', v_request.id,
        'request_group_id', v_request.request_group_id,
        'accessibility_visit_id', v_group.accessibility_visit_id,
        'appointment_id', v_appointment.id,
        'interpreter_id', p_interpreter_id,
        'response_status', v_request.response_status,
        'assignment_status', v_request.assignment_status,
        'group_status', v_group.status,
        'assigned_at', v_request.assigned_at,
        'assigned_by', v_request.assigned_by
    );
END;
$$;

REVOKE ALL ON FUNCTION public.assign_interpreter_request(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cancel_interpreter_assignment(UUID, UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.assign_interpreter_request(UUID, UUID) TO service_role;
GRANT EXECUTE ON FUNCTION public.cancel_interpreter_assignment(UUID, UUID, UUID) TO service_role;
