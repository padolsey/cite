<script lang="ts">
	import { onMount } from 'svelte';
	import { createClient } from '$lib/auth/supabase-client';
	import { goto } from '$app/navigation';
	import { dev } from '$app/environment';

	interface Stats {
		totalUsers: number;
		totalKeys: number;
		activeKeys: number;
		revokedKeys: number;
		totalRequests: number;
	}

	interface User {
		id: string;
		email: string;
		created_at: string;
		last_sign_in_at: string | null;
		is_admin: boolean;
		email_confirmed_at: string | null;
	}

	interface ApiKey {
		id: string;
		user_id: string;
		name: string;
		created_at: string;
		last_used_at: string | null;
		revoked_at: string | null;
		request_count: number;
	}

	interface AdminData {
		stats: Stats;
		users: User[];
		apiKeys: ApiKey[];
	}

	let loading = $state(true);
	let error = $state<string | null>(null);
	let success = $state<string | null>(null);
	let data = $state<AdminData | null>(null);
	let currentUser = $state<any>(null);
	let activeTab = $state<'overview' | 'users' | 'keys'>('overview');
	let searchQuery = $state('');

	const supabase = createClient();

	onMount(async () => {
		// Check authentication
		const {
			data: { user }
		} = await supabase.auth.getUser();

		if (!user && !dev) {
			goto('/');
			return;
		}

		currentUser = user;
		await loadAdminData();
	});

	async function loadAdminData() {
		loading = true;
		error = null;

		try {
			const response = await fetch('/api/admin');

			if (!response.ok) {
				if (response.status === 403) {
					error = 'Access denied. Admin privileges required.';
					return;
				}
				throw new Error('Failed to load admin data');
			}

			data = await response.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to load admin data';
		} finally {
			loading = false;
		}
	}

	async function toggleAdminStatus(userId: string, currentStatus: boolean) {
		const newStatus = !currentStatus;
		const confirmMsg = newStatus
			? 'Grant admin privileges to this user?'
			: 'Remove admin privileges from this user?';

		if (!confirm(confirmMsg)) {
			return;
		}

		try {
			const response = await fetch('/api/admin', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ userId, isAdmin: newStatus })
			});

			if (!response.ok) {
				throw new Error('Failed to update admin status');
			}

			success = `Admin status updated successfully`;
			await loadAdminData();

			setTimeout(() => {
				success = null;
			}, 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to update admin status';
		}
	}

	async function handleRevokeApiKey(keyId: string, keyName: string) {
		if (!confirm(`Revoke API key "${keyName}"? This cannot be undone.`)) {
			return;
		}

		try {
			const response = await fetch(`/api/admin?action=revoke-key&keyId=${keyId}`, {
				method: 'DELETE'
			});

			if (!response.ok) {
				throw new Error('Failed to revoke API key');
			}

			success = 'API key revoked successfully';
			await loadAdminData();

			setTimeout(() => {
				success = null;
			}, 3000);
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to revoke API key';
		}
	}

	async function handleSignOut() {
		await supabase.auth.signOut();
		goto('/');
	}

	function formatDate(dateString: string | null): string {
		if (!dateString) return 'Never';
		return new Date(dateString).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatNumber(num: number): string {
		return num.toLocaleString();
	}

	let filteredUsers = $derived(() => {
		if (!data?.users || !searchQuery) return data?.users ?? [];
		const query = searchQuery.toLowerCase();
		return data.users.filter(
			(user) => user.email?.toLowerCase().includes(query) || user.id.toLowerCase().includes(query)
		);
	});

	let filteredKeys = $derived(() => {
		if (!data?.apiKeys || !searchQuery) return data?.apiKeys ?? [];
		const query = searchQuery.toLowerCase();
		return data.apiKeys.filter(
			(key) =>
				key.name.toLowerCase().includes(query) ||
				key.user_id.toLowerCase().includes(query) ||
				key.id.toLowerCase().includes(query)
		);
	});

	function getUserEmail(userId: string): string {
		const user = data?.users.find((u) => u.id === userId);
		return user?.email || 'Unknown';
	}
</script>

<svelte:head>
	<title>Admin Dashboard - CITE Safety API</title>
</svelte:head>

{#if loading}
	<div class="min-h-screen flex items-center justify-center">
		<div class="text-center">
			<div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
			<p class="text-gray-600">Loading admin dashboard...</p>
		</div>
	</div>
{:else if error && !data}
	<div class="min-h-screen flex items-center justify-center bg-gray-50">
		<div class="text-center max-w-md mx-auto p-8">
			<div class="text-red-600 mb-4">
				<svg class="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path
						stroke-linecap="round"
						stroke-linejoin="round"
						stroke-width="2"
						d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
					/>
				</svg>
			</div>
			<h2 class="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
			<p class="text-gray-600 mb-6">{error}</p>
			<a
				href="/"
				class="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
			>
				Go to Homepage
			</a>
		</div>
	</div>
{:else}
	<div class="min-h-screen bg-gray-50">
		<!-- Header -->
		<header class="bg-white border-b border-gray-200 shadow-sm sticky top-0 z-10">
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
						<span class="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
							ADMIN
						</span>
						{#if dev}
							<span class="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-semibold rounded">
								DEV MODE
							</span>
						{/if}
					</div>

					<div class="flex items-center gap-4">
						<a href="/account" class="text-sm text-gray-600 hover:text-gray-900">My Account</a>
						{#if currentUser}
							<span class="text-sm text-gray-600 hidden sm:inline">{currentUser.email}</span>
						{/if}
						<button onclick={handleSignOut} class="text-sm text-gray-600 hover:text-gray-900">
							Sign Out
						</button>
					</div>
				</div>
			</div>
		</header>

		<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
			<!-- Page Header -->
			<div class="mb-8">
				<h1 class="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
				<p class="text-gray-600">Manage users, API keys, and monitor system usage</p>
			</div>

			<!-- Alerts -->
			{#if error}
				<div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
					<svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-sm text-red-800">{error}</p>
				</div>
			{/if}

			{#if success}
				<div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
					<svg class="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
					</svg>
					<p class="text-sm text-green-800">{success}</p>
				</div>
			{/if}

			<!-- Stats Grid -->
			{#if data}
				<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between mb-2">
							<h3 class="text-sm font-medium text-gray-600">Total Users</h3>
							<svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
							</svg>
						</div>
						<div class="text-3xl font-bold text-gray-900">{formatNumber(data.stats.totalUsers)}</div>
					</div>

					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between mb-2">
							<h3 class="text-sm font-medium text-gray-600">Total API Keys</h3>
							<svg class="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
							</svg>
						</div>
						<div class="text-3xl font-bold text-gray-900">{formatNumber(data.stats.totalKeys)}</div>
					</div>

					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between mb-2">
							<h3 class="text-sm font-medium text-gray-600">Active Keys</h3>
							<svg class="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
						</div>
						<div class="text-3xl font-bold text-gray-900">{formatNumber(data.stats.activeKeys)}</div>
					</div>

					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between mb-2">
							<h3 class="text-sm font-medium text-gray-600">Revoked Keys</h3>
							<svg class="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
							</svg>
						</div>
						<div class="text-3xl font-bold text-gray-900">{formatNumber(data.stats.revokedKeys)}</div>
					</div>

					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<div class="flex items-center justify-between mb-2">
							<h3 class="text-sm font-medium text-gray-600">Total Requests</h3>
							<svg class="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
							</svg>
						</div>
						<div class="text-3xl font-bold text-gray-900">{formatNumber(data.stats.totalRequests)}</div>
					</div>
				</div>

				<!-- Tabs -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
					<div class="border-b border-gray-200">
						<nav class="flex -mb-px">
							<button
								onclick={() => (activeTab = 'overview')}
								class={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === 'overview'
										? 'border-blue-500 text-blue-600'
										: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
								}`}
							>
								Overview
							</button>
							<button
								onclick={() => (activeTab = 'users')}
								class={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === 'users'
										? 'border-blue-500 text-blue-600'
										: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
								}`}
							>
								Users ({data.users.length})
							</button>
							<button
								onclick={() => (activeTab = 'keys')}
								class={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
									activeTab === 'keys'
										? 'border-blue-500 text-blue-600'
										: 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
								}`}
							>
								API Keys ({data.apiKeys.length})
							</button>
						</nav>
					</div>

					<div class="p-6">
						{#if activeTab === 'overview'}
							<div class="space-y-6">
								<div>
									<h3 class="text-lg font-semibold text-gray-900 mb-4">System Overview</h3>
									<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
										<div class="bg-gray-50 rounded-lg p-4">
											<h4 class="text-sm font-medium text-gray-700 mb-3">Recent Activity</h4>
											<div class="space-y-2 text-sm text-gray-600">
												<div class="flex justify-between">
													<span>Total API Requests:</span>
													<span class="font-semibold">{formatNumber(data.stats.totalRequests)}</span>
												</div>
												<div class="flex justify-between">
													<span>Active API Keys:</span>
													<span class="font-semibold">{data.stats.activeKeys}</span>
												</div>
												<div class="flex justify-between">
													<span>Registered Users:</span>
													<span class="font-semibold">{data.stats.totalUsers}</span>
												</div>
											</div>
										</div>

										<div class="bg-gray-50 rounded-lg p-4">
											<h4 class="text-sm font-medium text-gray-700 mb-3">Key Statistics</h4>
											<div class="space-y-2 text-sm text-gray-600">
												<div class="flex justify-between">
													<span>Active/Total Keys:</span>
													<span class="font-semibold">{data.stats.activeKeys}/{data.stats.totalKeys}</span>
												</div>
												<div class="flex justify-between">
													<span>Revocation Rate:</span>
													<span class="font-semibold">
														{data.stats.totalKeys > 0
															? ((data.stats.revokedKeys / data.stats.totalKeys) * 100).toFixed(1)
															: '0'}%
													</span>
												</div>
												<div class="flex justify-between">
													<span>Avg Requests/Key:</span>
													<span class="font-semibold">
														{data.stats.activeKeys > 0
															? formatNumber(Math.round(data.stats.totalRequests / data.stats.activeKeys))
															: '0'}
													</span>
												</div>
											</div>
										</div>
									</div>
								</div>
							</div>
						{:else if activeTab === 'users'}
							<div>
								<div class="mb-4 flex items-center justify-between">
									<h3 class="text-lg font-semibold text-gray-900">User Management</h3>
									<input
										type="text"
										bind:value={searchQuery}
										placeholder="Search users..."
										class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
									/>
								</div>

								<div class="overflow-x-auto">
									<table class="min-w-full divide-y divide-gray-200">
										<thead class="bg-gray-50">
											<tr>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Email
												</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Status
												</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Created
												</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Last Sign In
												</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Role
												</th>
												<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
													Actions
												</th>
											</tr>
										</thead>
										<tbody class="bg-white divide-y divide-gray-200">
											{#each filteredUsers as user}
												<tr class="hover:bg-gray-50">
													<td class="px-6 py-4 whitespace-nowrap">
														<div class="text-sm font-medium text-gray-900">{user.email}</div>
														<div class="text-xs text-gray-500">{user.id.slice(0, 8)}...</div>
													</td>
													<td class="px-6 py-4 whitespace-nowrap">
														{#if user.email_confirmed_at}
															<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
																Verified
															</span>
														{:else}
															<span class="px-2 py-1 text-xs font-medium bg-yellow-100 text-yellow-700 rounded">
																Unverified
															</span>
														{/if}
													</td>
													<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDate(user.created_at)}
													</td>
													<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDate(user.last_sign_in_at)}
													</td>
													<td class="px-6 py-4 whitespace-nowrap">
														{#if user.is_admin}
															<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
																Admin
															</span>
														{:else}
															<span class="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
																User
															</span>
														{/if}
													</td>
													<td class="px-6 py-4 whitespace-nowrap text-right text-sm">
														<button
															onclick={() => toggleAdminStatus(user.id, user.is_admin)}
															class={`px-3 py-1 text-xs font-medium rounded transition-colors ${
																user.is_admin
																	? 'bg-red-50 text-red-700 hover:bg-red-100'
																	: 'bg-blue-50 text-blue-700 hover:bg-blue-100'
															}`}
														>
															{user.is_admin ? 'Remove Admin' : 'Make Admin'}
														</button>
													</td>
												</tr>
											{/each}
										</tbody>
									</table>

									{#if filteredUsers.length === 0}
										<div class="text-center py-12">
											<p class="text-gray-500">No users found</p>
										</div>
									{/if}
								</div>
							</div>
						{:else if activeTab === 'keys'}
							<div>
								<div class="mb-4 flex items-center justify-between">
									<h3 class="text-lg font-semibold text-gray-900">API Key Management</h3>
									<input
										type="text"
										bind:value={searchQuery}
										placeholder="Search keys..."
										class="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
									/>
								</div>

								<div class="overflow-x-auto">
									<table class="min-w-full divide-y divide-gray-200">
										<thead class="bg-gray-50">
											<tr>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Name
												</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													User
												</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Status
												</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Requests
												</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Created
												</th>
												<th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
													Last Used
												</th>
												<th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
													Actions
												</th>
											</tr>
										</thead>
										<tbody class="bg-white divide-y divide-gray-200">
											{#each filteredKeys as key}
												<tr class="hover:bg-gray-50">
													<td class="px-6 py-4 whitespace-nowrap">
														<div class="text-sm font-medium text-gray-900">{key.name}</div>
														<div class="text-xs text-gray-500">{key.id.slice(0, 8)}...</div>
													</td>
													<td class="px-6 py-4 whitespace-nowrap">
														<div class="text-sm text-gray-900">{getUserEmail(key.user_id)}</div>
														<div class="text-xs text-gray-500">{key.user_id.slice(0, 8)}...</div>
													</td>
													<td class="px-6 py-4 whitespace-nowrap">
														{#if key.revoked_at}
															<span class="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
																Revoked
															</span>
														{:else}
															<span class="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
																Active
															</span>
														{/if}
													</td>
													<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
														{formatNumber(key.request_count)}
													</td>
													<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDate(key.created_at)}
													</td>
													<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
														{formatDate(key.last_used_at)}
													</td>
													<td class="px-6 py-4 whitespace-nowrap text-right text-sm">
														{#if !key.revoked_at}
															<button
																onclick={() => handleRevokeApiKey(key.id, key.name)}
																class="px-3 py-1 text-xs font-medium bg-red-50 text-red-700 hover:bg-red-100 rounded transition-colors"
															>
																Revoke
															</button>
														{:else}
															<span class="text-xs text-gray-400">Revoked</span>
														{/if}
													</td>
												</tr>
											{/each}
										</tbody>
									</table>

									{#if filteredKeys.length === 0}
										<div class="text-center py-12">
											<p class="text-gray-500">No API keys found</p>
										</div>
									{/if}
								</div>
							</div>
						{/if}
					</div>
				</div>
			{/if}
		</div>
	</div>
{/if}
