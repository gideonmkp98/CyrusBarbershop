<script lang="ts">
  import { enhance } from '$app/forms';
  import { goto } from '$app/navigation';

  let email = $state('');
  let password = $state('');
  let error = $state<string | null>(null);
  let loading = $state(false);

  function handleFormSubmit({ update }: { update: () => void }) {
    return async (result: { result?: { type: string; location?: string; status?: number }; data?: { error?: string } }) => {
      loading = false;

      // SvelteKit enhance passes redirect info in result.result
      if (result.result?.type === 'redirect' && result.result.location) {
        await goto(result.result.location);
        return;
      }

      error = result.data?.error ?? 'Ongeldig e-mailadres of wachtwoord';
    };
  }

  function onSubmit() {
    loading = true;
    error = null;
  }
</script>

<svelte:head>
  <title>Aanmelden — Cyrus Beheer</title>
</svelte:head>

<div class="min-h-screen bg-surface flex items-center justify-center px-6">
  <div class="w-full max-w-sm">
    <div class="text-center mb-12">
      <img src="/images/logo.jpeg" alt="Cyrus" class="w-16 h-16 object-contain rounded-full mx-auto mb-4 border border-gold-500/20 p-1"/>
      <h1 class="font-display text-subheading text-gold-500">CYRUS BEHEER</h1>
    </div>

    <form method="POST" use:enhance={handleFormSubmit} onsubmit={onSubmit} class="space-y-6">
      {#if error}
        <div class="bg-red-900/20 border border-red-500/30 p-4 rounded-sm text-sm text-red-400 text-center">{error}</div>
      {/if}

      <div class="field-group">
        <input type="email" name="email" bind:value={email} placeholder=" " required />
        <label>E-mail</label>
      </div>
      <div class="field-group">
        <input type="password" name="password" bind:value={password} placeholder=" " required />
        <label>Wachtwoord</label>
      </div>

      <button type="submit" class="btn-primary w-full py-4" disabled={loading}>
        {loading ? 'Bezig met aanmelden...' : 'Aanmelden'}
      </button>
    </form>
  </div>
</div>