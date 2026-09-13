-- ==============================================================================
-- Migration: 012_interpreter_capabilities.sql
-- Description: Add structured interpreter capabilities for deterministic matching.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.interpreter_capabilities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    interpreter_id UUID NOT NULL REFERENCES public.interpreter_profiles(id) ON DELETE CASCADE,
    capability TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT interpreter_capabilities_capability_not_blank
        CHECK (length(trim(capability)) > 0),
    CONSTRAINT interpreter_capabilities_unique_capability
        UNIQUE (interpreter_id, capability)
);

CREATE INDEX IF NOT EXISTS idx_interpreter_capabilities_interpreter_active
    ON public.interpreter_capabilities (interpreter_id, is_active);

ALTER TABLE public.interpreter_capabilities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS interpreter_capabilities_select_staff ON public.interpreter_capabilities;
CREATE POLICY interpreter_capabilities_select_staff
    ON public.interpreter_capabilities
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.interpreter_profiles ip
            JOIN public.staff_profiles sp
              ON sp.hospital_id = ip.hospital_id
            WHERE ip.id = interpreter_capabilities.interpreter_id
              AND sp.user_id = auth.uid()
              AND sp.is_active = true
        )
    );

DROP POLICY IF EXISTS interpreter_capabilities_select_self ON public.interpreter_capabilities;
CREATE POLICY interpreter_capabilities_select_self
    ON public.interpreter_capabilities
    FOR SELECT
    TO authenticated
    USING (
        interpreter_id = public.get_auth_interpreter_id()
    );

REVOKE ALL ON public.interpreter_capabilities FROM anon;
REVOKE ALL ON public.interpreter_capabilities FROM authenticated;
GRANT SELECT ON public.interpreter_capabilities TO authenticated;
