<script lang="ts">
  import { reveal } from '$lib/actions/reveal';

  export let heroRevealed: boolean = false;
  export let heroOffset: number = 0;

  const heroTitleText: string = 'CYRUS BARBERSHOP';
  const heroChars: string[] = [...heroTitleText];
  const taglineChars: string[] = [...'Precision Cuts, Timeless Style.'];
</script>

<section id="hero" class="relative min-h-screen flex items-center justify-center overflow-hidden">
  <div class="absolute inset-0 z-0">
    <img src="/images/storefrombehind.jpeg" alt="Cyrus Barbershop interior" class="hero-image w-full h-full object-cover scale-110 opacity-60" style="transform: scale(1.1) translateY({heroOffset}px)"/>
    <div class="hero-overlay absolute inset-0"></div>
  </div>

  <div class="relative z-10 text-center max-w-[1200px] px-6">
    <div use:reveal class="mb-10">
      <img src="/images/logo.jpeg" alt="Cyrus Barbershop" class="w-20 h-20 md:w-24 md:h-24 mx-auto object-contain rounded-full border border-gold-500/20 p-1"/>
    </div>

    <h1 class="font-display text-display text-gold-300 mb-6 char-reveal" id="heroTitle" class:revealed={heroRevealed} style="font-size: clamp(3rem, 8vw, 6rem); line-height: 1.05; letter-spacing: -0.02em; font-weight: 700;">
      {#each heroChars as char, i}
        <span
          class="char {char === ' ' ? 'space' : ''}"
          style="transition-delay: {0.05 * i + 0.3}s"
        >{char}</span>
      {/each}
    </h1>

    <p use:reveal={{ delay: 4 }} class="font-display text-subheading text-bone-warm italic mb-12 tracking-wide" style="font-size: clamp(1.25rem, 2vw, 1.5rem); line-height: 1.3; font-weight: 500;">
      {taglineChars.join('')}
    </p>

    <div use:reveal={{ delay: 6 }} class="section-divider mx-auto mb-12"></div>

    <div use:reveal={{ delay: 7 }} class="flex flex-col sm:flex-row gap-4 justify-center">
      <a href="/booking" class="btn-primary px-12 py-5">Maak een Afspraak</a>
      <a href="/services" class="btn-outline px-12 py-5">Bekijk Behandelingen</a>
    </div>
  </div>

  <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10" use:reveal={{ delay: 8 }}>
    <div class="w-[1px] h-12 bg-gradient-to-b from-transparent to-gold-500/50 animate-pulse"></div>
  </div>
</section>