<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  import ServiceItem from './ServiceItem.svelte';
</script>

<section id="services" class="py-section bg-surface-low">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8">
    <div class="text-center mb-16 md:mb-24">
      <span use:reveal class="font-body text-label text-gold-500 block mb-4">ONZE BEHANDELINGEN</span>
      <h2 use:reveal={{ delay: 1 }} class="font-display text-heading text-bone">Vakwerk Met Precisie</h2>
      <div use:reveal={{ delay: 2 }} class="section-divider mx-auto mt-6"></div>
    </div>

    <div class="grid lg:grid-cols-12 gap-12 lg:gap-16">
      <!-- Sidebar -->
      <div class="lg:col-span-4 lg:sticky lg:top-32 lg:self-start space-y-8">
        <div use:reveal>
          <p class="font-body text-body-lg text-bone-warm mb-8" style="font-size: 1.125rem; line-height: 1.7; letter-spacing: 0.01em;">
            We combineren klassieke barbering met moderne technieken. Elke behandeling begint met een goed gesprek over wat jij wilt.
          </p>
          <div class="space-y-5">
            <div class="flex items-center gap-4 group">
              <span class="text-gold-500 text-2xl">&#9986;</span>
              <span class="font-body text-label text-bone-warm group-hover:text-gold-400 transition-colors">Perfecte Kapsels</span>
            </div>
            <div class="flex items-center gap-4 group">
              <span class="text-gold-500 text-2xl">&#9671;</span>
              <span class="font-body text-label text-bone-warm group-hover:text-gold-400 transition-colors">Premium Producten</span>
            </div>
            <div class="flex items-center gap-4 group">
              <span class="text-gold-500 text-2xl">&#9672;</span>
              <span class="font-body text-label text-bone-warm group-hover:text-gold-400 transition-colors">Ontspannde Atmosfeer</span>
            </div>
          </div>
        </div>
        <div use:reveal={{ delay: 2 }} class="overflow-hidden">
          <img src="/images/barberchair1.jpeg" alt="Barber chair" class="w-full h-64 object-cover grayscale hover:grayscale-0 transition-all duration-700"/>
        </div>
      </div>

      <!-- Service List -->
      <div class="lg:col-span-8 space-y-16">
        <!-- Hair Services -->
        <div>
          <h3 use:reveal class="font-body text-label text-bone-muted uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
            <span>01</span>
            <span class="h-px bg-bone-muted/20 flex-grow"></span>
            <span>Haarwerk</span>
          </h3>
          <div class="space-y-2">
            <ServiceItem name="Haarknippen" price={35} description="Een vakkundige snit op maat. Schaarwerk, tondeuse en styling. Inclusief wassen en föhnen." revealOpts={{ delay: 1 }} />
            <ServiceItem name="Fade" price={45} description="Vloeiende overgang van huid naar haar. Verschillende fademogelijkheden met scheermesafwerking." revealOpts={{ delay: 2 }} />
            <ServiceItem name="De Klassieke" price={45} description="Gerespecteerd klassiek werk. Hals netjes afgewerkt met warme handdoek. De standaard." revealOpts={{ delay: 3 }} />
          </div>
        </div>

        <!-- Beard & Face -->
        <div>
          <h3 use:reveal class="font-body text-label text-bone-muted uppercase tracking-[0.3em] mb-10 flex items-center gap-4">
            <span>02</span>
            <span class="h-px bg-bone-muted/20 flex-grow"></span>
            <span>Baardverzorging</span>
          </h3>
          <div class="space-y-2">
            <ServiceItem name="Baardtrim &amp; Vorm" price={25} description="Vakkundig trimmen en vormen naar je gezichtsstructuur. Afgewerkt met premium baardolie." revealOpts={{ delay: 1 }} />
            <ServiceItem name="Warme Scheerbeurt" price={40} description="Klassieke scheerervaring. Stoom, zeep en scheermeswerk met de nodige finesse." revealOpts={{ delay: 2 }} />
            <ServiceItem name="Baard Design" price={30} description="Fijne vorming en linenwerk. Voor wie waarde hecht aan perfecte details en vakwerk." revealOpts={{ delay: 3 }} />
          </div>
        </div>

        <!-- Signature Package -->
        <div use:reveal class="bg-surface-base p-8 md:p-12 relative overflow-hidden group">
          <div class="absolute -top-12 -right-12 text-[8rem] text-gold-500/5 font-display leading-none select-none">&#9733;</div>
          <span class="font-body text-label text-gold-500 block mb-6 tracking-[0.3em]">COMPLEET PAKKET</span>
          <div class="flex items-end justify-between mb-6 relative z-10">
            <h4 class="font-display text-heading text-bone italic">The Works</h4>
            <div class="leader"></div>
            <span class="font-display text-heading text-gold-500">€75</span>
          </div>
          <p class="text-bone-warm text-body-lg mb-10 max-w-xl relative z-10" style="font-size: 1.125rem; line-height: 1.7; letter-spacing: 0.01em;">
            Het volledige Cyrus-programma. Premium haarknippen of fade, baardwerk of warme scheering, en dan een ontspannende gezichtsmassage.
          </p>
          <a href="/booking" class="btn-outline">Kies dit Pakket</a>
        </div>
      </div>
    </div>
  </div>
</section>