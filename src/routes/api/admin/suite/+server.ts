/**
 * Admin Suite API
 *
 * Endpoints for managing test scenarios, suites, and runs
 * Requires admin authentication
 */

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabaseAdmin } from '$lib/auth/supabase-admin';
import { getUser } from '$lib/auth/supabase-server';
import { isAdmin } from '$lib/auth/admin';

const supabase = getSupabaseAdmin();

/**
 * GET /api/admin/suite
 * Query parameters:
 *   - type: 'scenarios' | 'suites' | 'runs' | 'results'
 *   - id: UUID (optional, for single item)
 *   - suite_id: UUID (optional, for filtering)
 *   - run_id: UUID (optional, for filtering)
 *   - category: string (optional, for filtering scenarios/suites)
 *   - tags: string[] (optional, for filtering)
 *   - limit: number (default: 100)
 *   - offset: number (default: 0)
 */
export const GET: RequestHandler = async (event) => {
  const user = await getUser(event);
  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Check admin status
  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    throw error(403, 'Forbidden - Admin access required');
  }

  const { url } = event;

  const type = url.searchParams.get('type') || 'scenarios';
  const id = url.searchParams.get('id');
  const suiteId = url.searchParams.get('suite_id');
  const runId = url.searchParams.get('run_id');
  const category = url.searchParams.get('category');
  const tags = url.searchParams.getAll('tags');
  const showArchived = url.searchParams.get('show_archived') === 'true';
  const limit = parseInt(url.searchParams.get('limit') || '100');
  const offset = parseInt(url.searchParams.get('offset') || '0');

  try {
    switch (type) {
      case 'scenarios':
        return await getScenarios(id, category, tags, showArchived, limit, offset);

      case 'suites':
        return await getSuites(id, category, showArchived, limit, offset);

      case 'runs':
        return await getRuns(id, suiteId, limit, offset);

      case 'results':
        if (!runId) {
          throw error(400, 'run_id required for results query');
        }
        return await getResults(runId, limit, offset);

      case 'stats':
        return await getStats();

      default:
        throw error(400, `Invalid type: ${type}`);
    }
  } catch (err: any) {
    console.error('Suite API GET error:', err);
    throw error(500, err.message || 'Internal server error');
  }
};

/**
 * POST /api/admin/suite
 * Body depends on action:
 *   - action: 'create_scenario' | 'create_suite' | 'start_run'
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

  const body = await event.request.json();
  const { action } = body;

  try {
    switch (action) {
      case 'create_scenario':
        return await createScenario(body.scenario, user.id);

      case 'create_suite':
        return await createSuite(body.suite, user.id);

      case 'start_run':
        return await startRun(body.run, user.id);

      case 'archive_scenario':
        return await archiveScenario(body.scenario_id, user.id);

      case 'copy_scenario':
        return await copyScenario(body.scenario_id, user.id, body.new_name);

      case 'archive_suite':
        return await archiveSuite(body.suite_id, user.id);

      default:
        throw error(400, `Invalid action: ${action}`);
    }
  } catch (err: any) {
    console.error('Suite API POST error:', err);
    throw error(500, err.message || 'Internal server error');
  }
};

/**
 * PUT /api/admin/suite
 * Update scenario or suite
 */
export const PUT: RequestHandler = async (event) => {
  const user = await getUser(event);
  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Check admin status
  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    throw error(403, 'Forbidden - Admin access required');
  }

  const body = await event.request.json();
  const { type, id, data } = body;

  try {
    switch (type) {
      case 'scenario':
        return await updateScenario(id, data, user.id);

      case 'suite':
        return await updateSuite(id, data, user.id);

      default:
        throw error(400, `Invalid type: ${type}`);
    }
  } catch (err: any) {
    console.error('Suite API PUT error:', err);
    throw error(500, err.message || 'Internal server error');
  }
};

/**
 * DELETE /api/admin/suite
 * Delete scenario or suite
 */
export const DELETE: RequestHandler = async (event) => {
  const user = await getUser(event);
  if (!user) {
    throw error(401, 'Unauthorized');
  }

  // Check admin status
  const userIsAdmin = await isAdmin(user.id);
  if (!userIsAdmin) {
    throw error(403, 'Forbidden - Admin access required');
  }

  const { url } = event;
  const type = url.searchParams.get('type');
  const id = url.searchParams.get('id');

  if (!type || !id) {
    throw error(400, 'type and id required');
  }

  try {
    switch (type) {
      case 'scenario':
        return await deleteScenario(id);

      case 'suite':
        return await deleteSuite(id);

      default:
        throw error(400, `Invalid type: ${type}`);
    }
  } catch (err: any) {
    console.error('Suite API DELETE error:', err);
    throw error(500, err.message || 'Internal server error');
  }
};

// ============================================================================
// Helper Functions
// ============================================================================

async function getScenarios(
  id: string | null,
  category: string | null,
  tags: string[],
  showArchived: boolean,
  limit: number,
  offset: number
) {
  if (id) {
    const { data, error: err } = await supabase
      .from('test_scenarios')
      .select('*')
      .eq('id', id)
      .single();

    if (err) throw err;
    return json({ data, count: null });
  }

  let query = supabase.from('test_scenarios').select('*');

  // Filter out archived scenarios by default
  if (!showArchived) {
    query = query.eq('archived', false);
  }
  if (category) {
    query = query.eq('category', category);
  }
  if (tags.length > 0) {
    query = query.contains('tags', tags);
  }
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error: err, count } = await query;

  if (err) throw err;

  return json({ data, count });
}

async function getSuites(
  id: string | null,
  category: string | null,
  showArchived: boolean,
  limit: number,
  offset: number
) {
  if (id) {
    const { data, error: err } = await supabase
      .from('test_suites')
      .select('*')
      .eq('id', id)
      .single();

    if (err) throw err;
    return json({ data, count: null });
  }

  let query = supabase.from('test_suites').select('*');

  // Filter out archived suites by default
  if (!showArchived) {
    query = query.eq('archived', false);
  }
  if (category) {
    query = query.eq('category', category);
  }
  query = query.order('created_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error: err, count } = await query;

  if (err) throw err;

  return json({ data, count });
}

async function getRuns(
  id: string | null,
  suiteId: string | null,
  limit: number,
  offset: number
) {
  if (id) {
    const { data, error: err } = await supabase
      .from('test_runs')
      .select('*')
      .eq('id', id)
      .single();

    if (err) throw err;
    return json({ data, count: null });
  }

  let query = supabase.from('test_runs').select('*');

  if (suiteId) {
    query = query.eq('suite_id', suiteId);
  }
  query = query.order('started_at', { ascending: false }).range(offset, offset + limit - 1);

  const { data, error: err, count } = await query;

  if (err) throw err;

  return json({ data, count });
}

async function getResults(runId: string, limit: number, offset: number) {
  const { data, error: err, count } = await supabase
    .from('test_results')
    .select('*')
    .eq('run_id', runId)
    .order('created_at', { ascending: true })
    .range(offset, offset + limit - 1);

  if (err) throw err;

  return json({ data, count });
}

async function getStats() {
  // Get counts for dashboard
  const [scenariosRes, suitesRes, runsRes] = await Promise.all([
    supabase.from('test_scenarios').select('id', { count: 'exact', head: true }),
    supabase.from('test_suites').select('id', { count: 'exact', head: true }),
    supabase.from('test_runs').select('id', { count: 'exact', head: true }),
  ]);

  // Get recent runs
  const { data: recentRuns } = await supabase
    .from('test_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(5);

  return json({
    counts: {
      scenarios: scenariosRes.count || 0,
      suites: suitesRes.count || 0,
      runs: runsRes.count || 0,
    },
    recentRuns: recentRuns || [],
  });
}

async function createScenario(scenario: any, userId: string) {
  const { data, error: err } = await supabase
    .from('test_scenarios')
    .insert({
      ...scenario,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (err) throw err;

  return json({ data });
}

async function createSuite(suite: any, userId: string) {
  const { data, error: err } = await supabase
    .from('test_suites')
    .insert({
      ...suite,
      created_by: userId,
      updated_by: userId,
    })
    .select()
    .single();

  if (err) throw err;

  return json({ data });
}

async function startRun(runConfig: any, userId: string) {
  const { suite_id, models, run_mode } = runConfig;

  // Get suite and its scenarios
  const { data: suite, error: suiteErr } = await supabase
    .from('test_suites')
    .select('*')
    .eq('id', suite_id)
    .single();

  if (suiteErr) throw suiteErr;
  if (!suite) throw new Error('Suite not found');

  // Create run record
  const { data: run, error: runErr } = await supabase
    .from('test_runs')
    .insert({
      suite_id,
      suite_name: suite.name,
      scenario_ids: suite.scenario_ids,
      models,
      run_mode: run_mode || 'sequential',
      status: 'pending',
      total_scenarios: suite.scenario_ids.length * models.length,
      run_by: userId,
    })
    .select()
    .single();

  if (runErr) throw runErr;

  return json({ data: run });
}

async function updateScenario(id: string, data: any, userId: string) {
  const { data: updated, error: err } = await supabase
    .from('test_scenarios')
    .update({
      ...data,
      updated_by: userId,
    })
    .eq('id', id)
    .select()
    .single();

  if (err) throw err;

  return json({ data: updated });
}

async function updateSuite(id: string, data: any, userId: string) {
  const { data: updated, error: err } = await supabase
    .from('test_suites')
    .update({
      ...data,
      updated_by: userId,
    })
    .eq('id', id)
    .select()
    .single();

  if (err) throw err;

  return json({ data: updated });
}

async function deleteScenario(id: string) {
  const { error: err } = await supabase.from('test_scenarios').delete().eq('id', id);

  if (err) throw err;

  return json({ success: true });
}

async function deleteSuite(id: string) {
  const { error: err } = await supabase.from('test_suites').delete().eq('id', id);

  if (err) throw err;

  return json({ success: true });
}

async function archiveScenario(scenarioId: string, userId: string) {
  const { data, error: err } = await supabase.rpc('archive_scenario', {
    scenario_uuid: scenarioId,
    user_uuid: userId,
  });

  if (err) throw err;

  return json({ success: true, message: 'Scenario archived successfully' });
}

async function copyScenario(scenarioId: string, userId: string, newName?: string) {
  const { data: newScenarioId, error: err } = await supabase.rpc('copy_scenario', {
    scenario_uuid: scenarioId,
    user_uuid: userId,
    new_name: newName || null,
  });

  if (err) throw err;

  return json({ success: true, data: { id: newScenarioId }, message: 'Scenario copied successfully' });
}

async function archiveSuite(suiteId: string, userId: string) {
  const { data, error: err } = await supabase
    .from('test_suites')
    .update({
      archived: true,
      archived_at: new Date().toISOString(),
      archived_by: userId,
      updated_at: new Date().toISOString(),
      updated_by: userId,
    })
    .eq('id', suiteId)
    .select()
    .single();

  if (err) throw err;

  return json({ success: true, message: 'Suite archived successfully' });
}
