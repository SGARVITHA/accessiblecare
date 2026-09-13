-- ==============================================================================
-- Migration: 014_interpreter_request_group_transaction.sql
-- Description: Atomically create/reuse one active interpreter request group
--              for an accessibility visit and create its candidate requests.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.create_interpreter_request_group(
    p_accessibility_visit_id UUID,
    p_requested_mode TEXT,
    p_candidate_limit INT,
    p_candidates JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_visit accessibility_visits%ROWTYPE;
    v_appointment appointments%ROWTYPE;
    v_existing interpreter_request_groups%ROWTYPE;
    v_group interpreter_request_groups%ROWTYPE;
    v_candidate JSONB;
    v_request_count INT := 0;
BEGIN
    IF p_candidate_limit < 1 OR p_candidate_limit > 5 THEN
        RAISE EXCEPTION 'INVALID_CANDIDATE_LIMIT';
    END IF;

    IF jsonb_typeof(p_candidates) <> 'array' THEN
        RAISE EXCEPTION 'INVALID_CANDIDATES';
    END IF;

    SELECT * INTO v_visit
    FROM accessibility_visits
    WHERE id = p_accessibility_visit_id
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

    SELECT * INTO v_existing
    FROM interpreter_request_groups
    WHERE accessibility_visit_id = p_accessibility_visit_id
      AND status IN ('PENDING', 'ACTIVE')
    ORDER BY created_at
    LIMIT 1
    FOR UPDATE;

    IF FOUND THEN
        RETURN jsonb_build_object(
            'request_group_id', v_existing.id,
            'created', false
        );
    END IF;

    IF jsonb_array_length(p_candidates) = 0 THEN
        RAISE EXCEPTION 'NO_ELIGIBLE_INTERPRETERS';
    END IF;

    INSERT INTO interpreter_request_groups (
        accessibility_visit_id,
        requested_mode,
        strategy,
        candidate_limit,
        status
    ) VALUES (
        p_accessibility_visit_id,
        p_requested_mode,
        'PARALLEL_TOP_N',
        p_candidate_limit,
        'PENDING'
    )
    RETURNING * INTO v_group;

    FOR v_candidate IN SELECT value FROM jsonb_array_elements(p_candidates)
    LOOP
        IF v_request_count >= p_candidate_limit THEN
            EXIT;
        END IF;

        IF NOT (v_candidate ? 'interpreter_id') THEN
            RAISE EXCEPTION 'INVALID_CANDIDATE';
        END IF;

        INSERT INTO interpreter_requests (
            request_group_id,
            interpreter_id,
            response_status,
            assignment_status
        ) VALUES (
            v_group.id,
            (v_candidate ->> 'interpreter_id')::UUID,
            'PENDING',
            'UNASSIGNED'
        );

        v_request_count := v_request_count + 1;
    END LOOP;

    IF v_request_count = 0 THEN
        RAISE EXCEPTION 'NO_INTERPRETER_REQUESTS_CREATED';
    END IF;

    RETURN jsonb_build_object(
        'request_group_id', v_group.id,
        'created', true
    );
END;
$$;

REVOKE ALL ON FUNCTION public.create_interpreter_request_group(UUID, TEXT, INT, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_interpreter_request_group(UUID, TEXT, INT, JSONB) TO service_role;
