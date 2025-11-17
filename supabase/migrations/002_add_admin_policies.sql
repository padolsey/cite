-- ============================================================================
-- Add Admin Policies for API Keys
-- ============================================================================
-- This migration adds policies that allow admins to view and manage all API keys
-- across all users (for admin dashboard purposes).
-- ============================================================================

-- Allow admins to view all API keys
CREATE POLICY "Admins can view all API keys"
  ON public.api_keys
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to view all API keys (even revoked ones)
-- Note: This supplements the user-specific policies
CREATE POLICY "Admins can update any API key"
  ON public.api_keys
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Allow admins to delete any API key
CREATE POLICY "Admins can delete any API key"
  ON public.api_keys
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
