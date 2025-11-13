<script lang="ts">
  import type { ProcessEvent } from '$lib/../../lib/types';

  interface Props {
    processEvents: ProcessEvent[];
    isStreaming: boolean;
    thinking: string;
  }

  let { processEvents, isStreaming, thinking }: Props = $props();

  function getEventColor(type: string): string {
    switch (type) {
      case 'context': return 'text-blue-600';
      case 'interception': return 'text-green-600';
      case 'thinking': return 'text-purple-600';
      case 'escalation': return 'text-red-600';
      default: return 'text-gray-600';
    }
  }

  function getEventLabel(type: string): string {
    switch (type) {
      case 'context': return 'CTX';
      case 'interception': return 'INT';
      case 'thinking': return 'THK';
      case 'escalation': return 'ESC';
      default: return 'SYS';
    }
  }

  function formatTime(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', {
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      fractionalSecondDigits: 3
    });
  }

  function formatDuration(ms: number | undefined): string {
    if (!ms) return '';
    return ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(2)}s`;
  }

  const byType = $derived(processEvents.reduce((acc, e) => {
    acc[e.type] = (acc[e.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>));
</script>

<div class="h-full flex flex-col bg-gray-900 text-gray-100 font-mono text-xs">
  <!-- Header -->
  <div class="px-3 py-2 bg-gray-800 border-b border-gray-700 flex items-center justify-between">
    <span class="font-semibold">PROCESS LOG</span>
    {#if isStreaming}
      <span class="text-blue-400 animate-pulse">● ACTIVE</span>
    {:else if processEvents.length > 0}
      <span class="text-gray-500">COMPLETE</span>
    {/if}
  </div>

  <!-- Stats Bar -->
  {#if processEvents.length > 0}
    <div class="px-3 py-1 bg-gray-800 border-b border-gray-700 flex gap-4 text-[10px] text-gray-400">
      <span>EVENTS: {processEvents.length}</span>
      {#each Object.entries(byType) as [type, count]}
        <span class={getEventColor(type)}>{getEventLabel(type)}: {count}</span>
      {/each}
    </div>
  {/if}

  <!-- Log Stream -->
  <div class="flex-1 overflow-y-auto px-3 py-2 space-y-0.5">
    {#if processEvents.length === 0}
      <div class="text-gray-500 py-4">Waiting for events...</div>
    {:else}
      {#each processEvents as event (event.id)}
        {@const color = getEventColor(event.type)}
        {@const label = getEventLabel(event.type)}

        <div class="hover:bg-gray-800 py-0.5">
          <div class="flex gap-2">
            <span class="text-gray-500 select-none">{formatTime(event.timestamp)}</span>
            <span class="{color} font-semibold w-8 flex-shrink-0">[{label}]</span>
            <span class="flex-1">{event.description}</span>
            {#if event.duration}
              <span class="text-gray-500 flex-shrink-0">+{formatDuration(event.duration)}</span>
            {/if}
          </div>

          {#if event.data}
            <details class="ml-11 mt-0.5">
              <summary class="text-gray-500 cursor-pointer hover:text-gray-300 select-none text-[10px]">
                └─ data
              </summary>
              <pre class="text-gray-400 ml-3 mt-0.5 text-[10px] leading-tight">{JSON.stringify(event.data, null, 2)}</pre>
            </details>
          {/if}
        </div>
      {/each}
    {/if}

    <!-- Show thinking as single stateful element -->
    {#if thinking}
      <div class="hover:bg-gray-800 py-0.5" class:animate-pulse={isStreaming}>
        <div class="flex gap-2">
          <span class="text-gray-500 select-none">{formatTime(Date.now())}</span>
          <span class="text-purple-600 font-semibold w-8 flex-shrink-0">[THK]</span>
          <span class="flex-1">{isStreaming ? 'Reasoning in progress...' : 'Internal reasoning'}</span>
        </div>
        <div class="ml-11 mt-1 text-purple-300 text-[10px] leading-snug border-l-2 border-purple-700 pl-2 py-1">
          {thinking}
        </div>
      </div>
    {/if}
  </div>
</div>
