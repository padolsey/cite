<script lang="ts">
  /**
   * Test Scenarios Browser
   * View and manage test scenarios
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

  let scenarios: Scenario[] = $state([]);
  let loading = $state(true);
  let error = $state<string | null>(null);
  let selectedScenario: Scenario | null = $state(null);
  let showDetailModal = $state(false);

  // Filters
  let suiteId = $derived($page.url.searchParams.get('suite_id'));
  let selectedCategory = $state<string>('all');
  let selectedRiskLevel = $state<string>('all');
  let searchQuery = $state('');

  // Computed
  let filteredScenarios = $derived(
    scenarios.filter((s) => {
      if (selectedCategory !== 'all' && s.category !== selectedCategory) return false;
      if (selectedRiskLevel !== 'all' && s.expected_risk_level !== selectedRiskLevel) return false;
      if (searchQuery && !s.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    })
  );

  let categories = $derived(Array.from(new Set(scenarios.map((s) => s.category))).sort());

  onMount(async () => {
    await loadScenarios();
  });

  async function loadScenarios() {
    try {
      loading = true;
      error = null;

      let url = '/api/admin/suite?type=scenarios&limit=1000';
      if (selectedCategory !== 'all') {
        url += `&category=${selectedCategory}`;
      }

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error('Failed to load scenarios');
      }

      const data = await res.json();
      scenarios = data.data || [];
    } catch (err: any) {
      error = err.message;
      console.error('Error loading scenarios:', err);
    } finally {
      loading = false;
    }
  }

  function openDetailModal(scenario: Scenario) {
    selectedScenario = scenario;
    showDetailModal = true;
  }

  function closeDetailModal() {
    showDetailModal = false;
    selectedScenario = null;
  }

  function handleModalBackgroundClick(event: MouseEvent) {
    if (event.target === event.currentTarget) {
      closeDetailModal();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape' && showDetailModal) {
      closeDetailModal();
    }
  }

  function getRiskLevelBadgeClass(level: string): string {
    switch (level) {
      case 'none':
        return 'bg-gray-100 text-gray-800';
      case 'low':
        return 'bg-blue-100 text-blue-800';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800';
      case 'high':
        return 'bg-orange-100 text-orange-800';
      case 'critical':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
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
      case 'baseline':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }

  function formatMessages(messages: any[]): string {
    return messages.map((m) => `${m.role}: ${m.content}`).join('\n\n');
  }
</script>

<div class="max-w-7xl mx-auto p-6">
  <!-- Header -->
  <div class="mb-8">
    <div class="flex items-center gap-2 text-sm text-gray-600 mb-2">
      <a href="/admin/suite" class="hover:text-blue-600">Suite</a>
      <span>/</span>
      <span class="text-gray-900">Scenarios</span>
      {#if suiteId}
        <span>/</span>
        <span class="text-gray-900">Suite Filter</span>
      {/if}
    </div>
    <div class="flex items-center justify-between">
      <div>
        <h1 class="text-3xl font-bold text-gray-900">Test Scenarios</h1>
        <p class="text-sm text-gray-600 mt-1">
          {scenarios.length} scenarios loaded
          {#if suiteId}
            <span class="text-blue-600">(filtered by suite)</span>
          {/if}
        </p>
      </div>
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
      <p class="mt-2 text-gray-600">Loading scenarios...</p>
    </div>
  {:else}
    <!-- Filters -->
    <div class="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <div class="flex flex-wrap gap-4">
        <div class="flex-1 min-w-[200px]">
          <label class="text-sm font-medium text-gray-700 block mb-1">Search</label>
          <input
            type="text"
            bind:value={searchQuery}
            placeholder="Search by name..."
            class="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">Category</label>
          <select
            bind:value={selectedCategory}
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Categories</option>
            {#each categories as category}
              <option value={category}>{category}</option>
            {/each}
          </select>
        </div>

        <div>
          <label class="text-sm font-medium text-gray-700 block mb-1">Risk Level</label>
          <select
            bind:value={selectedRiskLevel}
            class="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="all">All Levels</option>
            <option value="none">None</option>
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="critical">Critical</option>
          </select>
        </div>

        <div class="flex items-end">
          <span class="text-sm text-gray-600">
            Showing {filteredScenarios.length} of {scenarios.length}
          </span>
        </div>
      </div>
    </div>

    <!-- Scenarios Grid -->
    {#if filteredScenarios.length === 0}
      <div class="bg-white border border-gray-200 rounded-lg p-12 text-center">
        <p class="text-gray-500">No scenarios found matching your filters</p>
      </div>
    {:else}
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {#each filteredScenarios as scenario}
          <div class="bg-white border border-gray-200 rounded-lg p-6 hover:border-blue-300 transition">
            <div class="mb-4">
              <h3 class="text-lg font-semibold text-gray-900 mb-2">{scenario.name}</h3>
              {#if scenario.description}
                <p class="text-sm text-gray-600">{scenario.description}</p>
              {/if}
            </div>

            <div class="flex flex-wrap gap-2 mb-4">
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getRiskLevelBadgeClass(scenario.expected_risk_level)}">
                {scenario.expected_risk_level.toUpperCase()}
              </span>
              <span class="inline-flex px-2 py-1 text-xs font-semibold rounded-full {getCategoryBadgeClass(scenario.category)}">
                {scenario.category}
              </span>
              <span class="inline-flex px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-700">
                {scenario.messages.length} message{scenario.messages.length > 1 ? 's' : ''}
              </span>
            </div>

            {#if scenario.tags.length > 0}
              <div class="flex flex-wrap gap-1 mb-4">
                {#each scenario.tags.slice(0, 5) as tag}
                  <span class="text-xs px-2 py-0.5 bg-gray-50 text-gray-600 rounded">
                    {tag}
                  </span>
                {/each}
                {#if scenario.tags.length > 5}
                  <span class="text-xs px-2 py-0.5 text-gray-500">
                    +{scenario.tags.length - 5} more
                  </span>
                {/if}
              </div>
            {/if}

            <div class="mb-4">
              <div class="text-xs text-gray-500 mb-1">Preview:</div>
              <div class="text-sm text-gray-700 bg-gray-50 rounded p-2 max-h-20 overflow-hidden">
                {scenario.messages[0]?.content || 'No content'}
              </div>
            </div>

            {#if scenario.clinical_grounding}
              <div class="mb-4 text-xs text-gray-600">
                <strong>Grounding:</strong> {scenario.clinical_grounding}
              </div>
            {/if}

            <div class="flex gap-2">
              <a
                href="/admin/suite/scenarios/{scenario.id}"
                class="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                View & Test
              </a>
              <button
                onclick={() => openDetailModal(scenario)}
                class="px-4 py-2 border border-gray-300 text-gray-700 bg-white rounded-lg hover:bg-gray-50 font-medium transition-colors"
              >
                Quick View
              </button>
            </div>
          </div>
        {/each}
      </div>
    {/if}
  {/if}
</div>

<!-- Detail Modal -->
<svelte:window onkeydown={handleKeydown} />

{#if showDetailModal && selectedScenario}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
    onclick={handleModalBackgroundClick}
    role="dialog"
    aria-modal="true"
  >
    <div class="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b border-gray-200 sticky top-0 bg-white">
        <div class="flex items-start justify-between">
          <div>
            <h2 class="text-xl font-bold text-gray-900">{selectedScenario.name}</h2>
            {#if selectedScenario.description}
              <p class="text-sm text-gray-600 mt-1">{selectedScenario.description}</p>
            {/if}
          </div>
          <button
            onclick={closeDetailModal}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      <div class="p-6 space-y-6">
        <!-- Badges -->
        <div class="flex flex-wrap gap-2">
          <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full {getRiskLevelBadgeClass(selectedScenario.expected_risk_level)}">
            {selectedScenario.expected_risk_level.toUpperCase()}
          </span>
          <span class="inline-flex px-3 py-1 text-sm font-semibold rounded-full {getCategoryBadgeClass(selectedScenario.category)}">
            {selectedScenario.category}
          </span>
        </div>

        <!-- Messages -->
        <div>
          <h3 class="text-sm font-semibold text-gray-900 mb-2">Conversation</h3>
          <div class="bg-gray-50 rounded-lg p-4 space-y-3">
            {#each selectedScenario.messages as message}
              <div class="flex gap-3">
                <div class="flex-shrink-0">
                  <span class="inline-flex px-2 py-1 text-xs font-medium rounded {message.role === 'user' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                    {message.role}
                  </span>
                </div>
                <div class="flex-1 text-sm text-gray-700">
                  {message.content}
                </div>
              </div>
            {/each}
          </div>
        </div>

        <!-- Expected Output -->
        <div>
          <h3 class="text-sm font-semibold text-gray-900 mb-2">Expected Classification</h3>
          <div class="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
            <div>
              <strong>Risk Level:</strong>
              <span class="ml-2 px-2 py-0.5 rounded text-xs font-medium {getRiskLevelBadgeClass(selectedScenario.expected_risk_level)}">
                {selectedScenario.expected_risk_level.toUpperCase()}
              </span>
              {#if selectedScenario.expected_risk_level_range.length > 0}
                <span class="text-gray-600 ml-2">
                  (acceptable: {selectedScenario.expected_risk_level_range.join(', ')})
                </span>
              {/if}
            </div>
            <div>
              <strong>Min Confidence:</strong>
              <span class="text-gray-700 ml-2">{(selectedScenario.expected_confidence_min * 100).toFixed(0)}%</span>
            </div>
            {#if selectedScenario.expected_risk_types.length > 0}
              <div>
                <strong>Expected Risk Types:</strong>
                <div class="mt-1 space-y-1">
                  {#each selectedScenario.expected_risk_types as riskType}
                    <div class="text-xs text-gray-600 ml-2">
                      • {riskType.type} (min confidence: {(riskType.min_confidence * 100).toFixed(0)}%)
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>

        <!-- Clinical Grounding -->
        {#if selectedScenario.clinical_grounding}
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-2">Clinical Grounding</h3>
            <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              {selectedScenario.clinical_grounding}
            </div>
          </div>
        {/if}

        <!-- Source -->
        {#if selectedScenario.source}
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-2">Source</h3>
            <div class="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {selectedScenario.source}
            </div>
          </div>
        {/if}

        <!-- Tags -->
        {#if selectedScenario.tags.length > 0}
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-2">Tags</h3>
            <div class="flex flex-wrap gap-2">
              {#each selectedScenario.tags as tag}
                <span class="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                  {tag}
                </span>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Config -->
        {#if Object.keys(selectedScenario.config).length > 0}
          <div>
            <h3 class="text-sm font-semibold text-gray-900 mb-2">Configuration</h3>
            <pre class="text-xs bg-gray-50 rounded-lg p-3 overflow-x-auto">{JSON.stringify(selectedScenario.config, null, 2)}</pre>
          </div>
        {/if}
      </div>

      <div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          onclick={closeDetailModal}
          class="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-medium transition"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
