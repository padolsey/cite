import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser } from '$lib/auth/supabase-server';
import { isAdmin, getAllUsers, getAdminStats, getAllApiKeys, setAdminStatus } from '$lib/auth/admin';
import { dev } from '$app/environment';

// GET /api/admin - Get admin dashboard data
export const GET: RequestHandler = async (event) => {
	// In dev mode, skip auth checks
	if (!dev) {
		const user = await getUser(event);

		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userIsAdmin = await isAdmin(user.id);

		if (!userIsAdmin) {
			return json({ error: 'Forbidden - Admin access required' }, { status: 403 });
		}
	}

	try {
		const [stats, users, apiKeys] = await Promise.all([
			getAdminStats(),
			getAllUsers(),
			getAllApiKeys()
		]);

		return json({
			stats,
			users,
			apiKeys
		});
	} catch (error) {
		console.error('Error fetching admin data:', error);
		return json({ error: 'Failed to fetch admin data' }, { status: 500 });
	}
};

// POST /api/admin - Update user admin status
export const POST: RequestHandler = async (event) => {
	// In dev mode, skip auth checks
	if (!dev) {
		const user = await getUser(event);

		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userIsAdmin = await isAdmin(user.id);

		if (!userIsAdmin) {
			return json({ error: 'Forbidden - Admin access required' }, { status: 403 });
		}
	}

	try {
		const body = await event.request.json();
		const { userId, isAdmin: newAdminStatus } = body;

		if (!userId || typeof newAdminStatus !== 'boolean') {
			return json({ error: 'Invalid request body' }, { status: 400 });
		}

		await setAdminStatus(userId, newAdminStatus);

		return json({ success: true });
	} catch (error) {
		console.error('Error updating admin status:', error);
		return json({ error: 'Failed to update admin status' }, { status: 500 });
	}
};

// DELETE /api/admin?action=revoke-key&keyId=xxx - Revoke an API key (admin only)
export const DELETE: RequestHandler = async (event) => {
	// In dev mode, skip auth checks
	if (!dev) {
		const user = await getUser(event);

		if (!user) {
			return json({ error: 'Unauthorized' }, { status: 401 });
		}

		const userIsAdmin = await isAdmin(user.id);

		if (!userIsAdmin) {
			return json({ error: 'Forbidden - Admin access required' }, { status: 403 });
		}
	}

	const action = event.url.searchParams.get('action');
	const keyId = event.url.searchParams.get('keyId');

	if (action !== 'revoke-key' || !keyId) {
		return json({ error: 'Invalid request. Use ?action=revoke-key&keyId=xxx' }, { status: 400 });
	}

	try {
		const { getSupabaseAdmin } = await import('$lib/auth/supabase-admin');
		const admin = getSupabaseAdmin();

		const { error } = await admin
			.from('api_keys')
			.update({ revoked_at: new Date().toISOString() })
			.eq('id', keyId);

		if (error) {
			throw new Error(`Failed to revoke API key: ${error.message}`);
		}

		return json({ success: true });
	} catch (error) {
		console.error('Error revoking API key:', error);
		return json({ error: 'Failed to revoke API key' }, { status: 500 });
	}
};
