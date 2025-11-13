<script lang="ts">
  // Optional prop for custom text
  let { text = 'Assistant is thinking' }: { text?: string } = $props();
</script>

<div class="flex gap-3 justify-start">
  <div class="max-w-2xl">
    <!-- Role indicator -->
    <div class="text-xs text-gray-500 mb-1">
      Assistant
    </div>

    <!-- Typing bubble -->
    <div class="px-4 py-3 rounded-lg bg-white border border-gray-200">
      <div class="flex items-center gap-2 text-gray-500">
        <div class="flex gap-1">
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 0ms"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 150ms"></div>
          <div class="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style="animation-delay: 300ms"></div>
        </div>
        <span class="text-sm">{text}...</span>
      </div>
    </div>
  </div>
</div>

<style>
  @keyframes bounce {
    0%, 80%, 100% {
      transform: translateY(0);
    }
    40% {
      transform: translateY(-8px);
    }
  }

  .animate-bounce {
    animation: bounce 1.4s infinite ease-in-out;
  }
</style>
