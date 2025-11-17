<script lang="ts">
  /**
   * Test Runs History
   * Browse past test runs
   */
  import { onMount } from 'svelte';

  interface TestRun {
    id: string;
    suite_name: string;
    models: string[];
    status: string;
    total_scenarios: number;
    completed_scenarios: number;
    failed_scenarios: number;
    overall_score: number;
    total_cost_usd: number;
    avg_latency_ms: number;
    started_at: string;
    completed_at: string;
    duration_ms: number;
  }

  let runs: TestRun[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  // Filters
  let selectedStatus = $state<string>('all');

  let filteredRuns = $derived(
    runs.filter((r) => {
      if (selectedStatus !== 'all' && r.status !== selectedStatus) return false;
      return true;
    })
  );

  onMount(async () => {
    await loadRuns();
  });

  async function loadRuns() {
    try {
      loading = true;
      error = null;

      const res = await fetch('/api/admin/suite?type=runs&limit=100');
      if (!res.ok) {
        throw new Error('Failed to load runs');
      }

      const data = await res.json();
      runs = data.data || [];
    } catch (err: any) {
      error = err.message;
      console.error('Error loading runs:', err);
    } finally {
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

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatDuration(ms: number): string {
    if (!ms) return '-';
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
      <span class="text-gray-900">Test Runs</span>
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Test Run History</h1>
        <p class="text-sm text-gray-600 mt-1">{runs.length} runs recorded</p>
      </div>
      <a
        href="/admin/suite/suites"
        class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition"
      >
        + New Run
      </a>
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
      <p class="mt-2 text-gray-600">Loading runs...</p>
    </div>
  {:else}
    <!-- Filters -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div class="flex items-center gap-4">
        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">Status</label>
          <select
            bind:value={selectedStatus}
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All</option>
            <option value="completed">Completed</option>
            <option value="running">Running</option>
            <option value="failed">Failed</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        <div class="ml-auto flex items-end">
          <span class="text-sm text-gray-600">
            Showing {filteredRuns.length} of {runs.length}
          </span>
        </div>
      </div>
    </div>

    <!-- Runs Table -->
    {#if filteredRuns.length === 0}
      <div class="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p class="text-gray-500 mb-4">No test runs yet</p>
        <a
          href="/admin/suite/suites"
          class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Run Your First Suite →
        </a>
      </div>
    {:else}
      <div class="bg-white border border-gray-200 rounded-lg overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full">
            <thead class="bg-gray-50">
              <tr>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Suite</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Models</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Score</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Started</th>
                <th class="px-6 py-3"></th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-200">
              {#each filteredRuns as run}
                <tr class="hover:bg-gray-50">
                  <td class="px-6 py-4 text-sm text-gray-900">
                    {run.suite_name || 'Unknown Suite'}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">
                    <div class="flex flex-wrap gap-1">
                      {#each run.models as model}
                        <span class="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {getModelShortName(model)}
                        </span>
                      {/each}
                    </div>
                  </td>
                  <td class="px-6 py-4">
                    <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getStatusBadgeClass(run.status)}">
                      {run.status}
                    </span>
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">
                    {#if run.status === 'running' || run.status === 'pending'}
                      <div class="flex items-center gap-2">
                        <div class="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-[100px]">
                          <div
                            class="h-full bg-blue-600 transition-all"
                            style="width: {(run.completed_scenarios / run.total_scenarios) * 100}%"
                          ></div>
                        </div>
                        <span class="text-xs">{run.completed_scenarios}/{run.total_scenarios}</span>
                      </div>
                    {:else}
                      {run.completed_scenarios}/{run.total_scenarios}
                    {/if}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">
                    {#if run.overall_score !== null && run.status === 'completed'}
                      <span class="font-medium {run.overall_score >= 0.75 ? 'text-green-600' : 'text-red-600'}">
                        {Math.round(run.overall_score * 100)}%
                      </span>
                    {:else}
                      <span class="text-gray-400">-</span>
                    {/if}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-600">
                    {formatDuration(run.duration_ms)}
                  </td>
                  <td class="px-6 py-4 text-sm text-gray-900">
                    {#if run.total_cost_usd !== null}
                      ${run.total_cost_usd.toFixed(3)}
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
      </div>
    {/if}
  {/if}
</div>
