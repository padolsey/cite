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
  let currentSafetyBanner = $state<{ category: string; resources: string; prefix?: string } | null>(null);

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
              } else if (chunk.type === 'done') {
                // Done streaming
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
