<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  import { Scissors, Star } from 'lucide-svelte';
  import StepIndicators from './StepIndicators.svelte';
  import ServiceItem from './ServiceItem.svelte';
  import BarberSelection from './BarberSelection.svelte';
  import Calendar from './Calendar.svelte';
  import TimeSlots from './TimeSlots.svelte';
  import FieldGroup from './FieldGroup.svelte';
  import BookingSummary from './BookingSummary.svelte';
  import BookingSuccess from './BookingSuccess.svelte';

  interface ServiceData {
    id: number;
    name: string;
    price: string;
    duration: number;
    description: string | null;
    isSignature: boolean;
    category?: string;
  }

  interface Barber {
    id: number;
    displayName: string;
    email: string;
  }

  let { services }: { services: ServiceData[] | undefined } = $props();

  // Default services matching original HTML when none provided
  const defaultServices: ServiceData[] = [
    { id: 1, name: 'Haarknippen', price: '35', duration: 45, description: 'Een vakkundige snit op maat. Schaarwerk, tondeuse en styling. Inclusief wassen en föhnen.', isSignature: false, category: 'hair' },
    { id: 2, name: 'Fade', price: '45', duration: 60, description: 'Vloeiende overgang van huid naar haar. Verschillende fademogelijkheden met scheermesafwerking.', isSignature: false, category: 'hair' },
    { id: 3, name: 'De Klassieke', price: '45', duration: 50, description: 'Gerespecteerd klassiek werk. Hals netjes afgewerkt met warme handdoek. De standaard.', isSignature: false, category: 'hair' },
    { id: 4, name: 'Baardtrim &amp; Vorm', price: '25', duration: 30, description: 'Vakkundig trimmen en vormen naar je gezichtsstructuur. Afgewerkt met premium baardolie.', isSignature: false, category: 'beard' },
    { id: 5, name: 'Warme Scheerbeurt', price: '40', duration: 45, description: 'Klassieke scheerervaring. Stoom, zeep en scheermeswerk met de nodige finesse.', isSignature: false, category: 'beard' },
    { id: 6, name: 'The Works', price: '75', duration: 90, description: 'Het volledige Cyrus-programma. Premium haarknippen of fade, baardwerk en gezichtsmassage', isSignature: true, category: 'signature' }
  ];

  const servicesList = $derived(services && services.length > 0 ? services : defaultServices);

  // Group services by category
  const signatureServices = $derived(servicesList.filter(s => s.isSignature));
  const hairServices = $derived(servicesList.filter(s => s.category === 'hair' && !s.isSignature));
  const beardServices = $derived(servicesList.filter(s => s.category === 'beard' && !s.isSignature));

  let currentStep = $state(1);
  let selectedServiceId = $state<number | null>(null);
  let selectedService = $state('');
  let selectedPrice = $state(0);
  let selectedStaffId = $state<number | null>(null);
  let selectedBarberName = $state('');
  let selectedDate = $state<Date | null>(null);
  let selectedTime = $state('');
  let calMonth = $state(new Date().getMonth());
  let calYear = $state(new Date().getFullYear());
  let clientName = $state('');
  let clientEmail = $state('');
  let clientPhone = $state('');
  let clientNotes = $state('');
  let showSuccess = $state(false);
  let submitting = $state(false);
  let formError = $state<string | null>(null);
  let availableSlots = $state<{ time: string; available: boolean }[]>([]);
  let loadingSlots = $state(false);
  let barbers = $state<Barber[]>([]);
  let loadingBarbers = $state(false);

  // Fetch barbers on mount
  $effect(() => {
    fetchBarbers();
  });

  async function fetchBarbers() {
    loadingBarbers = true;
    try {
      const res = await fetch('/api/barbers');
      if (res.ok) {
        const data = await res.json();
        barbers = data.barbers || [];
      }
    } catch {
      barbers = [];
    }
    loadingBarbers = false;
  }

  let summaryService = $derived(selectedService || '─');
  let summaryTotal = $derived(selectedPrice ? `€${selectedPrice}` : '€0');
  let summaryDate = $derived(
    selectedDate
      ? selectedDate.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric', year: 'numeric' })
      : '─'
  );
  let summaryTime = $derived(selectedTime || '─');
  let summaryBarber = $derived(selectedBarberName || '─');
  let canConfirm = $derived(!!(selectedServiceId && selectedDate && selectedTime && clientName && clientEmail));

  // Fetch availability when date changes (regardless of staff selection)
  $effect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  });

  async function fetchAvailability(date: Date) {
    loadingSlots = true;
    // Format date as YYYY-MM-DD using local date, not UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    try {
      // When no barber selected (no preference), use allBarbers=true to combine availability
      const staffIdParam = selectedStaffId !== null ? `&staffId=${selectedStaffId}` : '&allBarbers=true';
      const res = await fetch(`/api/availability?date=${dateStr}${staffIdParam}`);
      if (res.ok) {
        const data = await res.json();
        availableSlots = data.slots || [];
      }
    } catch {
      availableSlots = [];
    }
    loadingSlots = false;
  }

  function selectService(id: number, name: string, price: number) {
    selectedServiceId = id;
    selectedService = name;
    selectedPrice = price;
  }

  function selectBarber(id: number | null) {
    selectedStaffId = id;
    if (id === null) {
      selectedBarberName = 'Geen Voorkeur';
    } else {
      const barber = barbers.find(b => b.id === id);
      selectedBarberName = barber?.displayName || '';
    }
    // Reset date/time/slots when changing barber to force re-fetch of availability
    selectedDate = null;
    selectedTime = '';
    availableSlots = [];
  }

  function selectTime(time: string) {
    selectedTime = time;
  }

  function changeMonth(dir: number) {
    calMonth += dir;
    if (calMonth > 11) { calMonth = 0; calYear++; }
    if (calMonth < 0) { calMonth = 11; calYear--; }
  }

  function selectCalendarDay(day: { disabled?: boolean; empty?: boolean; day?: number }) {
    if (day.disabled || day.empty) return;
    if (day.day !== undefined) {
      selectedDate = new Date(calYear, calMonth, day.day);
    }
  }

  function nextStep() {
    if (currentStep === 1 && !selectedService) return;
    // Step 2: allow proceeding with no preference (selectedStaffId === null is valid)
    if (currentStep === 3 && (!selectedDate || !selectedTime)) return;
    if (currentStep < 4) currentStep++;
  }

  function prevStep() {
    if (currentStep > 1) currentStep--;
  }

  async function submitBooking(e?: Event) {
    if (e) e.preventDefault();
    await confirmBooking();
  }

  async function confirmBooking() {
    if (!canConfirm || submitting) return;
    formError = null;
    submitting = true;

    // Client-side validatie
    if (!clientName.trim()) {
      formError = 'Voer je volledige naam in';
      submitting = false;
      return;
    }
    if (!clientEmail.trim()) {
      formError = 'Voer je e-mailadres in';
      submitting = false;
      return;
    }
    if (clientPhone.trim() && !/^[\d\s\-+()]{6,20}$/.test(clientPhone)) {
      formError = 'Voer een geldig telefoonnummer in (bijv. 06 12345678)';
      submitting = false;
      return;
    }

    // Format date as YYYY-MM-DD using local date, not UTC
    const date = selectedDate!;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    // When no barber preference, pick from barbers who actually have availability at the selected time
    let finalStaffId = selectedStaffId;
    if (finalStaffId === null && barbers.length > 0) {
      // Find which barbers have the selected time available
      const availableBarbers: number[] = [];
      
      for (const barber of barbers) {
        try {
          const res = await fetch(`/api/availability?date=${dateStr}&staffId=${barber.id}`);
          if (res.ok) {
            const data = await res.json();
            const hasSlot = data.slots?.some((s: { time: string; available: boolean }) => 
              s.time === selectedTime && s.available
            );
            if (hasSlot) {
              availableBarbers.push(barber.id);
            }
          }
        } catch {
          // Skip this barber if API call fails
        }
      }

      // Pick a random barber from those available
      if (availableBarbers.length > 0) {
        const randomIndex = Math.floor(Math.random() * availableBarbers.length);
        finalStaffId = availableBarbers[randomIndex];
      }
    }

    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          staffId: finalStaffId || undefined,
          date: dateStr,
          timeSlot: selectedTime,
          clientName,
          clientEmail,
          clientPhone,
          notes: clientNotes || undefined
        })
      });

      if (res.ok) {
        showSuccess = true;
      } else if (res.status === 409) {
        formError = 'Dit tijdvak was zojuist geboekt. Selecteer een ander moment.';
        selectedTime = '';
        fetchAvailability(selectedDate!);
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.issues && data.issues.length > 0) {
          formError = data.issues.map((i: any) => i.message).join('. ');
        } else {
          formError = data.error || 'Boeking mislukt. Probeer het opnieuw.';
        }
      }
    } catch {
      formError = 'Netwerkfout. Controleer je verbinding en probeer opnieuw.';
    }
    submitting = false;
  }

  function closeSuccess() {
    showSuccess = false;
    currentStep = 1;
    selectedServiceId = null;
    selectedService = '';
    selectedPrice = 0;
    selectedStaffId = null;
    selectedBarberName = '';
    selectedDate = null;
    selectedTime = '';
    clientName = '';
    clientEmail = '';
    clientPhone = '';
    clientNotes = '';
  }

  function formatSlotTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }
</script>

<section id="booking" class="py-section bg-surface-low">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8">
    <header class="mb-12 md:mb-16">
      <span use:reveal class="font-body text-label text-gold-500 block mb-4">MAAK JE AFSPRAAK</span>
      <h1 use:reveal={{ delay: 1 }} class="font-display text-heading text-gold-300 mb-4">Tijd voor een nieuwe look</h1>
      <p use:reveal={{ delay: 2 }} class="font-body text-body-lg text-bone-warm max-w-xl" style="font-size: 1.125rem; line-height: 1.7; letter-spacing: 0.01em;">
        Stap voor stap naar je volgende Cyrus-ervaring. Kies je service, selecteer datum en moment, en we zien je snel.
      </p>
    </header>

    <StepIndicators currentStep={currentStep} totalSteps={4} />

    <div class="grid lg:grid-cols-12 gap-12 lg:gap-16">
      <div class="lg:col-span-8">
        <!-- Step 1: Service Selection -->
        {#if currentStep === 1}
          <div class="booking-step" style="animation: fadeStep 0.5s ease-out">
            <h3 use:reveal class="font-display text-subheading text-bone uppercase tracking-tight mb-8">Kies Behandeling</h3>
            <div class="space-y-12">
              <!-- Hair Services -->
              {#if hairServices.length > 0}
                <div>
                  <h4 use:reveal class="font-body text-label text-bone-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <span class="h-px bg-bone-muted/20 flex-grow"></span>
                    <span>Haarwerk</span>
                    <span class="h-px bg-bone-muted/20 flex-grow"></span>
                  </h4>
                  <div class="space-y-2">
                    {#each hairServices as svc, i}
                      <ServiceItem
                        name={svc.name}
                        price={Number(svc.price)}
                        description={svc.description || undefined}
                        selected={selectedService === svc.name}
                        signature={svc.isSignature}
                        revealOpts={{ delay: i + 1 }}
                        onclick={() => selectService(svc.id, svc.name, Number(svc.price))}
                      />
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Beard Services -->
              {#if beardServices.length > 0}
                <div>
                  <h4 use:reveal class="font-body text-label text-bone-muted uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
                    <span class="h-px bg-bone-muted/20 flex-grow"></span>
                    <span>Baardverzorging</span>
                    <span class="h-px bg-bone-muted/20 flex-grow"></span>
                  </h4>
                  <div class="space-y-2">
                    {#each beardServices as svc, i}
                      <ServiceItem
                        name={svc.name}
                        price={Number(svc.price)}
                        description={svc.description || undefined}
                        selected={selectedService === svc.name}
                        signature={svc.isSignature}
                        revealOpts={{ delay: i + 1 }}
                        onclick={() => selectService(svc.id, svc.name, Number(svc.price))}
                      />
                    {/each}
                  </div>
                </div>
              {/if}

              <!-- Signature Services -->
              {#each signatureServices as svc}
                <div use:reveal class="bg-surface-base p-6 md:p-8 relative overflow-hidden border border-gold-500/20">
                  <Scissors class="absolute -top-8 -right-8 text-[6rem] text-gold-500/5" style="font-display: leading-none; user-select: none;" />
                  <span class="font-body text-label text-gold-500 block mb-4 tracking-[0.2em]">COMPLEET PAKKET</span>
                  <ServiceItem
                    name={svc.name}
                    price={Number(svc.price)}
                    description={svc.description || undefined}
                    selected={selectedService === svc.name}
                    signature={true}
                    revealOpts={{ delay: 1 }}
                    onclick={() => selectService(svc.id, svc.name, Number(svc.price))}
                  />
                </div>
              {/each}
            </div>
          </div>
        {/if}

        <!-- Step 2: Barber Selection -->
        {#if currentStep === 2}
          <div class="booking-step" style="animation: fadeStep 0.5s ease-out">
            <h3 use:reveal class="font-display text-subheading text-bone uppercase tracking-tight mb-8">Kies je Kapper</h3>
            {#if loadingBarbers}
              <p class="text-bone-muted font-body text-body">Kappers laden...</p>
            {:else}
              <BarberSelection
                {barbers}
                selectedBarberId={selectedStaffId}
                onselect={selectBarber}
              />
            {/if}
          </div>
        {/if}

        <!-- Step 3: Date & Time -->
        {#if currentStep === 3}
          <div class="booking-step" style="animation: fadeStep 0.5s ease-out">
            <h3 class="font-display text-subheading text-bone uppercase tracking-tight mb-8">Selecteer Datum &amp; Moment</h3>
            <div class="grid md:grid-cols-2 gap-8">
              <Calendar {calMonth} {calYear} {selectedDate} selectDay={selectCalendarDay} {changeMonth} selectedStaffId={selectedStaffId} />
              {#if loadingSlots}
                <div class="flex items-center justify-center">
                  <span class="text-bone-warm font-body text-label">Beschikbaarheid laden...</span>
                </div>
              {:else}
                <TimeSlots {selectedTime} {selectTime} slots={availableSlots.map(s => ({ time: formatSlotTime(s.time), unavailable: !s.available }))} />
              {/if}
            </div>
          </div>
        {/if}

        <!-- Step 4: Contact Info -->
        {#if currentStep === 4}
          <div class="booking-step" style="animation: fadeStep 0.5s ease-out">
            <h3 class="font-display text-subheading text-bone uppercase tracking-tight mb-8">Contact Gegevens</h3>
            {#if formError}
              <div class="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 mb-6 text-sm font-body rounded">
                {formError}
              </div>
            {/if}
            <form class="grid md:grid-cols-2 gap-8" onsubmit={submitBooking}>
              <FieldGroup id="bName" label="Volledige Naam" value={clientName} onchange={(v) => clientName = v} required />
              <FieldGroup type="email" id="bEmail" label="E-mailadres" value={clientEmail} onchange={(v) => clientEmail = v} required />
              <FieldGroup type="tel" id="bPhone" label="Telefoonnummer" value={clientPhone} onchange={(v) => clientPhone = v} pattern="[0-9\s\-+()]{6,20}" />
              <FieldGroup id="bNotes" label="Speciale Opmerkingen" value={clientNotes} onchange={(v) => clientNotes = v} />
            </form>
          </div>
        {/if}

        <!-- Navigation Buttons -->
        <div class="flex justify-between mt-12">
          {#if currentStep > 1}
            <button class="btn-outline" onclick={prevStep}>Terug</button>
          {/if}
          {#if currentStep < 4}
            <button class="btn-primary ml-auto" onclick={nextStep}>Doorgaan</button>
          {/if}
        </div>
      </div>

      <aside class="lg:col-span-4">
        <BookingSummary
          {summaryService}
          {summaryBarber}
          {summaryDate}
          {summaryTime}
          {summaryTotal}
          {canConfirm}
          onConfirm={confirmBooking}
        />
      </aside>
    </div>
  </div>
</section>

<BookingSuccess show={showSuccess} onClose={closeSuccess} />