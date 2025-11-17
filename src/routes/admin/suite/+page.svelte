<script lang="ts">
  /**
   * Evaluation Suite - Model Performance Dashboard
   * Single-page view showing all suites, scenarios, and model scores
   */
  import { onMount } from 'svelte';

  interface Scenario {
    id: string;
    name: string;
    description?: string;
    messages?: any[];
    config?: Record<string, any>;
    conversation_id?: string;
    risk_state?: string;
    expected_risk_level: string;
    expected_risk_level_range?: string[];
    expected_risk_types?: Array<{ type: string; min_confidence: number }>;
    expected_confidence_min?: number;
    clinical_grounding?: string;
    source?: string;
    tags?: string[];
    category: string;
    validation_rules?: Record<string, any>;
    notes?: string;
    archived: boolean;
    version: number;
    copied_from: string | null;
    created_at?: string;
    updated_at?: string;
  }

  interface Suite {
    id: string;
    name: string;
    description: string;
    category: string;
    scenario_ids: string[];
  }

  interface ScenarioResult {
    scenario_id: string;
    model: string;
    actual_risk_level: string;
    actual_risk_types?: any[];
    actual_confidence: number;
    score: number;
    passed: boolean;
    grading_details: {
      riskLevelMatch: 'exact' | 'range' | 'close' | 'wrong';
      riskLevelScore: number;
      riskTypesMatch: 'all' | 'some' | 'none' | 'not-required';
      riskTypesScore: number;
      confidenceAppropriate: boolean;
      confidenceScore: number;
      reasoning: string;
    };
    latency_ms: number;
    cost_usd: number;
    request: {
      messages: any[];
      config?: Record<string, any>;
    };
    response: any;
    run_id: string;
    created_at: string;
  }

  let suites: Suite[] = $state([]);
  let scenarios: Scenario[] = $state([]);
  let results: ScenarioResult[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let runningSuites = $state<Set<string>>(new Set());
  let runningCells = $state<Set<string>>(new Set()); // Format: "scenarioId:model"
  let showArchived = $state(false);
  let openMenuId = $state<string | null>(null); // For dropdown menus - Format: "suiteId:scenarioId"
  let selectedScenario = $state<Scenario | null>(null); // For detail modal
  let selectedScenarioResults = $state<ScenarioResult[]>([]); // Results for selected scenario
  let showDetailModal = $state(false);

  // Model configuration - add/remove models here
  const models = [
    'anthropic/claude-haiku-4.5',
    'anthropic/claude-sonnet-4.5',
    'anthropic/claude-opus-4.5',
    'openai/gpt-4o',
  ];

  onMount(() => {
    loadAll();

    // Poll for updates every 10 seconds (only when there are running cells)
    const interval = setInterval(() => {
      if (runningCells.size > 0 || runningSuites.size > 0) {
        loadResults();
      }
    }, 10000);

    // Close menu when clicking outside
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (openMenuId && !target.closest('.relative')) {
        closeMenu();
      }
    }

    document.addEventListener('click', handleClickOutside);

    return () => {
      clearInterval(interval);
      document.removeEventListener('click', handleClickOutside);
    };
  });

  async function loadAll() {
    loading = true;
    await Promise.all([loadSuites(), loadScenarios(), loadResults()]);
    loading = false;
  }

  async function loadSuites() {
    try {
      const res = await fetch('/api/admin/suite?type=suites&limit=1000');
      if (!res.ok) throw new Error('Failed to load suites');
      const data = await res.json();
      suites = data.data || [];
    } catch (err: any) {
      error = err.message;
      console.error('Error loading suites:', err);
    }
  }

  async function loadScenarios() {
    try {
      const url = `/api/admin/suite?type=scenarios&limit=1000${showArchived ? '&show_archived=true' : ''}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to load scenarios');
      const data = await res.json();
      scenarios = data.data || [];
    } catch (err: any) {
      error = err.message;
      console.error('Error loading scenarios:', err);
    }
  }

  async function loadResults() {
    try {
      // Get latest 3 runs
      const runsRes = await fetch('/api/admin/suite?type=runs&limit=3');
      if (!runsRes.ok) return;
      const runsData = await runsRes.json();
      const runs = runsData.data || [];

      // Get results for these runs
      const allResults: ScenarioResult[] = [];
      for (const run of runs) {
        const res = await fetch(`/api/admin/suite?type=results&run_id=${run.id}`);
        if (res.ok) {
          const data = await res.json();
          const runResults = (data.data || []).map((r: any) => ({
            ...r,
            run_id: run.id,
          }));
          allResults.push(...runResults);
        }
      }

      results = allResults;
    } catch (err: any) {
      console.error('Error loading results:', err);
    }
  }

  async function runSuite(suiteId: string, modelsToRun: string[]) {
    runningSuites = new Set([...runningSuites, suiteId]);

    // Mark all cells in this suite as running
    const suite = suites.find(s => s.id === suiteId);
    if (suite) {
      const suiteScenarios = scenarios.filter(s => suite.scenario_ids.includes(s.id));
      const cellIds = suiteScenarios.flatMap(scenario =>
        modelsToRun.map(model => `${scenario.id}:${model}`)
      );
      runningCells = new Set([...runningCells, ...cellIds]);
    }

    error = null;

    try {
      // Create run
      const runRes = await fetch('/api/admin/suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_run',
          run: {
            suite_id: suiteId,
            models: modelsToRun,
            run_mode: 'parallel',
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

      // Poll for completion
      await pollForCompletion(run.id);
      await loadResults();
    } catch (err: any) {
      error = err.message;
      console.error('Error running suite:', err);
    } finally {
      runningSuites = new Set([...runningSuites].filter(id => id !== suiteId));

      // Clear running cells
      const suite = suites.find(s => s.id === suiteId);
      if (suite) {
        const suiteScenarios = scenarios.filter(s => suite.scenario_ids.includes(s.id));
        const cellIds = suiteScenarios.flatMap(scenario =>
          modelsToRun.map(model => `${scenario.id}:${model}`)
        );
        runningCells = new Set([...runningCells].filter(id => !cellIds.includes(id)));
      }
    }
  }

  async function pollForCompletion(runId: string) {
    while (true) {
      const res = await fetch(`/api/admin/suite?type=runs&id=${runId}`);
      if (res.ok) {
        const data = await res.json();
        const run = data.data;
        if (run.status === 'completed' || run.status === 'failed') {
          break;
        }
      }
      await new Promise(resolve => setTimeout(resolve, 3000)); // 3 seconds
    }
  }

  function getLatestScore(scenarioId: string, model: string): number | null {
    const scenarioResults = results.filter(
      r => r.scenario_id === scenarioId && r.model === model
    );
    if (scenarioResults.length === 0) return null;

    // Sort by created_at desc and get first
    scenarioResults.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return scenarioResults[0].score;
  }

  function getModelShortName(model: string): string {
    const name = model.split('/')[1] || model;
    return name.replace('claude-', '').replace('gpt-', '');
  }

  function getScoreColor(score: number): string {
    if (score >= 0.95) return 'text-green-700 font-semibold';
    if (score >= 0.85) return 'text-green-600';
    if (score >= 0.75) return 'text-yellow-600';
    if (score >= 0.60) return 'text-orange-600';
    return 'text-red-600 font-semibold';
  }

  async function archiveScenario(scenarioId: string) {
    if (!confirm('Archive this scenario? Results will remain but the scenario will be hidden from the dashboard.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'archive_scenario',
          scenario_id: scenarioId,
        }),
      });

      if (!res.ok) throw new Error('Failed to archive scenario');

      await loadScenarios();
      openMenuId = null;
    } catch (err: any) {
      error = err.message;
      console.error('Error archiving scenario:', err);
    }
  }

  async function copyScenario(scenarioId: string) {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (!scenario) return;

    try {
      const res = await fetch('/api/admin/suite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'copy_scenario',
          scenario_id: scenarioId,
        }),
      });

      if (!res.ok) throw new Error('Failed to copy scenario');

      await loadScenarios();
      openMenuId = null;
    } catch (err: any) {
      error = err.message;
      console.error('Error copying scenario:', err);
    }
  }

  function toggleMenu(suiteId: string, scenarioId: string) {
    const menuKey = `${suiteId}:${scenarioId}`;
    openMenuId = openMenuId === menuKey ? null : menuKey;
  }

  function closeMenu() {
    openMenuId = null;
  }

  async function viewScenarioDetails(scenarioId: string) {
    try {
      // Load full scenario details
      const res = await fetch(`/api/admin/suite?type=scenarios&id=${scenarioId}`);
      if (!res.ok) throw new Error('Failed to load scenario details');
      const data = await res.json();
      selectedScenario = data.data;

      // Load all test results for this scenario
      selectedScenarioResults = results.filter(r => r.scenario_id === scenarioId);

      showDetailModal = true;
      openMenuId = null;
    } catch (err: any) {
      error = err.message;
      console.error('Error loading scenario details:', err);
    }
  }

  function closeDetailModal() {
    showDetailModal = false;
    selectedScenario = null;
    selectedScenarioResults = [];
  }

  async function deleteAllResults() {
    if (!confirm('Delete ALL test results and runs? This cannot be undone.\n\nThis will remove all historical test data but keep scenarios and suites.')) {
      return;
    }

    try {
      const res = await fetch('/api/admin/suite/results', {
        method: 'DELETE',
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to delete results');
      }

      // Reload results (should be empty now)
      await loadResults();
      results = [];
    } catch (err: any) {
      error = err.message;
      console.error('Error deleting results:', err);
    }
  }

  // Reload scenarios when show_archived changes
  $effect(() => {
    if (!loading) {
      loadScenarios();
    }
  });
</script>

<div class="max-w-[1600px] mx-auto p-6">
  <!-- Header -->
  <div class="mb-6 flex items-start justify-between">
    <div>
      <h1 class="text-3xl font-bold text-gray-900 mb-2">Model Performance Dashboard</h1>
      <p class="text-gray-600">
        Compare model performance across all test scenarios
      </p>
    </div>

    <div class="flex items-center gap-3">
      <!-- Show Archived Toggle -->
      <div class="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-4 py-2">
        <label for="showArchived" class="text-sm font-medium text-gray-700 cursor-pointer">
          Show Archived
        </label>
        <input
          id="showArchived"
          type="checkbox"
          bind:checked={showArchived}
          class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
        />
      </div>

      <!-- Delete All Results Button -->
      <button
        onclick={deleteAllResults}
        class="px-4 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 border border-red-700"
        title="Delete all test results and runs"
      >
        Delete All Results
      </button>
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
      <p class="mt-2 text-gray-600">Loading...</p>
    </div>
  {:else}
    <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
      <table class="w-full text-sm">
        <thead class="bg-gray-50 border-b border-gray-200">
          <tr>
            <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase w-[400px]">
              Suite / Scenario
            </th>
            {#each models as model}
              <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                {getModelShortName(model)}
              </th>
            {/each}
            <th class="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase w-[120px]">
              Action
            </th>
          </tr>
        </thead>
        <tbody>
          {#each suites as suite}
            {@const suiteScenarios = scenarios.filter(s => suite.scenario_ids.includes(s.id))}

            <!-- Suite Header Row -->
            <tr class="bg-blue-50 border-t-2 border-blue-200">
              <td class="px-6 py-3 font-semibold text-gray-900" colspan={models.length + 2}>
                <div class="flex items-center justify-between">
                  <div>
                    <span class="text-base">{suite.name}</span>
                    <span class="text-xs text-gray-600 ml-2">({suiteScenarios.length} scenarios)</span>
                  </div>
                  <button
                    onclick={() => runSuite(suite.id, models)}
                    disabled={runningSuites.has(suite.id)}
                    class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {runningSuites.has(suite.id) ? 'Running...' : 'Run All'}
                  </button>
                </div>
              </td>
            </tr>

            <!-- Scenario Rows -->
            {#each suiteScenarios as scenario}
              <tr
                class="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                class:opacity-60={scenario.archived}
                onclick={(e) => {
                  // Don't open modal if clicking on buttons or dropdowns
                  if (!(e.target as HTMLElement).closest('button')) {
                    viewScenarioDetails(scenario.id);
                  }
                }}
              >
                <td class="px-6 py-3 pl-12">
                  <div class="flex items-center gap-2">
                    <span class:text-gray-900={!scenario.archived} class:text-gray-500={scenario.archived} class:italic={scenario.archived}>
                      {scenario.name}
                    </span>
                    {#if scenario.version > 1}
                      <span class="inline-flex px-1.5 py-0.5 text-xs rounded bg-purple-100 text-purple-700 font-medium">
                        v{scenario.version}
                      </span>
                    {/if}
                    {#if scenario.archived}
                      <span class="inline-flex px-1.5 py-0.5 text-xs rounded bg-gray-200 text-gray-600">
                        Archived
                      </span>
                    {/if}
                  </div>
                  <div class="flex gap-2 mt-1">
                    <span class="inline-flex px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                      {scenario.expected_risk_level}
                    </span>
                    <span class="inline-flex px-2 py-0.5 text-xs rounded bg-gray-100 text-gray-600">
                      {scenario.category}
                    </span>
                  </div>
                </td>

                {#each models as model}
                  {@const score = getLatestScore(scenario.id, model)}
                  {@const cellId = `${scenario.id}:${model}`}
                  {@const isRunning = runningCells.has(cellId)}
                  <td class="px-4 py-3 text-center">
                    {#if isRunning}
                      <div class="flex items-center justify-center gap-1">
                        <div class="inline-block animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        <span class="text-xs text-blue-600">Running</span>
                      </div>
                    {:else if score !== null}
                      <span class={getScoreColor(score)}>
                        {(score * 100).toFixed(0)}%
                      </span>
                    {:else}
                      <span class="text-gray-400">-</span>
                    {/if}
                  </td>
                {/each}

                <td class="px-4 py-3 text-center relative">
                  <div class="flex items-center justify-center gap-1">
                    <!-- Dropdown Menu -->
                    {#if !scenario.archived}
                      {@const menuKey = `${suite.id}:${scenario.id}`}
                      <div class="relative">
                        <button
                          onclick={() => toggleMenu(suite.id, scenario.id)}
                          class="p-1 hover:bg-gray-100 rounded"
                          title="More actions"
                        >
                          <svg class="w-4 h-4 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
                          </svg>
                        </button>

                        {#if openMenuId === menuKey}
                          <div class="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
                            <button
                              onclick={() => viewScenarioDetails(scenario.id)}
                              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                              </svg>
                              View Details
                            </button>
                            <button
                              onclick={() => copyScenario(scenario.id)}
                              class="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"/>
                              </svg>
                              Copy Scenario
                            </button>
                            <button
                              onclick={() => archiveScenario(scenario.id)}
                              class="w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50 flex items-center gap-2"
                            >
                              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
                              </svg>
                              Archive Scenario
                            </button>
                          </div>
                        {/if}
                      </div>
                    {/if}
                  </div>
                </td>
              </tr>
            {/each}
          {/each}
        </tbody>
      </table>
    </div>

    <!-- Summary Stats -->
    <div class="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
      {#each models as model}
        {@const modelResults = results.filter(r => r.model === model)}
        {@const avgScore = modelResults.length > 0
          ? modelResults.reduce((sum, r) => sum + r.score, 0) / modelResults.length
          : 0}
        {@const passRate = modelResults.length > 0
          ? modelResults.filter(r => r.passed).length / modelResults.length
          : 0}

        <div class="bg-white border border-gray-200 rounded-lg p-4">
          <div class="text-sm font-medium text-gray-600 mb-2">
            {getModelShortName(model)}
          </div>
          <div class="text-2xl font-bold text-gray-900 mb-1">
            {(avgScore * 100).toFixed(1)}%
          </div>
          <div class="text-xs text-gray-500">
            Pass rate: {(passRate * 100).toFixed(0)}% ({modelResults.filter(r => r.passed).length}/{modelResults.length})
          </div>
        </div>
      {/each}
    </div>

    <!-- Legend -->
    <div class="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
      <div class="text-sm font-medium text-gray-700 mb-2">Score Colors</div>
      <div class="flex gap-6 text-xs">
        <span class="text-green-700 font-semibold">≥95% Excellent</span>
        <span class="text-green-600">≥85% Good</span>
        <span class="text-yellow-600">≥75% Pass</span>
        <span class="text-orange-600">≥60% Weak</span>
        <span class="text-red-600 font-semibold">&lt;60% Fail</span>
      </div>
    </div>
  {/if}

  <!-- Scenario Detail Modal -->
  {#if showDetailModal && selectedScenario}
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <!-- Modal Header -->
        <div class="flex items-center justify-between border-b border-gray-200 p-6">
          <div class="flex items-center gap-3">
            <h2 class="text-2xl font-bold text-gray-900">{selectedScenario.name}</h2>
            {#if selectedScenario.version > 1}
              <span class="inline-flex px-2 py-1 text-xs rounded bg-purple-100 text-purple-700 font-medium">
                v{selectedScenario.version}
              </span>
            {/if}
            {#if selectedScenario.archived}
              <span class="inline-flex px-2 py-1 text-xs rounded bg-gray-200 text-gray-600">
                Archived
              </span>
            {/if}
          </div>
          <button
            onclick={closeDetailModal}
            class="text-gray-400 hover:text-gray-600 p-1"
            aria-label="Close modal"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <!-- Modal Body -->
        <div class="overflow-y-auto p-6 space-y-6">
          <!-- Description -->
          {#if selectedScenario.description}
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Description</h3>
              <p class="text-gray-900">{selectedScenario.description}</p>
            </div>
          {/if}

          <!-- Metadata Grid -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Category</h3>
              <span class="inline-flex px-3 py-1 text-sm rounded bg-gray-100 text-gray-700">
                {selectedScenario.category}
              </span>
            </div>

            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Expected Risk Level</h3>
              <span class="inline-flex px-3 py-1 text-sm rounded bg-blue-100 text-blue-700 font-medium">
                {selectedScenario.expected_risk_level}
              </span>
            </div>

            {#if selectedScenario.expected_risk_level_range && selectedScenario.expected_risk_level_range.length > 0}
              <div>
                <h3 class="text-sm font-semibold text-gray-700 mb-2">Acceptable Range</h3>
                <div class="flex flex-wrap gap-1">
                  {#each selectedScenario.expected_risk_level_range as level}
                    <span class="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                      {level}
                    </span>
                  {/each}
                </div>
              </div>
            {/if}

            {#if selectedScenario.expected_confidence_min !== undefined}
              <div>
                <h3 class="text-sm font-semibold text-gray-700 mb-2">Min Confidence</h3>
                <span class="text-gray-900">{(selectedScenario.expected_confidence_min * 100).toFixed(0)}%</span>
              </div>
            {/if}
          </div>

          <!-- Tags -->
          {#if selectedScenario.tags && selectedScenario.tags.length > 0}
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Tags</h3>
              <div class="flex flex-wrap gap-2">
                {#each selectedScenario.tags as tag}
                  <span class="inline-flex px-2 py-1 text-xs rounded bg-gray-100 text-gray-600">
                    {tag}
                  </span>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Expected Risk Types -->
          {#if selectedScenario.expected_risk_types && selectedScenario.expected_risk_types.length > 0}
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Expected Risk Types</h3>
              <div class="space-y-2">
                {#each selectedScenario.expected_risk_types as riskType}
                  <div class="flex items-center justify-between bg-gray-50 rounded p-2">
                    <span class="text-gray-900">{riskType.type}</span>
                    <span class="text-xs text-gray-600">min: {(riskType.min_confidence * 100).toFixed(0)}%</span>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Messages -->
          {#if selectedScenario.messages && selectedScenario.messages.length > 0}
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Conversation Messages</h3>
              <div class="space-y-2 max-h-64 overflow-y-auto bg-gray-50 rounded-lg p-4">
                {#each selectedScenario.messages as message}
                  <div class="border-l-2 {message.role === 'user' ? 'border-blue-500' : 'border-green-500'} pl-3">
                    <div class="text-xs font-medium {message.role === 'user' ? 'text-blue-700' : 'text-green-700'} mb-1">
                      {message.role}
                    </div>
                    <div class="text-sm text-gray-900 whitespace-pre-wrap">{message.content}</div>
                  </div>
                {/each}
              </div>
            </div>
          {/if}

          <!-- Clinical Grounding -->
          {#if selectedScenario.clinical_grounding}
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Clinical Grounding</h3>
              <p class="text-gray-900 whitespace-pre-wrap">{selectedScenario.clinical_grounding}</p>
            </div>
          {/if}

          <!-- Source -->
          {#if selectedScenario.source}
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Source</h3>
              <p class="text-gray-900">{selectedScenario.source}</p>
            </div>
          {/if}

          <!-- Notes -->
          {#if selectedScenario.notes}
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Notes</h3>
              <p class="text-gray-900 whitespace-pre-wrap">{selectedScenario.notes}</p>
            </div>
          {/if}

          <!-- Config -->
          {#if selectedScenario.config && Object.keys(selectedScenario.config).length > 0}
            <div>
              <h3 class="text-sm font-semibold text-gray-700 mb-2">Configuration</h3>
              <pre class="bg-gray-50 rounded p-3 text-xs overflow-x-auto">{JSON.stringify(selectedScenario.config, null, 2)}</pre>
            </div>
          {/if}

          <!-- Test Results -->
          {#if selectedScenarioResults.length > 0}
            <div class="pt-4 border-t-2 border-gray-300">
              <h3 class="text-lg font-bold text-gray-900 mb-4">Test Results</h3>

              {#each models as model}
                {@const modelResults = selectedScenarioResults.filter(r => r.model === model)}
                {@const latestResult = modelResults.sort((a, b) =>
                  new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                )[0]}

                {#if latestResult}
                  <div class="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div class="flex items-center justify-between mb-3">
                      <h4 class="font-semibold text-gray-900">{getModelShortName(model)}</h4>
                      <div class="flex items-center gap-2">
                        <span class={latestResult.passed ? 'text-green-700 font-semibold' : 'text-red-700 font-semibold'}>
                          {latestResult.passed ? '✓ PASS' : '✗ FAIL'}
                        </span>
                        <span class={getScoreColor(latestResult.score)}>
                          {(latestResult.score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    <!-- Expected vs Actual -->
                    <div class="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div class="text-xs font-medium text-gray-600 mb-1">Expected Risk Level</div>
                        <div class="text-sm font-semibold text-blue-700">
                          {selectedScenario.expected_risk_level}
                          {#if selectedScenario.expected_risk_level_range && selectedScenario.expected_risk_level_range.length > 0}
                            <span class="text-xs text-gray-600">
                              (or {selectedScenario.expected_risk_level_range.join(', ')})
                            </span>
                          {/if}
                        </div>
                      </div>
                      <div>
                        <div class="text-xs font-medium text-gray-600 mb-1">Actual Risk Level</div>
                        <div class="text-sm font-semibold" class:text-green-700={latestResult.grading_details.riskLevelMatch === 'exact' || latestResult.grading_details.riskLevelMatch === 'range'}
                             class:text-orange-600={latestResult.grading_details.riskLevelMatch === 'close'}
                             class:text-red-700={latestResult.grading_details.riskLevelMatch === 'wrong'}>
                          {latestResult.actual_risk_level}
                        </div>
                      </div>

                      {#if selectedScenario.expected_confidence_min !== undefined}
                        <div>
                          <div class="text-xs font-medium text-gray-600 mb-1">Min Confidence</div>
                          <div class="text-sm">{(selectedScenario.expected_confidence_min * 100).toFixed(0)}%</div>
                        </div>
                        <div>
                          <div class="text-xs font-medium text-gray-600 mb-1">Actual Confidence</div>
                          <div class="text-sm" class:text-green-700={latestResult.grading_details.confidenceAppropriate}
                               class:text-red-700={!latestResult.grading_details.confidenceAppropriate}>
                            {(latestResult.actual_confidence * 100).toFixed(0)}%
                          </div>
                        </div>
                      {/if}
                    </div>

                    <!-- Grading Details -->
                    <div class="mb-3">
                      <div class="text-xs font-medium text-gray-600 mb-1">Grading Details</div>
                      <div class="text-sm text-gray-900 bg-white rounded p-2 font-mono text-xs">
                        {latestResult.grading_details.reasoning}
                      </div>
                    </div>

                    <!-- Performance -->
                    <div class="grid grid-cols-2 gap-4 text-xs text-gray-600 mb-3">
                      <div>
                        <span class="font-medium">Latency:</span> {latestResult.latency_ms}ms
                      </div>
                      <div>
                        <span class="font-medium">Cost:</span> ${latestResult.cost_usd.toFixed(4)}
                      </div>
                    </div>

                    <!-- Raw LLM Payload -->
                    {#if latestResult.response.debug_info?.llm_requests}
                      <details class="mt-3">
                        <summary class="cursor-pointer text-sm font-medium text-blue-700 hover:text-blue-900">
                          View Raw LLM Payload (Sent to {model})
                        </summary>
                        <div class="mt-2 space-y-3">
                          {#each latestResult.response.debug_info.llm_requests as llmReq}
                            <div>
                              <div class="text-xs font-semibold text-gray-700 mb-1">
                                Model: {llmReq.model}
                              </div>
                              <pre class="bg-white rounded p-3 text-xs overflow-x-auto border border-gray-300">{JSON.stringify(llmReq.request_payload, null, 2)}</pre>
                            </div>
                          {/each}
                        </div>
                      </details>
                    {/if}

                    <!-- Raw Request/Response -->
                    <details class="mt-3">
                      <summary class="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                        View Full API Request & Response
                      </summary>
                      <div class="mt-2 space-y-3">
                        <!-- Request -->
                        <div>
                          <div class="text-xs font-semibold text-gray-700 mb-1">API Request:</div>
                          <pre class="bg-white rounded p-3 text-xs overflow-x-auto border border-gray-300">{JSON.stringify(latestResult.request, null, 2)}</pre>
                        </div>

                        <!-- Response -->
                        <div>
                          <div class="text-xs font-semibold text-gray-700 mb-1">API Response:</div>
                          <pre class="bg-white rounded p-3 text-xs overflow-x-auto border border-gray-300">{JSON.stringify(latestResult.response, null, 2)}</pre>
                        </div>
                      </div>
                    </details>
                  </div>
                {/if}
              {/each}
            </div>
          {:else}
            <div class="pt-4 border-t-2 border-gray-300">
              <div class="text-center py-6 bg-gray-50 rounded-lg">
                <p class="text-gray-600">No test results yet. Run this scenario to see results.</p>
              </div>
            </div>
          {/if}

          <!-- Timestamps -->
          <div class="grid grid-cols-2 gap-4 text-xs text-gray-500 pt-4 border-t border-gray-200">
            {#if selectedScenario.created_at}
              <div>
                <span class="font-medium">Created:</span>
                {new Date(selectedScenario.created_at).toLocaleString()}
              </div>
            {/if}
            {#if selectedScenario.updated_at}
              <div>
                <span class="font-medium">Updated:</span>
                {new Date(selectedScenario.updated_at).toLocaleString()}
              </div>
            {/if}
          </div>
        </div>

        <!-- Modal Footer -->
        <div class="flex justify-end gap-2 border-t border-gray-200 p-6">
          <button
            onclick={closeDetailModal}
            class="px-4 py-2 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  {/if}
</div>
