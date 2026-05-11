<script lang="ts">
  interface Appointment {
    id: number;
    date: Date | string;
    timeSlot: string;
    clientName: string;
    clientEmail: string | null;
    serviceName: string;
    status: string;
    barberName: string | null;
    staffId: number | null;
  }

  interface Props {
    appointments: Appointment[];
    staff: { id: number; displayName: string }[];
    onSelect: (appt: Appointment) => void;
    onStatusChange: (id: number, status: string) => void;
    onWeekChange?: (start: string, end: string) => void;
    isLoading?: boolean;
  }

  let { appointments, staff, onSelect, onStatusChange, onWeekChange, isLoading = false }: Props = $props();

  // Week navigation
  let currentWeekStart = $state(getMonday(new Date()));

  function getMonday(d: Date): Date {
    const date = new Date(d);
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(date.setDate(diff));
  }

  function addDays(date: Date, days: number): Date {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  function formatDateKey(d: Date | string): string {
    const date = d instanceof Date ? d : new Date(d);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d_ = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d_}`;
  }

  function isSameDay(a: Date | string, b: Date): boolean {
    return formatDateKey(a) === formatDateKey(b);
  }

  const dayNames = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

  let weekDays = $derived(
    Array.from({ length: 7 }, (_, i) => {
      const date = addDays(currentWeekStart, i);
      const dateKey = formatDateKey(date);
      const dayAppointments = appointments.filter(a => isSameDay(a.date, date));
      // Sort by time
      dayAppointments.sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
      return { date, dateKey, dayName: dayNames[i], appointments: dayAppointments };
    })
  );

  const statusColors: Record<string, string> = {
    confirmed: 'border-l-gold-500',
    completed: 'border-l-green-500',
    cancelled: 'border-l-red-400 opacity-50',
    no_show: 'border-l-bone-muted opacity-60'
  };

  const statusBg: Record<string, string> = {
    confirmed: 'bg-gold-500/10',
    completed: 'bg-green-500/10',
    cancelled: 'bg-red-500/5',
    no_show: 'bg-bone-muted/5'
  };

  function prevWeek() {
    currentWeekStart = addDays(currentWeekStart, -7);
    emitWeekChange();
  }

  function nextWeek() {
    currentWeekStart = addDays(currentWeekStart, 7);
    emitWeekChange();
  }

  function goToday() {
    currentWeekStart = getMonday(new Date());
    emitWeekChange();
  }

  function emitWeekChange() {
    if (!onWeekChange) return;
    const start = formatDateKey(currentWeekStart);
    const end = formatDateKey(addDays(currentWeekStart, 6));
    onWeekChange(start, end);
  }

  function formatDisplayDate(date: Date): string {
    return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' });
  }

  function isToday(date: Date): boolean {
    return formatDateKey(date) === formatDateKey(new Date());
  }
</script>

<div class="space-y-4">
  <!-- Week navigation -->
  <div class="flex items-center justify-between">
    <div class="flex items-center gap-2">
      <button onclick={prevWeek} disabled={isLoading} class="px-3 py-1.5 bg-surface-base border border-white/10 text-bone hover:border-gold-500 transition-colors text-sm font-body disabled:opacity-40">
        ←
      </button>
      <button onclick={goToday} disabled={isLoading} class="px-3 py-1.5 bg-surface-base border border-white/10 text-bone hover:border-gold-500 transition-colors text-sm font-body disabled:opacity-40">
        Vandaag
      </button>
      <button onclick={nextWeek} disabled={isLoading} class="px-3 py-1.5 bg-surface-base border border-white/10 text-bone hover:border-gold-500 transition-colors text-sm font-body disabled:opacity-40">
        →
      </button>
      {#if isLoading}
        <span class="text-xs text-bone-muted font-body animate-pulse">Laden...</span>
      {/if}
    </div>
    <span class="font-display text-subheading text-bone">
      {formatDisplayDate(weekDays[0].date)} – {formatDisplayDate(weekDays[6].date)}
    </span>
  </div>

  <!-- Calendar grid -->
  <div class="grid grid-cols-7 gap-2">
    {#each weekDays as { date, dayName, appointments: dayAppointments }}
      <div class="min-h-[400px] bg-surface-base border border-white/5 flex flex-col">
        <!-- Day header -->
        <div class="p-3 border-b border-white/5 text-center {isToday(date) ? 'bg-gold-500/10' : ''}">
          <div class="font-body text-label text-bone-muted uppercase">{dayName}</div>
          <div class="font-display text-body text-bone mt-1">{date.getDate()}</div>
        </div>

        <!-- Appointments -->
        <div class="flex-1 p-2 space-y-2 overflow-y-auto">
          {#if dayAppointments.length === 0}
            <div class="text-center py-8 text-bone-muted/40 text-xs font-body">Geen afspraken</div>
          {:else}
            {#each dayAppointments as appt}
              <button
                onclick={() => onSelect(appt)}
                class="w-full text-left p-2 border-l-2 {statusColors[appt.status] || 'border-l-bone-muted'} {statusBg[appt.status] || 'bg-surface-low'} hover:brightness-110 transition-all"
              >
                <div class="font-body text-label text-gold-500">{appt.timeSlot}</div>
                <div class="font-body text-sm text-bone truncate">{appt.clientName}</div>
                <div class="font-body text-xs text-bone-muted truncate">{appt.serviceName}</div>
                {#if appt.barberName}
                  <div class="font-body text-xs text-gold-300/60 mt-1">{appt.barberName}</div>
                {/if}
              </button>
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
