<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  import FieldGroup from './FieldGroup.svelte';

  export let onSubmit: (e: Event) => void;
  export const onNewsletterSubmit: (e: Event) => void = () => {};

  let cName: string = '';
  let cEmail: string = '';
  let cMessage: string = '';
  let submitting: boolean = false;
  let submitted: boolean = false;

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
              <span class="text-lg">&#9926;</span>
            </div>
            <div>
              <span class="block font-body text-label text-bone-muted mb-1">Telefoon</span>
              <p class="font-display text-subheading text-bone" style="font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.3; font-weight: 500;">0629231030</p>
            </div>
          </div>
          <div class="flex gap-5 items-start">
            <div class="p-3 border border-gold-500/20 text-gold-500">
              <span class="text-lg">&#9993;</span>
            </div>
            <div>
              <span class="block font-body text-label text-bone-muted mb-1">E-mail</span>
              <p class="font-display text-subheading text-bone" style="font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.3; font-weight: 500;">info@cyrusbarbershop.nl</p>
            </div>
          </div>
          <div class="flex gap-5 items-start">
            <div class="p-3 border border-gold-500/20 text-gold-500">
              <span class="text-lg">&#8982;</span>
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
              <span class="whitespace-nowrap text-bone">9:00 &ndash; 20:00 uur</span>
            </div>
            <div class="flex justify-between items-end font-body text-label uppercase">
              <span class="flex items-center w-full">Zaterdag<div class="leader"></div></span>
              <span class="whitespace-nowrap text-bone">10:00 &ndash; 18:00 uur</span>
            </div>
            <div class="flex justify-between items-end font-body text-label uppercase">
              <span class="flex items-center w-full">Zondag<div class="leader"></div></span>
              <span class="whitespace-nowrap text-bone-muted">Gesloten</span>
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
    <div use:reveal class="py-20 mt-16 border-t border-white/5 text-center">
      <h3 class="font-display text-subheading text-bone mb-10" style="font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.3; font-weight: 500;">Volg ons op social media</h3>
      <div class="flex justify-center gap-10">
        <a href="#" class="group flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-full border border-bone-muted/20 flex items-center justify-center group-hover:border-gold-500 transition-colors">
            <span class="text-bone-warm group-hover:text-gold-500 transition-colors text-lg">IG</span>
          </div>
          <span class="font-body text-label text-bone-muted group-hover:text-gold-500 transition-colors">Instagram</span>
        </a>
        <a href="#" class="group flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-full border border-bone-muted/20 flex items-center justify-center group-hover:border-gold-500 transition-colors">
            <span class="text-bone-warm group-hover:text-gold-500 transition-colors text-lg">FB</span>
          </div>
          <span class="font-body text-label text-bone-muted group-hover:text-gold-500 transition-colors">Facebook</span>
        </a>
        <!-- <a href="#" class="group flex flex-col items-center gap-3">
          <div class="w-14 h-14 rounded-full border border-bone-muted/20 flex items-center justify-center group-hover:border-gold-500 transition-colors">
            <span class="text-bone-warm group-hover:text-gold-500 transition-colors text-lg">&#9986;</span>
          </div>
          <span class="font-body text-label text-bone-muted group-hover:text-gold-500 transition-colors">Journal</span>
        </a> -->
      </div>
    </div>
  </div>
</section>