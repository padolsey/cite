-- Migration: Add Archiving Support
-- Description: Add archiving functionality for scenarios (immutable approach)
-- Created: 2025-01-17

-- Add archived flag to scenarios
ALTER TABLE public.test_scenarios
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS copied_from UUID REFERENCES public.test_scenarios(id);

-- Index for filtering archived scenarios
CREATE INDEX IF NOT EXISTS idx_test_scenarios_archived ON public.test_scenarios(archived);

-- Add version tracking to scenarios
ALTER TABLE public.test_scenarios
ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;

-- Update existing scenarios to version 1
UPDATE public.test_scenarios SET version = 1 WHERE version IS NULL;

-- Add archived flag to suites (for completeness, though suites can be edited)
ALTER TABLE public.test_suites
ADD COLUMN IF NOT EXISTS archived BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_test_suites_archived ON public.test_suites(archived);

-- Function to archive a scenario
CREATE OR REPLACE FUNCTION public.archive_scenario(
  scenario_uuid UUID,
  user_uuid UUID
) RETURNS void AS $$
BEGIN
  UPDATE public.test_scenarios
  SET
    archived = true,
    archived_at = NOW(),
    archived_by = user_uuid,
    updated_at = NOW(),
    updated_by = user_uuid
  WHERE id = scenario_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to copy a scenario
CREATE OR REPLACE FUNCTION public.copy_scenario(
  scenario_uuid UUID,
  user_uuid UUID,
  new_name TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_scenario_id UUID;
  original_scenario RECORD;
  new_version INTEGER;
BEGIN
  -- Get original scenario
  SELECT * INTO original_scenario
  FROM public.test_scenarios
  WHERE id = scenario_uuid;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Scenario not found';
  END IF;

  -- Calculate new version
  SELECT COALESCE(MAX(version), 0) + 1 INTO new_version
  FROM public.test_scenarios
  WHERE copied_from = scenario_uuid OR id = scenario_uuid;

  -- Create copy
  INSERT INTO public.test_scenarios (
    name,
    description,
    messages,
    config,
    conversation_id,
    risk_state,
    expected_risk_level,
    expected_risk_level_range,
    expected_risk_types,
    expected_confidence_min,
    clinical_grounding,
    source,
    tags,
    category,
    validation_rules,
    notes,
    created_by,
    updated_by,
    copied_from,
    version
  ) VALUES (
    COALESCE(new_name, original_scenario.name || ' (v' || new_version || ')'),
    original_scenario.description,
    original_scenario.messages,
    original_scenario.config,
    original_scenario.conversation_id,
    original_scenario.risk_state,
    original_scenario.expected_risk_level,
    original_scenario.expected_risk_level_range,
    original_scenario.expected_risk_types,
    original_scenario.expected_confidence_min,
    original_scenario.clinical_grounding,
    original_scenario.source,
    array_append(original_scenario.tags, 'v' || new_version || '-of-' || scenario_uuid::text),
    original_scenario.category,
    original_scenario.validation_rules,
    'Copied from: ' || original_scenario.name || ' (' || scenario_uuid::text || ')',
    user_uuid,
    user_uuid,
    scenario_uuid,
    new_version
  )
  RETURNING id INTO new_scenario_id;

  RETURN new_scenario_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.archive_scenario(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.copy_scenario(UUID, UUID, TEXT) TO authenticated;

COMMENT ON FUNCTION public.archive_scenario IS 'Archives a scenario (soft delete) - scenarios are immutable';
COMMENT ON FUNCTION public.copy_scenario IS 'Creates a copy of a scenario for editing - returns new scenario ID';
