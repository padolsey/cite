<script lang="ts">
  /**
   * Test Run Results Dashboard
   * Detailed results with model comparison
   */
  import { onMount } from 'svelte';
  import { page } from '$app/stores';

  interface TestRun {
    id: string;
    suite_name: string;
    models: string[];
    status: string;
    total_scenarios: number;
    completed_scenarios: number;
    failed_scenarios: number;
    overall_score: number;
    weighted_score: number;
    total_cost_usd: number;
    avg_latency_ms: number;
    results_by_model: Record<string, any>;
    started_at: string;
    completed_at: string;
    duration_ms: number;
  }

  interface TestResult {
    id: string;
    scenario_id: string;
    model: string;
    actual_risk_level: string;
    actual_risk_types: any[];
    actual_confidence: number;
    passed: boolean;
    score: number;
    grading_details: any;
    latency_ms: number;
    cost_usd: number;
    error: boolean;
    error_message: string;
  }

  interface Scenario {
    id: string;
    name: string;
    expected_risk_level: string;
    tags: string[];
  }

  let runId = $derived($page.params.id);
  let run: TestRun | null = $state(null);
  let results: TestResult[] = $state([]);
  let scenarios: Map<string, Scenario> = $state(new Map());
  let loading = $state(true);
  let error = $state<string | null>(null);
  let refreshInterval: number | null = null;

  // Filters
  let selectedModel = $state<string>('all');
  let selectedStatus = $state<string>('all');

  // Computed
  let filteredResults = $derived(
    results.filter((r) => {
      if (selectedModel !== 'all' && r.model !== selectedModel) return false;
      if (selectedStatus === 'passed' && !r.passed) return false;
      if (selectedStatus === 'failed' && r.passed) return false;
      return true;
    })
  );

  let resultsByModel = $derived(
    run?.models.reduce(
      (acc, model) => {
        const modelResults = results.filter((r) => r.model === model);
        acc[model] = {
          total: modelResults.length,
          passed: modelResults.filter((r) => r.passed).length,
          failed: modelResults.filter((r) => !r.passed).length,
          avgScore: modelResults.reduce((sum, r) => sum + r.score, 0) / modelResults.length || 0,
          avgLatency: modelResults.reduce((sum, r) => sum + r.latency_ms, 0) / modelResults.length || 0,
          totalCost: modelResults.reduce((sum, r) => sum + r.cost_usd, 0),
        };
        return acc;
      },
      {} as Record<string, any>
    ) || {}
  );

  onMount(async () => {
    await loadRun();

    // Auto-refresh if running
    if (run?.status === 'running') {
      refreshInterval = window.setInterval(loadRun, 5000);
    }

    return () => {
      if (refreshInterval) clearInterval(refreshInterval);
    };
  });

  async function loadRun() {
    try {
      error = null;

      // Load run details
      const runRes = await fetch(`/api/admin/suite?type=runs&id=${runId}`);
      if (!runRes.ok) throw new Error('Failed to load run');
      const runData = await runRes.json();
      run = runData.data;

      // Load results
      const resultsRes = await fetch(`/api/admin/suite?type=results&run_id=${runId}&limit=1000`);
      if (!resultsRes.ok) throw new Error('Failed to load results');
      const resultsData = await resultsRes.json();
      results = resultsData.data || [];

      // Load scenario details
      if (run && run.scenario_ids) {
        const scenarioIds = run.scenario_ids;
        const scenariosRes = await fetch(
          `/api/admin/suite?type=scenarios&limit=1000`
        );
        if (scenariosRes.ok) {
          const scenariosData = await scenariosRes.json();
          const scenarioList = scenariosData.data || [];
          scenarios = new Map(
            scenarioList
              .filter((s: Scenario) => scenarioIds.includes(s.id))
              .map((s: Scenario) => [s.id, s])
          );
        }
      }

      // Stop refreshing if completed
      if (run?.status !== 'running' && refreshInterval) {
        clearInterval(refreshInterval);
        refreshInterval = null;
      }

      loading = false;
    } catch (err: any) {
      error = err.message;
      console.error('Error loading run:', err);
      loading = false;
    }
  }

  function getStatusBadgeClass(status: string): string {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'running':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function getModelShortName(model: string): string {
    return model.split('/')[1] || model;
  }

  function formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  }
</script>

<div class="max-w-7xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <a href="/admin/suite" class="hover:text-blue-600">Suite</a>
      <span>/</span>
      <a href="/admin/suite/runs" class="hover:text-blue-600">Runs</a>
      <span>/</span>
      <span class="text-gray-900">Results</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">{run?.suite_name || 'Test Run'}</h1>
        <p class="text-sm text-gray-600 mt-1">
          Started {run ? new Date(run.started_at).toLocaleString() : '...'}
        </p>
      </div>
      {#if run}
        <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full {getStatusBadgeClass(run.status)}">
          {run.status}
        </span>
      {/if}
    </div>
  </div>

  {#if error}
    <div class="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
      <p class="text-red-800">Error: {error}</p>
    </div>
  {/if}

  {#if loading}
    <div class="text-center py-12">
      <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      <p class="mt-2 text-gray-600">Loading results...</p>
    </div>
  {:else if run}
    <!-- Overall Results -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
      {#each run.models as model}
        {@const stats = resultsByModel[model]}
        {#if stats}
          <div class="bg-white border border-gray-200 rounded-lg p-6">
            <div class="flex items-center justify-between mb-4">
              <h3 class="font-semibold text-gray-900">{getModelShortName(model)}</h3>
              <div class="text-2xl font-bold text-gray-900">
                {Math.round(stats.avgScore * 100)}%
              </div>
            </div>

            <div class="space-y-2 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-600">Passed:</span>
                <span class="font-medium text-green-600">{stats.passed}/{stats.total}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Failed:</span>
                <span class="font-medium text-red-600">{stats.failed}/{stats.total}</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Avg Latency:</span>
                <span class="font-medium text-gray-900">{Math.round(stats.avgLatency)}ms</span>
              </div>
              <div class="flex justify-between">
                <span class="text-gray-600">Total Cost:</span>
                <span class="font-medium text-gray-900">${stats.totalCost.toFixed(3)}</span>
              </div>
            </div>

            <!-- Score bar -->
            <div class="mt-4">
              <div class="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-600 transition-all"
                  style="width: {stats.avgScore * 100}%"
                ></div>
              </div>
            </div>
          </div>
        {/if}
      {/each}
    </div>

    <!-- Progress (if running) -->
    {#if run.status === 'running'}
      <div class="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
        <div class="flex items-center justify-between mb-2">
          <h3 class="font-semibold text-blue-900">Running...</h3>
          <span class="text-sm text-blue-800">
            {run.completed_scenarios} / {run.total_scenarios}
          </span>
        </div>
        <div class="h-2 bg-blue-200 rounded-full overflow-hidden">
          <div
            class="h-full bg-blue-600 transition-all"
            style="width: {(run.completed_scenarios / run.total_scenarios) * 100}%"
          ></div>
        </div>
        <p class="text-xs text-blue-700 mt-2">Auto-refreshing every 5 seconds...</p>
      </div>
    {/if}

    <!-- Filters -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">Model</label>
          <select
            bind:value={selectedModel}
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Models</option>
            {#each run.models as model}
              <option value={model}>{getModelShortName(model)}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">Status</label>
          <select
            bind:value={selectedStatus}
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="passed">Passed Only</option>
            <option value="failed">Failed Only</option>
          </select>
        </div>

        <div class="ml-auto flex items-end">
          <span class="text-sm text-gray-600">
            Showing {filteredResults.length} of {results.length} results
          </span>
        </div>
      </div>
    </div>

    <!-- Results Table -->
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50">
            <tr>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scenario</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Model</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Expected</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
              <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Latency</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200">
            {#each filteredResults as result}
              {@const scenario = scenarios.get(result.scenario_id)}
              <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 text-sm text-gray-900">
                  {scenario?.name || 'Unknown'}
                  {#if scenario?.tags.length}
                    <div class="flex flex-wrap gap-1 mt-1">
                      {#each scenario.tags.slice(0, 2) as tag}
                        <span class="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{tag}</span>
                      {/each}
                    </div>
                  {/if}
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  {getModelShortName(result.model)}
                </td>
                <td class="px-6 py-4 text-sm">
                  <span class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium uppercase">
                    {scenario?.expected_risk_level || '-'}
                  </span>
                </td>
                <td class="px-6 py-4 text-sm">
                  <span class="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-medium uppercase">
                    {result.actual_risk_level}
                  </span>
                </td>
                <td class="px-6 py-4">
                  {#if result.passed}
                    <span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                      </svg>
                      Pass
                    </span>
                  {:else}
                    <span class="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" />
                      </svg>
                      Fail
                    </span>
                  {/if}
                </td>
                <td class="px-6 py-4 text-sm font-medium {result.score >= 0.75 ? 'text-green-600' : 'text-red-600'}">
                  {Math.round(result.score * 100)}%
                </td>
                <td class="px-6 py-4 text-sm text-gray-600">
                  {Math.round(result.latency_ms)}ms
                </td>
              </tr>
            {/each}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Summary Stats -->
    {#if run.status === 'completed'}
      <div class="mt-8 bg-white border border-gray-200 rounded-lg p-6">
        <h3 class="text-lg font-semibold text-gray-900 mb-4">Run Summary</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p class="text-gray-600">Total Duration</p>
            <p class="text-lg font-semibold text-gray-900">{formatDuration(run.duration_ms)}</p>
          </div>
          <div>
            <p class="text-gray-600">Overall Score</p>
            <p class="text-lg font-semibold text-gray-900">{Math.round(run.overall_score * 100)}%</p>
          </div>
          <div>
            <p class="text-gray-600">Total Cost</p>
            <p class="text-lg font-semibold text-gray-900">${run.total_cost_usd.toFixed(3)}</p>
          </div>
          <div>
            <p class="text-gray-600">Avg Latency</p>
            <p class="text-lg font-semibold text-gray-900">{Math.round(run.avg_latency_ms)}ms</p>
          </div>
        </div>
      </div>
    {/if}
  {/if}
</div>
