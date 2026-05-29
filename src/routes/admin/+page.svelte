<script lang="ts">
  import {
    Check,
    CheckCircle2,
    Clock3,
    Phone,
    Search,
    UserX,
    X
  } from 'lucide-svelte';

  let { data } = $props();

  type Appointment = {
    id: number;
    date: string;
    timeSlot: string;
    clientName: string;
    clientPhone?: string | null;
    serviceName: string;
    duration: number;
    barberName?: string | null;
    status: string;
  };

  const statusLabels: Record<string, string> = {
    all: 'Alles',
    confirmed: 'Bevestigd',
    completed: 'Afgerond',
    cancelled: 'Geannuleerd',
    no_show: 'Niet verschenen'
  };

  let appointments = $state<Appointment[]>([]);
  let selectedDay = $state<string>('');
  let selectedStatus = $state('all');
  let searchQuery = $state('');
  let updatingId = $state<number | null>(null);
  let initialized = $state(false);

  $effect(() => {
    if (!initialized) {
      appointments = data.weekAppointments ?? [];
      selectedDay = data.weekDays?.[0]?.key ?? '';
      initialized = true;
    }
  });

  let selectedDayMeta = $derived(data.weekDays.find((day: { key: string }) => day.key === selectedDay));
  let selectedDayAppointments = $derived(
    appointments.filter((appt) => appt.date === selectedDay)
  );
  let visibleAppointments = $derived(
    selectedDayAppointments.filter((appt) => {
      const matchesStatus = selectedStatus === 'all' || appt.status === selectedStatus;
      const query = searchQuery.trim().toLowerCase();
      if (!query) return matchesStatus;

      const haystack = [
        appt.clientName,
        appt.clientPhone,
        appt.serviceName,
        appt.barberName,
        appt.timeSlot
      ].filter(Boolean).join(' ').toLowerCase();

      return matchesStatus && haystack.includes(query);
    })
  );
  let activeAppointment = $derived(
    appointments.find((appt) => appt.status === 'confirmed') ?? null
  );
  let confirmedToday = $derived(selectedDayAppointments.filter((appt) => appt.status === 'confirmed').length);
  let completedToday = $derived(selectedDayAppointments.filter((appt) => appt.status === 'completed').length);
  let scheduleTitle = $derived(
    selectedDayMeta?.label === 'Vandaag'
      ? 'Planning van vandaag'
      : `Planning voor ${selectedDayMeta?.label ?? 'deze dag'}`
  );

  function formatSlot(time: string) {
    return time?.slice(0, 5) || '--:--';
  }

  function formatNextAppointmentDate(dateStr: string): string {
    const today = new Date();
    const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowKey = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`;

    if (dateStr === todayKey) return '';
    if (dateStr === tomorrowKey) return 'Morgen';

    const appointmentDate = new Date(dateStr + 'T00:00:00');
    return appointmentDate.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'short' });
  }

  function statusClass(status: string) {
    switch (status) {
      case 'confirmed':
        return 'border-gold-500/25 bg-gold-500/10 text-gold-500';
      case 'completed':
        return 'border-green-500/25 bg-green-500/10 text-green-400';
      case 'cancelled':
        return 'border-red-500/25 bg-red-500/10 text-red-400';
      case 'no_show':
        return 'border-bone-muted/20 bg-bone-muted/10 text-bone-muted';
      default:
        return 'border-white/10 bg-surface-low text-bone-muted';
    }
  }

  async function updateStatus(id: number, status: 'completed' | 'cancelled' | 'no_show') {
    const previous = appointments;
    updatingId = id;
    appointments = appointments.map((appt) => appt.id === id ? { ...appt, status } : appt);

    try {
      const response = await fetch('/admin/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status })
      });

      if (!response.ok) appointments = previous;
    } catch {
      appointments = previous;
    } finally {
      updatingId = null;
    }
  }
</script>

<svelte:head>
  <title>Dashboard - Cyrus Beheer</title>
</svelte:head>

<div class="space-y-6">
  <section class="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
    <div class="relative overflow-hidden border border-white/5 bg-surface-base p-6 md:p-8">
      <div class="absolute inset-0 pointer-events-none opacity-45 bg-[radial-gradient(circle_at_12%_10%,rgba(212,175,55,0.2),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(255,255,255,0.07),transparent_26%)]"></div>
      <div class="relative flex h-full flex-col gap-6">
        <div>
          <span class="font-body text-label text-gold-500">DASHBOARD</span>
          <h1 class="mt-4 max-w-3xl font-display text-heading text-bone">Planning</h1>
          <p class="mt-4 max-w-xl font-body text-sm leading-7 text-bone-muted">
            Een rustig overzicht van de komende afspraken.
          </p>
        </div>

        <div class="grid gap-3 sm:grid-cols-3">
          <div class="border border-white/10 bg-surface/70 p-4">
            <span class="font-body text-xs text-bone-muted">Vandaag</span>
            <strong class="mt-2 block font-display text-2xl text-bone tabular-nums">{data.todayCount}</strong>
          </div>
          <div class="border border-white/10 bg-surface/70 p-4">
            <span class="font-body text-xs text-bone-muted">Komende 7 dagen</span>
            <strong class="mt-2 block font-display text-2xl text-bone tabular-nums">{data.weekCount}</strong>
          </div>
          <div class="border border-white/10 bg-surface/70 p-4">
            <span class="font-body text-xs text-bone-muted">Geselecteerde dag</span>
            <strong class="mt-2 block font-display text-2xl text-bone tabular-nums">{selectedDayAppointments.length}</strong>
          </div>
        </div>
      </div>
    </div>

    <aside class="grid gap-4">
      <div class="border border-white/5 bg-surface-base p-5">
        <div class="flex items-start justify-between gap-4">
          <div>
            <span class="font-body text-label text-bone-muted">VOLGENDE AFSPRAAK</span>
            {#if activeAppointment}
              <div class="mt-3 flex items-baseline gap-3">
                <h2 class="font-display text-3xl text-gold-500">{formatSlot(activeAppointment.timeSlot)}</h2>
                {#if formatNextAppointmentDate(activeAppointment.date)}
                  <span class="font-body text-sm text-bone-muted">{formatNextAppointmentDate(activeAppointment.date)}</span>
                {/if}
              </div>
              <p class="mt-2 font-body text-lg text-bone">{activeAppointment.clientName}</p>
              <p class="mt-1 font-body text-sm text-bone-muted">{activeAppointment.serviceName} - {activeAppointment.duration} min</p>
              <p class="mt-2 font-body text-sm text-bone">
                Barber: <span class="text-gold-500">{activeAppointment.barberName || 'Geen voorkeur'}</span>
              </p>
            {:else}
              <h2 class="mt-3 font-display text-subheading text-bone">Planning rustig</h2>
              <p class="mt-2 font-body text-sm text-bone-muted">Geen bevestigde afspraak meer in deze 7-daagse planning.</p>
            {/if}
          </div>
          <Clock3 size={20} class="text-gold-500" />
        </div>

        {#if activeAppointment}
          <div class="mt-5 flex flex-wrap gap-2">
            <button
              onclick={() => updateStatus(activeAppointment.id, 'completed')}
              disabled={updatingId === activeAppointment.id}
              class="inline-flex items-center gap-2 bg-green-500/10 px-3 py-2 font-body text-xs text-green-400 transition-colors hover:bg-green-500 hover:text-surface disabled:opacity-50"
            >
              <Check size={14} /> Afronden
            </button>
            <button
              onclick={() => updateStatus(activeAppointment.id, 'no_show')}
              disabled={updatingId === activeAppointment.id}
              class="inline-flex items-center gap-2 border border-white/10 px-3 py-2 font-body text-xs text-bone-muted transition-colors hover:text-bone disabled:opacity-50"
            >
              <UserX size={14} /> No-show
            </button>
          </div>
        {/if}
      </div>

      <div class="border border-white/5 bg-surface-base p-5">
        <span class="font-body text-label text-bone-muted">DAGSTATUS</span>
        <div class="mt-5 grid grid-cols-2 gap-3">
          <div class="bg-surface-low p-4">
            <span class="font-body text-xs text-bone-muted">Bevestigd</span>
            <strong class="mt-2 block font-display text-2xl text-bone tabular-nums">{confirmedToday}</strong>
          </div>
          <div class="bg-surface-low p-4">
            <span class="font-body text-xs text-bone-muted">Afgerond</span>
            <strong class="mt-2 block font-display text-2xl text-bone tabular-nums">{completedToday}</strong>
          </div>
        </div>
      </div>
    </aside>
  </section>

  <section class="grid gap-6 xl:grid-cols-[0.9fr_1.35fr]">
    <div class="border border-white/5 bg-surface-base">
      <div class="border-b border-white/5 p-5">
        <span class="font-body text-label text-bone-muted">7-DAAGSE RADAR</span>
        <h2 class="mt-2 font-display text-subheading text-bone">Afspraken per dag</h2>
      </div>

      <div class="grid grid-cols-2 gap-px bg-white/5 sm:grid-cols-7 xl:grid-cols-1">
        {#each data.weekDays as day}
          {@const isSelected = selectedDay === day.key}
          {@const intensity = Math.min(day.count / Math.max(data.busiestDay?.count || 1, 1), 1)}
          <button
            onclick={() => selectedDay = day.key}
            class="bg-surface-base p-4 text-left transition-colors hover:bg-surface-high {isSelected ? 'bg-gold-500/10' : ''}"
          >
            <div class="flex items-center justify-between gap-3">
              <span class="font-body text-sm {isSelected ? 'text-gold-500' : 'text-bone'}">{day.label}</span>
              <span class="font-body text-xs text-bone-muted">{day.day}</span>
            </div>
            <div class="mt-4 flex items-end gap-3">
              <span class="font-display text-3xl tabular-nums {isSelected ? 'text-gold-500' : 'text-bone'}">{day.count}</span>
              <div class="mb-2 h-8 flex-1 bg-surface-low">
                <div
                  class="h-full bg-gold-500 transition-all"
                  style={`width: ${Math.max(intensity * 100, day.count > 0 ? 12 : 0)}%`}
                ></div>
              </div>
            </div>
          </button>
        {/each}
      </div>
    </div>

    <div class="border border-white/5 bg-surface-base">
      <div class="border-b border-white/5 p-5">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span class="font-body text-label text-bone-muted">DAGPLANNING</span>
            <h2 class="mt-2 font-display text-subheading text-bone">{scheduleTitle}</h2>
          </div>

          <div class="flex flex-col gap-3 sm:flex-row">
            <div class="relative">
              <Search size={15} class="absolute left-3 top-1/2 -translate-y-1/2 text-bone-muted" />
              <input
                bind:value={searchQuery}
                placeholder="Zoek klant, service..."
                class="w-full bg-surface-low py-2.5 pl-9 pr-3 font-body text-sm text-bone outline-none ring-1 ring-white/10 transition focus:ring-gold-500/60 sm:w-56"
              />
            </div>

            <select
              bind:value={selectedStatus}
              class="bg-surface-low px-3 py-2.5 font-body text-sm text-bone outline-none ring-1 ring-white/10 transition focus:ring-gold-500/60"
            >
              {#each ['all', 'confirmed', 'completed', 'cancelled', 'no_show'] as status}
                <option value={status}>{statusLabels[status]}</option>
              {/each}
            </select>
          </div>
        </div>
      </div>

      {#if visibleAppointments.length > 0}
        <div class="divide-y divide-white/5">
          {#each visibleAppointments as appt}
            <article class="grid gap-4 p-5 transition-colors hover:bg-white/[0.025] lg:grid-cols-[86px_1fr_auto] lg:items-center">
              <div>
                <span class="font-display text-2xl text-gold-500 tabular-nums">{formatSlot(appt.timeSlot)}</span>
                <span class="mt-1 block font-body text-xs text-bone-muted">{appt.duration} min</span>
              </div>

              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-body text-base text-bone">{appt.clientName}</h3>
                  <span class={`border px-2 py-0.5 font-body text-[11px] ${statusClass(appt.status)}`}>
                    {statusLabels[appt.status] || appt.status}
                  </span>
                </div>
                <p class="mt-1 font-body text-sm text-bone-muted">
                  {appt.serviceName}{appt.barberName ? ` - ${appt.barberName}` : ''}
                </p>
                {#if appt.clientPhone}
                  <a href={`tel:${appt.clientPhone}`} class="mt-2 inline-flex items-center gap-1.5 font-body text-xs text-bone-muted hover:text-gold-500">
                    <Phone size={13} /> {appt.clientPhone}
                  </a>
                {/if}
              </div>

              <div class="flex flex-wrap gap-2 lg:justify-end">
                {#if appt.status === 'confirmed'}
                  <button
                    onclick={() => updateStatus(appt.id, 'completed')}
                    disabled={updatingId === appt.id}
                    class="inline-flex items-center gap-1.5 bg-green-500/10 px-3 py-2 font-body text-xs text-green-400 transition-colors hover:bg-green-500 hover:text-surface disabled:opacity-50"
                  >
                    <Check size={14} /> Klaar
                  </button>
                  <button
                    onclick={() => updateStatus(appt.id, 'no_show')}
                    disabled={updatingId === appt.id}
                    class="inline-flex items-center gap-1.5 border border-white/10 px-3 py-2 font-body text-xs text-bone-muted transition-colors hover:text-bone disabled:opacity-50"
                  >
                    <UserX size={14} /> No-show
                  </button>
                  <button
                    onclick={() => updateStatus(appt.id, 'cancelled')}
                    disabled={updatingId === appt.id}
                    class="inline-flex items-center gap-1.5 bg-red-500/10 px-3 py-2 font-body text-xs text-red-400 transition-colors hover:bg-red-500 hover:text-white disabled:opacity-50"
                  >
                    <X size={14} /> Annuleer
                  </button>
                {:else}
                  <span class="font-body text-xs text-bone-muted">Geen snelle actie nodig</span>
                {/if}
              </div>
            </article>
          {/each}
        </div>
      {:else}
        <div class="grid place-items-center p-12 text-center">
          <CheckCircle2 size={30} class="mb-4 text-gold-500/80" />
          <p class="font-body text-bone">Geen afspraken in deze selectie</p>
          <p class="mt-1 font-body text-sm text-bone-muted">Pas je filter aan of kies een andere dag.</p>
        </div>
      {/if}
    </div>
  </section>

</div>
