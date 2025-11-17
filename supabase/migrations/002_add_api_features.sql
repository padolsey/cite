-- ============================================================================
-- CITE Safety API - Additional Features Migration
-- ============================================================================
-- Adds support for:
-- - Webhook configurations and delivery logs
-- - Idempotency keys (72-hour retention)
-- - Server-managed sessions (Mode B persistence)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. WEBHOOKS TABLE
-- ----------------------------------------------------------------------------
-- Stores webhook configurations for safety events

CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- webhook signing secret (encrypted in production)
  min_risk_level TEXT NOT NULL DEFAULT 'high', -- none|low|medium|high|critical
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_min_risk_level CHECK (min_risk_level IN ('none', 'low', 'medium', 'high', 'critical'))
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON public.webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled ON public.webhooks(enabled) WHERE enabled = true;

-- Enable Row Level Security
ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can manage own webhooks"
  ON public.webhooks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 2. WEBHOOK EVENTS LOG
-- ----------------------------------------------------------------------------
-- Tracks webhook delivery attempts for debugging and retries

CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id UUID NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL, -- safety.risk_escalated, etc.
  payload JSONB NOT NULL,
  status TEXT NOT NULL, -- pending|sent|failed
  http_status INTEGER,
  error_message TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_attempt_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (status IN ('pending', 'sent', 'failed'))
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id ON public.webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON public.webhook_events(status) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON public.webhook_events(created_at);

-- Enable RLS (users can only see events for their webhooks)
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own webhook events"
  ON public.webhook_events
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.webhooks
      WHERE webhooks.id = webhook_events.webhook_id
      AND webhooks.user_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------------------
-- 3. IDEMPOTENCY KEYS TABLE
-- ----------------------------------------------------------------------------
-- Stores idempotency keys and cached responses (72-hour retention)

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_id ON public.idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at ON public.idempotency_keys(expires_at);

-- Enable RLS
ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own idempotency keys"
  ON public.idempotency_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. SESSIONS TABLE (Mode B - Server-Managed Persistence)
-- ----------------------------------------------------------------------------
-- Stores conversation sessions and RiskState for server-side management

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT, -- optional client identifier
  risk_state JSONB NOT NULL DEFAULT '{"version": 0, "risk_level": "none", "confidence": 1.0}'::jsonb,
  policy_id TEXT NOT NULL DEFAULT 'default_mh',
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- optional TTL for auto-cleanup
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_conversation_id ON public.sessions(conversation_id) WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON public.sessions(expires_at) WHERE expires_at IS NOT NULL;

-- Enable RLS
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON public.sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 5. CLEANUP FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to clean up expired idempotency keys
CREATE OR REPLACE FUNCTION public.cleanup_expired_idempotency_keys()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.idempotency_keys
  WHERE expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to clean up expired sessions
CREATE OR REPLACE FUNCTION public.cleanup_expired_sessions()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.sessions
  WHERE expires_at IS NOT NULL
  AND expires_at < NOW();

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- Function to clean up old webhook events (keep last 30 days)
CREATE OR REPLACE FUNCTION public.cleanup_old_webhook_events()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.webhook_events
  WHERE created_at < (NOW() - INTERVAL '30 days');

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$;

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- New tables added:
-- - webhooks (safety event webhook configurations)
-- - webhook_events (delivery tracking and debugging)
-- - idempotency_keys (72-hour deduplication)
-- - sessions (optional server-side RiskState persistence)
--
-- Cleanup functions added (run these periodically via cron):
-- - SELECT cleanup_expired_idempotency_keys();
-- - SELECT cleanup_expired_sessions();
-- - SELECT cleanup_old_webhook_events();
-- ============================================================================
