<script lang="ts">
  let { data } = $props();

  let newEmail = $state('');
  let newPassword = $state('');
  let newName = $state('');
  let error = $state('');
  let success = $state('');

  async function createUser(e: Event) {
    e.preventDefault();
    error = '';
    success = '';

    const res = await fetch('/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: newEmail, password: newPassword, displayName: newName })
    });

    const result = await res.json();
    if (res.ok) {
      success = 'Gebruiker succesvol aangemaakt.';
      newEmail = '';
      newPassword = '';
      newName = '';
      window.location.reload();
    } else {
      error = result.error || 'Gebruiker aanmaken mislukt.';
    }
  }

  async function toggleActive(id: number, isActive: boolean) {
    await fetch('/admin/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive })
    });
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Gebruikers — Cyrus Beheer</title>
</svelte:head>

{#if data.isMaster}
  <h1 class="font-display text-heading text-bone mb-8">Gebruikersbeheer</h1>

  <!-- Create user form -->
  <div class="bg-surface-base p-6 border border-white/5 mb-8">
    <h2 class="font-display text-subheading text-bone mb-6">Maak Personeelsgebruiker</h2>

    {#if error}
      <div class="bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-400 mb-4">{error}</div>
    {/if}
    {#if success}
      <div class="bg-green-900/20 border border-green-500/30 p-3 text-sm text-green-400 mb-4">{success}</div>
    {/if}

    <form onsubmit={createUser} class="grid md:grid-cols-3 gap-4">
      <div class="field-group">
        <input type="text" bind:value={newName} placeholder=" " required />
        <label>Weergavenaam</label>
      </div>
      <div class="field-group">
        <input type="email" bind:value={newEmail} placeholder=" " required />
        <label>E-mail</label>
      </div>
      <div class="field-group">
        <input type="password" bind:value={newPassword} placeholder=" " required />
        <label>Wachtwoord</label>
      </div>
      <div class="md:col-span-3">
        <button type="submit" class="btn-primary">Gebruiker Aanmaken</button>
      </div>
    </form>
  </div>

  <!-- User list -->
  <div class="bg-surface-base border border-white/5 overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-white/5">
          <th class="text-left p-4 font-body text-label text-bone-muted">Naam</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">E-mail</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Rol</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Status</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Acties</th>
        </tr>
      </thead>
      <tbody>
        {#each data.users as user}
          <tr class="border-b border-white/5 last:border-0">
            <td class="p-4 font-body text-bone">{user.displayName}</td>
            <td class="p-4 font-body text-bone">{user.email}</td>
            <td class="p-4">
              <span class="font-body text-label {user.role === 'master' ? 'text-gold-500' : 'text-bone-muted'}">{user.role}</span>
            </td>
            <td class="p-4">
              <span class="font-body text-label {user.isActive ? 'text-green-500' : 'text-red-400'}">{user.isActive ? 'Actief' : 'Inactief'}</span>
            </td>
            <td class="p-4">
              {#if user.role !== 'master'}
                <button
                  onclick={() => toggleActive(user.id, user.isActive)}
                  class="text-xs {user.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-500 hover:text-green-400'}"
                >{user.isActive ? 'Deactiveren' : 'Reactiveren'}</button>
              {:else}
                <span class="text-xs text-bone-muted">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <div class="text-center py-20">
    <h1 class="font-display text-subheading text-bone-muted mb-4">Toegang Geweigerd</h1>
    <p class="font-body text-body text-bone-muted">Alleen hoofdaccounts kunnen gebruikers beheren.</p>
  </div>
{/if}