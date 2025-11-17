-- Migration: Evaluation Suite System
-- Description: Tables for admin-facing test scenario management, model comparison, and continuous validation
-- Created: 2025-01-17

-- ============================================================================
-- TEST SCENARIOS
-- ============================================================================
-- Individual test cases with expected outputs (ground truth)
CREATE TABLE IF NOT EXISTS public.test_scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  description TEXT,

  -- Input data
  messages JSONB NOT NULL, -- Array of conversation messages: [{ role: 'user', content: '...' }]
  config JSONB DEFAULT '{}'::jsonb, -- Optional config: { user_country, user_age_band, etc. }
  conversation_id TEXT, -- Optional for multi-turn scenarios
  risk_state JSONB, -- Optional for testing state tracking

  -- Expected output (ground truth)
  expected_risk_level TEXT NOT NULL CHECK (expected_risk_level IN ('none', 'low', 'medium', 'high', 'critical')),
  expected_risk_level_range TEXT[] DEFAULT ARRAY[]::TEXT[], -- Acceptable alternatives, e.g., ['high', 'critical']
  expected_risk_types JSONB DEFAULT '[]'::jsonb, -- Array of { type: string, min_confidence: number }
  expected_confidence_min NUMERIC DEFAULT 0.7 CHECK (expected_confidence_min >= 0 AND expected_confidence_min <= 1),

  -- Metadata
  clinical_grounding TEXT, -- E.g., "C-SSRS Level 5", "DSM-5 Psychosis"
  source TEXT, -- E.g., "Northeastern study", "Character.ai lawsuit", "docs/supporting_doc_failure_mode_research.md"
  tags TEXT[] DEFAULT ARRAY[]::TEXT[], -- E.g., ['jailbreak', 'critical', 'multi-turn', 'c-ssrs']
  category TEXT, -- E.g., 'c-ssrs', 'failure-modes', 'cultural', 'edge-cases'

  -- Additional validation rules
  validation_rules JSONB DEFAULT '{}'::jsonb, -- Custom validation logic
  notes TEXT,

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_test_scenarios_tags ON public.test_scenarios USING GIN(tags);
CREATE INDEX idx_test_scenarios_category ON public.test_scenarios(category);
CREATE INDEX idx_test_scenarios_expected_risk_level ON public.test_scenarios(expected_risk_level);
CREATE INDEX idx_test_scenarios_created_at ON public.test_scenarios(created_at DESC);

-- ============================================================================
-- TEST SUITES
-- ============================================================================
-- Groupings of scenarios (e.g., "C-SSRS Suite", "Failure Modes Suite")
CREATE TABLE IF NOT EXISTS public.test_suites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification
  name TEXT NOT NULL,
  description TEXT,

  -- Scenarios in this suite
  scenario_ids UUID[] NOT NULL DEFAULT ARRAY[]::UUID[],

  -- Metadata
  category TEXT, -- E.g., 'clinical', 'safety', 'cultural', 'performance'
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Audit
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_test_suites_category ON public.test_suites(category);
CREATE INDEX idx_test_suites_created_at ON public.test_suites(created_at DESC);

-- ============================================================================
-- TEST RUNS
-- ============================================================================
-- Execution history of test suites
CREATE TABLE IF NOT EXISTS public.test_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- What was run
  suite_id UUID REFERENCES public.test_suites(id) ON DELETE SET NULL,
  suite_name TEXT, -- Snapshot of name at run time
  scenario_ids UUID[] NOT NULL, -- Scenarios included in this run

  -- Configuration
  models TEXT[] NOT NULL, -- E.g., ['anthropic/claude-haiku-4.5', 'anthropic/claude-sonnet-4.5']
  run_mode TEXT NOT NULL DEFAULT 'sequential' CHECK (run_mode IN ('sequential', 'parallel')),
  config JSONB DEFAULT '{}'::jsonb, -- Additional run configuration

  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  total_scenarios INTEGER NOT NULL,
  completed_scenarios INTEGER DEFAULT 0,
  failed_scenarios INTEGER DEFAULT 0,

  -- Aggregate results (computed after completion)
  overall_score NUMERIC, -- 0.0 - 1.0
  weighted_score NUMERIC, -- 0.0 - 1.0 (weighted by scenario criticality)
  total_cost_usd NUMERIC DEFAULT 0.0,
  avg_latency_ms INTEGER,

  -- Results breakdown by model
  results_by_model JSONB DEFAULT '{}'::jsonb, -- { "haiku": { passed: 47, failed: 3, score: 0.94 }, ... }

  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER,

  -- Error handling
  error_message TEXT,

  -- Audit
  run_by UUID REFERENCES auth.users(id)
);

CREATE INDEX idx_test_runs_suite_id ON public.test_runs(suite_id);
CREATE INDEX idx_test_runs_status ON public.test_runs(status);
CREATE INDEX idx_test_runs_started_at ON public.test_runs(started_at DESC);
CREATE INDEX idx_test_runs_completed_at ON public.test_runs(completed_at DESC);

-- ============================================================================
-- TEST RESULTS
-- ============================================================================
-- Individual scenario results within a run
CREATE TABLE IF NOT EXISTS public.test_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Linkage
  run_id UUID NOT NULL REFERENCES public.test_runs(id) ON DELETE CASCADE,
  scenario_id UUID NOT NULL REFERENCES public.test_scenarios(id) ON DELETE CASCADE,
  model TEXT NOT NULL, -- E.g., 'anthropic/claude-haiku-4.5'

  -- Actual output from API
  actual_risk_level TEXT NOT NULL,
  actual_risk_types JSONB, -- Array of { type: string, confidence: number }
  actual_confidence NUMERIC,

  -- Evaluation
  passed BOOLEAN NOT NULL,
  score NUMERIC NOT NULL CHECK (score >= 0 AND score <= 1), -- 0.0 - 1.0
  grading_details JSONB NOT NULL, -- Detailed breakdown of why this score

  -- Performance metrics
  latency_ms INTEGER NOT NULL,
  cost_usd NUMERIC DEFAULT 0.0,

  -- Full request/response for debugging
  request JSONB NOT NULL, -- Full EvaluateRequest
  response JSONB NOT NULL, -- Full EvaluateResponse

  -- Error handling
  error BOOLEAN DEFAULT FALSE,
  error_message TEXT,

  -- Timing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_test_results_run_id ON public.test_results(run_id);
CREATE INDEX idx_test_results_scenario_id ON public.test_results(scenario_id);
CREATE INDEX idx_test_results_model ON public.test_results(model);
CREATE INDEX idx_test_results_passed ON public.test_results(passed);
CREATE INDEX idx_test_results_score ON public.test_results(score);
CREATE INDEX idx_test_results_created_at ON public.test_results(created_at DESC);

-- Composite index for common queries
CREATE INDEX idx_test_results_run_model ON public.test_results(run_id, model);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.test_scenarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_results ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins can manage test scenarios" ON public.test_scenarios
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.is_admin = true
    )
  );

CREATE POLICY "Admins can manage test suites" ON public.test_suites
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.is_admin = true
    )
  );

CREATE POLICY "Admins can view and create test runs" ON public.test_runs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.is_admin = true
    )
  );

CREATE POLICY "Admins can view test results" ON public.test_results
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_settings
      WHERE user_settings.user_id = auth.uid()
      AND user_settings.is_admin = true
    )
  );

-- Service role can insert results (for the orchestration engine)
CREATE POLICY "Service role can insert test results" ON public.test_results
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function: Get scenarios for a suite
CREATE OR REPLACE FUNCTION public.get_suite_scenarios(suite_uuid UUID)
RETURNS SETOF public.test_scenarios
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT s.*
  FROM public.test_scenarios s
  JOIN public.test_suites suite ON s.id = ANY(suite.scenario_ids)
  WHERE suite.id = suite_uuid
  ORDER BY array_position(suite.scenario_ids, s.id);
$$;

-- Function: Calculate suite statistics
CREATE OR REPLACE FUNCTION public.calculate_run_statistics(run_uuid UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result JSONB;
  model_stats JSONB;
BEGIN
  -- Overall statistics
  WITH overall AS (
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE passed = true) as passed_count,
      COUNT(*) FILTER (WHERE passed = false) as failed_count,
      AVG(score) as avg_score,
      SUM(cost_usd) as total_cost,
      AVG(latency_ms) as avg_latency
    FROM public.test_results
    WHERE run_id = run_uuid
  ),
  -- Statistics by model
  by_model AS (
    SELECT
      model,
      jsonb_build_object(
        'total', COUNT(*),
        'passed', COUNT(*) FILTER (WHERE passed = true),
        'failed', COUNT(*) FILTER (WHERE passed = false),
        'score', AVG(score),
        'cost_usd', SUM(cost_usd),
        'avg_latency_ms', AVG(latency_ms)
      ) as stats
    FROM public.test_results
    WHERE run_id = run_uuid
    GROUP BY model
  )
  SELECT jsonb_build_object(
    'overall', row_to_json(o.*)::jsonb,
    'by_model', jsonb_object_agg(bm.model, bm.stats)
  ) INTO result
  FROM overall o
  CROSS JOIN by_model bm;

  RETURN result;
END;
$$;

-- Function: Update run aggregates (call after run completes)
CREATE OR REPLACE FUNCTION public.finalize_test_run(run_uuid UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  stats JSONB;
BEGIN
  -- Calculate statistics
  stats := public.calculate_run_statistics(run_uuid);

  -- Update test_runs table
  UPDATE public.test_runs
  SET
    status = 'completed',
    completed_at = NOW(),
    duration_ms = EXTRACT(EPOCH FROM (NOW() - started_at)) * 1000,
    overall_score = (stats->'overall'->>'avg_score')::numeric,
    total_cost_usd = (stats->'overall'->>'total_cost')::numeric,
    avg_latency_ms = (stats->'overall'->>'avg_latency')::integer,
    completed_scenarios = (stats->'overall'->>'passed_count')::integer + (stats->'overall'->>'failed_count')::integer,
    failed_scenarios = (stats->'overall'->>'failed_count')::integer,
    results_by_model = stats->'by_model'
  WHERE id = run_uuid;
END;
$$;

-- Function: Update timestamp on update
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Triggers for updated_at
CREATE TRIGGER update_test_scenarios_updated_at
  BEFORE UPDATE ON public.test_scenarios
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_test_suites_updated_at
  BEFORE UPDATE ON public.test_suites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================

-- Grant service role full access (needed for orchestration engine)
GRANT ALL ON public.test_scenarios TO service_role;
GRANT ALL ON public.test_suites TO service_role;
GRANT ALL ON public.test_runs TO service_role;
GRANT ALL ON public.test_results TO service_role;

-- Grant authenticated users read access (RLS policies will further restrict)
GRANT SELECT ON public.test_scenarios TO authenticated;
GRANT SELECT ON public.test_suites TO authenticated;
GRANT SELECT ON public.test_runs TO authenticated;
GRANT SELECT ON public.test_results TO authenticated;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.get_suite_scenarios TO authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_run_statistics TO authenticated;
GRANT EXECUTE ON FUNCTION public.finalize_test_run TO service_role;
