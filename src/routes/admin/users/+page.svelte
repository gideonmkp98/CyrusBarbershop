<script lang="ts">
  // @ts-nocheck - lucide-svelte has type definition issues in this build
  import { UserX, UserCog, Trash2 } from 'lucide-svelte';
  let { data } = $props();

  // Tooltip state
  let tooltipText = $state('');
  let tooltipX = $state(0);
  let tooltipY = $state(0);
  let showTooltip = $state(false);

  function showTip(e: MouseEvent, text: string) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    tooltipX = rect.left + rect.width / 2;
    tooltipY = rect.top - 8;
    tooltipText = text;
    showTooltip = true;
  }

  function hideTip() {
    showTooltip = false;
  }

  // Define user type
  type User = { id: number; email: string; displayName: string; role: 'owner' | 'manager' | 'staff'; isActive: boolean };

  // Create a reactive local copy of users
  let users = $state<User[]>([]);
  $effect(() => {
    if (data.users) {
      users = [...data.users];
    }
  });

  let newEmail = $state('');
  let newPassword = $state('');
  let newName = $state('');
  let error = $state('');
  let success = $state('');

  // Delete confirmation modal state
  let showDeleteModal = $state(false);
  let userToDelete = $state<{ id: number; displayName: string } | null>(null);

  // Role change modal state
  let showRoleModal = $state(false);
  let userToChangeRole = $state<{ id: number; displayName: string; role: string } | null>(null);
  let selectedRole = $state<'owner' | 'manager' | 'staff'>('staff');

  async function toggleActive(id: number, isActive: boolean) {
    const res = await fetch('/admin/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive })
    });

    if (res.ok) {
      // Update the user in the list without refresh
      const user = users.find(u => u.id === id);
      if (user) {
        user.isActive = !isActive;
      }
    }
  }

  function openDeleteModal(id: number, displayName: string) {
    userToDelete = { id, displayName };
    showDeleteModal = true;
  }

  function closeDeleteModal() {
    showDeleteModal = false;
    userToDelete = null;
  }

  async function confirmDelete() {
    if (!userToDelete) return;

    const res = await fetch('/admin/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userToDelete.id })
    });

    if (res.ok) {
      // Remove user from the list without refresh
      const index = users.findIndex(u => u.id === userToDelete!.id);
      if (index !== -1) {
        users.splice(index, 1);
      }
      closeDeleteModal();
    } else {
      const result = await res.json();
      alert(result.error || 'Verwijderen mislukt.');
    }
  }

  function openRoleModal(id: number, displayName: string, role: 'owner' | 'manager' | 'staff') {
    userToChangeRole = { id, displayName, role };
    selectedRole = role;
    showRoleModal = true;
  }

  function closeRoleModal() {
    showRoleModal = false;
    userToChangeRole = null;
    selectedRole = 'staff';
  }

  async function confirmRoleChange() {
    if (!userToChangeRole) return;

    const res = await fetch('/admin/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: userToChangeRole.id, role: selectedRole })
    });

    if (res.ok) {
      // Update the user role in the list without refresh
      const user = users.find(u => u.id === userToChangeRole!.id);
      if (user) {
        user.role = selectedRole;
      }
      closeRoleModal();
    } else {
      const result = await res.json();
      alert(result.error || 'Rol wijzigen mislukt.');
    }
  }

  async function createUser(e: Event) {
    e.preventDefault();
    error = '';
    success = '';

    try {
      const res = await fetch('/admin/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, displayName: newName })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        success = 'Gebruiker succesvol aangemaakt.';

        // Add new user to the list without refresh
        users.push({
          id: result.id,
          email: newEmail,
          displayName: newName,
          role: 'staff',
          isActive: true
        });

        newEmail = '';
        newPassword = '';
        newName = '';

        // Clear success message after 3 seconds
        setTimeout(() => success = '', 3000);
      } else {
        error = result.error || 'Gebruiker aanmaken mislukt.';
      }
    } catch (e: any) {
      console.error('Create user error:', e);
      error = 'Er ging iets mis bij het aanmaken. Probeer het opnieuw.';
    }
  }
</script>

<svelte:head>
  <title>Gebruikers — Cyrus Beheer</title>
</svelte:head>

{#if data.canManageUsers}
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
        <input type="text" id="newName" bind:value={newName} placeholder=" " required />
        <label for="newName">Weergavenaam</label>
      </div>
      <div class="field-group">
        <input type="email" id="newEmail" bind:value={newEmail} placeholder=" " required />
        <label for="newEmail">E-mail</label>
      </div>
      <div class="field-group">
        <input type="password" id="newPassword" bind:value={newPassword} placeholder=" " required />
        <label for="newPassword">Wachtwoord</label>
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
        {#each users as user}
          <tr class="border-b border-white/5 last:border-0">
            <td class="p-4 font-body text-bone">{user.displayName}</td>
            <td class="p-4 font-body text-bone">{user.email}</td>
            <td class="p-4">
              <span class="font-body text-label {user.role === 'owner' ? 'text-gold-500 font-semibold' : user.role === 'manager' ? 'text-gold-400' : 'text-bone-muted'}">
                {#if user.role === 'staff'}Medewerker{:else}{user.role}{/if}
              </span>
            </td>
            <td class="p-4">
              <span class="font-body text-label {user.isActive ? 'text-green-500' : 'text-red-400'}">{user.isActive ? 'Actief' : 'Inactief'}</span>
            </td>
            <td class="p-4">
              {#if user.role !== 'owner'}
                <div class="flex gap-3">
                  <button
                    onclick={() => toggleActive(user.id, user.isActive)}
                    onmouseenter={(e) => showTip(e, user.isActive ? 'Deactiveren' : 'Reactiveren')}
                    onmouseleave={hideTip}
                    class="p-1.5 rounded hover:bg-white/5 transition-colors {user.isActive ? 'text-red-400 hover:text-red-300' : 'text-green-500 hover:text-green-400'}"
                  >
                    <UserX size={18} />
                  </button>
                  <button
                    onclick={() => openRoleModal(user.id, user.displayName, user.role)}
                    onmouseenter={(e) => showTip(e, 'Rol wijzigen')}
                    onmouseleave={hideTip}
                    class="p-1.5 rounded hover:bg-white/5 transition-colors text-gold-500 hover:text-gold-400"
                  >
                    <UserCog size={18} />
                  </button>
                  <button
                    onclick={() => openDeleteModal(user.id, user.displayName)}
                    onmouseenter={(e) => showTip(e, 'Verwijderen')}
                    onmouseleave={hideTip}
                    class="p-1.5 rounded hover:bg-white/5 transition-colors text-red-400 hover:text-red-300"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              {:else}
                <span class="text-xs text-bone-muted">—</span>
              {/if}
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>

  <!-- Role Change Modal -->
  {#if showRoleModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 w-full" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeRoleModal} onkeydown={(e) => e.key === 'Enter' && closeRoleModal()}>
      <div class="bg-surface-base p-8 rounded-lg border border-white/10 max-w-md w-full mx-6 shadow-2xl" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeRoleModal()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
            <span class="text-gold-500 text-2xl">&#9733;</span>
          </div>
          <h3 class="font-display text-subheading text-bone mb-2">Rol Wijzigen</h3>
          <p class="font-body text-body text-bone-muted mb-4">
            Kies een nieuwe rol voor <span class="text-bone font-semibold">{userToChangeRole?.displayName}</span>
          </p>
          <div class="space-y-3">
            <label class="flex items-center gap-3 p-4 border border-white/10 rounded-lg cursor-pointer hover:border-gold-500/50 transition-colors">
              <input type="radio" name="role" value="staff" bind:group={selectedRole} class="text-gold-500" />
              <div>
                <span class="block font-body text-body text-bone">Medewerker</span>
                <span class="block font-body text-xs text-bone-muted">Standaard rol voor personeelsleden</span>
              </div>
            </label>
            <label class="flex items-center gap-3 p-4 border border-white/10 rounded-lg cursor-pointer hover:border-gold-500/50 transition-colors">
              <input type="radio" name="role" value="manager" bind:group={selectedRole} class="text-gold-500" />
              <div>
                <span class="block font-body text-body text-gold-400">Manager</span>
                <span class="block font-body text-xs text-bone-muted">Kan gebruikers beheren, maar geen owners wijzigen</span>
              </div>
            </label>
          </div>
        </div>
        <div class="flex gap-4">
          <button
            onclick={closeRoleModal}
            class="flex-1 btn-outline py-3 border-bone-muted/30 text-bone-muted hover:border-bone-muted/50"
          >
            Annuleren
          </button>
          <button
            onclick={confirmRoleChange}
            class="flex-1 btn-primary py-3"
          >
            Opslaan
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Delete Confirmation Modal -->
  {#if showDeleteModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 w-full" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeDeleteModal} onkeydown={(e) => e.key === 'Enter' && closeDeleteModal()}>
      <div class="bg-surface-base p-8 rounded-lg border border-white/10 max-w-md w-full mx-6 shadow-2xl" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeDeleteModal()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span class="text-red-400 text-3xl">!</span>
          </div>
          <h3 class="font-display text-subheading text-bone mb-2">Gebruiker Verwijderen</h3>
          <p class="font-body text-body text-bone-muted">
            Weet je zeker dat je <span class="text-bone font-semibold">{userToDelete?.displayName}</span> wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
          </p>
        </div>
        <div class="flex gap-4">
          <button
            onclick={closeDeleteModal}
            class="flex-1 btn-outline py-3 border-bone-muted/30 text-bone-muted hover:border-bone-muted/50"
          >
            Annuleren
          </button>
          <button
            onclick={confirmDelete}
            class="flex-1 btn-primary py-3 bg-red-500 hover:bg-red-600 text-white"
          >
            Verwijderen
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Tooltip -->
  {#if showTooltip}
    <div
      class="fixed px-2 py-1 bg-surface-base text-bone text-xs rounded whitespace-nowrap z-50 pointer-events-none border border-white/10 shadow-lg"
      style="left: {tooltipX}px; top: {tooltipY}px; transform: translateX(-50%) translateY(-100%);"
    >
      {tooltipText}
    </div>
  {/if}
{:else}
  <div class="text-center py-20">
    <h1 class="font-display text-subheading text-bone-muted mb-4">Toegang Geweigerd</h1>
    <p class="font-body text-body text-bone-muted">Alleen hoofdaccounts kunnen gebruikers beheren.</p>
  </div>
{/if}