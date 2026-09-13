-- ==============================================================================
-- Migration: 019_harden_appointment_confirmation_execute_privileges.sql
-- Description: Remove legacy anon EXECUTE grant from appointment confirmation RPC.
-- ==============================================================================

REVOKE ALL ON FUNCTION public.confirm_appointment_request(
    UUID,
    UUID,
    TIMESTAMPTZ,
    TEXT,
    UUID
)
FROM anon, authenticated;

GRANT EXECUTE ON FUNCTION public.confirm_appointment_request(
    UUID,
    UUID,
    TIMESTAMPTZ,
    TEXT,
    UUID
)
TO service_role;