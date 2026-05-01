<script lang="ts">
  import { reveal, type RevealOptions } from '$lib/actions/reveal';
  export let name: string;
  export let price: number;
  export let description: string | undefined = undefined;
  export let selected: boolean = false;
  export let revealOpts: RevealOptions | undefined = undefined;
  export let signature: boolean = false;
  export let onclick: (() => void) | undefined = undefined;
</script>

<div
  use:reveal={revealOpts || {}}
  class="service-item p-6 cursor-pointer group {signature ? 'bg-gold-500/5' : ''}"
  class:selected
  role={onclick ? 'button' : undefined}
  tabindex={onclick ? -1 : undefined}
  onclick={onclick}
  onkeydown={onclick ? (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === ' ') onclick(); } : undefined}
>
  <div class="flex items-center justify-between mb-2">
    <div class="flex-1">
      <div class="flex items-end">
        <h4 class="font-display text-subheading text-bone group-hover:text-gold-400 transition-colors">{name}</h4>
        <div class="leader"></div>
        <span class="font-display text-subheading text-gold-500">${price}</span>
      </div>
      {#if description && onclick}
        <p class="text-bone-warm text-sm max-w-lg mt-1">{description}</p>
      {/if}
    </div>
    {#if onclick}
      <span class="text-bone-muted/40 text-xl ml-4">{selected ? '●' : '○'}</span>
    {/if}
  </div>
  {#if !onclick && description}
    <p class="text-bone-warm text-sm max-w-lg">{description}</p>
  {/if}
</div>