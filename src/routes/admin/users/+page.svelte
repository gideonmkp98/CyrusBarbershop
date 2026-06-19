<script lang="ts">
  // @ts-nocheck - lucide-svelte has type definition issues in this build
  import { UserX, UserCog, Trash2, UserPlus, Search, Filter, Users, UserCheck, Scissors, Clock, MoreVertical } from 'lucide-svelte';
  let { data } = $props();

  // Define user type
  type User = { id: number; email: string; displayName: string; role: 'owner' | 'manager' | 'staff'; isActive: boolean; isBarber: boolean };

  // Create a reactive local copy of users
  let users = $state<User[]>([]);
  $effect(() => {
    if (data.users) {
      users = [...data.users];
    }
  });

  // View state
  let searchQuery = $state('');
  let filterRole = $state('all');
  let filterStatus = $state('all');
  let filterBarber = $state('all');
  let openUserMenuId = $state<number | null>(null);

  // Filtered users
  let filteredUsers = $derived(
    users.filter(u => {
      if (filterRole !== 'all' && u.role !== filterRole) return false;
      if (filterStatus !== 'all') {
        if (filterStatus === 'active' && !u.isActive) return false;
        if (filterStatus === 'inactive' && u.isActive) return false;
      }
      if (filterBarber !== 'all') {
        if (filterBarber === 'barber' && !u.isBarber) return false;
        if (filterBarber === 'non-barber' && u.isBarber) return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = `${u.displayName} ${u.email}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
  );

  // Stats
  let totalUsers = $derived(users.length);
  let activeUsers = $derived(users.filter(u => u.isActive).length);
  let barberUsers = $derived(users.filter(u => u.isBarber).length);

  let newEmail = $state('');
  let newPassword = $state('');
  let newName = $state('');
  let newIsBarber = $state(false);
  let formError = $state('');
  let formSuccess = $state('');

  // Delete confirmation modal state
  let showDeleteModal = $state(false);
  let userToDelete = $state<{ id: number; displayName: string } | null>(null);

  // Role change modal state
  let showRoleModal = $state(false);
  let userToChangeRole = $state<{ id: number; displayName: string; role: string } | null>(null);
  let selectedRole = $state<'owner' | 'manager' | 'staff'>('staff');

  // Schedule modal state
  let userToEditSchedule = $state<{ id: number; displayName: string } | null>(null);
  let showScheduleModal = $state(false);
  let userSchedules = $state<Record<number, { openTime: string; closeTime: string; isActive: boolean }>>({});
  let loadingSchedule = $state(false);
  let savingSchedule = $state(false);
  let scheduleMessage = $state('');
  let scheduleError = $state('');

  function toggleUserMenu(id: number) {
    openUserMenuId = openUserMenuId === id ? null : id;
  }

  async function toggleActive(id: number, isActive: boolean) {
    const res = await fetch('/admin/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isActive: !isActive })
    });

    if (res.ok) {
      const user = users.find(u => u.id === id);
      if (user) {
        user.isActive = !isActive;
      }
      openUserMenuId = null;
    }
  }

  async function toggleBarber(id: number, isBarber: boolean) {
    const res = await fetch('/admin/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isBarber: !isBarber })
    });

    if (res.ok) {
      const user = users.find(u => u.id === id);
      if (user) {
        user.isBarber = !isBarber;
      }
      openUserMenuId = null;
    }
  }

  function openScheduleModal(id: number, displayName: string) {
    openUserMenuId = null;
    userToEditSchedule = { id, displayName };
    showScheduleModal = true;
    fetchUserSchedule(id);
  }

  function closeScheduleModal() {
    showScheduleModal = false;
    userToEditSchedule = null;
  }

  async function fetchUserSchedule(staffId: number) {
    loadingSchedule = true;
    scheduleMessage = '';
    scheduleError = '';
    try {
      const res = await fetch(`/admin/api/staff-schedules?staffId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        const schedules = createDefaultScheduleDraft();
        (data.schedules || []).forEach((s: any) => {
          schedules[s.dayOfWeek] = { openTime: s.openTime || '', closeTime: s.closeTime || '', isActive: s.isActive };
        });
        userSchedules = schedules;
      } else {
        userSchedules = createDefaultScheduleDraft();
      }
    } catch {
      userSchedules = createDefaultScheduleDraft();
    }
    loadingSchedule = false;
  }

  function createDefaultScheduleDraft() {
    return Object.fromEntries(
      Array.from({ length: 7 }, (_, index) => [
        index + 1,
        { openTime: index < 5 ? '09:00' : '10:00', closeTime: index < 5 ? '18:00' : '16:00', isActive: index < 6 }
      ])
    ) as Record<number, { openTime: string; closeTime: string; isActive: boolean }>;
  }

  async function saveAllUserSchedules() {
    if (!userToEditSchedule) return;
    savingSchedule = true;
    scheduleMessage = '';
    scheduleError = '';

    try {
      for (const [dayOfWeek, sched] of Object.entries(userSchedules)) {
        if (sched.isActive) {
          const res = await fetch('/admin/api/staff-schedules', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              staffId: userToEditSchedule.id,
              dayOfWeek: Number(dayOfWeek),
              openTime: sched.openTime || null,
              closeTime: sched.closeTime || null,
              isActive: true
            })
          });

          if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Opslaan mislukt');
          }
        } else {
          const res = await fetch(`/admin/api/staff-schedules?staffId=${userToEditSchedule.id}&dayOfWeek=${dayOfWeek}`, {
            method: 'DELETE'
          });

          if (!res.ok) {
            throw new Error('Gesloten dag verwijderen mislukt');
          }
        }
      }

      scheduleMessage = 'Werktijden opgeslagen.';
      await fetchUserSchedule(userToEditSchedule.id);
      scheduleMessage = 'Werktijden opgeslagen.';
    } catch (e: any) {
      scheduleError = e.message || 'Opslaan mislukt';
    } finally {
      savingSchedule = false;
    }
  }

  async function saveUserSchedule(dayOfWeek: number, openTime: string, closeTime: string, isActive: boolean) {
    if (!userToEditSchedule) return;
    try {
      const res = await fetch('/admin/api/staff-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: userToEditSchedule.id,
          dayOfWeek,
          openTime: openTime || null,
          closeTime: closeTime || null,
          isActive
        })
      });
      if (res.ok) {
        await fetchUserSchedule(userToEditSchedule.id);
      } else {
        const error = await res.json();
        alert('Fout bij opslaan: ' + (error.error || 'Onbekende fout'));
      }
    } catch (e: any) {
      alert('Netwerkfout: ' + (e.message || e));
    }
  }

  async function deleteUserSchedule(dayOfWeek: number) {
    if (!userToEditSchedule) return;
    try {
      const res = await fetch(`/admin/api/staff-schedules?staffId=${userToEditSchedule.id}&dayOfWeek=${dayOfWeek}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        await fetchUserSchedule(userToEditSchedule.id);
      } else {
        alert('Fout bij verwijderen');
      }
    } catch {
      alert('Netwerkfout');
    }
  }

  const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  function openDeleteModal(id: number, displayName: string) {
    openUserMenuId = null;
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
    openUserMenuId = null;
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

  function openCreateModal() {
    formError = '';
    formSuccess = '';
    newEmail = '';
    newPassword = '';
    newName = '';
    newIsBarber = false;
    showCreateModal = true;
  }

  function closeCreateModal() {
    showCreateModal = false;
    formError = '';
    formSuccess = '';
  }

  async function createUser(e: Event) {
    e.preventDefault();
    formError = '';
    formSuccess = '';

    try {
      const res = await fetch('/admin/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newEmail, password: newPassword, displayName: newName, isBarber: newIsBarber })
      });

      const result = await res.json();

      if (res.ok && result.success) {
        formSuccess = 'Gebruiker succesvol aangemaakt.';

        users.push({
          id: result.id,
          email: newEmail,
          displayName: newName,
          role: 'staff',
          isActive: true,
          isBarber: newIsBarber
        });

        newEmail = '';
        newPassword = '';
        newName = '';
        newIsBarber = false;

        setTimeout(() => {
          closeCreateModal();
          formSuccess = '';
        }, 1500);
      } else {
        formError = result.error || 'Gebruiker aanmaken mislukt.';
      }
    } catch (e: any) {
      console.error('Create user error:', e);
      formError = 'Er ging iets mis bij het aanmaken. Probeer het opnieuw.';
    }
  }

  let showCreateModal = $state(false);

  function getRoleBadgeColor(role: string): string {
    switch (role) {
      case 'owner': return 'text-gold-500 bg-gold-500/10 border-gold-500/20';
      case 'manager': return 'text-amber-400 bg-amber-500/10 border-amber-500/20';
      default: return 'text-bone-muted bg-bone-muted/10 border-bone-muted/20';
    }
  }

  function getRoleLabel(role: string): string {
    switch (role) {
      case 'owner': return 'Owner';
      case 'manager': return 'Manager';
      default: return 'Medewerker';
    }
  }
</script>

<svelte:head>
  <title>Gebruikers — Cyrus Beheer</title>
</svelte:head>

{#if data.canManageUsers}
  <!-- Header -->
  <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
    <div>
      <h1 class="font-display text-heading text-bone">Gebruikersbeheer</h1>
      <p class="text-bone-muted font-body text-sm mt-1">
        {totalUsers} totaal · {activeUsers} actief · {barberUsers} barbers
      </p>
    </div>
    <button onclick={openCreateModal} class="btn-primary flex items-center gap-2 self-start md:self-auto">
      <UserPlus size={18} />
      Nieuwe Gebruiker
    </button>
  </div>

  <!-- Stats cards -->
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
    <div class="bg-surface-base border border-white/5 p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 bg-gold-500/10 flex items-center justify-center">
          <Users class="text-gold-500" size={20} />
        </div>
        <span class="font-body text-sm text-bone-muted">Totaal</span>
      </div>
      <p class="font-display text-2xl text-bone">{totalUsers}</p>
    </div>
    <div class="bg-surface-base border border-white/5 p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 bg-green-500/10 flex items-center justify-center">
          <UserCheck class="text-green-500" size={20} />
        </div>
        <span class="font-body text-sm text-bone-muted">Actief</span>
      </div>
      <p class="font-display text-2xl text-bone">{activeUsers}</p>
    </div>
    <div class="bg-surface-base border border-white/5 p-5">
      <div class="flex items-center gap-3 mb-2">
        <div class="w-10 h-10 bg-blue-500/10 flex items-center justify-center">
          <Scissors class="text-blue-500" size={20} />
        </div>
        <span class="font-body text-sm text-bone-muted">Barbers</span>
      </div>
      <p class="font-display text-2xl text-bone">{barberUsers}</p>
    </div>
  </div>

  <!-- Filters bar -->
  <div class="flex flex-col md:flex-row gap-3 mb-6">
    <!-- Search -->
    <div class="relative flex-1">
      <input
        type="text"
        bind:value={searchQuery}
        placeholder="Zoek gebruikers op naam of e-mail..."
        class="w-full bg-surface-base border border-white/10 pl-9 pr-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500 placeholder:text-bone-muted/50"
      />
      <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-bone-muted">
        <Search size={16} />
      </div>
    </div>

    <!-- Role filter -->
    <div class="relative">
      <select
        bind:value={filterRole}
        class="bg-surface-base border border-white/10 pl-9 pr-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500 appearance-none"
      >
        <option value="all">Alle rollen</option>
        <option value="owner">Owner</option>
        <option value="manager">Manager</option>
        <option value="staff">Medewerker</option>
      </select>
      <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-bone-muted">
        <UserCog size={16} />
      </div>
    </div>

    <!-- Status filter -->
    <div class="relative">
      <select
        bind:value={filterStatus}
        class="bg-surface-base border border-white/10 pl-9 pr-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500 appearance-none"
      >
        <option value="all">Alle statussen</option>
        <option value="active">Actief</option>
        <option value="inactive">Inactief</option>
      </select>
      <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-bone-muted">
        <Filter size={16} />
      </div>
    </div>

    <!-- Barber filter -->
    <div class="relative">
      <select
        bind:value={filterBarber}
        class="bg-surface-base border border-white/10 pl-9 pr-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500 appearance-none"
      >
        <option value="all">Allen</option>
        <option value="barber">Barber</option>
        <option value="non-barber">Geen barber</option>
      </select>
      <div class="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-bone-muted">
        <Scissors size={16} />
      </div>
    </div>
  </div>

  <!-- User list -->
  {#if filteredUsers.length > 0}
    <div class="bg-surface-base border border-white/5">
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-white/5 bg-surface-low">
            <th class="text-left p-4 font-body text-label text-bone-muted">Gebruiker</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Rol</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Barber</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Status</th>
            <th class="text-left p-4 font-body text-label text-bone-muted">Acties</th>
          </tr>
        </thead>
        <tbody>
          {#each filteredUsers as user}
            <tr class="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
              <td class="p-4">
                <div>
                  <span class="font-body text-bone block font-medium">{user.displayName}</span>
                  <span class="font-body text-xs text-bone-muted block mt-0.5">{user.email}</span>
                </div>
              </td>
              <td class="p-4">
                <span class="font-body text-xs px-2.5 py-1 border {getRoleBadgeColor(user.role)}">
                  {getRoleLabel(user.role)}
                </span>
              </td>
              <td class="p-4">
                <button
                  onclick={() => toggleBarber(user.id, user.isBarber)}
                  class="inline-flex items-center gap-3 border border-white/10 bg-surface-low px-3 py-2 transition-colors hover:border-gold-500/35"
                  aria-label="{user.isBarber ? 'Barberrechten uitzetten voor' : 'Barberrechten aanzetten voor'} {user.displayName}"
                >
                  <span class="relative h-5 w-9 rounded-full transition-colors {user.isBarber ? 'bg-gold-500' : 'bg-surface-highest'}">
                    <span class="absolute left-0.5 top-0.5 h-4 w-4 rounded-full bg-surface transition-transform {user.isBarber ? 'translate-x-4' : 'translate-x-0'}"></span>
                  </span>
                  <span class="font-body text-xs {user.isBarber ? 'text-bone' : 'text-bone-muted'}">
                    {user.isBarber ? 'Barber' : 'Geen barber'}
                  </span>
                </button>
              </td>
              <td class="p-4">
                <span class="flex items-center gap-2 font-body text-label {user.isActive ? 'text-green-500' : 'text-red-400'}">
                  <span class="w-2 h-2 rounded-full {user.isActive ? 'bg-green-500' : 'bg-red-400'}"></span>
                  {user.isActive ? 'Actief' : 'Inactief'}
                </span>
              </td>
              <td class="p-4">
                {#if user.role !== 'owner' || user.isBarber}
                  <div class="relative inline-flex">
                    <button
                      onclick={() => toggleUserMenu(user.id)}
                      class="inline-flex items-center gap-2 border border-white/10 bg-surface-low px-3 py-2 font-body text-xs text-bone transition-colors hover:border-gold-500/35 hover:bg-white/[0.03]"
                      aria-expanded={openUserMenuId === user.id}
                      aria-label="Acties beheren voor {user.displayName}"
                    >
                      Beheer
                      <MoreVertical size={15} class="text-bone-muted" />
                    </button>

                    {#if openUserMenuId === user.id}
                      <button
                        class="fixed inset-0 z-10 cursor-default"
                        aria-label="Menu sluiten"
                        onclick={() => (openUserMenuId = null)}
                      ></button>
                      <div class="absolute right-0 top-11 z-20 w-56 border border-white/10 bg-surface-base p-2 shadow-2xl">
                        {#if user.isBarber}
                          <button
                            onclick={() => openScheduleModal(user.id, user.displayName)}
                            class="flex w-full items-center gap-3 px-3 py-2.5 text-left font-body text-sm text-bone transition-colors hover:bg-white/[0.04]"
                          >
                            <Clock size={16} class="text-blue-400" />
                            Werktijden beheren
                          </button>
                        {/if}

                        <button
                          onclick={() => openRoleModal(user.id, user.displayName, user.role)}
                          class:hidden={user.role === 'owner'}
                          class="flex w-full items-center gap-3 px-3 py-2.5 text-left font-body text-sm text-bone transition-colors hover:bg-white/[0.04]"
                        >
                          <UserCog size={16} class="text-gold-500" />
                          Rol wijzigen
                        </button>

                        <button
                          onclick={() => toggleActive(user.id, user.isActive)}
                          class:hidden={user.role === 'owner'}
                          class="flex w-full items-center gap-3 px-3 py-2.5 text-left font-body text-sm transition-colors hover:bg-white/[0.04] {user.isActive ? 'text-red-400' : 'text-green-500'}"
                        >
                          <UserX size={16} />
                          {user.isActive ? 'Deactiveren' : 'Reactiveren'}
                        </button>

                        {#if user.role !== 'owner'}
                          <div class="my-1 border-t border-white/5"></div>
                        {/if}

                        <button
                          onclick={() => openDeleteModal(user.id, user.displayName)}
                          class:hidden={user.role === 'owner'}
                          class="flex w-full items-center gap-3 px-3 py-2.5 text-left font-body text-sm text-red-400 transition-colors hover:bg-red-500/10"
                        >
                          <Trash2 size={16} />
                          Verwijderen
                        </button>
                      </div>
                    {/if}
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
  {:else}
    <div class="bg-surface-base border border-white/5 p-12 text-center">
      <div class="w-16 h-16 mx-auto mb-4 bg-surface-low flex items-center justify-center">
        <Users size={32} class="text-bone-muted opacity-20" />
      </div>
      <p class="font-body text-bone-muted mb-2">
        {searchQuery || filterRole !== 'all' || filterStatus !== 'all' || filterBarber !== 'all'
          ? 'Geen gebruikers gevonden met deze filters.'
          : 'Geen gebruikers gevonden. Maak je eerste gebruiker aan.'}
      </p>
    </div>
  {/if}

  <!-- Create User Modal -->
  {#if showCreateModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeCreateModal} onkeydown={(e) => e.key === 'Enter' && closeCreateModal()}>
      <div class="bg-surface-base p-8 border border-white/10 max-w-2xl w-full mx-6 shadow-2xl max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true" tabindex="-1" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeCreateModal()}>
        <div class="flex items-center gap-4 mb-6 pb-4 border-b border-white/5">
          <div class="w-12 h-12 rounded-full bg-gold-500/10 flex items-center justify-center">
            <UserPlus class="text-gold-500" size={24} />
          </div>
          <div>
            <h3 class="font-display text-subheading text-bone">Nieuwe Gebruiker</h3>
            <p class="font-body text-sm text-bone-muted">Voeg een nieuwe medewerker toe aan het team</p>
          </div>
        </div>

        {#if formError}
          <div class="bg-red-500/10 border border-red-500/20 p-3 text-sm text-red-400 mb-4 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            <span>{formError}</span>
          </div>
        {/if}

        {#if formSuccess}
          <div class="bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-400 mb-4 flex items-start gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="shrink-0 mt-0.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
            <span>{formSuccess}</span>
          </div>
        {/if}

        <form onsubmit={createUser} class="space-y-5">
          <div class="grid md:grid-cols-2 gap-4">
            <div>
              <label for="new-user-name" class="block text-xs font-body text-bone-muted mb-2">Weergavenaam *</label>
              <input
                id="new-user-name"
                type="text"
                bind:value={newName}
                class="w-full bg-surface-low border border-white/5 px-3 py-2.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 transition-colors"
                placeholder="Bijv. Jan Jansen"
                required
              />
            </div>
            <div>
              <label for="new-user-email" class="block text-xs font-body text-bone-muted mb-2">E-mail *</label>
              <input
                id="new-user-email"
                type="email"
                bind:value={newEmail}
                class="w-full bg-surface-low border border-white/5 px-3 py-2.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 transition-colors"
                placeholder="jan@barbershop.nl"
                required
              />
            </div>
          </div>

          <div>
            <label for="new-user-password" class="block text-xs font-body text-bone-muted mb-2">Wachtwoord *</label>
            <input
              id="new-user-password"
              type="password"
              bind:value={newPassword}
              class="w-full bg-surface-low border border-white/5 px-3 py-2.5 text-sm font-body text-bone focus:outline-none focus:border-gold-500 transition-colors"
              placeholder="Minimaal 6 tekens"
              required
            />
          </div>

          <div class="pt-2 border-t border-white/5">
            <label class="flex items-center gap-3 cursor-pointer p-4 bg-surface-low border border-white/5 hover:border-blue-500/30 transition-colors">
              <input type="checkbox" bind:checked={newIsBarber} class="w-5 h-5 text-blue-500 accent-blue-500" />
              <div class="flex items-center gap-3">
                <Scissors size={18} class="text-blue-500" />
                <div>
                  <span class="block font-body text-sm text-bone">Is Barber</span>
                  <span class="block font-body text-xs text-bone-muted">Deze gebruiker kan afspraken uitvoeren als barber</span>
                </div>
              </div>
            </label>
          </div>

          <div class="flex gap-4 pt-4 border-t border-white/5">
            <button type="button" onclick={closeCreateModal} class="flex-1 px-4 py-2.5 bg-surface-low border border-white/10 text-bone-muted hover:text-bone hover:border-white/20 text-sm font-body transition-all">
              Annuleren
            </button>
            <button type="submit" class="flex-1 px-4 py-2.5 bg-gold-500 text-surface text-sm font-body hover:bg-gold-600 transition-colors">
              Gebruiker Aanmaken
            </button>
          </div>
        </form>
      </div>
    </div>
  {/if}

  <!-- Role Change Modal -->
  {#if showRoleModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeRoleModal} onkeydown={(e) => e.key === 'Enter' && closeRoleModal()}>
      <div class="bg-surface-base p-8 border border-white/10 max-w-md w-full mx-6 shadow-2xl" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeRoleModal()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
            <UserCog class="text-gold-500" size={32} />
          </div>
          <h3 class="font-display text-subheading text-bone mb-2">Rol Wijzigen</h3>
          <p class="font-body text-body text-bone-muted mb-4">
            Kies een nieuwe rol voor <span class="text-bone font-semibold">{userToChangeRole?.displayName}</span>
          </p>
          <div class="space-y-3">
            <label class="flex items-center gap-3 p-4 border border-white/10 cursor-pointer hover:border-gold-500/50 transition-colors">
              <input type="radio" name="role" value="staff" bind:group={selectedRole} class="text-gold-500" />
              <div>
                <span class="block font-body text-body text-bone">Medewerker</span>
                <span class="block font-body text-xs text-bone-muted">Standaard rol voor personeelsleden</span>
              </div>
            </label>
            <label class="flex items-center gap-3 p-4 border border-white/10 cursor-pointer hover:border-gold-500/50 transition-colors">
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
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeDeleteModal} onkeydown={(e) => e.key === 'Enter' && closeDeleteModal()}>
      <div class="bg-surface-base p-8 border border-white/10 max-w-md w-full mx-6 shadow-2xl" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeDeleteModal()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-red-400"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" x2="10" y1="11" y2="17"/><line x1="14" x2="14" y1="11" y2="17"/></svg>
          </div>
          <h3 class="font-display text-subheading text-bone mb-2">Gebruiker Verwijderen</h3>
          <p class="font-body text-body text-bone-muted mb-2">
            Weet je zeker dat je <span class="text-bone font-semibold">{userToDelete?.displayName}</span> wilt verwijderen?
          </p>
          <p class="font-body text-xs text-red-400 flex items-center justify-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            Deze actie kan niet ongedaan worden gemaakt.
          </p>
        </div>
        <div class="flex gap-3">
          <button onclick={closeDeleteModal} class="flex-1 px-4 py-2.5 bg-surface-low border border-white/10 text-bone-muted hover:text-bone hover:border-white/20 text-sm font-body transition-all">
            Annuleren
          </button>
          <button onclick={confirmDelete} class="flex-1 px-4 py-2.5 bg-red-500 text-white text-sm font-body hover:bg-red-600 transition-colors">
            Verwijderen
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Schedule Modal -->
  {#if showScheduleModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeScheduleModal} onkeydown={(e) => e.key === 'Enter' && closeScheduleModal()}>
      <div class="bg-surface-base p-8 border border-white/10 max-w-2xl w-full mx-6 shadow-2xl max-h-[90vh] overflow-y-auto" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeScheduleModal()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="flex items-center gap-4 mb-6 pb-4 border-b border-white/5">
          <div class="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center">
            <Clock class="text-blue-500" size={24} />
          </div>
          <div>
            <h3 class="font-display text-subheading text-bone">Werktijden: {userToEditSchedule?.displayName}</h3>
            <p class="font-body text-sm text-bone-muted">Stel hier de werktijden in. Deze moeten binnen de openingstijden van de zaak vallen.</p>
          </div>
        </div>

        {#if loadingSchedule}
          <div class="text-center py-12">
            <div class="w-8 h-8 border-2 border-gold-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
            <p class="text-bone-muted">Laden...</p>
          </div>
        {:else}
          {#if scheduleError}
            <div class="mb-4 border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">{scheduleError}</div>
          {/if}

          {#if scheduleMessage}
            <div class="mb-4 border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-400">{scheduleMessage}</div>
          {/if}

          <div class="space-y-2">
            {#each dayNames as day, i}
              {@const dayOfWeek = i + 1}
              {@const sched = userSchedules[dayOfWeek]}
              <div class="grid gap-3 border border-white/5 bg-surface-low p-3 sm:grid-cols-[4.5rem_1fr] sm:items-center">
                <label class="flex items-center gap-3">
                  <input type="checkbox" bind:checked={userSchedules[dayOfWeek].isActive} class="h-4 w-4 accent-gold-500" />
                  <span class="font-body text-sm font-semibold text-bone">{day}</span>
                </label>

                <div class="flex flex-wrap items-center gap-2 {sched.isActive ? '' : 'opacity-45'}">
                  <input
                    type="time"
                    bind:value={userSchedules[dayOfWeek].openTime}
                    disabled={!sched.isActive}
                    class="w-28 bg-surface-base border border-white/10 px-3 py-1.5 font-body text-sm text-bone focus:outline-none focus:border-gold-500 disabled:cursor-not-allowed"
                  />
                  <span class="text-bone-muted">tot</span>
                  <input
                    type="time"
                    bind:value={userSchedules[dayOfWeek].closeTime}
                    disabled={!sched.isActive}
                    class="w-28 bg-surface-base border border-white/10 px-3 py-1.5 font-body text-sm text-bone focus:outline-none focus:border-gold-500 disabled:cursor-not-allowed"
                  />
                  <span class="font-body text-xs text-bone-muted">{sched.isActive ? 'Werkdag' : 'Vrij'}</span>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="flex flex-col-reverse gap-3 mt-6 pt-4 border-t border-white/5 sm:flex-row sm:justify-end">
          <button onclick={closeScheduleModal} class="px-4 py-2 bg-surface-low border border-white/10 text-bone-muted hover:text-bone hover:border-white/20 text-sm font-body transition-all">
            Sluiten
          </button>
          <button
            onclick={saveAllUserSchedules}
            disabled={savingSchedule || loadingSchedule}
            class="px-4 py-2 bg-gold-500 text-surface text-sm font-body hover:bg-gold-600 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingSchedule ? 'Opslaan...' : 'Alle werktijden opslaan'}
          </button>
        </div>
      </div>
    </div>
  {/if}

{:else}
  <div class="text-center py-20">
    <h1 class="font-display text-subheading text-bone-muted mb-4">Toegang Geweigerd</h1>
    <p class="font-body text-body text-bone-muted">Alleen hoofdaccounts kunnen gebruikers beheren.</p>
  </div>
{/if}
