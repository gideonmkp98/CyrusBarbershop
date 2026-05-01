<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
</script>

<section id="heritage" class="py-section bg-surface">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8">
    <div class="grid md:grid-cols-2 gap-12 md:gap-20 items-center">
      <div>
        <span use:reveal class="font-body text-label text-gold-500 block mb-4">SINDS 1994</span>
        <h2 use:reveal={{ delay: 1 }} class="font-display text-heading text-bone mb-8 leading-tight">
          Erfenis van<br/>Vakmanschap
        </h2>
        <p use:reveal={{ delay: 2 }} class="font-body text-body-lg text-bone-warm mb-8 max-w-md">
          Bij Cyrus zeggen we dat een knippen meer is dan een dienst, het is een ritueel. Onze meesters brengen decennia van ervaring samen met eigentijdse stijl. Ieder bezoek eindigt met vakkundig afgewerkte styling.
        </p>
        <blockquote use:reveal={{ delay: 3 }} class="text-body text-bone-warm/80 pl-6 italic relative before:content-[''] before:absolute before:left-0 before:top-0 before:w-[2px] before:h-full before:bg-gold-500/40" style="font-size: 1rem; line-height: 1.7;">
          "Elke snede vertelt een verhaal. Elke behandeling is een moment van aandacht."&nbsp;&mdash;&nbsp;Cyrus, Oprichter
        </blockquote>
      </div>
      <div use:reveal={{ direction: 'right', delay: 2 }} class="relative">
        <div class="aspect-[4/5] overflow-hidden">
          <img src="/images/storefromdesk.jpeg" alt="Cyrus Barbershop interior" class="w-full h-full object-cover grayscale hover:grayscale-0 transition-all duration-700"/>
        </div>
        <div class="absolute -bottom-6 -left-6 w-48 h-48 border border-gold-500/10 -z-10"></div>
      </div>
    </div>
  </div>
</section>