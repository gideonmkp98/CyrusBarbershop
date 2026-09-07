<script lang="ts">
  import { page } from '$app/stores';

  let { data } = $props();

  // Email form state
  let email = $state('');
  let emailError = $state('');
  let emailSuccess = $state('');
  let emailLoading = $state(false);
  let emailInitialized = $state(false);

  // Password form state
  let currentPassword = $state('');
  let newPassword = $state('');
  let confirmPassword = $state('');
  let passwordError = $state('');
  let passwordSuccess = $state('');
  let passwordLoading = $state(false);

  $effect(() => {
    if (!emailInitialized) {
      email = data.user.email;
      emailInitialized = true;
    }
  });

  async function updateEmail(e: Event) {
    e.preventDefault();
    emailError = '';
    emailSuccess = '';
    emailLoading = true;

    try {
      const res = await fetch('/admin/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      const result = await res.json();

      if (res.ok) {
        emailSuccess = result.message || 'E-mailadres bijgewerkt';
        setTimeout(() => emailSuccess = '', 3000);
      } else {
        emailError = result.error || 'E-mailadres bijwerken mislukt';
      }
    } catch {
      emailError = 'Netwerkfout. Probeer het opnieuw.';
    }
    emailLoading = false;
  }

  async function updatePassword(e: Event) {
    e.preventDefault();
    passwordError = '';
    passwordSuccess = '';

    if (newPassword !== confirmPassword) {
      passwordError = 'Wachtwoorden komen niet overeen';
      return;
    }

    if (newPassword.length < 8) {
      passwordError = 'Wachtwoord moet minimaal 8 tekens zijn';
      return;
    }

    passwordLoading = true;

    try {
      const res = await fetch('/admin/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });

      const result = await res.json();

      if (res.ok) {
        passwordSuccess = result.message || 'Wachtwoord bijgewerkt';
        currentPassword = '';
        newPassword = '';
        confirmPassword = '';
        setTimeout(() => passwordSuccess = '', 3000);
      } else {
        passwordError = result.error || 'Wachtwoord bijwerken mislukt';
      }
    } catch {
      passwordError = 'Netwerkfout. Probeer het opnieuw.';
    }
    passwordLoading = false;
  }
</script>

<svelte:head>
  <title>Mijn Profiel — Cyrus Beheer</title>
</svelte:head>

<h1 class="font-display text-heading text-bone mb-8">Mijn Profiel</h1>

<div class="grid md:grid-cols-2 gap-8">
  <!-- Email Section -->
  <div class="bg-surface-base p-6 border border-white/5">
    <h2 class="font-display text-subheading text-bone mb-6">E-mailadres Wijzigen</h2>

    {#if emailError}
      <div class="bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-400 mb-4">{emailError}</div>
    {/if}
    {#if emailSuccess}
      <div class="bg-green-900/20 border border-green-500/30 p-3 text-sm text-green-400 mb-4">{emailSuccess}</div>
    {/if}

    <form onsubmit={updateEmail}>
      <div class="field-group mb-6">
        <input
          type="email"
          id="email"
          bind:value={email}
          placeholder=" "
          required
        />
        <label for="email">E-mailadres</label>
      </div>
      <button
        type="submit"
        class="btn-primary"
        disabled={emailLoading}
      >
        {#if emailLoading}Opslaan...{:else}Opslaan{/if}
      </button>
    </form>
  </div>

  <!-- Password Section -->
  <div class="bg-surface-base p-6 border border-white/5">
    <h2 class="font-display text-subheading text-bone mb-6">Wachtwoord Wijzigen</h2>

    {#if passwordError}
      <div class="bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-400 mb-4">{passwordError}</div>
    {/if}
    {#if passwordSuccess}
      <div class="bg-green-900/20 border border-green-500/30 p-3 text-sm text-green-400 mb-4">{passwordSuccess}</div>
    {/if}

    <form onsubmit={updatePassword}>
      <div class="space-y-4">
        <div class="field-group">
          <input
            type="password"
            id="currentPassword"
            bind:value={currentPassword}
            placeholder=" "
            required
          />
          <label for="currentPassword">Huidig Wachtwoord</label>
        </div>
        <div class="field-group">
          <input
            type="password"
            id="newPassword"
            bind:value={newPassword}
            placeholder=" "
            required
          />
          <label for="newPassword">Nieuw Wachtwoord</label>
        </div>
        <div class="field-group">
          <input
            type="password"
            id="confirmPassword"
            bind:value={confirmPassword}
            placeholder=" "
            required
          />
          <label for="confirmPassword">Bevestig Wachtwoord</label>
        </div>
      </div>
      <button
        type="submit"
        class="btn-primary mt-6"
        disabled={passwordLoading}
      >
        {#if passwordLoading}Opslaan...{:else}Wachtwoord Wijzigen{/if}
      </button>
    </form>
  </div>
</div>

<!-- Account Info -->
<div class="bg-surface-base p-6 border border-white/5 mt-8">
  <h2 class="font-display text-subheading text-bone mb-6">Account Informatie</h2>
  <div class="grid md:grid-cols-3 gap-6">
    <div>
      <span class="block font-body text-label text-bone-muted mb-1">Naam</span>
      <span class="font-body text-body text-bone">{data.user.displayName}</span>
    </div>
    <div>
      <span class="block font-body text-label text-bone-muted mb-1">Rol</span>
      <span class="font-body text-body text-gold-500 capitalize">{data.user.role}</span>
    </div>
    <div>
      <span class="block font-body text-label text-bone-muted mb-1">Account Status</span>
      <span class="font-body text-body {data.user.isActive ? 'text-green-500' : 'text-red-400'}">
        {data.user.isActive ? 'Actief' : 'Inactief'}
      </span>
    </div>
  </div>
</div>
