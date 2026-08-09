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

  // Helper to format hours display
  function formatHours(hours: OpeningHour[]): { weekday: string; saturday: string; sunday: string } {
    const activeHours = hours.filter((h) => h.isActive);

    if (activeHours.length === 0) {
      return { weekday: 'Gesloten', saturday: 'Gesloten', sunday: 'Gesloten' };
    }

    // Group by day
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
      if (hours.length === 0) return 'Gesloten';
      // Check if all have same hours
      const allSame = hours.every((h) => h.openTime === hours[0].openTime && h.closeTime === hours[0].closeTime);
      if (allSame) {
        return `${formatTime(hours[0].openTime)} – ${formatTime(hours[0].closeTime)} uur`;
      }
      // Show range of hours
      const earliest = Math.min(...hours.map((h) => parseInt(h.openTime.replace(':', ''))));
      const latest = Math.max(...hours.map((h) => parseInt(h.closeTime.replace(':', ''))));
      const formatNum = (num: number) => {
        const h = Math.floor(num / 100);
        const m = num % 100;
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      };
      return `${formatNum(earliest)} – ${formatNum(latest)} uur`;
    };

    return {
      weekday: formatTimeRange(weekdayHours),
      saturday: formatTimeRange(saturdayHours),
      sunday: formatTimeRange(sundayHours)
    };
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
          <a href="/contact" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Ma&ndash;Vr: {displayHours.weekday}</a>
          <a href="/contact" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Za: {displayHours.saturday}</a>
          <a href="/contact" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Zo: {displayHours.sunday}</a>
        </div>
        <div class="flex flex-col gap-3">
          <span class="font-body text-label text-gold-500">CONTACT</span>
          <a href="/contact" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Locatie</a>
          <a href="/booking" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Maak een afspraak</a>
        </div>
        <div class="flex flex-col gap-3">
          <span class="font-body text-label text-gold-500">SOCIALS</span>
          <div class="flex items-center gap-4 mt-1">
            <a href="/contact" aria-label="Instagram" class="text-bone-muted hover:text-gold-500 transition-colors">
              <SocialIcon name="instagram" size={20} />
            </a>
            <a href="/contact" aria-label="Facebook" class="text-bone-muted hover:text-gold-500 transition-colors">
              <SocialIcon name="facebook" size={20} />
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
