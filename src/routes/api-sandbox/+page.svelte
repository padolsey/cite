<script lang="ts">
	import { onMount } from 'svelte';

	// Request state
	let messages = $state<Array<{ role: string; content: string }>>([
		{ role: 'user', content: "I've been feeling really hopeless lately" }
	]);
	let userCountry = $state('US');
	let userAgeBand = $state('adult');
	let locale = $state('');
	let policyId = $state('');
	let dryRun = $state(false);
	let returnAssistantReply = $state(true);
	let assistantSafetyMode = $state<'template' | 'llm_generate' | 'llm_validate'>('template');
	let useMultipleJudges = $state(false);
	let conversationId = $state('');
	let riskStateJson = $state('');
	let candidateReplyRole = $state<'assistant' | 'user'>('assistant');
	let candidateReplyContent = $state('');
	let showAdvancedConfig = $state(false);

	let loading = $state(false);
	let error = $state<string | null>(null);

	// Response state
	let response = $state<any>(null);

	function buildPayload() {
		const filteredMessages = messages.filter((m) => m.content.trim());

		const config: any = {
			user_country: userCountry || undefined,
			user_age_band: userAgeBand
		};

		if (locale.trim()) {
			config.locale = locale.trim();
		}
		if (policyId.trim()) {
			config.policy_id = policyId.trim();
		}
		if (dryRun) {
			config.dry_run = true;
		}
		if (!returnAssistantReply) {
			config.return_assistant_reply = false;
		}
		if (assistantSafetyMode !== 'template') {
			config.assistant_safety_mode = assistantSafetyMode;
		}
		if (useMultipleJudges) {
			config.use_multiple_judges = true;
		}

		const payload: any = {
			messages: filteredMessages,
			config
		};

		if (conversationId.trim()) {
			payload.conversation_id = conversationId.trim();
		}

		if (riskStateJson.trim()) {
			try {
				payload.risk_state = JSON.parse(riskStateJson);
			} catch (e) {
				throw new Error('Invalid JSON in risk_state');
			}
		}

		if (candidateReplyContent.trim()) {
			payload.candidate_reply = {
				role: candidateReplyRole,
				content: candidateReplyContent.trim()
			};
		}

		return payload;
	}

	// Compute curl command reactively
	let curlCommand = $derived((() => {
		let payload: any;
		try {
			payload = buildPayload();
		} catch (e) {
			// If risk_state JSON is invalid, fall back to basic payload for curl preview
			payload = {
			messages: messages.filter((m) => m.content.trim()),
			config: {
				user_country: userCountry || undefined,
				user_age_band: userAgeBand
			}
		};
		}

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
			let payload: any;
			try {
				payload = buildPayload();
			} catch (e) {
				error = e instanceof Error ? e.message : 'Invalid advanced configuration';
				loading = false;
				return;
			}

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

				<!-- Advanced Configuration -->
				<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
					<div class="flex items-center justify-between mb-4">
						<h2 class="text-lg font-semibold text-gray-900">Advanced Configuration</h2>
						<button
							type="button"
							onclick={() => (showAdvancedConfig = !showAdvancedConfig)}
							class="text-sm text-blue-600 hover:text-blue-800"
						>
							{showAdvancedConfig ? 'Hide' : 'Show'}
						</button>
					</div>

					{#if showAdvancedConfig}
						<div class="space-y-4">
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Locale</label>
									<input
										type="text"
										bind:value={locale}
										placeholder="en-US, es-MX, etc."
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<p class="text-xs text-gray-500 mt-1">
										Optional. If omitted, locale is inferred from conversation.
									</p>
								</div>

								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">Policy ID</label>
									<input
										type="text"
										bind:value={policyId}
										placeholder="default_mh"
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<p class="text-xs text-gray-500 mt-1">
										Advanced: select a specific safety policy (if configured).
									</p>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div class="flex items-center gap-2">
									<input
										id="dry-run"
										type="checkbox"
										bind:checked={dryRun}
										class="h-4 w-4 text-blue-600 border-gray-300 rounded"
									/>
									<label for="dry-run" class="text-sm text-gray-700">Dry run (no logging/webhooks)</label>
								</div>

								<div class="flex items-center gap-2">
									<input
										id="return-reply"
										type="checkbox"
										bind:checked={returnAssistantReply}
										class="h-4 w-4 text-blue-600 border-gray-300 rounded"
									/>
									<label for="return-reply" class="text-sm text-gray-700">
										Return assistant reply
									</label>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">
										Assistant Safety Mode
									</label>
									<select
										bind:value={assistantSafetyMode}
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									>
										<option value="template">Template (default)</option>
										<option value="llm_generate">LLM generate (experimental)</option>
										<option value="llm_validate">LLM validate candidate (experimental)</option>
									</select>
									<p class="text-xs text-gray-500 mt-1">
										Experimental modes require server-side LLM configuration.
									</p>
								</div>

								<div class="flex items-center gap-2">
									<input
										id="multi-judges"
										type="checkbox"
										bind:checked={useMultipleJudges}
										class="h-4 w-4 text-blue-600 border-gray-300 rounded"
									/>
									<label for="multi-judges" class="text-sm text-gray-700">
										Use multiple judges (consensus classification)
									</label>
								</div>
							</div>

							<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">
										Conversation ID
									</label>
									<input
										type="text"
										bind:value={conversationId}
										placeholder="conversation-123"
										class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
									/>
									<p class="text-xs text-gray-500 mt-1">
										Optional. Enables risk_state tracking and trend detection.
									</p>
								</div>

								<div>
									<label class="block text-sm font-medium text-gray-700 mb-1">
										Candidate Reply (future/experimental)
									</label>
									<div class="flex gap-2 mb-2">
										<select
											bind:value={candidateReplyRole}
											class="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
										>
											<option value="assistant">Assistant</option>
											<option value="user">User</option>
										</select>
										<input
											type="text"
											bind:value={candidateReplyContent}
											placeholder="Optional candidate reply to validate"
											class="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
										/>
									</div>
									<p class="text-xs text-gray-500">
										Used with LLM validation modes to adjust an existing reply.
									</p>
								</div>
							</div>

							<div>
								<label class="block text-sm font-medium text-gray-700 mb-1">
									Previous Risk State (JSON)
								</label>
								<textarea
									bind:value={riskStateJson}
									rows="4"
									placeholder='Optional. Paste a previous risk_state object to enable trend tracking.'
									class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs"
								></textarea>
								<p class="text-xs text-gray-500 mt-1">
									If provided, must be valid JSON. Use the risk_state from a prior response.
								</p>
							</div>
						</div>
					{/if}
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

							{#if typeof response.agreement === 'number'}
								<div class="flex items-center justify-between">
									<span class="text-sm font-medium text-gray-700">Judge Agreement</span>
									<span class="text-sm font-semibold text-gray-900">
										{(response.agreement * 100).toFixed(0)}%
									</span>
								</div>
							{/if}

							{#if response.explanation}
								<div>
									<span class="text-sm font-medium text-gray-700 block mb-1">Explanation</span>
									<p class="text-sm text-gray-600">{response.explanation}</p>
								</div>
							{/if}
						</div>
					</div>

					<!-- Routing & Escalation -->
					{#if response.recommended_routing || response.escalation_urgency || response.actions}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 class="text-lg font-semibold text-gray-900 mb-4">Routing & Escalation</h2>
							<div class="space-y-3 text-sm">
								{#if response.recommended_routing}
									<div class="flex items-center justify-between">
										<span class="text-gray-700">Recommended Routing</span>
										<span class="px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
											{response.recommended_routing}
										</span>
									</div>
								{/if}

								{#if response.escalation_urgency}
									<div class="flex items-center justify-between">
										<span class="text-gray-700">Escalation Urgency</span>
										<span
											class={`px-3 py-1 rounded-full font-medium ${
												response.escalation_urgency === 'immediate'
													? 'bg-red-100 text-red-700'
													: response.escalation_urgency === 'urgent'
													? 'bg-orange-100 text-orange-700'
													: response.escalation_urgency === 'routine'
													? 'bg-yellow-100 text-yellow-700'
													: 'bg-gray-100 text-gray-700'
											}`}
										>
											{response.escalation_urgency}
										</span>
									</div>
								{/if}

								{#if response.actions}
									{#if response.actions.required && response.actions.required.length}
										<div>
											<div class="text-gray-700 font-medium mb-1">Required Actions</div>
											<ul class="list-disc list-inside text-gray-600 space-y-1">
												{#each response.actions.required as action}
													<li>{action}</li>
												{/each}
											</ul>
										</div>
									{/if}

									{#if response.actions.recommended && response.actions.recommended.length}
										<div>
											<div class="text-gray-700 font-medium mb-1">Recommended Actions</div>
											<ul class="list-disc list-inside text-gray-600 space-y-1">
												{#each response.actions.recommended as action}
													<li>{action}</li>
												{/each}
											</ul>
										</div>
									{/if}
								{/if}
							</div>
						</div>
					{/if}

					<!-- Risk Tags & Distress -->
					{#if response.risk_types || response.risk_tags || response.distress_level || response.trend}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 class="text-lg font-semibold text-gray-900 mb-4">Risk Tags & Distress</h2>
							<div class="space-y-4 text-sm">
								{#if response.risk_types && response.risk_types.length}
									<div>
										<div class="text-gray-700 font-medium mb-2">Risk Types</div>
										<div class="flex flex-wrap gap-2">
											{#each response.risk_types as tag}
												<span
													class="inline-flex items-center px-2.5 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium"
												>
													{tag.type}
													{#if typeof tag.confidence === 'number'}
														<span class="ml-1 text-gray-500">
															({(tag.confidence * 100).toFixed(0)}%)
														</span>
													{/if}
												</span>
											{/each}
										</div>
									</div>
								{/if}

								<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
									{#if response.distress_level}
										<div class="flex items-center justify-between">
											<span class="text-gray-700">Distress Level</span>
											<span class="px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
												{response.distress_level}
											</span>
										</div>
									{/if}

									{#if response.distress_trend}
										<div class="flex items-center justify-between">
											<span class="text-gray-700">Distress Trend</span>
											<span class="px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
												{response.distress_trend}
											</span>
										</div>
									{/if}
								</div>

								{#if response.trend}
									<div class="flex items-center justify-between">
										<span class="text-gray-700">Risk Trend</span>
										<span class="px-3 py-1 rounded-full bg-gray-100 text-gray-800 font-medium">
											{response.trend}
										</span>
									</div>
								{/if}

								{#if response.trend_explanation}
									<div>
										<div class="text-gray-700 font-medium mb-1">Trend Explanation</div>
										<p class="text-gray-600">{response.trend_explanation}</p>
									</div>
								{/if}
							</div>
						</div>
					{/if}

					<!-- Safe Reply / Recommended Reply -->
					{#if response.recommended_reply}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 class="text-lg font-semibold text-gray-900 mb-2">Recommended Reply</h2>
							<div class="flex items-center justify-between mb-3 text-xs text-gray-500">
								<span>
									Source:
									<span class="font-semibold">
										{response.recommended_reply.source}
									</span>
								</span>
								{#if response.recommended_reply.notes}
									<span>{response.recommended_reply.notes}</span>
								{/if}
							</div>
							<p class="text-sm text-gray-700 whitespace-pre-wrap">
								{response.recommended_reply.content}
							</p>
						</div>
					{:else if response.safe_reply}
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

					<!-- UI Guidance & Constraints -->
					<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
						<h2 class="text-lg font-semibold text-gray-900 mb-4">UI Guidance & Constraints</h2>
						<div class="space-y-2 text-sm mb-4">
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

						{#if response.constraints || response.ui_guidance}
							<div class="border-t border-gray-200 pt-4 mt-4 space-y-3 text-sm">
								{#if response.constraints}
									<div>
										<div class="text-gray-700 font-medium mb-1">Assistant Constraints</div>
										<div class="space-y-1">
											<div class="flex items-center justify-between">
												<span>Allow method details</span>
												<span class={response.constraints.allow_method_details ? 'text-green-600' : 'text-red-600'}>
													{response.constraints.allow_method_details ? '✓ Yes' : '✗ No'}
												</span>
											</div>
											<div class="flex items-center justify-between">
												<span>Allow philosophical debate</span>
												<span class={response.constraints.allow_philosophical_debate ? 'text-green-600' : 'text-red-600'}>
													{response.constraints.allow_philosophical_debate ? '✓ Yes' : '✗ No'}
												</span>
											</div>
											<div class="flex items-center justify-between">
												<span>Avoid detailed trauma questions</span>
												<span class={response.constraints.avoid_detailed_trauma_questions ? 'text-green-600' : 'text-gray-400'}>
													{response.constraints.avoid_detailed_trauma_questions ? '✓ Yes' : '✗ No'}
												</span>
											</div>
											<div class="flex items-center justify-between">
												<span>Use safety-focused responses</span>
												<span class={response.constraints.use_safety_focused_responses ? 'text-green-600' : 'text-gray-400'}>
													{response.constraints.use_safety_focused_responses ? '✓ Yes' : '✗ No'}
												</span>
											</div>
										</div>
									</div>
								{/if}

								{#if response.ui_guidance}
									<div>
										<div class="text-gray-700 font-medium mb-1">UI Guidance (Advanced)</div>
										<div class="space-y-1">
											<div class="flex items-center justify-between">
												<span>Show crisis resources</span>
												<span class={response.ui_guidance.show_crisis_resources ? 'text-green-600' : 'text-gray-400'}>
													{response.ui_guidance.show_crisis_resources ? '✓ Yes' : '✗ No'}
												</span>
											</div>
											<div class="flex items-center justify-between">
												<span>Highlight urgency</span>
												<span class={response.ui_guidance.highlight_urgency ? 'text-orange-600' : 'text-gray-400'}>
													{response.ui_guidance.highlight_urgency ? '✓ Yes' : '✗ No'}
												</span>
											</div>
											<div class="flex items-center justify-between">
												<span>Allow further chat</span>
												<span class={response.ui_guidance.allow_further_chat ? 'text-green-600' : 'text-red-600'}>
													{response.ui_guidance.allow_further_chat ? '✓ Yes' : '✗ No'}
												</span>
											</div>
											<div class="flex items-center justify-between">
												<span>Require acknowledgement</span>
												<span class={response.ui_guidance.require_acknowledgement ? 'text-blue-600' : 'text-gray-400'}>
													{response.ui_guidance.require_acknowledgement ? '✓ Yes' : '✗ No'}
												</span>
											</div>
											{#if typeof response.ui_guidance.limit_remaining_messages === 'number'}
												<div class="flex items-center justify-between">
													<span>Limit remaining messages</span>
													<span class="text-gray-800">
														{response.ui_guidance.limit_remaining_messages}
													</span>
												</div>
											{/if}
										</div>
									</div>
								{/if}
							</div>
						{/if}
					</div>

					<!-- Conversation Risk State -->
					{#if response.risk_state}
						<div class="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
							<h2 class="text-lg font-semibold text-gray-900 mb-4">Conversation Risk State</h2>
							<div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
								<div>
									<div class="text-gray-700 font-medium">Conversation ID</div>
									<div class="text-gray-900 break-all">{response.risk_state.conversation_id}</div>
								</div>
								<div>
									<div class="text-gray-700 font-medium">Version</div>
									<div class="text-gray-900">{response.risk_state.version}</div>
								</div>
								<div>
									<div class="text-gray-700 font-medium">Current Risk</div>
									<div class="text-gray-900">{response.risk_state.current_risk}</div>
								</div>
								<div>
									<div class="text-gray-700 font-medium">Max Risk (this conversation)</div>
									<div class="text-gray-900">{response.risk_state.max_risk}</div>
								</div>
								{#if response.risk_state.last_high_risk_at}
									<div>
										<div class="text-gray-700 font-medium">Last High Risk At</div>
										<div class="text-gray-900">
											{response.risk_state.last_high_risk_at}
										</div>
									</div>
								{/if}
								<div>
									<div class="text-gray-700 font-medium">Updated At</div>
									<div class="text-gray-900">
										{response.risk_state.updated_at}
									</div>
								</div>
							</div>
						</div>
					{/if}

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
