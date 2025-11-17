<script lang="ts">
  import { onMount } from 'svelte';
  import type { Message, CITEConfig, StreamChunk, ProcessEvent } from '$lib/../../lib/types';
  import type { ProfileKey } from '$lib/../../lib/interception/Router';
  import ConfigPanel from '$lib/components/ConfigPanel.svelte';
  import ProcessPanel from '$lib/components/ProcessPanel.svelte';
  import ChatMessage from '$lib/components/ChatMessage.svelte';
  import TypingIndicator from '$lib/components/TypingIndicator.svelte';

  // State
  let messages = $state<Message[]>([]);
  let currentInput = $state('');
  let isStreaming = $state(false);
  let streamingContent = $state('');
  let streamingThinking = $state('');
  let processEvents = $state<ProcessEvent[]>([]);
  let showProcessPanel = $state(true);
  let showConfig = $state(true);
  let currentSafetyBanner = $state<{
    category: string;
    resources: string;
    prefix?: string;
    mode: 'crisis_immediate' | 'distress_acute' | 'support_general';
    showBreathing: boolean;
    showGame: boolean;
    defaultTab: 'breathing' | 'game' | 'resources';
  } | null>(null);

  // Configuration
  let config = $state<CITEConfig>({
    enableContextSynthesis: true,
    maxContextTokens: 4000,
    synthesisInterval: 10,
    enableRouting: true,
    enableDelegation: true,
    enableThinking: true,
    thinkingStyle: 'detailed',
    enableSafetyMessaging: true,
    enableUpskilling: true
  });

  let selectedProfile = $state<ProfileKey | 'auto'>('auto');
  let rateLimitError = $state<{ show: boolean; message: string; retryAfter?: number }>({
    show: false,
    message: '',
    retryAfter: undefined
  });

  async function sendMessage() {
    if (!currentInput.trim() || isStreaming) return;

    const userMessage: Message = {
      role: 'user',
      content: currentInput.trim(),
      id: crypto.randomUUID(),
      timestamp: Date.now()
    };

    messages.push(userMessage);
    currentInput = '';
    isStreaming = true;
    streamingContent = '';
    streamingThinking = '';  // Clear previous thinking when starting new message
    processEvents = [];
    currentSafetyBanner = null;  // Clear previous safety banner

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages,
          config,
          profile: selectedProfile
        })
      });

      // Handle rate limiting
      if (response.status === 429) {
        const errorData = await response.json();
        rateLimitError = {
          show: true,
          message: errorData.message || 'Too many requests. Please try again in a moment.',
          retryAfter: errorData.retryAfter
        };
        messages.pop(); // Remove the user message we just added
        return;
      }

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            try {
              const chunk = JSON.parse(data) as StreamChunk;

              if (chunk.type === 'content' && chunk.content) {
                streamingContent += chunk.content;
              } else if (chunk.type === 'thinking' && chunk.thinking) {
                // Accumulate thinking for display (single state, not separate events)
                streamingThinking += (streamingThinking ? '\n\n' : '') + chunk.thinking;
              } else if (chunk.type === 'safety_banner' && chunk.safetyBanner) {
                // Capture safety banner for display
                currentSafetyBanner = chunk.safetyBanner;
              } else if (chunk.type === 'metadata' && chunk.metadata) {
                // Handle both real-time single events and batch events
                if (chunk.metadata.processEvent) {
                  // Single event (real-time)
                  processEvents = [...processEvents, chunk.metadata.processEvent];
                } else if (chunk.metadata.processEvents) {
                  // Batch events (end of stream, for backward compatibility)
                  // DON'T replace - we may have added thinking events on frontend
                  // processEvents = chunk.metadata.processEvents;
                }
              } else if (chunk.type === 'error') {
                console.error('Stream error:', chunk.error);
                streamingContent += `\n\n[Error: ${chunk.error}]`;
              }
            } catch (e) {
              console.error('Failed to parse chunk:', e);
            }
          }
        }
      }

      // Add assistant message
      if (streamingContent) {
        messages.push({
          role: 'assistant',
          content: streamingContent,
          id: crypto.randomUUID(),
          timestamp: Date.now(),
          safetyBanner: currentSafetyBanner || undefined
        });
      }
    } catch (error) {
      console.error('Error:', error);
      streamingContent += `\n\n[Error: ${error}]`;
    } finally {
      isStreaming = false;
      streamingContent = '';
      // Keep streamingThinking visible after completion
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function loadTemplate(template: string) {
    currentInput = template;
  }

  function clearChat() {
    messages = [];
    processEvents = [];
  }
</script>

<div class="h-screen bg-gray-50 flex">
  <!-- Config Sidebar -->
  {#if showConfig}
    <div class="w-72 bg-white border-r border-gray-200 overflow-y-auto">
      <ConfigPanel bind:config bind:selectedProfile {loadTemplate} />
    </div>
  {/if}

  <!-- Main Chat Area -->
  <div class="flex-1 flex flex-col" role="main">
    <!-- Header -->
    <header class="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div>
        <h1 class="text-xl font-bold text-gray-900">CITE Demo</h1>
        <p class="text-xs text-gray-600">Context • Interception • Thinking • Escalation</p>
      </div>
      <div class="flex gap-1">
        <button
          type="button"
          onclick={() => showConfig = !showConfig}
          class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          aria-label={showConfig ? 'Hide configuration panel' : 'Show configuration panel'}
        >
          {showConfig ? 'Hide' : 'Show'} Config
        </button>
        <button
          type="button"
          onclick={() => showProcessPanel = !showProcessPanel}
          class="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded"
          aria-label={showProcessPanel ? 'Hide process log panel' : 'Show process log panel'}
        >
          {showProcessPanel ? 'Hide' : 'Show'} Log
        </button>
        <button
          type="button"
          onclick={clearChat}
          class="px-3 py-1 text-xs bg-red-100 hover:bg-red-200 text-red-700 rounded"
          aria-label="Clear chat history"
        >
          Clear
        </button>
      </div>
    </header>

    <!-- Messages -->
    <div class="flex-1 overflow-y-auto px-4 py-3 space-y-3" role="log" aria-live="polite" aria-label="Chat conversation">
      {#if messages.length === 0}
        <div class="text-center text-gray-500 mt-12">
          <p class="text-base mb-1">Welcome to the CITE Demo</p>
          <p class="text-xs">Start a conversation or try a template</p>
        </div>
      {/if}

      {#each messages as message (message.id)}
        <ChatMessage {message} safetyBanner={message.safetyBanner} />
      {/each}

      {#if isStreaming}
        {#if streamingContent}
          <ChatMessage
            message={{
              role: 'assistant',
              content: streamingContent
            }}
            thinking={streamingThinking}
            safetyBanner={currentSafetyBanner}
            isStreaming={true}
          />
        {:else}
          <TypingIndicator text="Processing your request" />
        {/if}
      {/if}
    </div>

    <!-- Input -->
    <div class="border-t border-gray-200 bg-white px-4 py-2">
      <div class="flex gap-2">
        <label for="message-input" class="sr-only">Message input</label>
        <textarea
          id="message-input"
          bind:value={currentInput}
          onkeydown={handleKeyDown}
          placeholder="Type your message..."
          class="flex-1 px-3 py-2 border border-gray-300 rounded text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="2"
          disabled={isStreaming}
          aria-label="Type your message here. Press Enter to send, Shift+Enter for new line."
        ></textarea>
        <button
          type="submit"
          onclick={sendMessage}
          disabled={!currentInput.trim() || isStreaming}
          class="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
          aria-label={isStreaming ? 'Sending message...' : 'Send message'}
        >
          {isStreaming ? '...' : 'Send'}
        </button>
      </div>
    </div>
  </div>

  <!-- Process Panel Sidebar -->
  {#if showProcessPanel}
    <div class="w-[450px] h-full border-l border-gray-200">
      <ProcessPanel {processEvents} {isStreaming} thinking={streamingThinking} />
    </div>
  {/if}
</div>

<!-- Rate Limit Error Dialog -->
{#if rateLimitError.show}
  <div
    class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
    role="dialog"
    aria-modal="true"
    aria-labelledby="rate-limit-title"
  >
    <div class="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
      <div class="flex items-start gap-3 mb-4">
        <div class="flex-shrink-0 w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
          <svg class="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div class="flex-1">
          <h3 id="rate-limit-title" class="text-lg font-semibold text-gray-900 mb-1">
            Slow Down
          </h3>
          <p class="text-sm text-gray-600">
            {rateLimitError.message}
          </p>
          {#if rateLimitError.retryAfter}
            <p class="text-xs text-gray-500 mt-2">
              You can try again in {Math.ceil(rateLimitError.retryAfter / 60)} minute{Math.ceil(rateLimitError.retryAfter / 60) > 1 ? 's' : ''}.
            </p>
          {/if}
        </div>
      </div>
      <div class="flex justify-end">
        <button
          onclick={() => rateLimitError.show = false}
          class="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  </div>
{/if}
