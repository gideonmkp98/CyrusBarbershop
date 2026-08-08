<script lang="ts">
  import { reveal, type RevealOptions } from '$lib/actions/reveal';

  interface Props {
    id: number;
    name: string;
    price: number;
    duration: number;
    description?: string;
    checked: boolean;
    revealOpts?: RevealOptions;
    onToggle: (id: number) => void;
  }

  let { id, name, price, duration, description = undefined, checked, revealOpts = undefined, onToggle }: Props = $props();
</script>

<label
  use:reveal={revealOpts || {}}
  class="add-on-item flex items-center gap-4 p-4 md:p-5 border cursor-pointer transition-all w-full text-left bg-transparent"
  class:checked
>
  <input
    type="checkbox"
    {checked}
    onchange={() => onToggle(id)}
    class="w-5 h-5 accent-gold-500 shrink-0"
  />
  <div class="flex-1 min-w-0">
    <div class="flex items-center gap-3">
      <span class="font-display text-body font-medium text-bone">{name}</span>
      <span class="leader"></span>
      <span class="font-display text-body text-gold-500">+€{price}</span>
    </div>
    {#if description}
      <p class="text-bone-muted text-xs mt-1 line-clamp-1">{description}</p>
    {/if}
  </div>
  <span class="font-body text-xs text-bone-muted shrink-0">+{duration} min</span>
</label>

<style>
  .add-on-item {
    border-color: rgba(255, 255, 255, 0.05);
    background: rgba(255, 255, 255, 0.01);
  }
  .add-on-item:hover {
    border-color: rgba(212, 175, 55, 0.3);
  }
  .add-on-item.checked {
    border-color: rgba(212, 175, 55, 0.6);
    background: rgba(212, 175, 55, 0.05);
  }
  .leader {
    flex: 1;
    height: 1px;
    background: linear-gradient(to right, rgba(255, 255, 255, 0.1), rgba(255, 255, 255, 0.05));
    min-width: 16px;
  }
</style>