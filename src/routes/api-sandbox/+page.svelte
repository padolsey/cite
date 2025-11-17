<script lang="ts">
	import { onMount } from 'svelte';

	// Request state
	let messages = $state<Array<{ role: string; content: string }>>([
		{ role: 'user', content: "I've been feeling really hopeless lately" }
	]);
	let userCountry = $state('US');
	let userAgeBand = $state('adult');
	let loading = $state(false);
	let error = $state<string | null>(null);

	// Response state
	let response = $state<any>(null);

	// Compute curl command reactively
	let curlCommand = $derived((() => {
		const payload = {
			messages: messages.filter((m) => m.content.trim()),
			config: {
				user_country: userCountry || undefined,
				user_age_band: userAgeBand
			}
		};

		return `curl -X POST ${typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com'}/api/v1/evaluate \\
  -H "Content-Type: application/json" \\
  -d '${JSON.stringify(payload, null, 2)}'`;
	})());

	// Example scenarios
	const examples = [
		{
			name: 'General Distress (Low Risk)',
			messages: [{ role: 'user', content: "I'm feeling really stressed about work lately" }],
			country: 'US'
		},
		{
			name: 'Passive Ideation (Medium Risk)',
			messages: [{ role: 'user', content: "Sometimes I wish I could just disappear" }],
			country: 'GB'
		},
		{
			name: 'Active Ideation (High Risk)',
			messages: [
				{ role: 'user', content: "I've been thinking about ending my life" },
				{ role: 'assistant', content: "I'm really concerned about what you're sharing." },
				{ role: 'user', content: "I have a plan for how I'd do it" }
			],
			country: 'CA'
		},
		{
			name: 'Academic Discussion (None)',
			messages: [
				{
					role: 'user',
					content: "I'm writing a paper on suicide prevention. What are common warning signs?"
				}
			],
			country: 'AU'
		}
	];

	function loadExample(index: number) {
		const example = examples[index];
		messages = [...example.messages];
		userCountry = example.country;
		response = null;
		error = null;
	}

	function addMessage() {
		messages = [...messages, { role: 'user', content: '' }];
	}

	function removeMessage(index: number) {
		messages = messages.filter((_, i) => i !== index);
	}

	async function evaluate() {
		loading = true;
		error = null;
		response = null;

		try {
			const payload = {
				messages: messages.filter((m) => m.content.trim()),
				config: {
					user_country: userCountry || undefined,
					user_age_band: userAgeBand
				}
			};

			const res = await fetch('/api/v1/evaluate', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const errorData = await res.json();
				throw new Error(errorData.error || 'API request failed');
			}

			response = await res.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Failed to evaluate';
		} finally {
			loading = false;
		}
	}

	function getRiskColor(level: string) {
		const colors: Record<string, string> = {
			none: 'text-gray-600 bg-gray-100',
			low: 'text-blue-700 bg-blue-100',
			medium: 'text-yellow-700 bg-yellow-100',
			high: 'text-orange-700 bg-orange-100',
			critical: 'text-red-700 bg-red-100'
		};
		return colors[level] || 'text-gray-600 bg-gray-100';
	}
</script>

<svelte:head>
	<title>API Sandbox - CITE Safety</title>
</svelte:head>

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
					<span class="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded">
						API SANDBOX
					</span>
				</div>

				<div class="flex items-center gap-4">
					<a href="/docs" class="text-sm text-gray-600 hover:text-gray-900">API Docs</a>
					<a href="/account" class="text-sm text-gray-600 hover:text-gray-900">Get API Key</a>
				</div>
			</div>
		</div>
	</header>

	<div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
		<!-- Page Header -->
		<div class="mb-8">
			<h1 class="text-3xl font-bold text-gray-900 mb-2">API Sandbox</h1>
			<p class="text-gray-600">
				Test the CITE Safety API interactively. No signup required for testing.
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
			<!-- Left: Request Builder -->
			<div class="space-y-6">
				<!-- Examples -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Quick Examples</h2>
					<div class="grid grid-cols-2 gap-2">
						{#each examples as example, i}
							<button
								onclick={() => loadExample(i)}
								class="text-left px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-blue-300 transition-colors"
							>
								{example.name}
							</button>
						{/each}
					</div>
				</div>

				<!-- Configuration -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">User Country</label>
							<input
								type="text"
								bind:value={userCountry}
								placeholder="US, GB, CA, etc."
								maxlength="2"
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							/>
							<p class="text-xs text-gray-500 mt-1">
								ISO country code (optional - will infer from language if empty)
							</p>
						</div>

						<div>
							<label class="block text-sm font-medium text-gray-700 mb-1">Age Band</label>
							<select
								bind:value={userAgeBand}
								class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
							>
								<option value="adult">Adult</option>
								<option value="minor">Minor</option>
								<option value="unknown">Unknown</option>
							</select>
						</div>
					</div>
				</div>

				<!-- Messages -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<h2 class="text-lg font-semibold text-gray-900 mb-4">Messages</h2>
					<div class="space-y-3">
						{#each messages as message, i}
							<div class="flex gap-2">
								<select
									bind:value={message.role}
									class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
								>
									<option value="user">User</option>
									<option value="assistant">Assistant</option>
								</select>
								<textarea
									bind:value={message.content}
									placeholder="Message content"
									rows="2"
									class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
								></textarea>
								{#if messages.length > 1}
									<button
										onclick={() => removeMessage(i)}
										class="px-3 text-red-600 hover:text-red-800"
									>
										✕
									</button>
								{/if}
							</div>
						{/each}
					</div>
					<button
						onclick={addMessage}
						class="mt-3 text-sm text-blue-600 hover:text-blue-800 font-medium"
					>
						+ Add Message
					</button>
				</div>

				<!-- Actions -->
				<div class="flex gap-3">
					<button
						onclick={evaluate}
						disabled={loading}
						class="flex-1 px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
					>
						{loading ? 'Evaluating...' : 'Evaluate'}
					</button>
				</div>

				<!-- Curl Command -->
				<div class="bg-gray-900 rounded-lg p-4">
					<div class="flex items-center justify-between mb-2">
						<h3 class="text-sm font-semibold text-gray-300">Equivalent cURL</h3>
						<button
							onclick={() => navigator.clipboard.writeText(curlCommand)}
							class="text-xs text-gray-400 hover:text-white"
						>
							Copy
						</button>
					</div>
					<pre class="text-xs text-gray-300 font-mono overflow-x-auto">{curlCommand}</pre>
				</div>
			</div>

			<!-- Right: Response -->
			<div class="space-y-6">
				{#if error}
					<div class="bg-red-50 border border-red-200 rounded-lg p-6">
						<div class="flex items-start gap-3">
							<svg class="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
							</svg>
							<div>
								<h3 class="font-semibold text-red-900 mb-1">Error</h3>
								<p class="text-sm text-red-800">{error}</p>
							</div>
						</div>
					</div>
				{/if}

				{#if response}
					<!-- Risk Assessment -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">Risk Assessment</h2>
						<div class="space-y-4">
							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-gray-700">Risk Level</span>
								<span
									class={`px-3 py-1 text-sm font-semibold rounded-full ${getRiskColor(response.risk_level)}`}
								>
									{response.risk_level.toUpperCase()}
								</span>
							</div>

							<div class="flex items-center justify-between">
								<span class="text-sm font-medium text-gray-700">Confidence</span>
								<span class="text-sm font-semibold text-gray-900">
									{(response.confidence * 100).toFixed(0)}%
								</span>
							</div>

							{#if response.explanation}
								<div>
									<span class="text-sm font-medium text-gray-700 block mb-1">Explanation</span>
									<p class="text-sm text-gray-600">{response.explanation}</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Safe Reply -->
					{#if response.safe_reply}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 class="text-lg font-semibold text-gray-900 mb-4">Safe Reply</h2>
							<p class="text-sm text-gray-700 whitespace-pre-wrap">{response.safe_reply}</p>
						</div>
					{/if}

					<!-- Crisis Resources -->
					{#if response.crisis_resources && response.crisis_resources.length > 0}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 class="text-lg font-semibold text-gray-900 mb-4">Crisis Resources</h2>
							<div class="space-y-3">
								{#each response.crisis_resources as resource}
									<div class="border border-gray-200 rounded-lg p-4">
										<div class="font-semibold text-gray-900 mb-1">{resource.name}</div>
										<div class="text-sm text-gray-600 space-y-1">
											{#if resource.phone}
												<div>📞 {resource.phone}</div>
											{/if}
											{#if resource.text_instructions}
												<div>💬 {resource.text_instructions}</div>
											{/if}
											{#if resource.availability}
												<div>🕐 {resource.availability}</div>
											{/if}
											{#if resource.description}
												<div class="mt-2 text-gray-500">{resource.description}</div>
											{/if}
										</div>
									</div>
								{/each}
							</div>
						</div>
					{/if}

					<!-- UI Guidance -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">UI Guidance</h2>
						<div class="space-y-2 text-sm">
							<div class="flex items-center justify-between">
								<span class="text-gray-700">Show Crisis Resources</span>
								<span class={response.show_crisis_resources ? 'text-green-600' : 'text-gray-400'}>
									{response.show_crisis_resources ? '✓ Yes' : '✗ No'}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-gray-700">Highlight Urgency</span>
								<span class={response.highlight_urgency ? 'text-orange-600' : 'text-gray-400'}>
									{response.highlight_urgency ? '✓ Yes' : '✗ No'}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-gray-700">Allow Method Details</span>
								<span class={response.allow_method_details ? 'text-green-600' : 'text-red-600'}>
									{response.allow_method_details ? '✓ Yes' : '✗ No'}
								</span>
							</div>
							<div class="flex items-center justify-between">
								<span class="text-gray-700">Log Recommended</span>
								<span class={response.log_recommended ? 'text-blue-600' : 'text-gray-400'}>
									{response.log_recommended ? '✓ Yes' : '✗ No'}
								</span>
							</div>
						</div>
					</div>

					<!-- Raw JSON -->
					<details class="bg-gray-900 rounded-lg p-4">
						<summary class="text-sm font-semibold text-gray-300 cursor-pointer">
							View Raw JSON Response
						</summary>
						<pre class="mt-3 text-xs text-gray-300 font-mono overflow-x-auto">{JSON.stringify(
								response,
								null,
								2
							)}</pre>
					</details>
				{:else if !loading && !error}
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
						<svg
							class="w-16 h-16 text-gray-300 mx-auto mb-4"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
							/>
						</svg>
						<p class="text-gray-500">
							Configure your request and click "Evaluate" to see results here.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- Info Banner -->
		<div class="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
			<div class="flex gap-3">
				<svg class="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
				</svg>
				<div>
					<h3 class="font-semibold text-blue-900 mb-1">Free Tier Rate Limits</h3>
					<p class="text-sm text-blue-800">
						This sandbox uses the free tier: <strong>60 requests per minute per session</strong>.
						<a href="/account" class="underline hover:text-blue-900">Create an API key</a> for higher limits
						and production use.
					</p>
				</div>
			</div>
		</div>
	</div>
</div>
