<script lang="ts">
  interface Barber {
    id: number;
    displayName: string;
    email: string;
  }

  interface Props {
    barbers: Barber[];
    selectedBarberId: number | null;
    onselect: (id: number | null) => void;
  }

  let { barbers, selectedBarberId, onselect }: Props = $props();

  function selectBarber(id: number | null) {
    onselect(id);
  }
</script>

<div class="space-y-4">
  {#if barbers.length === 0}
    <p class="text-bone-muted font-body text-body">Geen barbers beschikbaar op dit moment.</p>
  {:else}
    <!-- No preference option -->
    <button
      type="button"
      class="barber-card"
      class:selected={selectedBarberId === null}
      onclick={() => selectBarber(null)}
    >
      <div class="flex items-center gap-4">
        <div class="w-12 h-12 rounded-full bg-bone-muted/20 flex items-center justify-center text-bone font-display text-xl">
          <span class="text-2xl">✦</span>
        </div>
        <div class="text-left flex-1">
          <p class="font-body text-body-lg text-bone">Geen voorkeur</p>
          <p class="font-body text-sm text-bone-muted">Elke beschikbare barber</p>
        </div>
        {#if selectedBarberId === null}
          <div class="w-6 h-6 flex items-center justify-center text-gold-500">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        {/if}
      </div>
    </button>

    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <div class="w-full border-t border-bone-muted/20"></div>
      </div>
      <div class="relative flex justify-center text-sm">
        <span class="px-4 bg-surface-low text-bone-muted">OF KIES EEN SPECIFIEKE BARBER</span>
      </div>
    </div>

    <!-- Individual barbers -->
    <div class="grid sm:grid-cols-2 gap-4">
      {#each barbers as barber}
        <button
          type="button"
          class="barber-card"
          class:selected={selectedBarberId === barber.id}
          onclick={() => selectBarber(barber.id)}
        >
          <div class="flex items-center gap-4">
            <div class="w-12 h-12 rounded-full bg-bone-muted/20 flex items-center justify-center text-bone font-display text-xl">
              {barber.displayName.charAt(0).toUpperCase()}
            </div>
            <div class="text-left flex-1">
              <p class="font-body text-body-lg text-bone">{barber.displayName}</p>
            </div>
            {#if selectedBarberId === barber.id}
              <div class="w-6 h-6 flex items-center justify-center text-gold-500">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            {/if}
          </div>
        </button>
      {/each}
    </div>
  {/if}
</div>

<style>
  .barber-card {
    width: 100%;
    padding: 1rem 1.25rem;
    background: var(--bg-surface-low);
    border: 1px solid var(--border-bone-muted-20);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
  }

  .barber-card:hover {
    background: var(--bg-surface-base);
    border-color: var(--border-bone-muted-40);
  }

  .barber-card.selected {
    background: var(--bg-surface-base);
    border-color: var(--border-bone);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  }
</style>
