<script lang="ts">
  export let show: boolean;
  export let onClose: () => void;
</script>

{#if show}
  <div class="booking-success show">
    <div class="max-w-md text-center p-12 border border-gold-500/20 bg-surface-base">
      <div class="text-6xl text-gold-500 mb-6">&#10003;</div>
      <h2 class="font-display text-heading text-bone mb-4">Reservering Bevestigd</h2>
      <p class="text-bone-warm font-body mb-8">Dank je wel. We hebben de details naar je e-mail verstuurd. We kijken ernaar uit je te zien.</p>
      <button onclick={onClose} class="btn-outline border-gold-500/40 text-gold-500 hover:bg-gold-500 hover:text-surface">Terug naar Start</button>
    </div>
  </div>
{/if}