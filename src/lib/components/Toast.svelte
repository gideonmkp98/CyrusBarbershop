<script lang="ts">
  import { toasts, removeToast } from '$lib/stores/toast';
  import { fly } from 'svelte/transition';

  const icon: Record<string, string> = {
    success: 'M5 13l4 4L19 7',
    error: 'M6 18L18 6M6 6l12 12',
    info: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z'
  };

  const accent: Record<string, string> = {
    success: 'border-l-gold-500 text-gold-500',
    error: 'border-l-red-400 text-red-400',
    info: 'border-l-bone-muted text-bone-muted'
  };
</script>

<div class="fixed top-4 right-4 z-[2000] flex flex-col gap-2 w-[min(92vw,360px)] pointer-events-none">
  {#each $toasts as t (t.id)}
    <div
      in:fly={{ x: 24, duration: 200 }}
      out:fly={{ x: 24, duration: 150 }}
      class="pointer-events-auto flex items-start gap-3 bg-surface-base border border-white/10 border-l-2 {accent[t.type] || ''} px-4 py-3 shadow-xl cursor-pointer"
      role="status"
      onclick={() => removeToast(t.id)}
      onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && removeToast(t.id)}
      tabindex="0"
    >
      <svg class="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d={icon[t.type] || icon.info} />
      </svg>
      <span class="flex-1 text-sm font-body text-bone">{t.message}</span>
      <span class="text-bone-muted/50 text-lg leading-none -mt-0.5">×</span>
    </div>
  {/each}
</div>