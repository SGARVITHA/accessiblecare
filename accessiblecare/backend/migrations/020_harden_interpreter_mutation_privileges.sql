-- ============================================================
-- 020: Harden interpreter mutation privileges
-- ============================================================

-- ------------------------------------------------------------
-- interpreter_requests
-- ------------------------------------------------------------

-- Interpreter requests are created and assigned by backend/RPCs.
REVOKE INSERT ON TABLE public.interpreter_requests
FROM authenticated;

-- Interpreters may only respond to their own pending requests.
REVOKE UPDATE ON TABLE public.interpreter_requests
FROM authenticated;

GRANT UPDATE (
    response_status,
    responded_at
) ON TABLE public.interpreter_requests
TO authenticated;

-- Interpreters must not delete request records.
REVOKE DELETE ON TABLE public.interpreter_requests
FROM authenticated;

-- These privileges are not required by the application.
REVOKE REFERENCES, TRIGGER, TRUNCATE
ON TABLE public.interpreter_requests
FROM authenticated;


-- ------------------------------------------------------------
-- interpreter_availability
-- ------------------------------------------------------------

-- Interpreter creates their own availability records.
REVOKE INSERT ON TABLE public.interpreter_availability
FROM authenticated;

GRANT INSERT (
    date,
    start_time,
    end_time,
    mode,
    status
) ON TABLE public.interpreter_availability
TO authenticated;

-- Interpreter may modify their own availability.
REVOKE UPDATE ON TABLE public.interpreter_availability
FROM authenticated;

GRANT UPDATE (
    date,
    start_time,
    end_time,
    mode,
    status
) ON TABLE public.interpreter_availability
TO authenticated;

-- DELETE remains available because the existing
-- interpreter self-delete RLS policy controls ownership.
REVOKE REFERENCES, TRIGGER, TRUNCATE
ON TABLE public.interpreter_availability
FROM authenticated;