-- ============================================================================
-- CITE Safety API - Initial Database Schema
-- ============================================================================
-- This migration creates all tables and functions needed for:
-- - User authentication and settings
-- - Admin privilege management
-- - API key generation and tracking
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. USER SETTINGS TABLE
-- ----------------------------------------------------------------------------
-- Stores user preferences and admin flags

CREATE TABLE IF NOT EXISTS public.user_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for admin lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_is_admin
  ON public.user_settings(is_admin)
  WHERE is_admin = true;

-- Enable Row Level Security
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_settings
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
-- Stores hashed API keys for accessing the CITE API

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

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON public.api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(key_hash) WHERE revoked_at IS NULL;

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- RLS Policies for api_keys
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
-- 3. FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function to automatically create user_settings on signup
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

-- Function to update last_used_at for API keys (called by service role)
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

-- Function to check if a user is an admin (callable from server)
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

-- ----------------------------------------------------------------------------
-- 4. TRIGGERS
-- ----------------------------------------------------------------------------

-- Trigger to create user_settings when a new user signs up
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- Migration Complete!
-- ============================================================================
-- Next steps:
-- 1. Set admin status for your first admin user:
--    UPDATE user_settings SET is_admin = true WHERE user_id = 'your-user-id';
-- 2. Create API keys via the /account dashboard
-- 3. Use API keys with: Authorization: Bearer cite_live_...
-- ============================================================================
