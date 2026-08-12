<script lang="ts">
  import { onMount } from 'svelte';
  import WeekCalendar from '$lib/components/admin/WeekCalendar.svelte';
  import { toast } from '$lib/stores/toast';

  let { data } = $props();

  // ── Accumulated appointment data ──
  let allAppointments = $state<any[]>([]);
  let loadedRanges = $state<{ start: string; end: string }[]>([]);
  let isLoadingCalendar = $state(false);
  let isLoadingMore = $state(false);
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  let appointmentIds = $state(new Set<number>());
  let initialDataLoaded = $state(false);

  // ── Infinite scroll pagination ──
  let nextCursor = $state<string | null>(null);
  let hasMore = $state(false);
  let loadMoreRef = $state<HTMLDivElement | null>(null);

  // Use refs to avoid reactive dependencies in observer callback
  let hasMoreRef = $state({ value: false });
  let isLoadingMoreRef = $state({ value: false });

  // Keep refs in sync
  $effect(() => {
    hasMoreRef.value = hasMore;
  });

  $effect(() => {
    isLoadingMoreRef.value = isLoadingMore;
  });

  $effect(() => {
    if (!initialDataLoaded) {
      allAppointments = data.appointments;
      appointmentIds = new Set<number>(data.appointments.map((a: any) => a.id));
      nextCursor = data.nextCursor || null;
      hasMore = data.hasMore || false;
      initialDataLoaded = true;
    }
  });

  // ── Infinite scroll observer setup ──
  // Re-setup observer when switching to list view
  $effect(() => {
    let observer: IntersectionObserver | null = null;

    if (viewMode === 'list' && loadMoreRef) {
      observer = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting && hasMoreRef.value && !isLoadingMoreRef.value) {
            loadMore();
          }
        },
        { rootMargin: '200px' }
      );

      observer.observe(loadMoreRef);
    }

    return () => observer?.disconnect();
  });

  // ── View state ──
  let viewMode = $state<'list' | 'calendar'>('calendar');
  let showNewAppointmentForm = $state(false);

  // ── Filters ──
  let filterStatus = $state('all');
  let filterBarber = $state('all');
  let searchQuery = $state('');

  // ── Form state ──
  let selectedServiceId = $state<number | null>(null);
  let selectedStaffId = $state<number | null>(null);
  let appointmentDate = $state('');
  let appointmentTime = $state('');
  let clientName = $state('');
  let clientEmail = $state('');
  let clientPhone = $state('');
  let notes = $state('');
  let selectedAddOnIds = $state<number[]>([]);
  let isSubmitting = $state(false);
  let availableSlots = $state<{ time: string; available: boolean }[]>([]);
  let loadingSlots = $state(false);

  // ── Services gesplitst: behandelingen vs extras ──
  // Extras zijn services met category === 'extra' en worden apart gekozen,
  // niet als hoofdbehandeling.
  let treatmentServices = $derived(
    (data.services as any[]).filter((s) => s.category !== 'extra')
  );
  let extraServices = $derived(
    (data.services as any[]).filter((s) => s.category === 'extra')
  );

  let selectedAddOnTotalPrice = $derived(
    selectedAddOnIds.reduce((sum, id) => {
      const ex = extraServices.find((s) => s.id === id);
      return sum + (ex ? Number(ex.price) : 0);
    }, 0)
  );
  let selectedAddOnTotalDuration = $derived(
    selectedAddOnIds.reduce((sum, id) => {
      const ex = extraServices.find((s) => s.id === id);
      return sum + (ex ? ex.duration : 0);
    }, 0)
  );

  function toggleAddOn(id: number) {
    if (selectedAddOnIds.includes(id)) {
      selectedAddOnIds = selectedAddOnIds.filter((x) => x !== id);
    } else {
      selectedAddOnIds = [...selectedAddOnIds, id];
    }
  }

  // ── Detail modal ──
  let selectedAppointment = $state<any | null>(null);
  let showDetailModal = $state(false);

  // ── Tooltip state ──
  let tooltipText = $state('');
  let tooltipVisible = $state(false);
  let tooltipPosition = $state({ x: 0, y: 0 });

  function showTooltip(e: MouseEvent, text: string) {
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    tooltipPosition = {
      x: rect.left + rect.width / 2,
      y: rect.top - 8
    };
    tooltipText = text;
    tooltipVisible = true;
  }

  function hideTooltip() {
    tooltipVisible = false;
  }

  const statusLabels: Record<string, string> = {
    confirmed: 'Bevestigd',
    completed: 'Afgerond',
    cancelled: 'Geannuleerd',
    no_show: 'Niet Verschenen'
  };

  const statusColors: Record<string, string> = {
    confirmed: 'text-gold-500',
    completed: 'text-green-500',
    cancelled: 'text-red-400',
    no_show: 'text-bone-muted'
  };

  const statusBadgeBg: Record<string, string> = {
    confirmed: 'bg-gold-500/10 border-gold-500/20',
    completed: 'bg-green-500/10 border-green-500/20',
    cancelled: 'bg-red-500/10 border-red-500/20',
    no_show: 'bg-bone-muted/10 border-bone-muted/20'
  };

  // ── Derived filtered list ──
  let filteredAppointments = $derived(
    allAppointments.filter((a: any) => {
      if (filterStatus !== 'all' && a.status !== filterStatus) return false;
      if (filterBarber !== 'all' && String(a.staffId) !== filterBarber) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const hay = [
          a.clientName,
          a.clientEmail,
          a.serviceName,
          a.barberName,
          a.timeSlot
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    })
  );

  // ── Stats ──
  // ── Grouped list for card view ──
  let groupedAppointments = $derived((() => {
    const groups = new Map<string, any[]>();
    const sorted = [...filteredAppointments].sort((a: any, b: any) => {
      const da = `${a.date}T${a.timeSlot}`;
      const db = `${b.date}T${b.timeSlot}`;
      return da.localeCompare(db);
    });

    for (const appt of sorted) {
      const key = formatDate(appt.date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(appt);
    }

    const today = formatDate(new Date());
    const tomorrow = formatDate(new Date(Date.now() + 86400000));

    const result: [string, any[]][] = [];
    for (const [key, list] of groups) {
      let label = key;
      if (key === today) label = 'Vandaag';
      else if (key === tomorrow) label = 'Morgen';
      result.push([label, list]);
    }
    return result;
  })());

  const todayKey = formatDateKey(new Date());
  let todayCount = $derived(allAppointments.filter((a: any) => a.date === todayKey).length);
  let confirmedCount = $derived(allAppointments.filter((a: any) => a.status === 'confirmed').length);

  // ── Data loading ──
  function formatDateKey(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }

  function isRangeLoaded(start: string, end: string): boolean {
    // Check if this exact range or a superset range is already loaded
    return loadedRanges.some(r => r.start <= start && r.end >= end);
  }

  function mergeRanges(ranges: { start: string; end: string }[]): { start: string; end: string }[] {
    if (ranges.length === 0) return [];
    const sorted = ranges.sort((a, b) => a.start.localeCompare(b.start));
    const merged: { start: string; end: string }[] = [sorted[0]];
    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const current = sorted[i];
      // Merge if ranges overlap or are adjacent
      if (current.start <= last.end) {
        last.end = current.end > last.end ? current.end : last.end;
      } else {
        merged.push(current);
      }
    }
    return merged;
  }

  async function loadRange(start: string, end: string) {
    if (isRangeLoaded(start, end)) return;
    isLoadingCalendar = true;
    try {
      const res = await fetch(`/admin/api/appointments?startDate=${start}&endDate=${end}`);
      if (res.ok) {
        const payload = await res.json();
        if (payload.appointments) {
          const newOnes = payload.appointments.filter((a: any) => !appointmentIds.has(a.id));
          if (newOnes.length > 0) {
            allAppointments = [...allAppointments, ...newOnes];
            newOnes.forEach((a: any) => appointmentIds.add(a.id));
          }
          // Merge overlapping ranges
          loadedRanges = mergeRanges([...loadedRanges, { start, end }]);
          // Update pagination state
          nextCursor = payload.nextCursor || null;
          hasMore = payload.hasMore || false;
        }
      }
    } catch (e) {
      console.error('Fout bij laden afspraken:', e);
    }
    isLoadingCalendar = false;
  }

  async function loadMore() {
    if (!hasMore || isLoadingMore || !nextCursor) return;
    isLoadingMore = true;
    try {
      const res = await fetch(`/admin/api/appointments?cursor=${nextCursor}`);
      if (res.ok) {
        const payload = await res.json();
        if (payload.appointments) {
          const newOnes = payload.appointments.filter((a: any) => !appointmentIds.has(a.id));
          if (newOnes.length > 0) {
            allAppointments = [...allAppointments, ...newOnes];
            newOnes.forEach((a: any) => appointmentIds.add(a.id));
          }
          nextCursor = payload.nextCursor || null;
          hasMore = payload.hasMore || false;
        }
      }
    } catch (e) {
      console.error('Fout bij laden meer afspraken:', e);
    }
    isLoadingMore = false;
  }

  let pendingWeekLoad: { start: string; end: string } | null = null;
  let weekLoadTimeout: ReturnType<typeof setTimeout> | null = null;

  async function handleWeekChange(start: string, end: string) {
    // Debounce rapid week changes
    if (weekLoadTimeout) clearTimeout(weekLoadTimeout);
    pendingWeekLoad = { start, end };
    weekLoadTimeout = setTimeout(async () => {
      if (pendingWeekLoad) {
        await loadRange(pendingWeekLoad.start, pendingWeekLoad.end);
        pendingWeekLoad = null;
      }
    }, 150);
  }

  // ── Actions ──
  async function updateStatus(id: number, status: string) {
    const res = await fetch('/admin/appointments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status })
    });
    if (!res.ok) {
      toast.error('Status kon niet worden bijgewerkt');
      return;
    }
    // Lokale update — geen reload of invalidate.
    allAppointments = allAppointments.map((a: any) =>
      a.id === id ? { ...a, status } : a
    );
    if (selectedAppointment?.id === id) {
      selectedAppointment = { ...selectedAppointment, status };
    }
    const label = statusLabels[status] || status;
    toast.success(`Afspraak gemarkeerd als ${label.toLowerCase()}`);
  }

  function toggleForm() {
    showNewAppointmentForm = !showNewAppointmentForm;
    if (showNewAppointmentForm) {
      selectedServiceId = null;
      selectedStaffId = null;
      appointmentDate = '';
      appointmentTime = '';
      clientName = '';
      clientEmail = '';
      clientPhone = '';
      notes = '';
      selectedAddOnIds = [];
      availableSlots = [];
      lastFetchKey = '';
      isSubmitting = false;
    }
  }

  function openDetail(appt: any) {
    selectedAppointment = appt;
    showDetailModal = true;
  }

  function closeDetail() {
    showDetailModal = false;
    selectedAppointment = null;
  }

  // ── Availability ──
  // Refetch when datum, behandeling of barber wijzigt zodat het tijdslot-grid
  // de duration van de gekozen behandeling meeneemt. Zonder dit: 45 min
  // service toont nog steeds 30 min grid → slot past niet → error bij submit.
  let lastFetchKey = $state('');
  $effect(() => {
    if (!appointmentDate) {
      availableSlots = [];
      return;
    }
    const key = `${appointmentDate}|${selectedServiceId ?? ''}|${selectedStaffId ?? ''}`;
    if (key === lastFetchKey) return;
    lastFetchKey = key;
    fetchAvailability();
  });

  async function fetchAvailability() {
    if (!appointmentDate) {
      availableSlots = [];
      return;
    }
    loadingSlots = true;
    try {
      const staffIdParam = selectedStaffId !== null ? `&staffId=${selectedStaffId}` : '&allBarbers=true';
      const serviceIdParam = selectedServiceId !== null ? `&serviceId=${selectedServiceId}` : '';
      const res = await fetch(`/api/availability?date=${appointmentDate}${staffIdParam}${serviceIdParam}`);
      if (res.ok) {
        const slotData = await res.json();
        availableSlots = slotData.slots || [];
      } else {
        availableSlots = [];
      }
    } catch {
      availableSlots = [];
    }
    loadingSlots = false;
  }

  function selectTime(time: string) {
    appointmentTime = time;
  }

  async function createAppointment(event: Event) {
    event.preventDefault();
    isSubmitting = true;

    if (!selectedServiceId) {
      toast.error('Selecteer een behandeling');
      isSubmitting = false;
      return;
    }
    if (!appointmentDate) {
      toast.error('Selecteer een datum');
      isSubmitting = false;
      return;
    }
    if (!appointmentTime) {
      toast.error('Selecteer een tijdstip');
      isSubmitting = false;
      return;
    }
    if (!clientName.trim()) {
      toast.error('Voer een klantnaam in');
      isSubmitting = false;
      return;
    }
    if (clientPhone.trim() && !/^[\d\s\-+()]{6,20}$/.test(clientPhone)) {
      toast.error('Voer een geldig telefoonnummer in (bijv. 06 12345678)');
      isSubmitting = false;
      return;
    }

    try {
      const response = await fetch('/admin/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          staffId: selectedStaffId || undefined,
          date: appointmentDate,
          timeSlot: appointmentTime,
          clientName,
          clientEmail: clientEmail || undefined,
          clientPhone: clientPhone || undefined,
          notes: notes || undefined,
          addOnIds: selectedAddOnIds.length > 0 ? selectedAddOnIds : undefined
        })
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.issues && result.issues.length > 0) {
          toast.error(result.issues.map((i: any) => i.message).join('. '));
        } else {
          toast.error(result.error || 'Er is iets misgegaan');
        }
        isSubmitting = false;
        return;
      }
      // Nieuwe afspraak lokaal toevoegen — geen reload of invalidate.
      if (result.appointment) {
        const appt = result.appointment;
        if (!appointmentIds.has(appt.id)) {
          allAppointments = [appt, ...allAppointments];
          appointmentIds.add(appt.id);
        }
      }
      toast.success('Afspraak succesvol aangemaakt');
      isSubmitting = false;
      toggleForm();
    } catch {
      toast.error('Er is iets misgegaan bij het aanmaken van de afspraak');
      isSubmitting = false;
    }
  }

  function formatSlotTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  function formatDate(dateValue: any): string {
    if (!dateValue) return '';
    if (typeof dateValue === 'string') {
      // Converteer YYYY-MM-DD naar DD-MM-YYYY
      const [year, month, day] = dateValue.split('-');
      return `${day}-${month}-${year}`;
    }
    if (dateValue instanceof Date) {
      const day = String(dateValue.getDate()).padStart(2, '0');
      const month = String(dateValue.getMonth() + 1).padStart(2, '0');
      const year = dateValue.getFullYear();
      return `${day}-${month}-${year}`;
    }
    return String(dateValue);
  }
</script>

<svelte:head>
  <title>Afspraken — Cyrus Beheer</title>
</svelte:head>

<!-- Header -->
<div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
  <div>
    <h1 class="font-display text-heading text-bone">Afspraken</h1>
    <p class="text-bone-muted font-body text-sm mt-1">
      {data.appointments.length} totaal · {todayCount} vandaag · {confirmedCount} bevestigd
    </p>
  </div>

  <div class="flex items-center gap-3">
    <!-- View toggle -->
    <div class="flex bg-surface-base border border-white/10 overflow-hidden">
      <button
        onclick={() => viewMode = 'calendar'}
        class="px-4 py-2 text-sm font-body transition-colors {viewMode === 'calendar' ? 'bg-gold-500 text-surface' : 'text-bone hover:text-bone'}"
      >Kalender</button>
      <button
        onclick={() => viewMode = 'list'}
        class="px-4 py-2 text-sm font-body transition-colors {viewMode === 'list' ? 'bg-gold-500 text-surface' : 'text-bone hover:text-bone'}"
      >Lijst</button>
    </div>

    <button
      onclick={toggleForm}
      class="px-4 py-2 bg-gold-500 text-surface text-sm font-body hover:bg-gold-600 transition-colors"
    >
      {showNewAppointmentForm ? 'Annuleren' : '+ Nieuwe Afspraak'}
    </button>
  </div>
</div>

<!-- New appointment form -->
{#if showNewAppointmentForm}
  <div class="bg-surface-base border border-white/5 p-6 mb-8">
    <h2 class="font-display text-subheading text-bone mb-4">Nieuwe Afspraak Inplannen</h2>

    <form onsubmit={createAppointment} class="grid md:grid-cols-2 gap-4">
      <div>
        <label for="appointment-service" class="block text-xs font-body text-bone-muted mb-2">Behandeling *</label>
        <select
          id="appointment-service"
          bind:value={selectedServiceId}
          class="w-full bg-surface-low border border-white/5 px-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500"
          required
        >
          <option value="">Selecteer behandeling</option>
          {#each treatmentServices as service}
            <option value={service.id}>{service.name} – €{service.price} ({service.duration} min)</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="appointment-staff" class="block text-xs font-body text-bone-muted mb-2">Barber (optioneel)</label>
        <select
          id="appointment-staff"
          bind:value={selectedStaffId}
          class="w-full bg-surface-low border border-white/5 px-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500"
        >
          <option value="">Geen voorkeur</option>
          {#each data.staff as staffMember}
            <option value={staffMember.id}>{staffMember.displayName} ({staffMember.role})</option>
          {/each}
        </select>
      </div>

      <div>
        <label for="appointment-date" class="block text-xs font-body text-bone-muted mb-2">Datum *</label>
        <input
          id="appointment-date"
          type="date"
          bind:value={appointmentDate}
          min={new Date().toISOString().split('T')[0]}
          class="w-full bg-surface-low border border-white/5 px-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500"
          required
        />
      </div>

      <div>
        <label for="appointment-time" class="block text-xs font-body text-bone-muted mb-2">Tijdstip *</label>
        {#if loadingSlots}
          <div class="flex items-center justify-center h-[42px] bg-surface-low border border-white/5 text-sm font-body text-bone-muted">Beschikbaarheid laden...</div>
        {:else if availableSlots.length === 0}
          <div class="flex items-center justify-center h-[42px] bg-surface-low border border-white/5 text-sm font-body text-bone-muted">
            {appointmentDate ? 'Geen tijden beschikbaar' : 'Selecteer eerst een datum'}
          </div>
        {:else}
          <select
            id="appointment-time"
            bind:value={appointmentTime}
            class="w-full bg-surface-low border border-white/5 px-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500"
            required
          >
            <option value="">Selecteer tijdstip</option>
            {#each availableSlots as slot}
              {#if slot.available}
                <option value={slot.time}>{formatSlotTime(slot.time)}</option>
              {/if}
            {/each}
          </select>
        {/if}
      </div>

      <div>
        <label for="appointment-client-name" class="block text-xs font-body text-bone-muted mb-2">Naam Klant *</label>
        <input id="appointment-client-name" type="text" bind:value={clientName} placeholder="Voornaam Achternaam"
          class="w-full bg-surface-low border border-white/5 px-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500" required />
      </div>

      <div>
        <label for="appointment-client-phone" class="block text-xs font-body text-bone-muted mb-2">Telefoonnummer</label>
        <input id="appointment-client-phone" type="tel" bind:value={clientPhone} placeholder="06 12345678"
          pattern="[0-9\s\-+()]{6,20}"
          title="Voer een geldig telefoonnummer in (bijv. 06 12345678)"
          class="w-full bg-surface-low border border-white/5 px-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500" />
      </div>

      <div class="md:col-span-2">
        <label for="appointment-client-email" class="block text-xs font-body text-bone-muted mb-2">E-mail (optioneel)</label>
        <input id="appointment-client-email" type="email" bind:value={clientEmail} placeholder="klant@voorbeeld.nl"
          class="w-full bg-surface-low border border-white/5 px-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500" />
      </div>

      <div class="md:col-span-2">
        <label for="appointment-notes" class="block text-xs font-body text-bone-muted mb-2">Notities</label>
        <textarea id="appointment-notes" bind:value={notes} placeholder="Optionele notities..." rows="3"
          class="w-full bg-surface-low border border-white/5 px-3 py-2 text-sm font-body text-bone focus:outline-none focus:border-gold-500 resize-none"></textarea>
      </div>

      {#if extraServices.length > 0}
        <div class="md:col-span-2">
          <span class="block text-xs font-body text-bone-muted mb-2">Extra's (optioneel)</span>
          <p class="text-xs font-body text-bone-muted/60 mb-3">Meerdere extras tegelijk mogelijk. Worden opgeteld bij de behandeling.</p>
          <div class="grid sm:grid-cols-2 gap-2">
            {#each extraServices as addon}
              <label
                class="flex items-center gap-3 bg-surface-low border border-white/5 px-3 py-2 cursor-pointer hover:border-gold-500/30 transition-colors {selectedAddOnIds.includes(addon.id) ? 'border-gold-500/50 bg-gold-500/5' : ''}"
              >
                <input
                  type="checkbox"
                  checked={selectedAddOnIds.includes(addon.id)}
                  onchange={() => toggleAddOn(addon.id)}
                  class="accent-gold-500 w-4 h-4 shrink-0"
                />
                <span class="flex-1 text-sm font-body text-bone">{addon.name}</span>
                <span class="text-xs font-body text-bone-muted">+€{addon.price} · {addon.duration} min</span>
              </label>
            {/each}
          </div>
          {#if selectedAddOnIds.length > 0}
            <p class="text-xs font-body text-gold-500 mt-3">
              +€{selectedAddOnTotalPrice} · +{selectedAddOnTotalDuration} min
            </p>
          {/if}
        </div>
      {/if}

      <div class="md:col-span-2">
        <button type="submit" disabled={isSubmitting}
          class="px-4 py-2 bg-gold-500 text-surface text-sm font-body hover:bg-gold-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Afspraak aanmaken...' : 'Afspraak Inplannen'}
        </button>
      </div>
    </form>
  </div>
{/if}

<!-- Filters bar -->
<div class="flex flex-col md:flex-row gap-3 mb-6">
  <div class="flex gap-2 flex-wrap">
    {#each ['all', 'confirmed', 'completed', 'cancelled', 'no_show'] as status}
      <button
        onclick={() => filterStatus = status}
        class="px-3 py-1.5 text-xs font-body transition-colors border {filterStatus === status ? 'bg-gold-500 text-surface border-gold-500' : 'bg-surface-base text-bone-muted border-white/10 hover:text-bone'}"
      >
        {status === 'all' ? 'Alle' : statusLabels[status] || status}
      </button>
    {/each}
  </div>

  <div class="flex gap-3 ml-auto">
    <select
      bind:value={filterBarber}
      class="bg-surface-base border border-white/10 px-3 py-1.5 text-xs font-body text-bone focus:outline-none focus:border-gold-500"
    >
      <option value="all">Alle barbers</option>
      {#each data.staff as staffMember}
        <option value={String(staffMember.id)}>{staffMember.displayName}</option>
      {/each}
    </select>

    <input
      type="text"
      bind:value={searchQuery}
      placeholder="Zoek..."
      class="bg-surface-base border border-white/10 px-3 py-1.5 text-xs font-body text-bone focus:outline-none focus:border-gold-500 w-48 placeholder:text-bone-muted/50"
    />
  </div>
</div>

<!-- Content -->
{#if viewMode === 'calendar'}
  <WeekCalendar
    appointments={filteredAppointments}
    staff={data.staff}
    onSelect={openDetail}
    onStatusChange={updateStatus}
    onWeekChange={handleWeekChange}
    isLoading={isLoadingCalendar}
  />
{:else}
  <!-- Card List View -->
  {#if filteredAppointments.length === 0}
    <div class="bg-surface-base border border-white/5 p-16 text-center">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-low flex items-center justify-center">
        <svg class="w-7 h-7 text-bone-muted/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <p class="text-bone-muted font-body">Geen afspraken gevonden</p>
      <p class="text-bone-muted/60 text-sm font-body mt-1">Pas je filters aan of maak een nieuwe afspraak</p>
    </div>
  {:else}
    <div class="space-y-4">
      {#each groupedAppointments as [groupLabel, groupAppts]}
        <div>
          <!-- Day header -->
          <div class="flex items-center gap-3 mb-3">
            <span class="font-display text-subheading text-bone">{groupLabel}</span>
            <span class="px-2 py-0.5 bg-surface-base border border-white/10 text-xs font-body text-bone-muted">{groupAppts.length}</span>
            <div class="flex-1 h-px bg-white/5"></div>
          </div>

          <!-- Cards -->
          <div class="grid gap-2">
            {#each groupAppts as appt (appt.id)}
              <div
                class="group bg-surface-base border border-white/5 hover:border-gold-500/20 p-4 flex flex-col md:flex-row md:items-center gap-4 transition-all cursor-pointer"
                role="button"
                tabindex="0"
                onclick={() => openDetail(appt)}
                onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && openDetail(appt)}
              >
                <!-- Time column -->
                <div class="flex items-center gap-3 md:w-28 shrink-0">
                  <div class="w-10 h-10 bg-surface-low border border-white/5 flex items-center justify-center">
                    <span class="font-display text-sm text-gold-500">{appt.timeSlot.split(':')[0]}</span>
                  </div>
                  <div class="md:hidden">
                    <span class="font-body text-sm text-bone">{appt.timeSlot}</span>
                  </div>
                  <div class="hidden md:block">
                    <span class="font-body text-sm text-bone">{appt.timeSlot}</span>
                  </div>
                </div>

                <!-- Main info -->
                <div class="flex-1 min-w-0">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="font-body text-bone truncate">{appt.clientName}</span>
                    {#if appt.status === 'confirmed'}
                      <span class="w-1.5 h-1.5 rounded-full bg-gold-500"></span>
                    {:else if appt.status === 'completed'}
                      <span class="w-1.5 h-1.5 rounded-full bg-green-500"></span>
                    {:else if appt.status === 'cancelled'}
                      <span class="w-1.5 h-1.5 rounded-full bg-red-400"></span>
                    {/if}
                  </div>
                  <div class="flex items-center gap-3 text-xs font-body text-bone-muted flex-wrap">
                    <span class="flex items-center gap-1">
                      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                      </svg>
                      {appt.serviceName}
                    </span>
                    {#if appt.barberName}
                      <span class="flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {appt.barberName}
                      </span>
                    {/if}
                    {#if appt.clientPhone}
                      <span class="hidden sm:flex items-center gap-1">
                        <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                        {appt.clientPhone}
                      </span>
                    {/if}
                  </div>
                </div>

                <!-- Status + actions -->
                <div class="flex items-center gap-3 shrink-0">
                  <span class="px-2 py-1 text-xs font-body border {statusBadgeBg[appt.status] || 'bg-surface-low border-white/10'} {statusColors[appt.status] || 'text-bone-muted'}">
                    {statusLabels[appt.status] || appt.status}
                  </span>

                  <!-- Quick actions -->
                  {#if appt.status === 'confirmed'}
                    <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onclick={(e) => { e.stopPropagation(); updateStatus(appt.id, 'completed'); }}
                        onmouseenter={(e) => showTooltip(e, 'Markeer als afgerond')}
                        onmouseleave={hideTooltip}
                        class="w-8 h-8 flex items-center justify-center bg-green-500/10 border border-green-500/20 text-green-500 hover:bg-green-500 hover:text-surface transition-colors"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                        </svg>
                      </button>
                      <button
                        onclick={(e) => { e.stopPropagation(); updateStatus(appt.id, 'no_show'); }}
                        onmouseenter={(e) => showTooltip(e, 'Niet verschenen')}
                        onmouseleave={hideTooltip}
                        class="w-8 h-8 flex items-center justify-center bg-bone-muted/10 border border-bone-muted/20 text-bone-muted hover:bg-bone-muted/20 transition-colors"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 13h3v3h-3zm0-8h3v3h-3zm-6 0h3v3H7zm0 5h3v3H7zm0 5h3v3H7zm6 0h3v3h-3z" />
                        </svg>
                      </button>
                      <button
                        onclick={(e) => { e.stopPropagation(); updateStatus(appt.id, 'cancelled'); }}
                        onmouseenter={(e) => showTooltip(e, 'Annuleer afspraak')}
                        onmouseleave={hideTooltip}
                        class="w-8 h-8 flex items-center justify-center bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-surface transition-colors"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/each}
          </div>
        </div>
      {/each}
    </div>

    <!-- Infinite scroll sentinel -->
    <div bind:this={loadMoreRef} class="h-12 flex items-center justify-center">
      {#if isLoadingMore}
        <span class="text-bone-muted text-sm font-body animate-pulse">Meer afspraken laden...</span>
      {:else if hasMore}
        <span class="text-bone-muted/40 text-xs font-body">Scroll voor meer</span>
      {/if}
    </div>
  {/if}
{/if}

<!-- Detail modal -->
{#if showDetailModal && selectedAppointment}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center bg-surface/80 backdrop-blur-sm">
    <div class="bg-surface-base border border-white/10 p-8 max-w-md w-full mx-4">
      <div class="flex justify-between items-start mb-6">
        <h2 class="font-display text-subheading text-bone">Afspraak Details</h2>
        <button onclick={closeDetail} onmouseenter={(e) => showTooltip(e, 'Sluiten')} onmouseleave={hideTooltip} class="text-bone-muted hover:text-bone text-xl">×</button>
      </div>

      <div class="space-y-4">
        <div class="flex justify-between">
          <span class="font-body text-label text-bone-muted">Status</span>
          <span class="inline-block px-2 py-0.5 text-xs font-body border {statusBadgeBg[selectedAppointment.status] || 'bg-surface-low border-white/10'} {statusColors[selectedAppointment.status] || 'text-bone-muted'}">
            {statusLabels[selectedAppointment.status] || selectedAppointment.status}
          </span>
        </div>
        <div class="flex justify-between">
          <span class="font-body text-label text-bone-muted">Datum</span>
          <span class="font-body text-bone">{formatDate(selectedAppointment.date)} {selectedAppointment.timeSlot}</span>
        </div>
        <div class="flex justify-between">
          <span class="font-body text-label text-bone-muted">Klant</span>
          <span class="font-body text-bone">{selectedAppointment.clientName}</span>
        </div>
        {#if selectedAppointment.clientEmail}
          <div class="flex justify-between">
            <span class="font-body text-label text-bone-muted">E-mail</span>
            <span class="font-body text-bone">{selectedAppointment.clientEmail}</span>
          </div>
        {/if}
        {#if selectedAppointment.clientPhone}
          <div class="flex justify-between">
            <span class="font-body text-label text-bone-muted">Telefoon</span>
            <span class="font-body text-bone">{selectedAppointment.clientPhone}</span>
          </div>
        {/if}
        <div class="flex justify-between">
          <span class="font-body text-label text-bone-muted">Service</span>
          <span class="font-body text-bone">{selectedAppointment.serviceName}</span>
        </div>
        <div class="flex justify-between">
          <span class="font-body text-label text-bone-muted">Barber</span>
          <span class="font-body text-bone">{selectedAppointment.barberName || 'Geen voorkeur'}</span>
        </div>
      </div>

      {#if selectedAppointment.status === 'confirmed'}
        <div class="flex gap-2 mt-8 pt-6 border-t border-white/10">
          <button onclick={() => { updateStatus(selectedAppointment.id, 'completed'); closeDetail(); }} class="flex-1 px-3 py-2 bg-green-500/10 border border-green-500/20 text-green-500 text-xs font-body hover:bg-green-500/20 transition-colors">Afgerond</button>
          <button onclick={() => { updateStatus(selectedAppointment.id, 'cancelled'); closeDetail(); }} class="flex-1 px-3 py-2 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-body hover:bg-red-500/20 transition-colors">Annuleren</button>
          <button onclick={() => { updateStatus(selectedAppointment.id, 'no_show'); closeDetail(); }} class="flex-1 px-3 py-2 bg-bone-muted/10 border border-bone-muted/20 text-bone-muted text-xs font-body hover:bg-bone-muted/20 transition-colors">Niet Verschenen</button>
        </div>
      {/if}
    </div>
  </div>
{/if}

<!-- Custom Tooltip -->
{#if tooltipVisible}
  <div
    class="fixed px-3 py-1.5 bg-surface-base text-bone text-xs font-body whitespace-nowrap z-[100] pointer-events-none border border-white/10 shadow-xl"
    style="left: {tooltipPosition.x}px; top: {tooltipPosition.y}px; transform: translate(-50%, -100%);"
  >
    {tooltipText}
  </div>
{/if}
