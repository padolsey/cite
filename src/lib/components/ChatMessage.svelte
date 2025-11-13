<script lang="ts">
  import { marked } from 'marked';
  import type { Message } from '$lib/../../lib/types';
  import SafetyBanner from './SafetyBanner.svelte';

  interface Props {
    message: Message;
    thinking?: string;
    isStreaming?: boolean;
    safetyBanner?: {
      category: string;
      resources: string;
      prefix?: string;
      mode: 'crisis_immediate' | 'distress_acute' | 'support_general';
      showBreathing: boolean;
      showGame: boolean;
      defaultTab: 'breathing' | 'game' | 'resources';
    } | null;
  }

  let { message, thinking = '', isStreaming = false, safetyBanner = null }: Props = $props();

  // Configure marked for safer rendering
  marked.setOptions({
    breaks: true, // Convert \n to <br>
    gfm: true     // GitHub Flavored Markdown
  });

  // Trim and render content as markdown
  const renderedContent = $derived.by(() => {
    const trimmed = message.content.trim();
    if (message.role === 'user') {
      // For user messages, just escape HTML and preserve line breaks
      return trimmed.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br/>');
    } else {
      // For assistant messages, render as markdown
      return marked.parse(trimmed, { async: false }) as string;
    }
  });
</script>

<div class="flex gap-3 {message.role === 'user' ? 'justify-end' : 'justify-start'}">
  <div class="max-w-2xl {message.role === 'user' ? 'order-2' : 'order-1'}">
    <!-- Role indicator -->
    <div class="text-xs text-gray-500 mb-1 {message.role === 'user' ? 'text-right' : 'text-left'}">
      {message.role === 'user' ? 'You' : 'Assistant'}
      {#if isStreaming}
        <span class="ml-1">•••</span>
      {/if}
    </div>

    <!-- Safety Banner (only for assistant with banner) -->
    {#if safetyBanner && message.role === 'assistant'}
      <div class="mb-2">
        <SafetyBanner
          category={safetyBanner.category}
          resources={safetyBanner.resources}
          prefix={safetyBanner.prefix}
          mode={safetyBanner.mode}
          showBreathing={safetyBanner.showBreathing}
          showGame={safetyBanner.showGame}
          defaultTab={safetyBanner.defaultTab}
        />
      </div>
    {/if}

    <!-- Message bubble -->
    <div class="
      px-4 py-3 rounded-lg
      {message.role === 'user'
        ? 'bg-blue-600 text-white'
        : 'bg-white border border-gray-200 text-gray-900'
      }
    ">
      <div class="break-words prose prose-sm max-w-none {message.role === 'user' ? 'prose-invert' : ''}">
        {@html renderedContent}
      </div>
    </div>

    <!-- Thinking indicator (only for assistant) -->
    {#if thinking && message.role === 'assistant'}
      <details class="mt-2 text-xs">
        <summary class="cursor-pointer text-gray-500 hover:text-gray-700">
          Internal thinking...
        </summary>
        <div class="mt-1 p-2 bg-yellow-50 border border-yellow-200 rounded text-gray-700">
          {thinking}
        </div>
      </details>
    {/if}
  </div>
</div>
