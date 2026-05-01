<script lang="ts">
  let { data } = $props();
</script>

<svelte:head>
  <title>Dashboard — Cyrus Beheer</title>
</svelte:head>

<h1 class="font-display text-heading text-bone mb-8">Dashboard</h1>

<div class="grid md:grid-cols-3 gap-6 mb-12">
  <div class="bg-surface-base p-6 border border-white/5">
    <span class="font-body text-label text-bone-muted block mb-2">VANDAAG</span>
    <span class="font-display text-heading text-gold-500">{data.todayCount}</span>
    <span class="font-body text-label text-bone-muted block mt-1">afspraken</span>
  </div>
  <div class="bg-surface-base p-6 border border-white/5">
    <span class="font-body text-label text-bone-muted block mb-2">DEZE WEEK</span>
    <span class="font-display text-heading text-gold-500">{data.weekCount}</span>
    <span class="font-body text-label text-bone-muted block mt-1">afspraken</span>
  </div>
  <div class="bg-surface-base p-6 border border-white/5">
    <span class="font-body text-label text-bone-muted block mb-2">IN AFWACHTING</span>
    <span class="font-display text-heading text-gold-500">{data.pendingCount}</span>
    <span class="font-body text-label text-bone-muted block mt-1">bevestigd</span>
  </div>
</div>

{#if data.todayAppointments.length > 0}
  <h2 class="font-display text-subheading text-bone mb-4">Schema van Vandaag</h2>
  <div class="bg-surface-base border border-white/5 overflow-hidden">
    <table class="w-full text-sm">
      <thead>
        <tr class="border-b border-white/5">
          <th class="text-left p-4 font-body text-label text-bone-muted">Moment</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Klant</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Service</th>
          <th class="text-left p-4 font-body text-label text-bone-muted">Status</th>
        </tr>
      </thead>
      <tbody>
        {#each data.todayAppointments as appt}
          <tr class="border-b border-white/5 last:border-0">
            <td class="p-4 font-body text-bone">{appt.timeSlot}</td>
            <td class="p-4 font-body text-bone">{appt.clientName}</td>
            <td class="p-4 font-body text-bone">{appt.serviceName}</td>
            <td class="p-4">
              <span class="font-body text-label {appt.status === 'confirmed' ? 'text-gold-500' : 'text-bone-muted'}">{appt.status}</span>
            </td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
{:else}
  <p class="font-body text-body text-bone-muted">Geen afspraken vandaag.</p>
{/if}