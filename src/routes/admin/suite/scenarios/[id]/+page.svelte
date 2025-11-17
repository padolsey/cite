<script lang="ts">
  /**
   * Single Scenario Detail & Quick Test
   */
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  interface Scenario {
    id: string;
    name: string;
    description: string;
    messages: any[];
    config: any;
    expected_risk_level: string;
    expected_risk_level_range: string[];
    expected_risk_types: any[];
    expected_confidence_min: number;
    clinical_grounding: string;
    source: string;
    tags: string[];
    category: string;
    notes: string;
    created_at: string;
  }

  interface TestResult {
    id: string;
    model: string;
    actual_risk_level: string;
    passed: boolean;
    score: number;
    latency_ms: number;
    created_at: string;
    run_id: string;
  }

  let scenarioId = $derived($page.params.id);
  let scenario: Scenario | null = $state(null);
  let recentResults: TestResult[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let testing = $state(false);
  let selectedModel = $state('anthropic/claude-haiku-4.5');

  const availableModels = [
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5' },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5' },
    { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5' },
    { id: 'openai/gpt-4o', name: 'GPT-4o' },
  ];

  onMount(async () => {
    await loadScenario();
    await loadRecentResults();
  });

  async function loadScenario() {
    try {
      loading = true;
      error = null;

      const res = await fetch(`/api/admin/suite?type=scenarios&id=${scenarioId}`);
      if (!res.ok) throw new Error('Failed to load scenario');

      const data = await res.json();
      scenario = data.data;
    } catch (err: any) {
      error = err.message;
      console.error('Error loading scenario:', err);
    } finally {
      loading = false;
    }
  }

  async function loadRecentResults() {
    try {
      // Get all results for this scenario (across all runs)
      // Note: This is a simplified query - you might want to add pagination
      const runsRes = await fetch('/api/admin/suite?type=runs&limit=100');
      if (!runsRes.ok) return;

      const runsData = await runsRes.json();
      const runs = runsData.data || [];

      // Get results for runs that include this scenario
      const resultPromises = runs
        .filter((run: any) => run.scenario_ids?.includes(scenarioId))
        .map(async (run: any) => {
          const res = await fetch(`/api/admin/suite?type=results&run_id=${run.id}`);
          if (res.ok) {
            const data = await res.json();
            return (data.data || [])
              .filter((r: any) => r.scenario_id === scenarioId)
              .map((r: any) => ({ ...r, run_id: run.id }));
          }
          return [];
        });

      const allResults = (await Promise.all(resultPromises)).flat();
      recentResults = allResults.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ).slice(0, 10); // Latest 10
    } catch (err: any) {
      console.error('Error loading results:', err);
    }
  }

  async function runQuickTest() {
    if (!scenario) return;

    try {
      testing = true;
      error = null;

      // Create a temporary single-scenario suite
      const suiteRes = await fetch('/api/admin/suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_suite',
          suite: {
            name: `Quick Test: ${scenario.name}`,
            description: 'Temporary suite for quick testing',
            scenario_ids: [scenario.id],
            category: 'quick-test',
            tags: ['quick-test', 'temporary'],
          },
        }),
      });

      if (!suiteRes.ok) throw new Error('Failed to create temp suite');
      const { data: suite } = await suiteRes.json();

      // Create run
      const runRes = await fetch('/api/admin/suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_run',
          run: {
            suite_id: suite.id,
            models: [selectedModel],
            run_mode: 'sequential',
          },
        }),
      });

      if (!runRes.ok) throw new Error('Failed to create run');
      const { data: run } = await runRes.json();

      // Execute
      const executeRes = await fetch('/api/admin/suite/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: run.id }),
      });

      if (!executeRes.ok) throw new Error('Failed to start execution');

      // Redirect to results
      window.location.href = `/admin/suite/runs/${run.id}`;
    } catch (err: any) {
      error = err.message;
      console.error('Error running test:', err);
    } finally {
      testing = false;
    }
  }

  function getRiskLevelBadgeClass(level: string): string {
    switch (level) {
      case 'none': return 'bg-gray-100 text-gray-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'critical': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'clinical': return 'bg-blue-100 text-blue-800';
      case 'safety': return 'bg-red-100 text-red-800';
      case 'edge-cases': return 'bg-yellow-100 text-yellow-800';
      case 'integration': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function getModelShortName(model: string): string {
    return model.split('/')[1] || model;
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  }
</script>

<div class="max-w-5xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <a href="/admin/suite" class="hover:text-blue-600">Suite</a>
      <span>/</span>
      <a href="/admin/suite/scenarios" class="hover:text-blue-600">Scenarios</a>
      <span>/</span>
      <span class="text-gray-900">Detail</span>
    </div>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading scenario...</p>
    </div>
  {:else if error && !scenario}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800">Error: {error}</p>
    </div>
  {:else if scenario}
    <!-- Scenario Header -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h1 class="text-2xl font-bold text-gray-900 mb-2">{scenario.name}</h1>
      {#if scenario.description}
        <p class="text-gray-600 mb-4">{scenario.description}</p>
      {/if}

      <div class="flex flex-wrap gap-2">
        <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full {getRiskLevelBadgeClass(scenario.expected_risk_level)}">
          {scenario.expected_risk_level.toUpperCase()}
        </span>
        <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full {getCategoryBadgeClass(scenario.category)}">
          {scenario.category}
        </span>
        {#each scenario.tags.slice(0, 5) as tag}
          <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">{tag}</span>
        {/each}
      </div>
    </div>

    <!-- Quick Test -->
    <div class="bg-gradient-to-r from-blue-50 to-blue-100 border border-blue-200 rounded-lg p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">🚀 Quick Test</h2>

      {#if error}
        <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p class="text-red-800 text-sm">Error: {error}</p>
        </div>
      {/if}

      <div class="flex items-end gap-4">
        <div class="flex-1">
          <label class="block text-sm font-medium text-gray-700 mb-2">Select Model</label>
          <select
            bind:value={selectedModel}
            disabled={testing}
            class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50"
          >
            {#each availableModels as model}
              <option value={model.id}>{model.name}</option>
            {/each}
          </select>
        </div>
        <button
          onclick={runQuickTest}
          disabled={testing}
          class="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {#if testing}
            <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span>Testing...</span>
          {:else}
            <span>Run Test</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          {/if}
        </button>
      </div>
      <p class="text-xs text-gray-600 mt-2">Runs this single scenario and shows results (~5 seconds)</p>
    </div>

    <!-- Conversation -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Conversation</h2>
      <div class="space-y-3">
        {#each scenario.messages as message}
          <div class="flex gap-3">
            <div class="flex-shrink-0">
              <span class="inline-flex px-2 py-1 text-xs font-medium rounded {message.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                {message.role}
              </span>
            </div>
            <div class="flex-1 text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {message.content}
            </div>
          </div>
        {/each}
      </div>
    </div>

    <!-- Expected Output -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Expected Classification</h2>
      <div class="space-y-3 text-sm">
        <div class="flex items-center gap-3">
          <strong class="text-gray-700">Risk Level:</strong>
          <span class="px-3 py-1 rounded text-sm font-medium {getRiskLevelBadgeClass(scenario.expected_risk_level)}">
            {scenario.expected_risk_level.toUpperCase()}
          </span>
          {#if scenario.expected_risk_level_range.length > 0}
            <span class="text-gray-500 text-xs">
              (acceptable: {scenario.expected_risk_level_range.join(', ')})
            </span>
          {/if}
        </div>
        <div>
          <strong class="text-gray-700">Min Confidence:</strong>
          <span class="text-gray-900 ml-2">{(scenario.expected_confidence_min * 100).toFixed(0)}%</span>
        </div>
        {#if scenario.expected_risk_types.length > 0}
          <div>
            <strong class="text-gray-700 block mb-2">Expected Risk Types:</strong>
            <div class="space-y-1 ml-4">
              {#each scenario.expected_risk_types as riskType}
                <div class="text-xs text-gray-600">
                  • {riskType.type} <span class="text-gray-500">(min: {(riskType.min_confidence * 100).toFixed(0)}%)</span>
                </div>
              {/each}
            </div>
          </div>
        {/if}
      </div>
    </div>

    <!-- Clinical Grounding -->
    {#if scenario.clinical_grounding}
      <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Clinical Grounding</h2>
        <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
          {scenario.clinical_grounding}
        </div>
      </div>
    {/if}

    <!-- Source -->
    {#if scenario.source}
      <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 class="text-lg font-semibold text-gray-900 mb-3">Source</h2>
        <div class="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
          {scenario.source}
        </div>
      </div>
    {/if}

    <!-- Recent Test Results -->
    <div class="bg-white border border-gray-200 rounded-lg p-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-4">Recent Test Results</h2>

      {#if recentResults.length === 0}
        <p class="text-gray-500 text-sm">This scenario hasn't been tested yet. Use Quick Test above to run it!</p>
      {:else}
        <div class="space-y-2">
          {#each recentResults as result}
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition">
              <div class="flex items-center gap-3">
                <span class="px-2 py-1 text-xs font-medium rounded bg-gray-200 text-gray-700">
                  {getModelShortName(result.model)}
                </span>
                <span class="px-2 py-1 text-xs font-semibold rounded-full {getRiskLevelBadgeClass(result.actual_risk_level)}">
                  {result.actual_risk_level.toUpperCase()}
                </span>
                {#if result.passed}
                  <span class="text-xs text-green-600 font-medium">✓ Pass</span>
                {:else}
                  <span class="text-xs text-red-600 font-medium">✗ Fail</span>
                {/if}
                <span class="text-xs text-gray-600">
                  Score: {Math.round(result.score * 100)}%
                </span>
                <span class="text-xs text-gray-500">
                  {formatDate(result.created_at)}
                </span>
              </div>
              <a
                href="/admin/suite/runs/{result.run_id}"
                class="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                View Run →
              </a>
            </div>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</div>
