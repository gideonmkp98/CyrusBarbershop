<script lang="ts">
  import { page } from '$app/state';
</script>

<svelte:head>
  <title>{page.status} — Cyrus Kapsalon</title>
</svelte:head>

<div class="min-h-[80vh] flex items-center justify-center px-6">
  <div class="text-center">
    <span class="font-display text-display text-gold-500/20 block mb-4">{page.status}</span>
    <h1 class="font-display text-heading text-bone mb-4">
      {page.status === 404 ? 'Pagina Niet Gevonden' : 'Er is iets misgegaan'}
    </h1>
    <p class="font-body text-body-lg text-bone-warm mb-8 max-w-md mx-auto">
      {page.status === 404
        ? 'De pagina die je zoekt bestaat niet of is verplaatst.'
        : page.error?.message || 'Er is een onverwachte fout opgetreden.'}
    </p>
    <a href="/" class="btn-primary">Terug naar Start</a>
  </div>
</div>