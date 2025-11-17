import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getUser } from '$lib/auth/supabase-server';
import { createApiKey, listApiKeys, revokeApiKey } from '$lib/auth/api-keys';

// GET /api/keys - List all API keys for the authenticated user
export const GET: RequestHandler = async (event) => {
	const user = await getUser(event);

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const keys = await listApiKeys(user.id);
		return json({ keys });
	} catch (error) {
		console.error('Error listing API keys:', error);
		return json({ error: 'Failed to list API keys' }, { status: 500 });
	}
};

// POST /api/keys - Create a new API key
export const POST: RequestHandler = async (event) => {
	const user = await getUser(event);

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await event.request.json();
		const { name } = body;

		if (!name || typeof name !== 'string') {
			return json({ error: 'Name is required' }, { status: 400 });
		}

		const { id, key } = await createApiKey(user.id, name);

		return json({
			id,
			key,
			warning: 'Save this key securely. It will not be shown again.'
		});
	} catch (error) {
		console.error('Error creating API key:', error);
		return json({ error: 'Failed to create API key' }, { status: 500 });
	}
};

// DELETE /api/keys?id=xxx - Revoke an API key
export const DELETE: RequestHandler = async (event) => {
	const user = await getUser(event);

	if (!user) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	const keyId = event.url.searchParams.get('id');

	if (!keyId) {
		return json({ error: 'Key ID is required' }, { status: 400 });
	}

	try {
		await revokeApiKey(user.id, keyId);
		return json({ success: true });
	} catch (error) {
		console.error('Error revoking API key:', error);
		return json({ error: 'Failed to revoke API key' }, { status: 500 });
	}
};
