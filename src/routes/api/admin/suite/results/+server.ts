/**
 * Delete all test results and runs
 */
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSupabaseAdmin } from '$lib/auth/supabase-admin';
import { getUser } from '$lib/auth/supabase-server';
import { isAdmin } from '$lib/auth/admin';

const supabase = getSupabaseAdmin();

/**
 * DELETE /api/admin/suite/results
 * Delete all test results and runs (keeps scenarios and suites)
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

  try {
    // Delete all test results first (foreign key constraint)
    const { error: resultsErr } = await supabase.from('test_results').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (resultsErr) throw resultsErr;

    // Delete all test runs
    const { error: runsErr } = await supabase.from('test_runs').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (runsErr) throw runsErr;

    return json({ success: true, message: 'All test results and runs deleted successfully' });
  } catch (err: any) {
    console.error('Error deleting results:', err);
    throw error(500, err.message || 'Internal server error');
  }
};
