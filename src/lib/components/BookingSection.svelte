<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  import StepIndicators from './StepIndicators.svelte';
  import ServiceItem from './ServiceItem.svelte';
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
  }

  let { services }: { services: ServiceData[] | undefined } = $props();

  // Default services matching original HTML when none provided
  const defaultServices: ServiceData[] = [
    { id: 1, name: 'Haarknippen', price: '35', duration: 45, description: 'Een vakkundige snit op maat. Schaarwerk, tondeuse en styling. Inclusief wassen en föhnen.', isSignature: false },
    { id: 2, name: 'Fade', price: '45', duration: 60, description: 'Vloeiende overgang van huid naar haar. Verschillende fademogelijkheden met scheermesafwerking.', isSignature: false },
    { id: 3, name: 'De Klassieke', price: '45', duration: 50, description: 'Gerespecteerd klassiek werk. Hals netjes afgewerkt met warme handdoek. De standaard.', isSignature: false },
    { id: 4, name: 'Baardtrim &amp; Vorm', price: '25', duration: 30, description: 'Vakkundig trimmen en vormen naar je gezichtsstructuur. Afgewerkt met premium baardolie.', isSignature: false },
    { id: 5, name: 'Warme Scheerbeurt', price: '40', duration: 45, description: 'Klassieke scheerervaring. Stoom, zeep en scheermeswerk met de nodige finesse.', isSignature: false },
    { id: 6, name: 'The Works', price: '75', duration: 90, description: 'Het volledige Cyrus-programma. Premium haarknippen of fade, baardwerk en gezichtsmassage', isSignature: true }
  ];

  const servicesList = $derived(services && services.length > 0 ? services : defaultServices);

  let currentStep = $state(1);
  let selectedServiceId = $state(0);
  let selectedService = $state('');
  let selectedPrice = $state(0);
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
  let availableSlots = $state<{ time: string; available: boolean }[]>([]);
  let loadingSlots = $state(false);

  let summaryService = $derived(selectedService || '─');
  let summaryTotal = $derived(selectedPrice ? `€${selectedPrice}` : '€0');
  let summaryDate = $derived(
    selectedDate
      ? selectedDate.toLocaleDateString('nl-NL', { month: 'short', day: 'numeric', year: 'numeric' })
      : '─'
  );
  let summaryTime = $derived(selectedTime || '─');
  let canConfirm = $derived(!!(selectedServiceId && selectedDate && selectedTime && clientName && clientEmail));

  // Fetch availability when date changes
  $effect(() => {
    if (selectedDate) {
      fetchAvailability(selectedDate);
    }
  });

  async function fetchAvailability(date: Date) {
    loadingSlots = true;
    const dateStr = date.toISOString().split('T')[0];
    try {
      const res = await fetch(`/api/availability?date=${dateStr}`);
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
    if (currentStep === 2 && (!selectedDate || !selectedTime)) return;
    if (currentStep < 3) currentStep++;
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
    submitting = true;

    const dateStr = selectedDate!.toISOString().split('T')[0];
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: selectedServiceId,
          date: dateStr,
          timeSlot: selectedTime,
          clientName,
          clientEmail,
          clientPhone: clientPhone || undefined,
          notes: clientNotes || undefined
        })
      });

      if (res.ok) {
        showSuccess = true;
      } else if (res.status === 409) {
        alert('Dit tijdvak was zojuist geboekt. Selecteer alstublieft ander moment.');
        selectedTime = '';
        fetchAvailability(selectedDate!);
      } else {
        alert('Boeking mislukt. Probeer het alstublieft opnieuw.');
      }
    } catch {
      alert('Netwerkfout. Probeer het alstublieft opnieuw.');
    }
    submitting = false;
  }

  function closeSuccess() {
    showSuccess = false;
    currentStep = 1;
    selectedServiceId = 0;
    selectedService = '';
    selectedPrice = 0;
    selectedDate = null;
    selectedTime = '';
    clientName = '';
    clientEmail = '';
    clientPhone = '';
    clientNotes = '';
  }

  function formatSlotTime(time: string): string {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return `${String(displayH).padStart(2, '0')}:${String(m).padStart(2, '0')} ${period}`;
  }
</script>

<section id="booking" class="py-section bg-surface-low">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8">
    <header class="mb-12 md:mb-16">
      <span use:reveal class="font-body text-label text-gold-500 block mb-4">MAAK JE AFSPRAAK</span>
      <h1 use:reveal={{ delay: 1 }} class="font-display text-heading text-gold-300 mb-4">Tijd voor een Snit</h1>
      <p use:reveal={{ delay: 2 }} class="font-body text-body-lg text-bone-warm max-w-xl" style="font-size: 1.125rem; line-height: 1.7; letter-spacing: 0.01em;">
        Stap voor stap naar je volgende Cyrus-ervaring. Kies je service, selecteer datum en moment, en we zien je snel.
      </p>
    </header>

    <StepIndicators {currentStep} />

    <div class="grid lg:grid-cols-12 gap-12 lg:gap-16">
      <div class="lg:col-span-8">
        <!-- Step 1: Service Selection -->
        {#if currentStep === 1}
          <div class="booking-step" style="animation: fadeStep 0.5s ease-out">
            <h3 use:reveal class="font-display text-subheading text-bone uppercase tracking-tight mb-8">Kies Service</h3>
            <div class="space-y-2">
              {#each servicesList as svc, i}
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

        <!-- Step 2: Date & Time -->
        {#if currentStep === 2}
          <div class="booking-step" style="animation: fadeStep 0.5s ease-out">
            <h3 class="font-display text-subheading text-bone uppercase tracking-tight mb-8">Selecteer Datum &amp; Moment</h3>
            <div class="grid md:grid-cols-2 gap-8">
              <Calendar {calMonth} {calYear} {selectedDate} selectDay={selectCalendarDay} {changeMonth} />
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

        <!-- Step 3: Contact Info -->
        {#if currentStep === 3}
          <div class="booking-step" style="animation: fadeStep 0.5s ease-out">
            <h3 class="font-display text-subheading text-bone uppercase tracking-tight mb-8">Contact Gegevens</h3>
            <form class="grid md:grid-cols-2 gap-8" onsubmit={submitBooking}>
              <FieldGroup id="bName" label="Volledige Naam" bind:value={clientName} required />
              <FieldGroup type="email" id="bEmail" label="E-mailadres" bind:value={clientEmail} required />
              <FieldGroup type="tel" id="bPhone" label="Telefoonnummer" bind:value={clientPhone} />
              <FieldGroup id="bNotes" label="Speciale Opmerkingen" bind:value={clientNotes} />
            </form>
          </div>
        {/if}

        <!-- Navigation Buttons -->
        <div class="flex justify-between mt-12">
          {#if currentStep > 1}
            <button class="btn-outline" onclick={prevStep}>Terug</button>
          {/if}
          {#if currentStep < 3}
            <button class="btn-primary ml-auto" onclick={nextStep}>Doorgaan</button>
          {/if}
        </div>
      </div>

      <aside class="lg:col-span-4">
        <BookingSummary
          {summaryService}
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