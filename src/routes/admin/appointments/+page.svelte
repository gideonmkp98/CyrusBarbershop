<script lang="ts">
  let { data } = $props();
  let filterStatus = $state('all');

  let filteredAppointments = $derived(
    filterStatus === 'all'
      ? data.appointments
      : data.appointments.filter((a: any) => a.status === filterStatus)
  );

  const statusLabels: Record<string, string> = {
    confirmed: 'Bevestigd',
    completed: 'Afgerond',
    cancelled: 'Geannuleerd',
    no_show: 'Niet Verschenen'
  };

  async function updateStatus(id: number, status: string) {
    await fetch('/admin/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    window.location.reload();
  }
</script>

<svelte:head>
  <title>Afspraken — Cyrus Beheer</title>
</svelte:head>

<h1 class="font-display text-heading text-bone mb-8">Afspraken</h1>

<div class="flex gap-2 mb-6">
  {#each ['all', 'confirmed', 'completed', 'cancelled', 'no_show'] as status}
    <button
      class="px-4 py-2 text-xs font-body text-label transition-colors {filterStatus === status ? 'bg-gold-500 text-surface' : 'bg-surface-base text-bone-muted hover:text-bone'}"
      onclick={() => filterStatus = status}
    >{status === 'all' ? 'Alle' : statusLabels[status] || status}</button>
  {/each}
</div>

<div class="bg-surface-base border border-white/5 overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-white/5">
        <th class="text-left p-4 font-body text-label text-bone-muted">Datum</th>
        <th class="text-left p-4 font-body text-label text-bone-muted">Moment</th>
        <th class="text-left p-4 font-body text-label text-bone-muted">Klant</th>
        <th class="text-left p-4 font-body text-label text-bone-muted">E-mail</th>
        <th class="text-left p-4 font-body text-label text-bone-muted">Service</th>
        <th class="text-left p-4 font-body text-label text-bone-muted">Status</th>
        <th class="text-left p-4 font-body text-label text-bone-muted">Acties</th>
      </tr>
    </thead>
    <tbody>
      {#each filteredAppointments as appt}
        <tr class="border-b border-white/5 last:border-0">
          <td class="p-4 font-body text-bone">{appt.date}</td>
          <td class="p-4 font-body text-bone">{appt.timeSlot}</td>
          <td class="p-4 font-body text-bone">{appt.clientName}</td>
          <td class="p-4 font-body text-bone-muted text-xs">{appt.clientEmail}</td>
          <td class="p-4 font-body text-bone">{appt.serviceName}</td>
          <td class="p-4">
            <span class="font-body text-label {appt.status === 'confirmed' ? 'text-gold-500' : appt.status === 'completed' ? 'text-green-500' : 'text-bone-muted'}">
              {statusLabels[appt.status] || appt.status}
            </span>
          </td>
          <td class="p-4">
            {#if appt.status === 'confirmed'}
              <div class="flex gap-2">
                <button onclick={() => updateStatus(appt.id, 'completed')} class="text-xs text-green-500 hover:text-green-400">Afgerond</button>
                <button onclick={() => updateStatus(appt.id, 'cancelled')} class="text-xs text-red-400 hover:text-red-300">Annuleren</button>
                <button onclick={() => updateStatus(appt.id, 'no_show')} class="text-xs text-bone-muted hover:text-bone">Niet Verschenen</button>
              </div>
            {:else}
              <span class="text-xs text-bone-muted">—</span>
            {/if}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  {#if filteredAppointments.length === 0}
    <div class="p-8 text-center text-bone-muted font-body text-body">Geen afspraken gevonden.</div>
  {/if}
</div>