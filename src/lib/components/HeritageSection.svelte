<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
</script>

<section id="heritage" class="py-section bg-surface">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8">
    <div class="grid md:grid-cols-2 gap-12 md:gap-20 items-start">
      <!-- Text -->
      <div class="order-1 md:order-2 pt-4 md:pt-8">
        <span use:reveal class="font-body text-label text-gold-500 block mb-6">SINDS 2025</span>

        <h1 use:reveal={{ delay: 1 }} class="font-display text-heading text-bone mb-10 leading-[1.1]">
          Over Cyrus<br/>Barbershop
        </h1>

        <p use:reveal={{ delay: 2 }} class="font-body text-body-lg text-bone-warm mb-6 max-w-md leading-relaxed">
          De naam Cyrus is geïnspireerd op Cyrus de Grote, een van de meest gerespecteerde leiders uit de geschiedenis. Hij stond bekend om zijn wijsheid, visie, rechtvaardigheid en respect.
        </p>

        <div use:reveal={{ delay: 2 }} class="w-10 h-px bg-gold-500/30 mb-6"></div>

        <p use:reveal={{ delay: 3 }} class="font-body text-body text-bone-warm/70 mb-6 max-w-md leading-[1.8]">
          Bij Cyrus Barbershop vormen deze principes de basis van alles wat we doen. Wij geloven dat een bezoek aan de barbershop meer is dan alleen een knip- of scheerbeurt. Het is een moment van aandacht, vakmanschap en persoonlijke verzorging.
        </p>

        <p use:reveal={{ delay: 3 }} class="font-body text-body text-bone-warm/70 mb-6 max-w-md leading-[1.8]">
          Onze barbers combineren traditionele technieken met moderne stijl, waarbij kwaliteit, gastvrijheid en respect voor iedere klant centraal staan.
        </p>

        <blockquote use:reveal={{ delay: 4 }} class="font-body text-bone-warm/80 pl-6 italic relative before:content-[''] before:absolute before:left-0 before:top-0 before:w-[2px] before:h-full before:bg-gold-500/40" style="font-size: 1rem; line-height: 1.7;">
          "Karakter, klasse en vakmanschap - samengebracht in een ervaring die verder gaat dan alleen haarverzorging."
        </blockquote>
      </div>

      <!-- Image -->
      <div use:reveal={{ direction: 'right', delay: 2 }} class="order-2 md:order-1 relative">
        <div class="aspect-[4/5] overflow-hidden">
          <img src="/images/storefromdesk.jpeg" alt="Cyrus Barbershop interior" class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700" loading="lazy" width="400" height="500" sizes="(max-width: 768px) 100vw, 50vw" />
        </div>
        <div class="absolute -bottom-6 -left-6 w-48 h-48 border border-gold-500/10 -z-10"></div>
      </div>
    </div>
  </div>
</section>
