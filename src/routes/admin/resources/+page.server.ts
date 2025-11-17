/**
 * Admin Resources Page - Server Logic
 *
 * Loads resources and handles CRUD operations
 */

import { redirect, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { getSupabaseAdmin } from '$lib/auth/supabase-admin';
import { getUser } from '$lib/auth/supabase-server';

export const load: PageServerLoad = async (event) => {
	const user = await getUser(event);

	if (!user) {
		throw redirect(303, '/login');
	}

	// Check if user is admin
	const supabase = getSupabaseAdmin();
	const { data: settings } = await supabase
		.from('user_settings')
		.select('is_admin')
		.eq('user_id', user.id)
		.single();

	if (!settings?.is_admin) {
		throw redirect(303, '/account');
	}

	// Load all resources (including disabled)
	const { data: resources, error } = await supabase
		.from('crisis_resources')
		.select('*')
		.order('country_code', { ascending: true })
		.order('display_order', { ascending: true })
		.order('name', { ascending: true });

	if (error) {
		console.error('Error loading resources:', error);
		return {
			resources: [],
			error: 'Failed to load resources',
		};
	}

	// Get unique country codes
	const countries = new Set<string>();
	(resources || []).forEach((r) => countries.add(r.country_code));

	return {
		resources: resources || [],
		countries: Array.from(countries).sort(),
	};
};

export const actions = {
	/**
	 * Create a new resource
	 */
	create: async (event) => {
		const user = await getUser(event);
		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const supabase = getSupabaseAdmin();

		// Verify admin
		const { data: settings } = await supabase
			.from('user_settings')
			.select('is_admin')
			.eq('user_id', user.id)
			.single();

		if (!settings?.is_admin) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await event.request.formData();
		const country_code = formData.get('country_code') as string;
		const name = formData.get('name') as string;
		const type = formData.get('type') as string;
		const phone = formData.get('phone') as string | null;
		const text_instructions = formData.get('text_instructions') as string | null;
		const chat_url = formData.get('chat_url') as string | null;
		const availability = formData.get('availability') as string | null;
		const languages = formData.get('languages') as string; // comma-separated
		const description = formData.get('description') as string | null;
		const display_order = parseInt(formData.get('display_order') as string, 10) || 100;
		const enabled = formData.get('enabled') === 'true';

		// Enhanced metadata fields
		const service_scope = formData.get('service_scope') as string | null;
		const population_served = formData.get('population_served') as string | null;
		const requires_callback = formData.get('requires_callback') === 'true';
		const alternative_numbers = formData.get('alternative_numbers') as string | null;
		const website_url = formData.get('website_url') as string | null;
		const notes = formData.get('notes') as string | null;

		// Validate required fields
		if (!country_code || !name || !type) {
			return fail(400, { error: 'Missing required fields' });
		}

		// Validate contact method
		if (!phone && !text_instructions && !chat_url) {
			return fail(400, { error: 'At least one contact method required' });
		}

		// Parse languages
		const languagesArray = languages
			.split(',')
			.map((l) => l.trim())
			.filter((l) => l.length > 0);

		// Parse service scope
		const serviceScopeArray = service_scope
			? service_scope.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
			: [];

		// Parse population served
		const populationServedArray = population_served
			? population_served.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
			: [];

		// Parse alternative numbers JSON
		let alternativeNumbersJson = null;
		if (alternative_numbers && alternative_numbers.trim()) {
			try {
				alternativeNumbersJson = JSON.parse(alternative_numbers);
			} catch (e) {
				return fail(400, { error: 'Invalid JSON format for alternative numbers' });
			}
		}

		// Insert resource
		const { error } = await supabase.from('crisis_resources').insert({
			country_code: country_code.toUpperCase(),
			name,
			type,
			phone: phone || null,
			text_instructions: text_instructions || null,
			chat_url: chat_url || null,
			availability: availability || null,
			languages: languagesArray,
			description: description || null,
			display_order,
			enabled,
			service_scope: serviceScopeArray.length > 0 ? serviceScopeArray : null,
			population_served: populationServedArray.length > 0 ? populationServedArray : null,
			requires_callback,
			alternative_numbers: alternativeNumbersJson,
			website_url: website_url || null,
			notes: notes || null,
			created_by: user.id,
		});

		if (error) {
			console.error('Error creating resource:', error);
			return fail(500, { error: 'Failed to create resource' });
		}

		return { success: true };
	},

	/**
	 * Update an existing resource
	 */
	update: async (event) => {
		const user = await getUser(event);
		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const supabase = getSupabaseAdmin();

		// Verify admin
		const { data: settings } = await supabase
			.from('user_settings')
			.select('is_admin')
			.eq('user_id', user.id)
			.single();

		if (!settings?.is_admin) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await event.request.formData();
		const id = formData.get('id') as string;
		const country_code = formData.get('country_code') as string;
		const name = formData.get('name') as string;
		const type = formData.get('type') as string;
		const phone = formData.get('phone') as string | null;
		const text_instructions = formData.get('text_instructions') as string | null;
		const chat_url = formData.get('chat_url') as string | null;
		const availability = formData.get('availability') as string | null;
		const languages = formData.get('languages') as string;
		const description = formData.get('description') as string | null;
		const display_order = parseInt(formData.get('display_order') as string, 10) || 100;
		const enabled = formData.get('enabled') === 'true';

		// Enhanced metadata fields
		const service_scope = formData.get('service_scope') as string | null;
		const population_served = formData.get('population_served') as string | null;
		const requires_callback = formData.get('requires_callback') === 'true';
		const alternative_numbers = formData.get('alternative_numbers') as string | null;
		const website_url = formData.get('website_url') as string | null;
		const notes = formData.get('notes') as string | null;

		if (!id) {
			return fail(400, { error: 'Missing resource ID' });
		}

		// Parse languages
		const languagesArray = languages
			.split(',')
			.map((l) => l.trim())
			.filter((l) => l.length > 0);

		// Parse service scope
		const serviceScopeArray = service_scope
			? service_scope.split(',').map((s) => s.trim()).filter((s) => s.length > 0)
			: [];

		// Parse population served
		const populationServedArray = population_served
			? population_served.split(',').map((p) => p.trim()).filter((p) => p.length > 0)
			: [];

		// Parse alternative numbers JSON
		let alternativeNumbersJson = null;
		if (alternative_numbers && alternative_numbers.trim()) {
			try {
				alternativeNumbersJson = JSON.parse(alternative_numbers);
			} catch (e) {
				return fail(400, { error: 'Invalid JSON format for alternative numbers' });
			}
		}

		// Update resource
		const { error } = await supabase
			.from('crisis_resources')
			.update({
				country_code: country_code.toUpperCase(),
				name,
				type,
				phone: phone || null,
				text_instructions: text_instructions || null,
				chat_url: chat_url || null,
				availability: availability || null,
				languages: languagesArray,
				description: description || null,
				display_order,
				enabled,
				service_scope: serviceScopeArray.length > 0 ? serviceScopeArray : null,
				population_served: populationServedArray.length > 0 ? populationServedArray : null,
				requires_callback,
				alternative_numbers: alternativeNumbersJson,
				website_url: website_url || null,
				notes: notes || null,
				updated_by: user.id,
			})
			.eq('id', id);

		if (error) {
			console.error('Error updating resource:', error);
			return fail(500, { error: 'Failed to update resource' });
		}

		return { success: true };
	},

	/**
	 * Delete a resource
	 */
	delete: async (event) => {
		const user = await getUser(event);
		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const supabase = getSupabaseAdmin();

		// Verify admin
		const { data: settings } = await supabase
			.from('user_settings')
			.select('is_admin')
			.eq('user_id', user.id)
			.single();

		if (!settings?.is_admin) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await event.request.formData();
		const id = formData.get('id') as string;

		if (!id) {
			return fail(400, { error: 'Missing resource ID' });
		}

		// Delete resource
		const { error } = await supabase.from('crisis_resources').delete().eq('id', id);

		if (error) {
			console.error('Error deleting resource:', error);
			return fail(500, { error: 'Failed to delete resource' });
		}

		return { success: true };
	},

	/**
	 * Toggle resource enabled status
	 */
	toggle: async (event) => {
		const user = await getUser(event);
		if (!user) {
			return fail(401, { error: 'Unauthorized' });
		}

		const supabase = getSupabaseAdmin();

		// Verify admin
		const { data: settings } = await supabase
			.from('user_settings')
			.select('is_admin')
			.eq('user_id', user.id)
			.single();

		if (!settings?.is_admin) {
			return fail(403, { error: 'Forbidden' });
		}

		const formData = await event.request.formData();
		const id = formData.get('id') as string;
		const enabled = formData.get('enabled') === 'true';

		if (!id) {
			return fail(400, { error: 'Missing resource ID' });
		}

		// Toggle enabled status
		const { error } = await supabase
			.from('crisis_resources')
			.update({
				enabled,
				updated_by: user.id,
			})
			.eq('id', id);

		if (error) {
			console.error('Error toggling resource:', error);
			return fail(500, { error: 'Failed to toggle resource' });
		}

		return { success: true };
	},
} satisfies Actions;
