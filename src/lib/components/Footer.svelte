<script lang="ts">
  export let onNewsletterSubmit: (e: Event) => void;
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
          <a href="/contact" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Ma&ndash;Vr: 9&ndash;20</a>
          <a href="/contact" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Za: 10&ndash;18</a>
        </div>
        <div class="flex flex-col gap-3">
          <span class="font-body text-label text-gold-500">CONTACT</span>
          <a href="/contact" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Locatie</a>
          <a href="/booking" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Maak een afspraak</a>
        </div>
        <div class="flex flex-col gap-3">
          <span class="font-body text-label text-gold-500">SOCIALS</span>
          <a href="#" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Instagram</a>
          <a href="#" class="font-display text-caption text-bone-muted hover:text-bone transition-colors">Facebook</a>
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