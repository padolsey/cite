<script lang="ts">
  import { marked } from 'marked';
  import BreathingExercise from './BreathingExercise.svelte';
  import CalmingGame from './CalmingGame.svelte';

  interface Props {
    category: string;
    resources: string;
    prefix?: string;
    mode: 'crisis_immediate' | 'distress_acute' | 'support_general';
    showBreathing: boolean;
    showGame: boolean;
    defaultTab: 'breathing' | 'game' | 'resources';
  }

  let { category, resources, prefix, mode, showBreathing, showGame, defaultTab }: Props = $props();
  let showModal = $state(false);
  let activeTab = $state<'breathing' | 'game' | 'resources'>(defaultTab);

  // Configure marked
  marked.setOptions({
    breaks: true,
    gfm: true
  });

  const renderedResources = $derived(marked.parse(resources, { async: false }) as string);

  // Determine severity based on category
  const severity = $derived.by(() => {
    const cat = category.toLowerCase();
    if (cat.includes('suicide') || cat.includes('self-harm') || cat.includes('crisis')) {
      return 'high';
    } else if (cat.includes('panic') || cat.includes('anxiety') || cat.includes('acute')) {
      return 'medium';
    }
    return 'low';
  });

  // UI colors based on severity
  const colors = $derived.by(() => {
    if (severity === 'high') {
      return {
        banner: 'bg-red-50 border-red-200',
        button: 'bg-red-600 hover:bg-red-700',
        header: 'bg-red-600',
        tab: 'border-red-600 text-red-700',
        tabInactive: 'border-gray-300 text-gray-600 hover:border-gray-400'
      };
    } else if (severity === 'medium') {
      return {
        banner: 'bg-orange-50 border-orange-200',
        button: 'bg-orange-600 hover:bg-orange-700',
        header: 'bg-orange-600',
        tab: 'border-orange-600 text-orange-700',
        tabInactive: 'border-gray-300 text-gray-600 hover:border-gray-400'
      };
    }
    return {
      banner: 'bg-blue-50 border-blue-200',
      button: 'bg-blue-600 hover:bg-blue-700',
      header: 'bg-blue-600',
      tab: 'border-blue-600 text-blue-700',
      tabInactive: 'border-gray-300 text-gray-600 hover:border-gray-400'
    };
  });

  const bannerText = $derived.by(() => {
    if (severity === 'high') {
      return 'If you need immediate support, resources are available.';
    } else if (severity === 'medium') {
      return 'Take a moment. Support tools are here if you need them.';
    }
    return 'Additional support available if needed.';
  });

  function openModal() {
    showModal = true;
    // Use the provided defaultTab from mode configuration
    activeTab = defaultTab;
  }
</script>

<!-- Compact Banner -->
<div class="{colors.banner} border px-3 py-2 rounded flex items-center gap-3">
  <div class="flex-1 min-w-0">
    <div class="text-sm text-gray-700">
      {bannerText}
    </div>
  </div>
  <button
    onclick={openModal}
    class="px-3 py-1 {colors.button} text-white text-xs rounded flex-shrink-0"
  >
    Access Support
  </button>
</div>

<!-- Modal -->
{#if showModal}
  <div
    class="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4 backdrop-blur-sm"
    onclick={() => showModal = false}
  >
    <div
      class="bg-white rounded-xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col"
      style="height: min(600px, 85vh);"
      onclick={(e) => e.stopPropagation()}
    >
      <!-- Header -->
      <div class="{colors.header} px-5 sm:px-6 py-4 flex items-center justify-between flex-shrink-0">
        <h3 class="text-lg sm:text-xl font-semibold text-white">
          Support Tools
        </h3>
        <button
          onclick={() => showModal = false}
          class="text-white hover:text-gray-200 text-3xl font-bold leading-none w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <!-- Tabs -->
      <div class="flex border-b border-gray-200 px-4 sm:px-6 bg-gray-50 flex-shrink-0">
        {#if showBreathing}
          <button
            onclick={() => activeTab = 'breathing'}
            class="px-4 sm:px-6 py-3 text-sm sm:text-base font-medium border-b-3 -mb-px transition-all {
              activeTab === 'breathing' ? colors.tab + ' bg-white' : colors.tabInactive + ' hover:bg-white/50'
            }"
            style="border-bottom-width: 3px;"
          >
            Breathing
          </button>
        {/if}
        {#if showGame}
          <button
            onclick={() => activeTab = 'game'}
            class="px-4 sm:px-6 py-3 text-sm sm:text-base font-medium border-b-3 -mb-px transition-all {
              activeTab === 'game' ? colors.tab + ' bg-white' : colors.tabInactive + ' hover:bg-white/50'
            }"
            style="border-bottom-width: 3px;"
          >
            Distraction
          </button>
        {/if}
        <button
          onclick={() => activeTab = 'resources'}
          class="px-4 sm:px-6 py-3 text-sm sm:text-base font-medium border-b-3 -mb-px transition-all {
            activeTab === 'resources' ? colors.tab + ' bg-white' : colors.tabInactive + ' hover:bg-white/50'
          }"
          style="border-bottom-width: 3px;"
        >
          Resources
        </button>
      </div>

      <!-- Content -->
      <div class="flex-1 overflow-y-auto">
        {#if activeTab === 'breathing'}
          <div class="h-full">
            <BreathingExercise />
          </div>
        {:else if activeTab === 'game'}
          <div class="h-full p-4 sm:p-6">
            <CalmingGame />
          </div>
        {:else if activeTab === 'resources'}
          <div class="px-4 sm:px-6 py-4 sm:py-6">
            {#if prefix}
              <div class="text-base text-gray-800 mb-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
                {prefix}
              </div>
            {/if}
            <div class="prose prose-sm sm:prose-base max-w-none">
              {@html renderedResources}
            </div>
          </div>
        {/if}
      </div>

      <!-- Footer -->
      <div class="border-t border-gray-200 px-4 sm:px-6 py-3 sm:py-4 flex justify-between items-center bg-gray-50 flex-shrink-0">
        <div class="text-xs sm:text-sm text-gray-600 font-medium">
          {#if activeTab === 'breathing'}
            Take your time with each breath
          {:else if activeTab === 'game'}
            No rush, just focus
          {:else}
            Available 24/7
          {/if}
        </div>
        <button
          onclick={() => showModal = false}
          class="px-4 sm:px-5 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm sm:text-base font-medium rounded-lg shadow-sm transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  </div>
{/if}
