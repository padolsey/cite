<script lang="ts">
  /**
   * Test Suites Management
   * Browse, select, and run test suites
   */
  import { onMount } from 'svelte';

  interface Suite {
    id: string;
    name: string;
    description: string;
    category: string;
    scenario_ids: string[];
    tags: string[];
    created_at: string;
  }

  let suites: Suite[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);

  onMount(async () => {
    await loadSuites();
  });

  async function loadSuites() {
    try {
      loading = true;
      error = null;

      const res = await fetch('/api/admin/suite?type=suites&limit=100');
      if (!res.ok) {
        throw new Error('Failed to load suites');
      }

      const data = await res.json();
      suites = data.data || [];
    } catch (err: any) {
      error = err.message;
      console.error('Error loading suites:', err);
    } finally {
      loading = false;
    }
  }

  function getCategoryBadgeClass(category: string): string {
    switch (category) {
      case 'clinical':
        return 'bg-blue-100 text-blue-800';
      case 'safety':
        return 'bg-red-100 text-red-800';
      case 'edge-cases':
        return 'bg-yellow-100 text-yellow-800';
      case 'integration':
        return 'bg-green-100 text-green-800';
      case 'comprehensive':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }
</script>

<div class="max-w-7xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8 flex items-center justify-between">
    <div>
      <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
        <a href="/admin/suite" class="hover:text-blue-600">Suite</a>
        <span>/</span>
        <span class="text-gray-900">Test Suites</span>
      </div>
      <h1 class="text-3xl font-bold text-gray-900">Test Suites</h1>
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
      <p class="mt-2 text-gray-600">Loading suites...</p>
    </div>
  {:else if suites.length === 0}
    <div class="bg-white border border-gray-200 rounded-lg p-12 text-center">
      <p class="text-gray-500 mb-4">No test suites found</p>
      <p class="text-sm text-gray-400">Run database seed to populate test suites</p>
    </div>
  {:else}
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {#each suites as suite}
        <div class="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition">
          <div class="flex items-start justify-between mb-4">
            <div class="flex-1">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">{suite.name}</h3>
              <p class="text-sm text-gray-600 mb-3">{suite.description}</p>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 mb-4">
            <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getCategoryBadgeClass(suite.category)}">
              {suite.category}
            </span>
            <span class="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
              {suite.scenario_ids.length} scenarios
            </span>
          </div>

          {#if suite.tags.length > 0}
            <div class="flex flex-wrap gap-1 mb-4">
              {#each suite.tags.slice(0, 4) as tag}
                <span class="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 rounded">
                  {tag}
                </span>
              {/each}
              {#if suite.tags.length > 4}
                <span class="text-xs px-2 py-0.5 text-gray-500">
                  +{suite.tags.length - 4} more
                </span>
              {/if}
            </div>
          {/if}

          <a
            href="/admin/suite/suites/{suite.id}"
            class="block w-full px-4 py-2 bg-blue-600 text-white text-center rounded-lg hover:bg-blue-700 font-medium transition-colors"
          >
            View & Run Suite →
          </a>
        </div>
      {/each}
    </div>
  {/if}
</div>
