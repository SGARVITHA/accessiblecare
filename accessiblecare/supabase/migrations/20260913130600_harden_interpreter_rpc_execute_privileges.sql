-- ==============================================================================
-- Migration: 018_harden_interpreter_rpc_execute_privileges.sql
-- Description: Remove legacy anon/authenticated EXECUTE grants from
--              Phase 4 interpreter transaction RPCs.
-- ==============================================================================

REVOKE ALL ON FUNCTION public.assign_interpreter_request(UUID, UUID)
FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.cancel_interpreter_assignment(UUID, UUID, UUID)
FROM anon, authenticated;

REVOKE ALL ON FUNCTION public.create_interpreter_request_group(UUID, TEXT, INT, JSONB)
FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.assign_interpreter_request(UUID, UUID)
TO service_role;

GRANT EXECUTE ON FUNCTION public.cancel_interpreter_assignment(UUID, UUID, UUID)
TO service_role;

GRANT EXECUTE ON FUNCTION public.create_interpreter_request_group(UUID, TEXT, INT, JSONB)
TO service_role;
