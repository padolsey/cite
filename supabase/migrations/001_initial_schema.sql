-- ============================================================================
-- CITE Safety API - Baseline Schema (Fresh Canvas)
-- ============================================================================
-- This migration creates the full database schema needed for:
-- - User settings and admin flags
-- - API keys and usage tracking
-- - Webhooks and delivery logs
-- - Idempotency keys
-- - Server-managed sessions
-- - Crisis resources schema (NO seed data)
--
-- NOTE:
-- - All crisis resource *data* is seeded separately in
--   `002_crisis_resources_seed.sql`.
-- - This file is intended as a clean baseline for new environments.
-- ============================================================================

-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. USER SETTINGS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_is_admin
  ON public.user_settings(is_admin)
  WHERE is_admin = true;

ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own settings"
  ON public.user_settings
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all settings"
  ON public.user_settings
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- ----------------------------------------------------------------------------
-- 2. API KEYS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  key_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- Usage tracking
  request_count INTEGER NOT NULL DEFAULT 0,
  rate_limit_tier TEXT NOT NULL DEFAULT 'free'
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash
  ON public.api_keys(key_hash)
  WHERE revoked_at IS NULL;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own API keys"
  ON public.api_keys
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own API keys"
  ON public.api_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own API keys"
  ON public.api_keys
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own API keys"
  ON public.api_keys
  FOR DELETE
  USING (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 3. WEBHOOKS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.webhooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  secret TEXT NOT NULL, -- webhook signing secret (encrypted in production)
  min_risk_level TEXT NOT NULL DEFAULT 'high', -- none|low|medium|high|critical
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_min_risk_level CHECK (
    min_risk_level IN ('none', 'low', 'medium', 'high', 'critical')
  )
);

CREATE INDEX IF NOT EXISTS idx_webhooks_user_id ON public.webhooks(user_id);
CREATE INDEX IF NOT EXISTS idx_webhooks_enabled
  ON public.webhooks(enabled)
  WHERE enabled = true;

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own webhooks"
  ON public.webhooks
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 4. WEBHOOK EVENTS TABLE
-- ----------------------------------------------------------------------------

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

CREATE INDEX IF NOT EXISTS idx_webhook_events_webhook_id
  ON public.webhook_events(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status
  ON public.webhook_events(status)
  WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at
  ON public.webhook_events(created_at);

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
-- 5. IDEMPOTENCY KEYS TABLE
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.idempotency_keys (
  key TEXT PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  response_status INTEGER NOT NULL,
  response_body JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '72 hours')
);

CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_id
  ON public.idempotency_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_idempotency_keys_expires_at
  ON public.idempotency_keys(expires_at);

ALTER TABLE public.idempotency_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can access own idempotency keys"
  ON public.idempotency_keys
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 6. SESSIONS TABLE (Server-managed RiskState)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id TEXT, -- optional client identifier
  risk_state JSONB NOT NULL DEFAULT
    '{"version": 0, "risk_level": "none", "confidence": 1.0}'::jsonb,
  policy_id TEXT NOT NULL DEFAULT 'default_mh',
  last_evaluated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ -- optional TTL for auto-cleanup
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON public.sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_conversation_id
  ON public.sessions(conversation_id)
  WHERE conversation_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at
  ON public.sessions(expires_at)
  WHERE expires_at IS NOT NULL;

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own sessions"
  ON public.sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ----------------------------------------------------------------------------
-- 7. CRISIS RESOURCES TABLE (Schema only, no data)
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.crisis_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Geographic
  country_code TEXT NOT NULL, -- ISO 3166-1 alpha-2 (US, GB, CA, etc.)

  -- Resource details
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- emergency_number|crisis_line|text_line|chat_service|support_service
  phone TEXT,
  text_instructions TEXT, -- e.g., "Text HOME to 741741"
  chat_url TEXT,
  availability TEXT, -- e.g., "24/7", "Mon-Fri 9am-5pm"
  languages TEXT[] NOT NULL DEFAULT '{"en"}', -- ISO 639-1 codes
  description TEXT,

  -- Enhanced metadata
  service_scope TEXT[] DEFAULT '{}',
  population_served TEXT[] DEFAULT '{}',
  requires_callback BOOLEAN DEFAULT false,
  alternative_numbers JSONB DEFAULT '[]'::jsonb,
  website_url TEXT,
  notes TEXT,

  -- Record metadata
  enabled BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  CONSTRAINT crisis_resources_valid_type CHECK (
    type IN (
      'emergency_number',
      'crisis_line',
      'text_line',
      'chat_service',
      'support_service'
    )
  ),
  CONSTRAINT crisis_resources_has_contact_method CHECK (
    phone IS NOT NULL OR text_instructions IS NOT NULL OR chat_url IS NOT NULL
  )
);

-- Indexes for crisis_resources
CREATE INDEX IF NOT EXISTS idx_crisis_resources_country_code
  ON public.crisis_resources(country_code)
  WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_crisis_resources_enabled
  ON public.crisis_resources(enabled)
  WHERE enabled = true;
CREATE INDEX IF NOT EXISTS idx_crisis_resources_display_order
  ON public.crisis_resources(display_order);

-- GIN indexes for array fields
CREATE INDEX IF NOT EXISTS idx_crisis_resources_service_scope
  ON public.crisis_resources USING GIN(service_scope)
  WHERE enabled = true;

CREATE INDEX IF NOT EXISTS idx_crisis_resources_population_served
  ON public.crisis_resources USING GIN(population_served)
  WHERE enabled = true;

-- Column documentation
COMMENT ON COLUMN public.crisis_resources.service_scope IS
  'Type of issues handled: suicide, domestic_violence, sexual_assault, lgbtq, youth, substance_use, mental_health, child_abuse, veterans, indigenous, eating_disorders, general';
COMMENT ON COLUMN public.crisis_resources.population_served IS
  'Target population: general, youth, children, lgbtq, transgender, indigenous, veterans, women, men, students, farmers, elderly';
COMMENT ON COLUMN public.crisis_resources.requires_callback IS
  'If true, service requires user to call/text and they will call back';
COMMENT ON COLUMN public.crisis_resources.alternative_numbers IS
  'JSON array of alternative phone numbers for same service. Format: [{"phone": "123", "description": "Alternative line", "languages": ["en"]}]';
COMMENT ON COLUMN public.crisis_resources.website_url IS
  'Official website for the service/organization';
COMMENT ON COLUMN public.crisis_resources.notes IS
  'Additional information, restrictions, or special instructions';

-- RLS for crisis_resources
ALTER TABLE public.crisis_resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view enabled resources"
  ON public.crisis_resources
  FOR SELECT
  USING (enabled = true);

CREATE POLICY "Admins can view all resources"
  ON public.crisis_resources
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can insert resources"
  ON public.crisis_resources
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can update resources"
  ON public.crisis_resources
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "Admins can delete resources"
  ON public.crisis_resources
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- ----------------------------------------------------------------------------
-- 8. FUNCTIONS
-- ----------------------------------------------------------------------------

-- Create user_settings on auth.users insert
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_settings (user_id, is_admin)
  VALUES (NEW.id, false);
  RETURN NEW;
END;
$$;

-- Update API key usage (called from backend)
CREATE OR REPLACE FUNCTION public.update_api_key_usage(key_hash_param TEXT)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.api_keys
  SET
    last_used_at = NOW(),
    request_count = request_count + 1
  WHERE key_hash = key_hash_param
    AND revoked_at IS NULL;
END;
$$;

-- Check if a user is an admin
CREATE OR REPLACE FUNCTION public.is_user_admin(user_id_param UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  admin_status BOOLEAN;
BEGIN
  SELECT is_admin INTO admin_status
  FROM public.user_settings
  WHERE user_id = user_id_param;

  RETURN COALESCE(admin_status, false);
END;
$$;

-- Cleanup expired idempotency keys
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

-- Cleanup expired sessions
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

-- Cleanup old webhook events (keep last 30 days)
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

-- Crisis resources helper: get by country with optional filters
CREATE OR REPLACE FUNCTION public.get_crisis_resources_for_country(
  country_code_param TEXT,
  service_scope_param TEXT[] DEFAULT NULL,
  population_param TEXT[] DEFAULT NULL
)
RETURNS SETOF public.crisis_resources
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.crisis_resources
  WHERE country_code = UPPER(country_code_param)
    AND enabled = true
    AND (service_scope_param IS NULL OR service_scope && service_scope_param)
    AND (population_param IS NULL OR population_served && population_param)
  ORDER BY display_order ASC, name ASC;
$$;

-- Crisis resources helper: get for multiple countries
CREATE OR REPLACE FUNCTION public.get_crisis_resources_for_countries(
  country_codes_param TEXT[]
)
RETURNS SETOF public.crisis_resources
LANGUAGE sql
STABLE
AS $$
  SELECT DISTINCT ON (name) * FROM public.crisis_resources
  WHERE country_code = ANY(country_codes_param)
    AND enabled = true
  ORDER BY name ASC, display_order ASC;
$$;

-- Crisis resources helper: supported countries
CREATE OR REPLACE FUNCTION public.get_supported_countries()
RETURNS TABLE(country_code TEXT, resource_count BIGINT)
LANGUAGE sql
STABLE
AS $$
  SELECT country_code, COUNT(*) AS resource_count
  FROM public.crisis_resources
  WHERE enabled = true
  GROUP BY country_code
  ORDER BY country_code ASC;
$$;

-- Crisis resources helper: get by service scope across countries
CREATE OR REPLACE FUNCTION public.get_crisis_resources_by_service(
  service_scope_filter TEXT[],
  country_codes_param TEXT[] DEFAULT NULL
)
RETURNS SETOF public.crisis_resources
LANGUAGE sql
STABLE
AS $$
  SELECT * FROM public.crisis_resources
  WHERE enabled = true
    AND service_scope && service_scope_filter
    AND (country_codes_param IS NULL OR country_code = ANY(country_codes_param))
  ORDER BY display_order ASC, name ASC;
$$;

-- Trigger function to update crisis_resources.updated_at / updated_by
CREATE OR REPLACE FUNCTION public.update_crisis_resources_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;

-- ----------------------------------------------------------------------------
-- 9. TRIGGERS
-- ----------------------------------------------------------------------------

-- On auth.users insert, create user_settings
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Before update on crisis_resources, bump updated_at/updated_by
DROP TRIGGER IF EXISTS trigger_update_crisis_resources_updated_at
  ON public.crisis_resources;

CREATE TRIGGER trigger_update_crisis_resources_updated_at
  BEFORE UPDATE ON public.crisis_resources
  FOR EACH ROW
  EXECUTE FUNCTION public.update_crisis_resources_updated_at();

-- ============================================================================
-- Baseline schema complete.
-- Run `002_crisis_resources_seed.sql` next to populate crisis resources.
-- ============================================================================


