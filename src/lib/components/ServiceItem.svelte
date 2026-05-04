<script lang="ts">
  import { reveal, type RevealOptions } from '$lib/actions/reveal';

  interface Props {
    name: string;
    price: number;
    description?: string;
    selected?: boolean;
    revealOpts?: RevealOptions;
    signature?: boolean;
    onclick?: () => void;
  }

  let { name, price, description = undefined, selected = false, revealOpts = undefined, signature = false, onclick = undefined } = $props<Props>();
</script>

{#if onclick}
  <button
    use:reveal={revealOpts || {}}
    class="service-item p-6 cursor-pointer group {signature ? 'bg-gold-500/5' : ''} text-left w-full bg-transparent border-0"
    class:selected
    onclick={onclick}
  >
    <div class="flex items-center justify-between mb-2">
      <div class="flex-1">
        <div class="flex items-end">
          <h4 class="font-display text-subheading text-bone group-hover:text-gold-400 transition-colors">{name}</h4>
          <div class="leader"></div>
          <span class="font-display text-subheading text-gold-500">€{price}</span>
        </div>
        {#if description}
          <p class="text-bone-warm text-sm max-w-lg mt-1">{description}</p>
        {/if}
      </div>
      <span class="text-bone-muted/40 text-xl ml-4">{selected ? '●' : '○'}</span>
    </div>
  </button>
{:else}
  <div
    use:reveal={revealOpts || {}}
    class="service-item p-6 cursor-pointer group {signature ? 'bg-gold-500/5' : ''}"
    class:selected
  >
    <div class="flex items-center justify-between mb-2">
      <div class="flex-1">
        <div class="flex items-end">
          <h4 class="font-display text-subheading text-bone group-hover:text-gold-400 transition-colors">{name}</h4>
          <div class="leader"></div>
          <span class="font-display text-subheading text-gold-500">€{price}</span>
        </div>
      </div>
    </div>
    {#if description}
      <p class="text-bone-warm text-sm max-w-lg">{description}</p>
    {/if}
  </div>
{/if}
