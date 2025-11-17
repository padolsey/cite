<script lang="ts">
	import { onMount } from 'svelte';
	import { createClient } from '$lib/auth/supabase-client';
	import { goto } from '$app/navigation';

	interface ApiKey {
		id: string;
		name: string;
		created_at: string;
		last_used_at: string | null;
		revoked_at: string | null;
		request_count: number;
	}

	let user = $state<any>(null);
	let loading = $state(true);
	let keys = $state<ApiKey[]>([]);
	let newKeyName = $state('');
	let creatingKey = $state(false);
	let newlyCreatedKey = $state<string | null>(null);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);

	const supabase = createClient();

	onMount(async () => {
		// Check authentication
		const {
			data: { user: authUser }
		} = await supabase.auth.getUser();

		if (!authUser) {
			goto('/');
			return;
		}

		user = authUser;
		loading = false;

		// Load API keys
		await loadKeys();
	});

	async function loadKeys() {
		try {
			const response = await fetch('/api/keys');
			const data = await response.json();

			if (response.ok) {
				keys = data.keys;
			} else {
				error = data.error || 'Failed to load API keys';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load API keys';
		}
	}

	async function handleCreateKey(e: SubmitEvent) {
		e.preventDefault();
		creatingKey = true;
		error = null;
		success = null;
		newlyCreatedKey = null;

		try {
			const response = await fetch('/api/keys', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ name: newKeyName })
			});

			const data = await response.json();

			if (response.ok) {
				newlyCreatedKey = data.key;
				success = 'API key created successfully!';
				newKeyName = '';
				await loadKeys();
			} else {
				error = data.error || 'Failed to create API key';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to create API key';
		} finally {
			creatingKey = false;
		}
	}

	async function handleRevokeKey(keyId: string) {
		if (!confirm('Are you sure you want to revoke this API key? This cannot be undone.')) {
			return;
		}

		try {
			const response = await fetch(`/api/keys?id=${keyId}`, {
				method: 'DELETE'
			});

			if (response.ok) {
				success = 'API key revoked successfully';
				await loadKeys();
			} else {
				const data = await response.json();
				error = data.error || 'Failed to revoke API key';
			}
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to revoke API key';
		}
	}

	async function handleSignOut() {
		await supabase.auth.signOut();
		goto('/');
	}

	function copyToClipboard(text: string) {
		navigator.clipboard.writeText(text);
		success = 'Copied to clipboard!';
		setTimeout(() => {
			success = null;
		}, 2000);
	}

	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>Account - CITE Safety API</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<p class="text-gray-600">Loading...</p>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<header class="bg-white border-b border-gray-200 shadow-sm">
			<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div class="flex items-center justify-between h-16">
					<div class="flex items-center gap-4">
						<a href="/" class="flex items-center gap-2">
							<div
								class="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold text-sm"
							>
								C
							</div>
							<span class="font-semibold text-gray-900">CITE Safety</span>
						</a>
						<span class="text-sm text-gray-500 hidden sm:inline">API Dashboard</span>
					</div>

					<div class="flex items-center gap-4">
						<span class="text-sm text-gray-600 hidden sm:inline">{user.email}</span>
						<button
							onclick={handleSignOut}
							class="text-sm text-gray-600 hover:text-gray-900"
						>
							Sign Out
						</button>
					</div>
				</div>
			</div>
		</header>

		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Welcome Banner -->
			<div class="bg-blue-600 rounded-lg p-6 mb-8 text-white">
				<h1 class="text-2xl font-bold mb-2">Welcome to CITE Safety API</h1>
				<p class="text-blue-100">
					Manage your API keys and integrate mental health safety into your applications.
				</p>
			</div>

			<!-- Alerts -->
			{#if error}
				<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			{#if success}
				<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
					<p class="text-sm text-green-800">{success}</p>
				</div>
			{/if}

			<!-- Newly Created Key Display -->
			{#if newlyCreatedKey}
				<div class="mb-8 bg-yellow-50 border-2 border-yellow-400 rounded-lg p-6">
					<h2 class="text-lg font-semibold text-yellow-900 mb-2">
						⚠️ Save Your API Key
					</h2>
					<p class="text-sm text-yellow-800 mb-4">
						This is the only time you'll see this key. Copy it now and store it securely.
					</p>
					<div class="flex items-center gap-2">
						<code
							class="flex-1 bg-white px-4 py-3 rounded border border-yellow-300 text-sm font-mono break-all"
						>
							{newlyCreatedKey}
						</code>
						<button
							onclick={() => copyToClipboard(newlyCreatedKey!)}
							class="px-4 py-3 bg-yellow-600 text-white rounded hover:bg-yellow-700 transition-colors whitespace-nowrap"
						>
							Copy
						</button>
					</div>
				</div>
			{/if}

			<div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
				<!-- Main Content -->
				<div class="lg:col-span-2 space-y-8">
					<!-- Create New Key -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-xl font-semibold text-gray-900 mb-4">Create New API Key</h2>

						<form onsubmit={handleCreateKey} class="space-y-4">
							<div>
								<label for="key-name" class="block text-sm font-medium text-gray-700 mb-2">
									Key Name
								</label>
								<input
									type="text"
									id="key-name"
									bind:value={newKeyName}
									required
									disabled={creatingKey}
									placeholder="e.g., Production API Key"
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
								/>
								<p class="mt-1 text-xs text-gray-500">
									Give your key a descriptive name to identify its purpose
								</p>
							</div>

							<button
								type="submit"
								disabled={creatingKey || !newKeyName.trim()}
								class="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
							>
								{creatingKey ? 'Creating...' : 'Create API Key'}
							</button>
						</form>
					</div>

					<!-- API Keys List -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-xl font-semibold text-gray-900 mb-4">Your API Keys</h2>

						{#if keys.length === 0}
							<div class="text-center py-12">
								<svg
									class="w-12 h-12 text-gray-400 mx-auto mb-4"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
									/>
								</svg>
								<p class="text-gray-600 mb-2">No API keys yet</p>
								<p class="text-sm text-gray-500">Create your first API key to get started</p>
							</div>
						{:else}
							<div class="space-y-4">
								{#each keys as key}
									<div
										class="border border-gray-200 rounded-lg p-4 {key.revoked_at
											? 'bg-gray-50 opacity-60'
											: 'bg-white'}"
									>
										<div class="flex items-start justify-between">
											<div class="flex-1">
												<div class="flex items-center gap-2 mb-2">
													<h3 class="font-semibold text-gray-900">{key.name}</h3>
													{#if key.revoked_at}
														<span class="px-2 py-0.5 bg-gray-200 text-gray-700 text-xs rounded">
															Revoked
														</span>
													{:else}
														<span class="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">
															Active
														</span>
													{/if}
												</div>

												<div class="grid grid-cols-2 gap-4 text-sm text-gray-600">
													<div>
														<span class="text-gray-500">Created:</span>
														{formatDate(key.created_at)}
													</div>
													<div>
														<span class="text-gray-500">Last used:</span>
														{formatDate(key.last_used_at)}
													</div>
													<div>
														<span class="text-gray-500">Requests:</span>
														{key.request_count.toLocaleString()}
													</div>
													{#if key.revoked_at}
														<div>
															<span class="text-gray-500">Revoked:</span>
															{formatDate(key.revoked_at)}
														</div>
													{/if}
												</div>
											</div>

											{#if !key.revoked_at}
												<button
													onclick={() => handleRevokeKey(key.id)}
													class="ml-4 px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded transition-colors"
												>
													Revoke
												</button>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						{/if}
					</div>
				</div>

				<!-- Sidebar -->
				<div class="space-y-6">
					<!-- Quick Links -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h3 class="font-semibold text-gray-900 mb-4">Quick Links</h3>
						<div class="space-y-2">
							<a
								href="/docs"
								class="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
							>
								📚 API Documentation
							</a>
							<a
								href="/sandbox"
								class="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
							>
								🎮 Try Live Demo
							</a>
							<a
								href="https://github.com/cite-safety/cite"
								target="_blank"
								rel="noopener noreferrer"
								class="block text-sm text-blue-600 hover:text-blue-700 hover:underline"
							>
								💻 GitHub Repository
							</a>
						</div>
					</div>

					<!-- Usage Tier -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h3 class="font-semibold text-gray-900 mb-4">Your Plan</h3>
						<div class="text-center mb-4">
							<div class="text-3xl font-bold text-blue-600">Free</div>
							<div class="text-sm text-gray-600">10,000 evaluations/month</div>
						</div>
						<div class="pt-4 border-t border-gray-200">
							<p class="text-xs text-gray-500 text-center">
								Need more? Check out our <a href="/#pricing" class="text-blue-600 hover:underline"
									>pricing plans</a
								>
							</p>
						</div>
					</div>

					<!-- Support -->
					<div class="bg-blue-50 rounded-lg border border-blue-200 p-6">
						<h3 class="font-semibold text-blue-900 mb-2">Need Help?</h3>
						<p class="text-sm text-blue-800 mb-4">
							Check out the documentation or reach out to our community.
						</p>
						<a
							href="/docs"
							class="block text-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded hover:bg-blue-700 transition-colors"
						>
							View Docs
						</a>
					</div>
				</div>
			</div>
		</div>
	</div>
{/if}
