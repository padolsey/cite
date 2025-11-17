import { getSupabaseAdmin } from './supabase-admin';

/**
 * Generate a secure API key
 * Format: cite_live_xxxxxxxxxxxxxxxxxxxxxxxx (32 chars after prefix)
 */
export function generateApiKey(): string {
	const prefix = 'cite_live_';
	const randomBytes = crypto.getRandomValues(new Uint8Array(24));
	const randomString = Array.from(randomBytes)
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
	return prefix + randomString;
}

/**
 * Hash an API key for storage
 */
export async function hashApiKey(key: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(key);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify an API key against its hash
 */
export async function verifyApiKey(key: string, hash: string): Promise<boolean> {
	const keyHash = await hashApiKey(key);
	return keyHash === hash;
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
	return /^cite_live_[a-f0-9]{48}$/.test(key);
}

/**
 * Create a new API key for a user
 */
export async function createApiKey(userId: string, name: string): Promise<{ id: string; key: string }> {
	const admin = getSupabaseAdmin();
	const key = generateApiKey();
	const keyHash = await hashApiKey(key);

	const { data, error } = await admin
		.from('api_keys')
		.insert({
			user_id: userId,
			key_hash: keyHash,
			name
		})
		.select('id')
		.single();

	if (error) {
		throw new Error(`Failed to create API key: ${error.message}`);
	}

	return { id: data.id, key };
}

/**
 * Validate an API key and return the associated user ID
 */
export async function validateApiKey(key: string): Promise<string | null> {
	if (!isValidApiKeyFormat(key)) {
		return null;
	}

	const admin = getSupabaseAdmin();
	const keyHash = await hashApiKey(key);

	const { data, error } = await admin
		.from('api_keys')
		.select('user_id, revoked_at')
		.eq('key_hash', keyHash)
		.single();

	if (error || !data || data.revoked_at) {
		return null;
	}

	// Update usage stats (fire and forget)
	admin.rpc('update_api_key_usage', { key_hash_param: keyHash }).then();

	return data.user_id;
}

/**
 * List all API keys for a user
 */
export async function listApiKeys(userId: string) {
	const admin = getSupabaseAdmin();

	const { data, error } = await admin
		.from('api_keys')
		.select('id, name, created_at, last_used_at, revoked_at, request_count')
		.eq('user_id', userId)
		.order('created_at', { ascending: false });

	if (error) {
		throw new Error(`Failed to list API keys: ${error.message}`);
	}

	return data;
}

/**
 * Revoke an API key
 */
export async function revokeApiKey(userId: string, keyId: string): Promise<void> {
	const admin = getSupabaseAdmin();

	const { error } = await admin
		.from('api_keys')
		.update({ revoked_at: new Date().toISOString() })
		.eq('id', keyId)
		.eq('user_id', userId);

	if (error) {
		throw new Error(`Failed to revoke API key: ${error.message}`);
	}
}
