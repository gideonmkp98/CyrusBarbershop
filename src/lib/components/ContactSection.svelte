<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  import { Phone, Mail, MapPin, Scissors } from 'lucide-svelte';
  import FieldGroup from './FieldGroup.svelte';

  interface Props {
    onSubmit?: (e: Event) => void;
    onNewsletterSubmit?: (e: Event) => void;
  }

  let { onSubmit = (e: Event) => {}, onNewsletterSubmit = (e: Event) => {} } = $props<Props>();

  let cName: string = '';
  let cEmail: string = '';
  let cMessage: string = '';
  let submitting: boolean = false;
  let submitted: boolean = false;

  // Opening hours state
  type OpeningHour = {
    id: number;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isActive: boolean;
  };

  let openingHours = $state<OpeningHour[]>([]);
  let hoursLoaded = $state(false);

  // Fetch opening hours on mount
  $effect(() => {
    async function fetchHours() {
      if (hoursLoaded) return;
      try {
        const res = await fetch('/api/opening-hours');
        if (res.ok) {
          const data = await res.json();
          openingHours = data.hours || [];
          hoursLoaded = true;
        }
      } catch (e) {
        console.error('Failed to fetch opening hours:', e);
        hoursLoaded = true;
      }
    }
    fetchHours();
  });

  // Group hours by weekday/weekend
  function getHoursDisplay() {
    const activeHours = openingHours.filter((h) => h.isActive);

    const weekdayHours = activeHours.filter((h) => h.dayOfWeek >= 1 && h.dayOfWeek <= 5);
    const saturdayHours = activeHours.filter((h) => h.dayOfWeek === 6);
    const sundayHours = activeHours.filter((h) => h.dayOfWeek === 7);

    // Helper to format time (remove seconds if present)
    const formatTime = (time: string) => {
      if (!time) return '';
      // Remove seconds if present (HH:MM:SS -> HH:MM)
      return time.split(':').slice(0, 2).join(':');
    };

    const formatTimeRange = (hours: OpeningHour[]) => {
      if (hours.length === 0) return { text: 'Gesloten', class: 'text-bone-muted' };

      const allSame = hours.every(
        (h) => h.openTime === hours[0].openTime && h.closeTime === hours[0].closeTime
      );

      if (allSame) {
        const open = formatTime(hours[0].openTime);
        const close = formatTime(hours[0].closeTime);
        return { text: `${open} – ${close} uur`, class: 'text-bone' };
      }

      // Multiple time ranges - show earliest to latest
      const times = hours.map((h) => ({ open: formatTime(h.openTime), close: formatTime(h.closeTime) }));
      return { text: `${times[0].open} – ${times[times.length - 1].close} uur`, class: 'text-bone' };
    };

    return {
      weekday: formatTimeRange(weekdayHours),
      saturday: formatTimeRange(saturdayHours),
      sunday: formatTimeRange(sundayHours)
    };
  }

  let hoursDisplay = $derived(getHoursDisplay());

  async function handleSubmit(e: Event) {
    e.preventDefault();
    if (submitting) return;
    submitting = true;
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cName, email: cEmail, message: cMessage })
      });
      if (res.ok) {
        submitted = true;
        cName = '';
        cEmail = '';
        cMessage = '';
      }
    } catch { /* ignore */ }
    submitting = false;
  }
</script>

<section id="contact" class="py-section bg-surface">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8">
    <div class="flex flex-col md:flex-row gap-12 md:gap-16 items-end mb-16 md:mb-24">
      <div>
        <span use:reveal class="font-body text-label text-gold-500 block mb-4">BEREIK ONS</span>
        <h2 use:reveal={{ delay: 1 }} class="font-display text-heading text-bone">Contact</h2>
      </div>
      <p use:reveal={{ delay: 2 }} class="font-body text-body-lg text-bone-warm max-w-md" style="font-size: 1.125rem; line-height: 1.7; letter-spacing: 0.01em;">
        Neem contact op met vragen, of kom langs voor advies en styling. Altijd graag behulpzaam.
      </p>
    </div>

    <div class="grid md:grid-cols-12 gap-12">
      <!-- Left: Details -->
      <div class="md:col-span-5 space-y-12">
        <div use:reveal class="space-y-8">
          <div class="flex gap-5 items-start">
            <div class="p-3 border border-gold-500/20 text-gold-500">
              <Phone size={24} />
            </div>
            <div>
              <span class="block font-body text-label text-bone-muted mb-1">Telefoon</span>
              <p class="font-display text-subheading text-bone" style="font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.3; font-weight: 500;">0629231030</p>
            </div>
          </div>
          <div class="flex gap-5 items-start">
            <div class="p-3 border border-gold-500/20 text-gold-500">
              <Mail size={24} />
            </div>
            <div>
              <span class="block font-body text-label text-bone-muted mb-1">E-mail</span>
              <p class="font-display text-subheading text-bone" style="font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.3; font-weight: 500;">info@cyrusbarbershop.nl</p>
            </div>
          </div>
          <div class="flex gap-5 items-start">
            <div class="p-3 border border-gold-500/20 text-gold-500">
              <MapPin size={24} />
            </div>
            <div>
              <span class="block font-body text-label text-bone-muted mb-1">Locatie</span>
              <p class="font-display text-subheading text-bone" style="font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.3; font-weight: 500;">Kennedylaan 9e<br/>2324ER, Leiden</p>
            </div>
          </div>
        </div>

        <div use:reveal={{ delay: 2 }} class="p-8 md:p-10 bg-surface-low border border-white/5">
          <h3 class="font-display text-subheading text-gold-500 mb-8 pb-4 border-b border-gold-500/15" style="font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.3; font-weight: 500;">Openingstijden</h3>
          <div class="space-y-5">
            <div class="flex justify-between items-end font-body text-label uppercase">
              <span class="flex items-center w-full">Maandag &ndash; Vrijdag<div class="leader"></div></span>
              <span class="whitespace-nowrap {hoursDisplay.weekday.class}">{hoursDisplay.weekday.text}</span>
            </div>
            <div class="flex justify-between items-end font-body text-label uppercase">
              <span class="flex items-center w-full">Zaterdag<div class="leader"></div></span>
              <span class="whitespace-nowrap {hoursDisplay.saturday.class}">{hoursDisplay.saturday.text}</span>
            </div>
            <div class="flex justify-between items-end font-body text-label uppercase">
              <span class="flex items-center w-full">Zondag<div class="leader"></div></span>
              <span class="whitespace-nowrap {hoursDisplay.sunday.class}">{hoursDisplay.sunday.text}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Right: Form -->
      <div class="md:col-span-7 space-y-10">
        <div use:reveal={{ direction: 'right' }}>
          <h3 class="font-display text-subheading text-bone mb-8">Stuur ons een Bericht</h3>
          <form class="grid md:grid-cols-2 gap-8" onsubmit={handleSubmit}>
            <FieldGroup id="cName" label="Naam" bind:value={cName} required />
            <FieldGroup type="email" id="cEmail" label="E-mailadres" bind:value={cEmail} required />
            <FieldGroup id="cMessage" label="Bericht" bind:value={cMessage} rows={4} cls="md:col-span-2" />
            <div class="md:col-span-2 pt-2">
              {#if submitted}
                <p class="text-gold-500 font-body text-label">Bedankt! Je bericht is ontvangen.</p>
              {:else}
                <button type="submit" class="btn-outline px-12 py-4 border-gold-500/40 text-gold-500 hover:bg-gold-500 hover:text-surface" disabled={submitting}>Verzend Bericht</button>
              {/if}
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Social Links -->
   
    
  </div>
</section>
<section id="socialMedia" class="py-section bg-surface-low overflow-hidden">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8 text-center">
    <h3 use:reveal class="font-display text-subheading text-bone mb-10" style="font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.3; font-weight: 500;">Volg ons op social media</h3>
    <div class="flex justify-center gap-10">
      <a href="#" use:reveal={{ delay: 1 }} class="group flex flex-col items-center gap-3">
        <div class="w-14 h-14 rounded-full border border-bone-muted/20 flex items-center justify-center group-hover:border-gold-500 transition-colors">
          <span class="text-bone-warm group-hover:text-gold-500 transition-colors text-lg">IG</span>
        </div>
        <span class="font-body text-label text-bone-muted group-hover:text-gold-500 transition-colors">Instagram</span>
      </a>
      <a href="#" use:reveal={{ delay: 2 }} class="group flex flex-col items-center gap-3">
        <div class="w-14 h-14 rounded-full border border-bone-muted/20 flex items-center justify-center group-hover:border-gold-500 transition-colors">
          <span class="text-bone-warm group-hover:text-gold-500 transition-colors text-lg">FB</span>
        </div>
        <span class="font-body text-label text-bone-muted group-hover:text-gold-500 transition-colors">Facebook</span>
      </a>
      <!-- <a href="#" use:reveal={{ delay: 3 }} class="group flex flex-col items-center gap-3">
        <div class="w-14 h-14 rounded-full border border-bone-muted/20 flex items-center justify-center group-hover:border-gold-500 transition-colors">
          <Scissors class="text-bone-warm group-hover:text-gold-500 transition-colors" size={24} />
        </div>
        <span class="font-body text-label text-bone-muted group-hover:text-gold-500 transition-colors">Journal</span>
      </a> -->
    </div>
  </div>
</section>
