<script lang="ts">
  import SocialIcon from './SocialIcon.svelte';

  let { onNewsletterSubmit }: { onNewsletterSubmit: (e: Event) => void } = $props();

  type OpeningHour = {
    id: number;
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isActive: boolean;
  };

  type HoursDisplayGroup = {
    label: string;
    text: string;
  };

  let openingHours = $state<OpeningHour[]>([]);
  let loaded = $state(false);

  // Fetch opening hours on mount
  $effect(() => {
    async function fetchHours() {
      if (loaded) return;
      try {
        const res = await fetch('/api/opening-hours');
        if (res.ok) {
          const data = await res.json();
          openingHours = data.hours || [];
          loaded = true;
        }
      } catch (e) {
        console.error('Failed to fetch opening hours:', e);
        loaded = true;
      }
    }
    fetchHours();
  });

  function formatHours(hours: OpeningHour[]): HoursDisplayGroup[] {
    const dayLabels = ['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'];

    const formatTime = (time: string) => {
      if (!time) return '';
      return time.split(':').slice(0, 2).join(':');
    };

    const formatDay = (dayOfWeek: number) => {
      const day = hours.find((h) => h.dayOfWeek === dayOfWeek && h.isActive);
      if (!day) return 'Gesloten';
      return `${formatTime(day.openTime)} – ${formatTime(day.closeTime)} uur`;
    };

    const dayEntries = dayLabels.map((label, index) => ({
      label,
      text: formatDay(index + 1)
    }));

    const groups: HoursDisplayGroup[] = [];

    for (const day of dayEntries) {
      const last = groups[groups.length - 1];
      if (last && last.text === day.text) {
        const startLabel = last.label.split(' – ')[0];
        last.label = `${startLabel} – ${day.label}`;
      } else {
        groups.push({ ...day });
      }
    }

    return groups;
  }

  let displayHours = $derived(formatHours(openingHours));
</script>

<footer class="bg-black border-t border-gold-500/10">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8 py-16 md:py-20">
    <div class="flex flex-col md:flex-row justify-between items-start gap-12">
      <div class="space-y-4">
        <div class="flex items-center gap-3">
          <img src="/images/logo.jpeg" alt="Cyrus Barbershop" class="w-8 h-8 object-contain rounded-full"/>
          <span class="font-display text-lg tracking-[0.1em] text-gold-500">CYRUS BARBERSHOP</span>
        </div>
        <p class="font-display text-caption text-bone-muted">
          &copy; 2025 CYRUS BARBERSHOP.
        </p>
      </div>

      <div class="grid grid-cols-2 md:grid-cols-3 gap-x-12 gap-y-6">
        <div class="flex flex-col gap-3">
          <span class="font-body text-label text-gold-500">OPENINGSTIJDEN</span>
          {#each displayHours as group}
            <a href="/contact" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">{group.label}: {group.text}</a>
          {/each}
        </div>
        <div class="flex flex-col gap-3">
          <span class="font-body text-label text-gold-500">CONTACT</span>
          <a href="/contact" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Locatie</a>
          <a href="/booking" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Maak een afspraak</a>
          <a href="/voorwaarden" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Voorwaarden</a>
          <a href="/privacy" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Privacyverklaring</a>
        </div>
        <div class="flex flex-col gap-3">
          <span class="font-body text-label text-gold-500">SOCIALS</span>
          <div class="flex items-center gap-4 mt-1">
            <a href="https://www.instagram.com/cyrusbarbershop/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" class="text-bone-muted hover:text-gold-500 transition-colors">
              <SocialIcon name="instagram" size={20} />
            </a>
          </div>
        </div>
      </div>

      <!-- <div class="flex flex-col gap-3">
        <span class="font-body text-label text-bone-muted/40">BLIJF SCHERP</span>
        <form class="flex items-center gap-2 border-b border-white/15 pb-2" onsubmit={onNewsletterSubmit}>
          <input type="email" placeholder="JE E-MAIL" class="bg-transparent border-none focus:ring-0 text-xs font-body text-label text-bone w-36 outline-none placeholder:text-bone-muted/30"/>
          <button type="submit" class="text-gold-500 hover:text-gold-300 transition-colors">&rarr;</button>
        </form>
      </div> -->
    </div>
  </div>
</footer>
