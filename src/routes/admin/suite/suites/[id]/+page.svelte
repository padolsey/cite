<script lang="ts">
  /**
   * Suite Detail & Run Page
   * View suite info, scenarios, previous runs, and start new runs
   */
  import { onMount } from 'svelte';
  import { page } from '$app/stores';
  import { goto } from '$app/navigation';

  interface Scenario {
    id: string;
    name: string;
    expected_risk_level: string;
    category: string;
    tags: string[];
  }

  interface Suite {
    id: string;
    name: string;
    description: string;
    category: string;
    scenario_ids: string[];
    tags: string[];
    created_at: string;
  }

  interface Run {
    id: string;
    suite_id: string;
    models: string[];
    status: string;
    overall_score: number | null;
    pass_rate: number | null;
    total_cost_usd: number | null;
    started_at: string;
    completed_at: string | null;
  }

  let suiteId = $derived($page.params.id);
  let suite: Suite | null = $state(null);
  let scenarios: Scenario[] = $state([]);
  let previousRuns: Run[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let executing = $state(false);

  // Run configuration
  let selectedModels = $state<string[]>(['anthropic/claude-haiku-4.5']);
  let runMode = $state<'sequential' | 'parallel'>('sequential');

  const availableModels = [
    { id: 'anthropic/claude-haiku-4.5', name: 'Claude Haiku 4.5', cost: '$', speed: 'Fast' },
    { id: 'anthropic/claude-sonnet-4.5', name: 'Claude Sonnet 4.5', cost: '$$', speed: 'Balanced' },
    { id: 'anthropic/claude-opus-4.5', name: 'Claude Opus 4.5', cost: '$$$', speed: 'Slow' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', cost: '$$', speed: 'Balanced' },
  ];

  onMount(async () => {
    await loadSuite();
    await loadScenarios();
    await loadPreviousRuns();
  });

  async function loadSuite() {
    try {
      loading = true;
      error = null;

      const res = await fetch(`/api/admin/suite?type=suites&id=${suiteId}`);
      if (!res.ok) throw new Error('Failed to load suite');

      const data = await res.json();
      suite = data.data;
    } catch (err: any) {
      error = err.message;
      console.error('Error loading suite:', err);
    } finally {
      loading = false;
    }
  }

  async function loadScenarios() {
    if (!suite) return;

    try {
      const res = await fetch('/api/admin/suite?type=scenarios&limit=1000');
      if (!res.ok) return;

      const data = await res.json();
      const allScenarios = data.data || [];

      // Filter to scenarios in this suite
      scenarios = allScenarios.filter((s: Scenario) =>
        suite!.scenario_ids.includes(s.id)
      );
    } catch (err: any) {
      console.error('Error loading scenarios:', err);
    }
  }

  async function loadPreviousRuns() {
    try {
      const res = await fetch('/api/admin/suite?type=runs&limit=100');
      if (!res.ok) return;

      const data = await res.json();
      const allRuns = data.data || [];

      // Filter to runs for this suite
      previousRuns = allRuns
        .filter((r: Run) => r.suite_id === suiteId)
        .sort((a: Run, b: Run) =>
          new Date(b.started_at).getTime() - new Date(a.started_at).getTime()
        );
    } catch (err: any) {
      console.error('Error loading runs:', err);
    }
  }

  function toggleModel(modelId: string) {
    if (selectedModels.includes(modelId)) {
      selectedModels = selectedModels.filter((id) => id !== modelId);
    } else {
      selectedModels = [...selectedModels, modelId];
    }
  }

  async function startRun() {
    if (!suite || selectedModels.length === 0) return;

    try {
      executing = true;
      error = null;

      // Create run
      const createRes = await fetch('/api/admin/suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_run',
          run: {
            suite_id: suite.id,
            models: selectedModels,
            run_mode: runMode,
          },
        }),
      });

      if (!createRes.ok) {
        throw new Error('Failed to create run');
      }

      const { data: run } = await createRes.json();

      // Execute run
      const executeRes = await fetch('/api/admin/suite/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ run_id: run.id }),
      });

      if (!executeRes.ok) {
        throw new Error('Failed to start execution');
      }

      // Redirect to run page
      goto(`/admin/suite/runs/${run.id}`);
    } catch (err: any) {
      error = err.message;
      console.error('Error starting run:', err);
    } finally {
      executing = false;
    }
  }

  function getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'clinical': return 'bg-blue-100 text-blue-800';
      case 'safety': return 'bg-red-100 text-red-800';
      case 'edge-cases': return 'bg-yellow-100 text-yellow-800';
      case 'integration': return 'bg-green-100 text-green-800';
      case 'comprehensive': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
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

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'running': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function getModelShortName(model: string): string {
    return model.split('/')[1] || model;
  }
</script>

<div class="max-w-7xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <a href="/admin/suite" class="hover:text-blue-600">Suite</a>
      <span>/</span>
      <a href="/admin/suite/suites" class="hover:text-blue-600">Suites</a>
      <span>/</span>
      <span class="text-gray-900">{suite?.name || 'Loading...'}</span>
    </div>
  </div>

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading suite...</p>
    </div>
  {:else if error && !suite}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4">
      <p class="text-red-800">Error: {error}</p>
    </div>
  {:else if suite}
    <!-- Suite Info -->
    <div class="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <h1 class="text-3xl font-bold text-gray-900 mb-2">{suite.name}</h1>
      <p class="text-gray-600 mb-4">{suite.description}</p>

      <div class="flex flex-wrap gap-2">
        <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full {getCategoryBadgeClass(suite.category)}">
          {suite.category}
        </span>
        <span class="inline-flex px-3 py-1 text-sm rounded-full bg-gray-100 text-gray-700">
          {suite.scenario_ids.length} scenarios
        </span>
        {#each suite.tags.slice(0, 5) as tag}
          <span class="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">{tag}</span>
        {/each}
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <!-- Left Column: Scenarios -->
      <div class="lg:col-span-2 space-y-6">
        <!-- Scenarios List -->
        <div class="bg-white border border-gray-200 rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">
              Scenarios ({scenarios.length})
            </h2>
          </div>

          {#if scenarios.length === 0}
            <div class="px-6 py-8 text-center text-gray-500">
              No scenarios found in this suite
            </div>
          {:else}
            <div class="divide-y divide-gray-200">
              {#each scenarios as scenario}
                <a
                  href="/admin/suite/scenarios/{scenario.id}"
                  class="block px-6 py-4 hover:bg-gray-50 transition"
                >
                  <div class="flex items-start justify-between">
                    <div class="flex-1">
                      <h3 class="text-sm font-medium text-gray-900 mb-1">
                        {scenario.name}
                      </h3>
                      <div class="flex flex-wrap gap-2">
                        <span class="inline-flex px-2 py-0.5 text-xs font-semibold rounded-full {getRiskLevelBadgeClass(scenario.expected_risk_level)}">
                          {scenario.expected_risk_level.toUpperCase()}
                        </span>
                        <span class="inline-flex px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                          {scenario.category}
                        </span>
                      </div>
                    </div>
                    <svg class="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </a>
              {/each}
            </div>
          {/if}
        </div>

        <!-- Previous Runs -->
        <div class="bg-white border border-gray-200 rounded-lg">
          <div class="px-6 py-4 border-b border-gray-200">
            <h2 class="text-lg font-semibold text-gray-900">
              Previous Runs ({previousRuns.length})
            </h2>
          </div>

          {#if previousRuns.length === 0}
            <div class="px-6 py-8 text-center text-gray-500">
              No previous runs yet. Start your first run!
            </div>
          {:else}
            <div class="overflow-x-auto">
              <table class="w-full">
                <thead class="bg-gray-50">
                  <tr>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Models</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pass Rate</th>
                    <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                    <th class="px-6 py-3"></th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-200">
                  {#each previousRuns as run}
                    <tr class="hover:bg-gray-50">
                      <td class="px-6 py-4 text-sm text-gray-900">
                        {run.models.map(getModelShortName).join(', ')}
                      </td>
                      <td class="px-6 py-4">
                        <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusBadgeClass(run.status)}">
                          {run.status}
                        </span>
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-900">
                        {#if run.overall_score !== null}
                          {(run.overall_score * 100).toFixed(1)}%
                        {:else}
                          <span class="text-gray-400">-</span>
                        {/if}
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-900">
                        {#if run.pass_rate !== null}
                          {(run.pass_rate * 100).toFixed(0)}%
                        {:else}
                          <span class="text-gray-400">-</span>
                        {/if}
                      </td>
                      <td class="px-6 py-4 text-sm text-gray-600">
                        {formatDate(run.started_at)}
                      </td>
                      <td class="px-6 py-4 text-right">
                        <a
                          href="/admin/suite/runs/{run.id}"
                          class="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          View →
                        </a>
                      </td>
                    </tr>
                  {/each}
                </tbody>
              </table>
            </div>
          {/if}
        </div>
      </div>

      <!-- Right Column: Run Configuration -->
      <div class="lg:col-span-1">
        <div class="bg-white border border-gray-200 rounded-lg p-6 sticky top-6">
          <h2 class="text-lg font-semibold text-gray-900 mb-4">
            Run This Suite
          </h2>

          {#if error}
            <div class="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p class="text-red-800 text-sm">Error: {error}</p>
            </div>
          {/if}

          <!-- Model Selection -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Select Models
            </label>
            <div class="space-y-2">
              {#each availableModels as model}
                <label class="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer {selectedModels.includes(model.id) ? 'border-blue-500 bg-blue-50' : ''}">
                  <input
                    type="checkbox"
                    checked={selectedModels.includes(model.id)}
                    onchange={() => toggleModel(model.id)}
                    class="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                  />
                  <div class="ml-3 flex-1">
                    <div class="text-sm font-medium text-gray-900">{model.name}</div>
                    <div class="flex gap-2 mt-1">
                      <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{model.cost}</span>
                      <span class="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">{model.speed}</span>
                    </div>
                  </div>
                </label>
              {/each}
            </div>
            {#if selectedModels.length === 0}
              <p class="text-xs text-red-600 mt-2">Select at least one model</p>
            {/if}
          </div>

          <!-- Run Mode -->
          <div class="mb-6">
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Execution Mode
            </label>
            <div class="space-y-2">
              <label class="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer {runMode === 'sequential' ? 'border-blue-500 bg-blue-50' : ''}">
                <input
                  type="radio"
                  name="runMode"
                  value="sequential"
                  bind:group={runMode}
                  class="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div class="ml-3">
                  <div class="text-sm font-medium text-gray-900">Sequential</div>
                  <div class="text-xs text-gray-600">One at a time</div>
                </div>
              </label>
              <label class="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer {runMode === 'parallel' ? 'border-blue-500 bg-blue-50' : ''}">
                <input
                  type="radio"
                  name="runMode"
                  value="parallel"
                  bind:group={runMode}
                  class="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div class="ml-3">
                  <div class="text-sm font-medium text-gray-900">Parallel</div>
                  <div class="text-xs text-gray-600">Faster</div>
                </div>
              </label>
            </div>
          </div>

          <!-- Estimate -->
          {#if selectedModels.length > 0}
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <div class="text-sm font-medium text-blue-900 mb-1">Estimate</div>
              <div class="text-sm text-blue-800">
                <strong>{suite.scenario_ids.length * selectedModels.length}</strong> tests
              </div>
              <div class="text-xs text-blue-700 mt-1">
                ~{Math.ceil((suite.scenario_ids.length * selectedModels.length * 2) / 60)} min
                | ~${(suite.scenario_ids.length * selectedModels.length * 0.002).toFixed(2)}
              </div>
            </div>
          {/if}

          <!-- Run Button -->
          <button
            onclick={startRun}
            disabled={executing || selectedModels.length === 0}
            class="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {#if executing}
              <div class="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              <span>Starting...</span>
            {:else}
              <span>Run Suite</span>
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            {/if}
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
