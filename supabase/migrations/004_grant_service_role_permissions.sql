-- ============================================================================
-- Grant Service Role Permissions
-- ============================================================================
-- Explicitly grant service_role permissions on all tables
-- (Service role should bypass RLS automatically, but this ensures it)
-- ============================================================================

-- Grant all privileges to service_role on all tables
GRANT ALL ON public.user_settings TO service_role;
GRANT ALL ON public.api_keys TO service_role;
GRANT ALL ON public.webhooks TO service_role;
GRANT ALL ON public.webhook_events TO service_role;
GRANT ALL ON public.idempotency_keys TO service_role;
GRANT ALL ON public.sessions TO service_role;
GRANT ALL ON public.crisis_resources TO service_role;

-- Grant usage on all sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- Grant execute on all functions
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;
