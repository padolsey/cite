<script lang="ts">
  interface Ripple {
    id: string;
    x: number;
    y: number;
    startTime: number;
  }

  let ripples = $state<Ripple[]>([]);
  let containerRef: HTMLDivElement;
  let currentTime = $state(Date.now());
  let animationFrameId: number;

  const rippleDuration = 2500; // 2.5 seconds
  const colors = ['#3b82f6', '#8b5cf6', '#06b6d4', '#10b981', '#f59e0b'];

  function animate() {
    currentTime = Date.now();
    animationFrameId = requestAnimationFrame(animate);
  }

  $effect(() => {
    animate();
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  });

  function handleClick(e: MouseEvent) {
    if (!containerRef) return;

    const rect = containerRef.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newRipple: Ripple = {
      id: crypto.randomUUID(),
      x,
      y,
      startTime: Date.now()
    };

    ripples = [...ripples, newRipple];

    // Clean up old ripples
    setTimeout(() => {
      ripples = ripples.filter(r => r.id !== newRipple.id);
    }, rippleDuration);
  }

  function getRippleProgress(ripple: Ripple): number {
    const elapsed = currentTime - ripple.startTime;
    return Math.min(elapsed / rippleDuration, 1);
  }

  function getRippleColor(index: number): string {
    return colors[index % colors.length];
  }
</script>

<div
  bind:this={containerRef}
  onclick={handleClick}
  class="relative w-full h-full bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-lg overflow-hidden cursor-pointer select-none"
  style="min-height: 300px;"
>
  {#each ripples as ripple, i (ripple.id)}
    {@const progress = getRippleProgress(ripple)}
    {@const scale = 1 + progress * 4}
    {@const opacity = (1 - progress) * 0.6}
    <div
      class="absolute rounded-full pointer-events-none"
      style="
        left: {ripple.x}px;
        top: {ripple.y}px;
        width: 60px;
        height: 60px;
        transform: translate(-50%, -50%) scale({scale});
        opacity: {opacity};
        border: 3px solid {getRippleColor(i)};
        transition: none;
      "
    ></div>
  {/each}

  {#if ripples.length === 0}
    <div class="absolute inset-0 flex items-center justify-center text-gray-500 text-base pointer-events-none">
      Tap anywhere to create ripples
    </div>
  {/if}
</div>
