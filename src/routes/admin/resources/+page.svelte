<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// State
	let showModal = $state(false);
	let editingResource = $state<any>(null);
	let filterCountry = $state('ALL');
	let filterEnabled = $state('ALL');
	let deleteConfirm = $state<string | null>(null);

	// Resource types
	const resourceTypes = [
		'emergency_number',
		'crisis_line',
		'text_line',
		'chat_service',
		'support_service',
	];

	// Filtered resources
	const filteredResources = $derived(() => {
		return data.resources.filter((r: any) => {
			if (filterCountry !== 'ALL' && r.country_code !== filterCountry) return false;
			if (filterEnabled === 'ENABLED' && !r.enabled) return false;
			if (filterEnabled === 'DISABLED' && r.enabled) return false;
			return true;
		});
	});

	// Open modal for creating
	function openCreateModal() {
		editingResource = {
			country_code: '',
			name: '',
			type: 'crisis_line',
			phone: '',
			text_instructions: '',
			chat_url: '',
			availability: '24/7',
			languages: 'en',
			description: '',
			display_order: 100,
			enabled: true,
			service_scope: '',
			population_served: '',
			requires_callback: false,
			alternative_numbers: '',
			website_url: '',
			notes: '',
		};
		showModal = true;
	}

	// Open modal for editing
	function openEditModal(resource: any) {
		editingResource = {
			...resource,
			languages: resource.languages.join(', '),
			service_scope: resource.service_scope?.join(', ') || '',
			population_served: resource.population_served?.join(', ') || '',
			alternative_numbers: resource.alternative_numbers
				? (typeof resource.alternative_numbers === 'string'
					? resource.alternative_numbers
					: JSON.stringify(resource.alternative_numbers, null, 2))
				: '',
		};
		showModal = true;
	}

	// Close modal
	function closeModal() {
		showModal = false;
		editingResource = null;
	}

	// Delete confirmation
	function confirmDelete(id: string) {
		deleteConfirm = id;
	}

	function cancelDelete() {
		deleteConfirm = null;
	}
</script>

<svelte:head>
	<title>Crisis Resources Admin | CITE</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
	<!-- Header -->
	<header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
			<div class="flex items-center justify-between h-16">
				<div class="flex items-center gap-4">
					<a href="/admin" class="text-gray-600 hover:text-gray-900 transition-colors">
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
						</svg>
					</a>
					<a href="/" class="flex items-center gap-2">
						<div
							class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm"
						>
							C
						</div>
						<span class="font-semibold text-gray-900">CITE Safety</span>
					</a>
					<span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
						ADMIN
					</span>
				</div>

				<div class="flex items-center gap-4">
					<a href="/admin" class="text-sm text-gray-600 hover:text-gray-900">Dashboard</a>
					<a href="/account" class="text-sm text-gray-600 hover:text-gray-900">My Account</a>
				</div>
			</div>
		</div>
	</header>

	<div class="container mx-auto px-4 py-8 max-w-7xl">
		<div class="mb-8">
			<h1 class="text-3xl font-bold mb-2">Crisis Resources Management</h1>
			<p class="text-gray-600">Manage crisis hotlines, text lines, and support services by country</p>
		</div>

	<!-- Filters and Actions -->
	<div class="mb-6 flex flex-wrap gap-4 items-center justify-between">
		<div class="flex gap-4 items-center">
			<!-- Country Filter -->
			<div>
				<label for="country-filter" class="block text-sm font-medium mb-1">Country</label>
				<select
					id="country-filter"
					bind:value={filterCountry}
					class="px-3 py-2 border rounded-md"
				>
					<option value="ALL">All Countries</option>
					{#each data.countries as country}
						<option value={country}>{country}</option>
					{/each}
				</select>
			</div>

			<!-- Status Filter -->
			<div>
				<label for="status-filter" class="block text-sm font-medium mb-1">Status</label>
				<select
					id="status-filter"
					bind:value={filterEnabled}
					class="px-3 py-2 border rounded-md"
				>
					<option value="ALL">All</option>
					<option value="ENABLED">Enabled Only</option>
					<option value="DISABLED">Disabled Only</option>
				</select>
			</div>
		</div>

		<button
			onclick={openCreateModal}
			class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
		>
			+ Add Resource
		</button>
	</div>

	<!-- Resources Table -->
	<div class="bg-white rounded-lg shadow overflow-hidden">
		<table class="min-w-full divide-y divide-gray-200">
			<thead class="bg-gray-50">
				<tr>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Country</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Languages</th>
					<th class="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order</th>
					<th class="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
				</tr>
			</thead>
			<tbody class="bg-white divide-y divide-gray-200">
				{#each filteredResources() as resource (resource.id)}
					<tr class={!resource.enabled ? 'bg-gray-50 opacity-60' : ''}>
						<td class="px-4 py-3 whitespace-nowrap">
							<form method="POST" action="?/toggle" use:enhance>
								<input type="hidden" name="id" value={resource.id} />
								<input type="hidden" name="enabled" value={!resource.enabled} />
								<button
									type="submit"
									class={`px-2 py-1 text-xs rounded ${resource.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}
								>
									{resource.enabled ? 'Enabled' : 'Disabled'}
								</button>
							</form>
						</td>
						<td class="px-4 py-3 whitespace-nowrap font-mono text-sm">{resource.country_code}</td>
						<td class="px-4 py-3">
							<div class="font-medium">{resource.name}</div>
							{#if resource.description}
								<div class="text-sm text-gray-500 truncate max-w-xs">{resource.description}</div>
							{/if}
						</td>
						<td class="px-4 py-3 whitespace-nowrap text-sm">{resource.type.replace(/_/g, ' ')}</td>
						<td class="px-4 py-3 text-sm">
							{#if resource.phone}
								<div>📞 {resource.phone}</div>
							{/if}
							{#if resource.text_instructions}
								<div>💬 {resource.text_instructions}</div>
							{/if}
							{#if resource.chat_url}
								<div>🌐 <a href={resource.chat_url} target="_blank" class="text-blue-600 hover:underline">Link</a></div>
							{/if}
						</td>
						<td class="px-4 py-3 whitespace-nowrap text-sm">{resource.languages.join(', ')}</td>
						<td class="px-4 py-3 whitespace-nowrap text-sm text-center">{resource.display_order}</td>
						<td class="px-4 py-3 whitespace-nowrap text-right text-sm">
							<button
								onclick={() => openEditModal(resource)}
								class="text-blue-600 hover:text-blue-800 mr-3"
							>
								Edit
							</button>
							<button
								onclick={() => confirmDelete(resource.id)}
								class="text-red-600 hover:text-red-800"
							>
								Delete
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="8" class="px-4 py-8 text-center text-gray-500">
							No resources found. {filterCountry !== 'ALL' || filterEnabled !== 'ALL' ? 'Try adjusting filters.' : 'Add a resource to get started.'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

		<div class="mt-4 text-sm text-gray-600">
			Showing {filteredResources().length} of {data.resources.length} resources
		</div>
	</div>
</div>

<!-- Create/Edit Modal -->
{#if showModal && editingResource}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
			<div class="px-6 py-4 border-b">
				<h2 class="text-xl font-bold">
					{editingResource.id ? 'Edit Resource' : 'Add Resource'}
				</h2>
			</div>

			<form
				method="POST"
				action={editingResource.id ? '?/update' : '?/create'}
				use:enhance
				class="px-6 py-4"
			>
				{#if editingResource.id}
					<input type="hidden" name="id" value={editingResource.id} />
				{/if}

				<div class="grid grid-cols-2 gap-4">
					<!-- Country Code -->
					<div>
						<label class="block text-sm font-medium mb-1">Country Code *</label>
						<input
							type="text"
							name="country_code"
							bind:value={editingResource.country_code}
							placeholder="US, GB, CA, etc."
							maxlength="2"
							required
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<!-- Type -->
					<div>
						<label class="block text-sm font-medium mb-1">Type *</label>
						<select
							name="type"
							bind:value={editingResource.type}
							required
							class="w-full px-3 py-2 border rounded-md"
						>
							{#each resourceTypes as type}
								<option value={type}>{type.replace(/_/g, ' ')}</option>
							{/each}
						</select>
					</div>

					<!-- Name -->
					<div class="col-span-2">
						<label class="block text-sm font-medium mb-1">Name *</label>
						<input
							type="text"
							name="name"
							bind:value={editingResource.name}
							placeholder="988 Suicide & Crisis Lifeline"
							required
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<!-- Phone -->
					<div>
						<label class="block text-sm font-medium mb-1">Phone</label>
						<input
							type="text"
							name="phone"
							bind:value={editingResource.phone}
							placeholder="988"
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<!-- Text Instructions -->
					<div>
						<label class="block text-sm font-medium mb-1">Text Instructions</label>
						<input
							type="text"
							name="text_instructions"
							bind:value={editingResource.text_instructions}
							placeholder="Text HOME to 741741"
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<!-- Chat URL -->
					<div class="col-span-2">
						<label class="block text-sm font-medium mb-1">Chat URL</label>
						<input
							type="url"
							name="chat_url"
							bind:value={editingResource.chat_url}
							placeholder="https://example.com/chat"
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<!-- Availability -->
					<div>
						<label class="block text-sm font-medium mb-1">Availability</label>
						<input
							type="text"
							name="availability"
							bind:value={editingResource.availability}
							placeholder="24/7"
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<!-- Languages -->
					<div>
						<label class="block text-sm font-medium mb-1">Languages *</label>
						<input
							type="text"
							name="languages"
							bind:value={editingResource.languages}
							placeholder="en, es"
							required
							class="w-full px-3 py-2 border rounded-md"
						/>
						<p class="text-xs text-gray-500 mt-1">Comma-separated ISO codes</p>
					</div>

					<!-- Display Order -->
					<div>
						<label class="block text-sm font-medium mb-1">Display Order</label>
						<input
							type="number"
							name="display_order"
							bind:value={editingResource.display_order}
							min="0"
							max="999"
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<!-- Enabled -->
					<div class="flex items-center">
						<label class="flex items-center cursor-pointer">
							<input
								type="checkbox"
								name="enabled"
								bind:checked={editingResource.enabled}
								value="true"
								class="mr-2"
							/>
							<span class="text-sm font-medium">Enabled</span>
						</label>
					</div>

					<!-- Description -->
					<div class="col-span-2">
						<label class="block text-sm font-medium mb-1">Description</label>
						<textarea
							name="description"
							bind:value={editingResource.description}
							rows="3"
							placeholder="Free, confidential support..."
							class="w-full px-3 py-2 border rounded-md"
						></textarea>
					</div>

					<!-- Enhanced Metadata Section -->
					<div class="col-span-2 border-t pt-4 mt-2">
						<h3 class="text-sm font-semibold text-gray-700 mb-3">Enhanced Metadata (Optional)</h3>
					</div>

					<!-- Service Scope -->
					<div class="col-span-2">
						<label class="block text-sm font-medium mb-1">Service Scope</label>
						<input
							type="text"
							name="service_scope"
							bind:value={editingResource.service_scope}
							placeholder="suicide, domestic_violence, sexual_assault, lgbtq, youth, mental_health"
							class="w-full px-3 py-2 border rounded-md text-sm"
						/>
						<p class="text-xs text-gray-500 mt-1">Comma-separated: suicide, domestic_violence, sexual_assault, lgbtq, youth, substance_use, mental_health, child_abuse, veterans, indigenous, eating_disorders, general</p>
					</div>

					<!-- Population Served -->
					<div class="col-span-2">
						<label class="block text-sm font-medium mb-1">Population Served</label>
						<input
							type="text"
							name="population_served"
							bind:value={editingResource.population_served}
							placeholder="general, youth, lgbtq, veterans"
							class="w-full px-3 py-2 border rounded-md text-sm"
						/>
						<p class="text-xs text-gray-500 mt-1">Comma-separated: general, youth, children, lgbtq, transgender, indigenous, veterans, women, men, students, farmers, elderly</p>
					</div>

					<!-- Website URL -->
					<div class="col-span-2">
						<label class="block text-sm font-medium mb-1">Website URL</label>
						<input
							type="url"
							name="website_url"
							bind:value={editingResource.website_url}
							placeholder="https://example.org"
							class="w-full px-3 py-2 border rounded-md"
						/>
					</div>

					<!-- Alternative Numbers (JSON) -->
					<div class="col-span-2">
						<label class="block text-sm font-medium mb-1">Alternative Numbers (JSON)</label>
						<textarea
							name="alternative_numbers"
							bind:value={editingResource.alternative_numbers}
							rows="2"
							placeholder={'[{"phone": "1-800-XXX-XXXX", "description": "TTY line", "languages": ["en"]}]'}
							class="w-full px-3 py-2 border rounded-md font-mono text-xs"
						></textarea>
						<p class="text-xs text-gray-500 mt-1">JSON array format</p>
					</div>

					<!-- Requires Callback -->
					<div class="flex items-center">
						<label class="flex items-center cursor-pointer">
							<input
								type="checkbox"
								name="requires_callback"
								bind:checked={editingResource.requires_callback}
								value="true"
								class="mr-2"
							/>
							<span class="text-sm font-medium">Requires Callback</span>
						</label>
					</div>

					<!-- Notes -->
					<div class="col-span-2">
						<label class="block text-sm font-medium mb-1">Notes</label>
						<textarea
							name="notes"
							bind:value={editingResource.notes}
							rows="2"
							placeholder="Additional information, restrictions, or special instructions"
							class="w-full px-3 py-2 border rounded-md"
						></textarea>
					</div>
				</div>

				<div class="mt-6 flex justify-end gap-3">
					<button
						type="button"
						onclick={closeModal}
						class="px-4 py-2 border rounded-md hover:bg-gray-50"
					>
						Cancel
					</button>
					<button
						type="submit"
						class="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
					>
						{editingResource.id ? 'Update' : 'Create'}
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

<!-- Delete Confirmation Modal -->
{#if deleteConfirm}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
		<div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
			<h3 class="text-lg font-bold mb-4">Confirm Delete</h3>
			<p class="text-gray-600 mb-6">
				Are you sure you want to delete this resource? This action cannot be undone.
			</p>
			<div class="flex justify-end gap-3">
				<button
					onclick={cancelDelete}
					class="px-4 py-2 border rounded-md hover:bg-gray-50"
				>
					Cancel
				</button>
				<form method="POST" action="?/delete" use:enhance>
					<input type="hidden" name="id" value={deleteConfirm} />
					<button
						type="submit"
						class="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
					>
						Delete
					</button>
				</form>
			</div>
		</div>
	</div>
{/if}

<style>
	/* Custom scrollbar for modal */
	:global(body) {
		scrollbar-width: thin;
	}
</style>
