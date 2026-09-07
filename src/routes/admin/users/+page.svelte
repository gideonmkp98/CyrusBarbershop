<script lang="ts">
  // @ts-nocheck - lucide-svelte has type definition issues in this   build
  import { Camera, Clock, MoreVertical, Scissors, Trash2, UserCog, UserX } from 'lucide-svelte';
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
  type User = { id: number; email: string; displayName: string; imageUrl: string | null; role: 'owner' | 'manager' | 'staff'; isActive: boolean; isBarber: boolean };

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
  let newIsBarber = $state(false);
  let error = $state('');
  let success = $state('');
  let userSaveStatus = $state<Record<number, 'success' | 'error' | null>>({});
  let openActionMenuId = $state<number | null>(null);

  // Delete confirmation modal state
  let showDeleteModal = $state(false);
  let userToDelete = $state<{ id: number; displayName: string } | null>(null);

  // Role change modal state
  let showRoleModal = $state(false);
  let userToChangeRole = $state<{ id: number; displayName: string; role: string } | null>(null);
  let selectedRole = $state<'owner' | 'manager' | 'staff'>('staff');

  // Avatar upload modal state
  let showAvatarModal = $state(false);
  let userToUploadAvatar = $state<User | null>(null);
  let selectedAvatarFile = $state<File | null>(null);
  let avatarError = $state('');
  let uploadingAvatar = $state(false);

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

  async function toggleBarber(id: number, isBarber: boolean) {
    const res = await fetch('/admin/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, isBarber: !isBarber })
    });

    if (res.ok) {
      // Update the user in the list without refresh
      const user = users.find(u => u.id === id);
      if (user) {
        user.isBarber = !isBarber;
      }
    }
  }

  function openScheduleModal(id: number, displayName: string) {
    userToEditSchedule = { id, displayName };
    showScheduleModal = true;
    fetchUserSchedule(id);
  }

  function closeScheduleModal() {
    showScheduleModal = false;
    userToEditSchedule = null;
  }

  let userToEditSchedule = $state<{ id: number; displayName: string } | null>(null);
  let showScheduleModal = $state(false);
  type StaffSchedule = { openTime: string; closeTime: string; isActive: boolean };
  type OpeningHour = { dayOfWeek: number; openTime: string; closeTime: string; isActive: boolean };
  let userSchedules = $state<Record<number, StaffSchedule>>({});
  let businessHours = $state<Record<number, OpeningHour>>({});
  let loadingSchedule = $state(false);
  let scheduleError = $state('');
  let scheduleSavedDay = $state<number | null>(null);

  function normalizeTime(time: string | null | undefined): string {
    return time ? time.split(':').slice(0, 2).join(':') : '';
  }

  async function updateUserField(id: number, field: 'displayName', value: string) {
    const user = users.find(u => u.id === id);
    if (!user) return;

    userSaveStatus[id] = null;

    const previousValue = user[field];
    user[field] = value.trim();

    try {
      const res = await fetch('/admin/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, [field]: user[field] })
      });

      if (res.ok) {
        userSaveStatus[id] = 'success';
        setTimeout(() => {
          if (userSaveStatus[id] === 'success') userSaveStatus[id] = null;
        }, 1500);
      } else {
        const result = await res.json();
        user[field] = previousValue;
        userSaveStatus[id] = 'error';
        alert(result.error || 'Wijziging opslaan mislukt.');
      }
    } catch {
      user[field] = previousValue;
      userSaveStatus[id] = 'error';
      alert('Netwerkfout. Probeer opnieuw.');
    }
  }

  async function uploadAvatar(id: number, file: File | null): Promise<boolean> {
    if (!file) {
      avatarError = 'Kies eerst een foto.';
      return false;
    }

    const user = users.find(u => u.id === id);
    if (!user) return false;

    userSaveStatus[id] = null;
    avatarError = '';
    uploadingAvatar = true;

    const formData = new FormData();
    formData.set('userId', String(id));
    formData.set('avatar', file);

    try {
      const res = await fetch('/admin/api/users/avatar', {
        method: 'POST',
        body: formData
      });

      const result = await res.json();

      if (res.ok && result.imageUrl) {
        user.imageUrl = result.imageUrl;
        userSaveStatus[id] = 'success';
        setTimeout(() => {
          if (userSaveStatus[id] === 'success') userSaveStatus[id] = null;
        }, 1500);
        uploadingAvatar = false;
        return true;
      } else {
        userSaveStatus[id] = 'error';
        avatarError = result.error || 'Foto uploaden mislukt.';
      }
    } catch {
      userSaveStatus[id] = 'error';
      avatarError = 'Netwerkfout. Probeer opnieuw.';
    }

    uploadingAvatar = false;
    return false;
  }

  async function removeAvatar(id: number): Promise<boolean> {
    const user = users.find(u => u.id === id);
    if (!user) return false;

    userSaveStatus[id] = null;
    avatarError = '';

    try {
      const res = await fetch('/admin/api/users/avatar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: id })
      });

      const result = await res.json();

      if (res.ok) {
        user.imageUrl = null;
        userSaveStatus[id] = 'success';
        setTimeout(() => {
          if (userSaveStatus[id] === 'success') userSaveStatus[id] = null;
        }, 1500);
        return true;
      } else {
        userSaveStatus[id] = 'error';
        avatarError = result.error || 'Foto verwijderen mislukt.';
      }
    } catch {
      userSaveStatus[id] = 'error';
      avatarError = 'Netwerkfout. Probeer opnieuw.';
    }

    return false;
  }

  function openAvatarModal(user: User) {
    userToUploadAvatar = user;
    selectedAvatarFile = null;
    avatarError = '';
    showAvatarModal = true;
    openActionMenuId = null;
  }

  function closeAvatarModal() {
    showAvatarModal = false;
    userToUploadAvatar = null;
    selectedAvatarFile = null;
    avatarError = '';
    uploadingAvatar = false;
  }

  async function confirmAvatarUpload() {
    if (!userToUploadAvatar) return;
    const success = await uploadAvatar(userToUploadAvatar.id, selectedAvatarFile);
    if (success) closeAvatarModal();
  }

  async function confirmAvatarRemove() {
    if (!userToUploadAvatar) return;
    const success = await removeAvatar(userToUploadAvatar.id);
    if (success) closeAvatarModal();
  }

  async function fetchBusinessHours(): Promise<Record<number, OpeningHour>> {
    try {
      const res = await fetch('/api/opening-hours');
      if (res.ok) {
        const data = await res.json();
        const hours: Record<number, OpeningHour> = {};
        (data.hours || []).forEach((h: any) => {
          hours[h.dayOfWeek] = {
            dayOfWeek: h.dayOfWeek,
            openTime: normalizeTime(h.openTime),
            closeTime: normalizeTime(h.closeTime),
            isActive: h.isActive
          };
        });
        businessHours = hours;
        return hours;
      }
    } catch {
      businessHours = {};
    }

    return {};
  }

  async function fetchUserSchedule(staffId: number) {
    loadingSchedule = true;
    scheduleError = '';
    try {
      const hours = await fetchBusinessHours();
      const res = await fetch(`/admin/api/staff-schedules?staffId=${staffId}`);
      if (res.ok) {
        const data = await res.json();
        const schedules: Record<number, StaffSchedule> = {};
        (data.schedules || []).forEach((s: any) => {
          const defaultHours = hours[s.dayOfWeek];
          schedules[s.dayOfWeek] = {
            openTime: normalizeTime(s.openTime) || normalizeTime(defaultHours?.openTime),
            closeTime: normalizeTime(s.closeTime) || normalizeTime(defaultHours?.closeTime),
            isActive: s.isActive
          };
        });
        userSchedules = schedules;
      }
    } catch {
      userSchedules = {};
    }
    loadingSchedule = false;
  }

  function getDefaultSchedule(dayOfWeek: number): StaffSchedule {
    const hours = businessHours[dayOfWeek];

    if (hours?.isActive && hours.openTime && hours.closeTime) {
      return {
        openTime: hours.openTime,
        closeTime: hours.closeTime,
        isActive: false
      };
    }

    return { openTime: '', closeTime: '', isActive: false };
  }

  function getSchedule(dayOfWeek: number): StaffSchedule {
    return userSchedules[dayOfWeek] || getDefaultSchedule(dayOfWeek);
  }

  function updateSchedule(dayOfWeek: number, field: keyof StaffSchedule, value: string | boolean) {
    const current = getSchedule(dayOfWeek);
    userSchedules = {
      ...userSchedules,
      [dayOfWeek]: {
        ...current,
        [field]: value
      }
    };
  }

  async function toggleUserSchedule(dayOfWeek: number) {
    const current = getSchedule(dayOfWeek);
    const nextActive = !current.isActive;
    const defaultSchedule = getDefaultSchedule(dayOfWeek);
    const nextOpen = normalizeTime(current.openTime || defaultSchedule.openTime);
    const nextClose = normalizeTime(current.closeTime || defaultSchedule.closeTime);

    if (nextActive && (!nextOpen || !nextClose)) {
      scheduleError = 'De zaak is gesloten op deze dag. Zet eerst openingstijden voor deze dag aan.';
      return;
    }

    userSchedules = {
      ...userSchedules,
      [dayOfWeek]: {
        openTime: nextOpen,
        closeTime: nextClose,
        isActive: nextActive
      }
    };
    await saveUserSchedule(dayOfWeek, nextOpen, nextClose, nextActive);
  }

  async function saveUserSchedule(dayOfWeek: number, openTime: string, closeTime: string, isActive: boolean) {
    if (!userToEditSchedule) return;
    scheduleError = '';
    scheduleSavedDay = null;
    try {
      const res = await fetch('/admin/api/staff-schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId: userToEditSchedule.id,
          dayOfWeek,
          openTime: isActive ? openTime : null,
          closeTime: isActive ? closeTime : null,
          isActive
        })
      });
      if (res.ok) {
        await fetchUserSchedule(userToEditSchedule.id);
        scheduleSavedDay = dayOfWeek;
        setTimeout(() => {
          if (scheduleSavedDay === dayOfWeek) scheduleSavedDay = null;
        }, 1500);
      } else {
        const error = await res.json();
        scheduleError = error.error || 'Fout bij opslaan';
      }
    } catch (e: any) {
      scheduleError = 'Netwerkfout: ' + (e.message || e);
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
        body: JSON.stringify({ email: newEmail, password: newPassword, displayName: newName, isBarber: newIsBarber })
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
          isActive: true,
          isBarber: newIsBarber,
          imageUrl: null
        });

        newEmail = '';
        newPassword = '';
        newName = '';
        newIsBarber = false;

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
      <div class="md:col-span-3 flex items-center gap-3 mb-2">
        <input type="checkbox" id="newIsBarber" bind:checked={newIsBarber} class="w-4 h-4" />
        <label for="newIsBarber" class="font-body text-body text-bone">Dit personeelslid is een barber</label>
      </div>
      <div class="md:col-span-3">
        <button type="submit" class="btn-primary">Gebruiker Aanmaken</button>
      </div>
    </form>
  </div>

  <!-- User list -->
  <div class="bg-surface-base border border-white/5 overflow-visible">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-white/5">
          <th class="text-left p-4 font-body text-label text-bone-muted">Naam</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">E-mail</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Rol</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Barber</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Foto</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Status</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Acties</th>
        </tr>
      </thead>
      <tbody>
        {#each users as user}
          <tr class="border-b border-white/5 last:border-0">
            <td class="p-4 font-body text-bone">
              {#if data.currentUserRole === 'owner'}
                <input
                  type="text"
                  value={user.displayName}
                  class="bg-surface-low border border-white/10 px-3 py-2 font-body text-sm text-bone focus:border-gold-500 focus:outline-none w-44"
                  aria-label="Naam van {user.displayName}"
                  onchange={(e) => updateUserField(user.id, 'displayName', e.currentTarget.value)}
                />
              {:else}
                {user.displayName}
              {/if}
            </td>
            <td class="p-4 font-body text-bone">{user.email}</td>
            <td class="p-4">
              <span class="font-body text-label {user.role === 'owner' ? 'text-gold-500 font-semibold' : user.role === 'manager' ? 'text-gold-400' : 'text-bone-muted'}">
                {#if user.role === 'staff'}Medewerker{:else}{user.role}{/if}
              </span>
            </td>
            <td class="p-4">
              <span class="font-body text-label {user.isBarber ? 'text-gold-500' : 'text-bone-muted'}">
                {#if user.isBarber}✓ Barber{:else}—{/if}
              </span>
            </td>
            <td class="p-4">
              {#if user.isBarber}
                {#if user.imageUrl}
                  <img src={user.imageUrl} alt={user.displayName} class="h-9 w-9 rounded-full object-cover border border-white/10" />
                {:else}
                  <div class="h-9 w-9 rounded-full bg-surface-low border border-white/10 flex items-center justify-center text-xs text-bone-muted">
                    {user.displayName.charAt(0).toUpperCase()}
                  </div>
                {/if}
              {:else}
                <span class="text-xs text-bone-muted">—</span>
              {/if}
            </td>
            <td class="p-4">
              <span class="font-body text-label {userSaveStatus[user.id] === 'success' ? 'text-green-500' : userSaveStatus[user.id] === 'error' ? 'text-red-400' : user.isActive ? 'text-green-500' : 'text-red-400'}">
                {#if userSaveStatus[user.id] === 'success'}Opgeslagen{:else}{user.isActive ? 'Actief' : 'Inactief'}{/if}
              </span>
            </td>
            <td class="p-4">
              {#if user.role !== 'owner'}
                <div class="relative inline-block">
                  <button
                    type="button"
                    class="p-1.5 rounded hover:bg-white/5 transition-colors text-bone-muted hover:text-bone"
                    aria-label="Acties voor {user.displayName}"
                    aria-expanded={openActionMenuId === user.id}
                    onclick={() => openActionMenuId = openActionMenuId === user.id ? null : user.id}
                  >
                    <MoreVertical size={18} />
                  </button>

                  {#if openActionMenuId === user.id}
                    <div class="absolute right-0 top-9 z-30 w-56 border border-white/10 bg-surface-base shadow-2xl">
                      <div class="py-2">
                        <button
                          type="button"
                          class="flex w-full items-center gap-3 px-4 py-3 text-left font-body text-sm text-bone hover:bg-white/5"
                          onclick={() => { openActionMenuId = null; toggleBarber(user.id, user.isBarber); }}
                        >
                          <Scissors size={16} class={user.isBarber ? 'text-red-400' : 'text-gold-500'} />
                          {user.isBarber ? 'Geen barber' : 'Maak barber'}
                        </button>

                        {#if user.isBarber}
                          <button
                            type="button"
                            class="flex w-full items-center gap-3 px-4 py-3 text-left font-body text-sm text-bone hover:bg-white/5"
                            onclick={() => { openActionMenuId = null; openScheduleModal(user.id, user.displayName); }}
                          >
                            <Clock size={16} class="text-blue-400" />
                            Werktijden
                          </button>
                          {#if data.currentUserRole === 'owner'}
                            <button
                              type="button"
                              class="flex w-full items-center gap-3 px-4 py-3 text-left font-body text-sm text-bone hover:bg-white/5"
                              onclick={() => openAvatarModal(user)}
                            >
                              <Camera size={16} class="text-gold-500" />
                              Upload foto
                            </button>
                          {/if}
                        {/if}

                        <button
                          type="button"
                          class="flex w-full items-center gap-3 px-4 py-3 text-left font-body text-sm text-gold-400 hover:bg-white/5"
                          onclick={() => { openActionMenuId = null; openRoleModal(user.id, user.displayName, user.role); }}
                        >
                          <UserCog size={16} />
                          Rol wijzigen
                        </button>

                        <button
                          type="button"
                          class="flex w-full items-center gap-3 px-4 py-3 text-left font-body text-sm {user.isActive ? 'text-red-400' : 'text-green-500'} hover:bg-white/5"
                          onclick={() => { openActionMenuId = null; toggleActive(user.id, user.isActive); }}
                        >
                          <UserX size={16} />
                          {user.isActive ? 'Deactiveren' : 'Reactiveren'}
                        </button>

                        <div class="my-2 border-t border-white/10"></div>

                        <button
                          type="button"
                          class="flex w-full items-center gap-3 px-4 py-3 text-left font-body text-sm text-red-400 hover:bg-white/5"
                          onclick={() => { openActionMenuId = null; openDeleteModal(user.id, user.displayName); }}
                        >
                          <Trash2 size={16} />
                          Verwijderen
                        </button>
                      </div>
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

  <!-- Avatar Upload Modal -->
  {#if showAvatarModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 w-full" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeAvatarModal} onkeydown={(e) => e.key === 'Enter' && closeAvatarModal()}>
      <div class="bg-surface-base p-8 rounded-lg border border-white/10 max-w-lg w-full mx-6 shadow-2xl" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeAvatarModal()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4 overflow-hidden border border-white/10">
            {#if userToUploadAvatar?.imageUrl}
              <img src={userToUploadAvatar.imageUrl} alt={userToUploadAvatar.displayName} class="h-full w-full object-cover" />
            {:else}
              <Camera class="text-gold-500" size={30} />
            {/if}
          </div>
          <h3 class="font-display text-subheading text-bone mb-2">Foto Uploaden</h3>
          <p class="font-body text-body text-bone-muted">
            Selecteer een foto voor <span class="text-bone font-semibold">{userToUploadAvatar?.displayName}</span>
          </p>
        </div>

        <label class="block border border-dashed border-white/15 bg-surface-low px-4 py-5 text-center cursor-pointer hover:border-gold-500/50 transition-colors">
          <span class="block font-body text-sm text-bone">
            {selectedAvatarFile ? selectedAvatarFile.name : 'Kies JPG, PNG of WebP'}
          </span>
          <span class="block font-body text-xs text-bone-muted mt-1">Maximaal 2 MB</span>
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            class="sr-only"
            onchange={(e) => {
              selectedAvatarFile = e.currentTarget.files?.[0] || null;
              avatarError = '';
            }}
          />
        </label>

        {#if avatarError}
          <div class="mt-4 bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-400">{avatarError}</div>
        {/if}

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6">
          <button
            onclick={closeAvatarModal}
            class="w-full border border-bone-muted/30 px-3 py-3 font-body text-xs font-semibold uppercase tracking-[0.16em] text-bone-muted transition-colors hover:border-bone-muted/50 hover:text-bone disabled:opacity-50"
            disabled={uploadingAvatar}
          >
            Annuleren
          </button>
          {#if userToUploadAvatar?.imageUrl}
            <button
              onclick={confirmAvatarRemove}
              class="w-full border border-red-500/30 px-3 py-3 font-body text-xs font-semibold uppercase tracking-[0.16em] text-red-400 transition-colors hover:border-red-500/50 hover:bg-red-500/10 disabled:opacity-50"
              disabled={uploadingAvatar}
            >
              Verwijderen
            </button>
          {/if}
          <button
            onclick={confirmAvatarUpload}
            class="w-full bg-gold-500 px-3 py-3 font-body text-xs font-semibold uppercase tracking-[0.16em] text-surface transition-colors hover:bg-gold-400 disabled:opacity-50"
            disabled={uploadingAvatar}
          >
            {uploadingAvatar ? 'Uploaden...' : 'Opslaan'}
          </button>
        </div>
      </div>
    </div>
  {/if}

  <!-- Role Change Modal -->
  {#if showRoleModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 w-full" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeRoleModal} onkeydown={(e) => e.key === 'Enter' && closeRoleModal()}>
      <div class="bg-surface-base p-8 rounded-lg border border-white/10 max-w-md w-full mx-6 shadow-2xl" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeRoleModal()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="text-center mb-6">
          <div class="w-16 h-16 rounded-full bg-gold-500/10 flex items-center justify-center mx-auto mb-4">
            <UserCog class="text-gold-500" size={32} />
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

  <!-- Schedule Modal -->
  {#if showScheduleModal}
    <div class="fixed inset-0 bg-black/70 flex items-center justify-center z-50 w-full" role="button" tabindex="0" aria-label="Modal sluiten" onclick={closeScheduleModal} onkeydown={(e) => e.key === 'Enter' && closeScheduleModal()}>
      <div class="bg-surface-base p-8 rounded-lg border border-white/10 max-w-2xl w-full mx-6 shadow-2xl max-h-[90vh] overflow-y-auto" onclick={e => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeScheduleModal()} role="dialog" aria-modal="true" tabindex="-1">
        <div class="text-center mb-6">
          <h3 class="font-display text-subheading text-bone mb-2">Werktijden: {userToEditSchedule?.displayName}</h3>
          <p class="font-body text-sm text-bone-muted">Wijzigingen worden automatisch opgeslagen. Deze tijden moeten binnen de openingstijden van de zaak vallen.</p>
        </div>

        {#if loadingSchedule}
          <p class="text-center text-bone-muted">Laden...</p>
        {:else}
          {#if scheduleError}
            <div class="mb-4 bg-red-900/20 border border-red-500/30 p-3 text-sm text-red-400">{scheduleError}</div>
          {/if}
          <div class="space-y-3">
            {#each dayNames as day, i}
              {@const dayOfWeek = i + 1}
              {@const sched = getSchedule(dayOfWeek)}
              {@const hours = businessHours[dayOfWeek]}
              <div class="flex items-center gap-3 p-3 bg-surface-low border border-white/5 rounded">
                <span class="w-8 font-body text-sm text-bone">{day}</span>
                <button
                  onclick={() => toggleUserSchedule(dayOfWeek)}
                  class="relative h-6 w-12 rounded-full transition-colors {sched.isActive ? 'bg-gold-500' : 'bg-surface-base border border-white/10'}"
                  aria-label="{sched.isActive ? 'Vrij zetten' : 'Werkdag aanzetten'} voor {day}"
                >
                  <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface transition-transform {sched.isActive ? 'translate-x-6' : 'translate-x-0'}"></span>
                </button>
                <div class="flex items-center gap-2 flex-1">
                  <input
                    type="time"
                    id="open_{dayOfWeek}"
                    class="bg-surface-base border border-gold-500/20 text-bone font-body text-sm px-2 py-1 w-24 disabled:opacity-40"
                    value={sched.openTime}
                    min={hours?.isActive ? hours.openTime : undefined}
                    max={hours?.isActive ? hours.closeTime : undefined}
                    disabled={!sched.isActive}
                    oninput={(e) => updateSchedule(dayOfWeek, 'openTime', e.currentTarget.value)}
                    onchange={(e) => {
                      const current = getSchedule(dayOfWeek);
                      saveUserSchedule(dayOfWeek, e.currentTarget.value, current.closeTime, current.isActive);
                    }}
                  />
                  <span class="text-bone-muted">-</span>
                  <input
                    type="time"
                    id="close_{dayOfWeek}"
                    class="bg-surface-base border border-gold-500/20 text-bone font-body text-sm px-2 py-1 w-24 disabled:opacity-40"
                    value={sched.closeTime}
                    min={hours?.isActive ? hours.openTime : undefined}
                    max={hours?.isActive ? hours.closeTime : undefined}
                    disabled={!sched.isActive}
                    oninput={(e) => updateSchedule(dayOfWeek, 'closeTime', e.currentTarget.value)}
                    onchange={(e) => {
                      const current = getSchedule(dayOfWeek);
                      saveUserSchedule(dayOfWeek, current.openTime, e.currentTarget.value, current.isActive);
                    }}
                  />
                  <span class="w-20 text-xs font-body {scheduleSavedDay === dayOfWeek ? 'text-green-500' : 'text-bone-muted'}">
                    {scheduleSavedDay === dayOfWeek ? 'Opgeslagen' : sched.isActive ? 'Werkt' : 'Vrij'}
                  </span>
                </div>
              </div>
            {/each}
          </div>
        {/if}

        <div class="flex justify-end mt-6">
          <button onclick={closeScheduleModal} class="btn-outline py-2">Sluiten</button>
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
