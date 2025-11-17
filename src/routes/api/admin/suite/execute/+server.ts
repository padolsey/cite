/**
 * Execute Test Run API
 *
 * Executes a test run and stores results in database
 * Long-running operation with progress updates
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabaseAdmin } from '$lib/auth/supabase-admin';
import { getUser } from '$lib/auth/supabase-server';
import { isAdmin } from '$lib/auth/admin';
import { SuiteRunner } from '../../../../../../lib/suite-runner/SuiteRunner';

const supabase = getSupabaseAdmin();

/**
 * POST /api/admin/suite/execute
 * Body: { run_id: string }
 *
 * Executes a test run asynchronously
 */
export const POST: RequestHandler = async (event) => {
  const user = await getUser(event);
  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Check admin status
  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    throw error(403, 'Forbidden - Admin access required');
  }

  const { run_id } = await event.request.json();
  const { url } = event;

  if (!run_id) {
    throw error(400, 'run_id required');
  }

  try {
    // Get run details
    const { data: run, error: runErr } = await supabase
      .from('test_runs')
      .select('*')
      .eq('id', run_id)
      .single();

    if (runErr) throw runErr;
    if (!run) throw new Error('Run not found');

    if (run.status !== 'pending') {
      throw error(400, `Run is ${run.status}, cannot execute`);
    }

    // Update status to running
    await supabase.from('test_runs').update({ status: 'running' }).eq('id', run_id);

    // Get scenarios
    const { data: scenarios, error: scenariosErr } = await supabase
      .from('test_scenarios')
      .select('*')
      .in('id', run.scenario_ids);

    if (scenariosErr) throw scenariosErr;
    if (!scenarios || scenarios.length === 0) {
      throw new Error('No scenarios found');
    }

    // Execute in background (don't await)
    executeRunInBackground(run_id, run, scenarios, url.origin);

    return json({ success: true, message: 'Execution started' });
  } catch (err: any) {
    console.error('Execute API error:', err);

    // Update run status to failed
    await supabase
      .from('test_runs')
      .update({
        status: 'failed',
        error_message: err.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', run_id);

    throw error(500, err.message || 'Internal server error');
  }
};

/**
 * Execute run in background
 */
async function executeRunInBackground(
  runId: string,
  run: any,
  scenarios: any[],
  origin: string
) {
  try {
    // Create runner (use first admin's API key or service key)
    // Note: In production, you'd have a dedicated service API key
    const runner = new SuiteRunner(
      origin,
      process.env.OPENROUTER_API_KEY || '', // Fallback for now
      async (completed, total, current) => {
        // Update progress in database
        await supabase
          .from('test_runs')
          .update({
            completed_scenarios: completed,
          })
          .eq('id', runId);
      }
    );

    // Run all scenarios
    const results = await runner.runScenarios(scenarios, run.models, run.run_mode);

    // Store results
    for (const result of results) {
      await supabase.from('test_results').insert({
        run_id: runId,
        scenario_id: result.scenario_id,
        model: result.model,
        actual_risk_level: result.actual_risk_level,
        actual_risk_types: result.actual_risk_types || null,
        actual_confidence: result.actual_confidence,
        passed: result.passed,
        score: result.score,
        grading_details: result.grading_details,
        latency_ms: result.latency_ms,
        cost_usd: result.cost_usd,
        request: result.request,
        response: result.response,
        error: !result.passed && result.score === 0,
        error_message: result.score === 0 ? result.grading_details.reasoning : null,
      });
    }

    // Finalize run (calculate aggregates)
    await supabase.rpc('finalize_test_run', { run_uuid: runId });
  } catch (err: any) {
    console.error('Background execution error:', err);

    // Update run to failed
    await supabase
      .from('test_runs')
      .update({
        status: 'failed',
        error_message: err.message,
        completed_at: new Date().toISOString(),
      })
      .eq('id', runId);
  }
}
