import { getSupabaseAdmin } from './supabase-admin';
import { dev } from '$app/environment';
import type { User } from '@supabase/supabase-js';

/**
 * Check if a user is an admin
 * In development mode, always returns true for convenience
 */
export async function isAdmin(userId: string): Promise<boolean> {
	// In dev mode, allow all access
	if (dev) {
		return true;
	}

	const admin = getSupabaseAdmin();

	const { data, error } = await admin.rpc('is_user_admin', { user_id_param: userId });

	if (error) {
		console.error('Error checking admin status:', error);
		return false;
	}

	return data ?? false;
}

/**
 * Set admin status for a user
 * Only callable by service role (server-side)
 */
export async function setAdminStatus(userId: string, isAdmin: boolean): Promise<void> {
	const admin = getSupabaseAdmin();

	const { error } = await admin
		.from('user_settings')
		.update({ is_admin: isAdmin, updated_at: new Date().toISOString() })
		.eq('user_id', userId);

	if (error) {
		throw new Error(`Failed to set admin status: ${error.message}`);
	}
}

/**
 * Get all users with their settings
 */
export async function getAllUsers() {
	const admin = getSupabaseAdmin();

	// Get all users from auth.users
	const { data: authUsers, error: authError } = await admin.auth.admin.listUsers();

	if (authError) {
		throw new Error(`Failed to list users: ${authError.message}`);
	}

	// Get user settings
	const { data: settings, error: settingsError } = await admin
		.from('user_settings')
		.select('*');

	if (settingsError) {
		throw new Error(`Failed to get user settings: ${settingsError.message}`);
	}

	// Merge auth users with settings
	const settingsMap = new Map(settings?.map((s) => [s.user_id, s]) ?? []);

	return authUsers.users.map((user) => {
		const userSettings = settingsMap.get(user.id);
		return {
			id: user.id,
			email: user.email,
			created_at: user.created_at,
			last_sign_in_at: user.last_sign_in_at,
			is_admin: userSettings?.is_admin ?? false,
			email_confirmed_at: user.email_confirmed_at
		};
	});
}

/**
 * Get admin statistics
 */
export async function getAdminStats() {
	const admin = getSupabaseAdmin();

	// Get total users
	const { count: totalUsers, error: usersError } = await admin
		.from('user_settings')
		.select('*', { count: 'exact', head: true });

	if (usersError) {
		console.error('Supabase error counting users:', usersError);
		throw new Error(`Failed to count users: ${usersError.message || JSON.stringify(usersError)}`);
	}

	// Get total API keys
	const { count: totalKeys, error: keysError } = await admin
		.from('api_keys')
		.select('*', { count: 'exact', head: true });

	if (keysError) {
		console.error('Supabase error counting API keys:', keysError);
		throw new Error(`Failed to count API keys: ${keysError.message || JSON.stringify(keysError)}`);
	}

	// Get active (non-revoked) API keys
	const { count: activeKeys, error: activeKeysError } = await admin
		.from('api_keys')
		.select('*', { count: 'exact', head: true })
		.is('revoked_at', null);

	if (activeKeysError) {
		console.error('Supabase error counting active keys:', activeKeysError);
		throw new Error(`Failed to count active keys: ${activeKeysError.message || JSON.stringify(activeKeysError)}`);
	}

	// Get total API requests
	const { data: requestData, error: requestError } = await admin
		.from('api_keys')
		.select('request_count');

	if (requestError) {
		console.error('Supabase error getting request counts:', requestError);
		throw new Error(`Failed to get request counts: ${requestError.message || JSON.stringify(requestError)}`);
	}

	const totalRequests = requestData?.reduce((sum, row) => sum + (row.request_count || 0), 0) ?? 0;

	return {
		totalUsers: totalUsers ?? 0,
		totalKeys: totalKeys ?? 0,
		activeKeys: activeKeys ?? 0,
		revokedKeys: (totalKeys ?? 0) - (activeKeys ?? 0),
		totalRequests
	};
}

/**
 * Get all API keys across all users
 */
export async function getAllApiKeys() {
	const admin = getSupabaseAdmin();

	const { data, error } = await admin
		.from('api_keys')
		.select('*')
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(`Failed to list API keys: ${error.message}`);
	}

	return data;
}
