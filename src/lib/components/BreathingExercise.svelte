<script lang="ts">
  import { onDestroy } from 'svelte';

  let phase = $state<'inhale' | 'hold1' | 'exhale' | 'hold2'>('inhale');
  let progress = $state(0);
  let isActive = $state(false);
  let cycleCount = $state(0);
  let intervalId: number | null = null;

  const phaseDuration = 4000; // 4 seconds per phase
  const tickInterval = 50; // Update every 50ms for smooth animation

  const phaseText = {
    inhale: 'Breathe in',
    hold1: 'Hold',
    exhale: 'Breathe out',
    hold2: 'Hold'
  };

  const phaseOrder: Array<'inhale' | 'hold1' | 'exhale' | 'hold2'> = ['inhale', 'hold1', 'exhale', 'hold2'];

  function startExercise() {
    isActive = true;
    progress = 0;
    phase = 'inhale';
    cycleCount = 0;
    tick();
  }

  function stopExercise() {
    isActive = false;
    if (intervalId !== null) {
      clearInterval(intervalId);
      intervalId = null;
    }
  }

  function tick() {
    if (intervalId !== null) {
      clearInterval(intervalId);
    }

    intervalId = setInterval(() => {
      progress += (tickInterval / phaseDuration) * 100;

      if (progress >= 100) {
        progress = 0;
        const currentIndex = phaseOrder.indexOf(phase);
        const nextIndex = (currentIndex + 1) % phaseOrder.length;
        phase = phaseOrder[nextIndex];

        if (phase === 'inhale') {
          cycleCount++;
        }
      }
    }, tickInterval) as unknown as number;
  }

  onDestroy(() => {
    stopExercise();
  });

  // Calculate circle size based on phase
  const circleScale = $derived.by(() => {
    if (!isActive) return 0.6;

    if (phase === 'inhale') {
      return 0.6 + (progress / 100) * 0.4; // 0.6 to 1.0
    } else if (phase === 'exhale') {
      return 1.0 - (progress / 100) * 0.4; // 1.0 to 0.6
    } else {
      return phase === 'hold1' ? 1.0 : 0.6;
    }
  });

  const circleColor = $derived.by(() => {
    if (!isActive) return { bg: 'rgba(59, 130, 246, 0.15)', border: 'rgb(59, 130, 246)' };

    if (phase === 'inhale') {
      return { bg: 'rgba(59, 130, 246, 0.2)', border: 'rgb(59, 130, 246)' };
    } else if (phase === 'exhale') {
      return { bg: 'rgba(139, 92, 246, 0.2)', border: 'rgb(139, 92, 246)' };
    } else {
      return { bg: 'rgba(16, 185, 129, 0.2)', border: 'rgb(16, 185, 129)' };
    }
  });
</script>

<div class="flex flex-col items-center justify-center h-full gap-4 py-4">
  <!-- Breathing Circle -->
  <div class="relative flex items-center justify-center" style="width: 240px; height: 240px;">
    <!-- Outer glow ring -->
    <div
      class="absolute rounded-full transition-all duration-100 ease-linear"
      style="
        width: {circleScale * 180 + 20}px;
        height: {circleScale * 180 + 20}px;
        background: radial-gradient(circle, {circleColor.bg} 0%, transparent 70%);
        filter: blur(10px);
      "
    ></div>

    <!-- Main circle -->
    <div
      class="absolute rounded-full transition-all duration-100 ease-linear shadow-lg"
      style="
        width: {circleScale * 180}px;
        height: {circleScale * 180}px;
        background: radial-gradient(circle, {circleColor.bg} 0%, {circleColor.bg} 100%);
        border: 4px solid {circleColor.border};
      "
    ></div>

    <!-- Center text -->
    <div class="relative z-10 text-center">
      <div class="text-2xl font-semibold text-gray-900 mb-1">
        {isActive ? phaseText[phase] : 'Ready'}
      </div>
      {#if isActive}
        <div class="text-lg text-gray-600 font-medium tabular-nums">
          {Math.ceil((phaseDuration - (progress / 100 * phaseDuration)) / 1000)}
        </div>
        <div class="text-xs text-gray-500 mt-2">
          Cycle {cycleCount + 1}
        </div>
      {:else}
        <div class="text-sm text-gray-500 mt-1">
          4 seconds each phase
        </div>
      {/if}
    </div>
  </div>

  <!-- Controls -->
  <div class="flex gap-3 mt-2">
    {#if !isActive}
      <button
        onclick={startExercise}
        class="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-base font-medium rounded-lg shadow-sm transition-colors"
      >
        Start
      </button>
    {:else}
      <button
        onclick={stopExercise}
        class="px-8 py-2.5 bg-gray-600 hover:bg-gray-700 text-white text-base font-medium rounded-lg shadow-sm transition-colors"
      >
        Stop
      </button>
    {/if}
  </div>
</div>
