<script lang="ts">
  import { onMount } from 'svelte';
  import { reveal } from '$lib/actions/reveal';
  import HeroSection from '$lib/components/HeroSection.svelte';

  let heroRevealed = false;
  let heroOffset = 0;

  onMount(() => {
    const onScroll = () => {
      if (window.scrollY < window.innerHeight) {
        heroOffset = window.scrollY * 0.3;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // Trigger hero reveal animation after initial load
    setTimeout(() => heroRevealed = true, 100);

    return () => window.removeEventListener('scroll', onScroll);
  });

  const featureCards = [
    {
      href: '/services',
      label: 'Behandelingen',
      title: 'Voor jong en oud',
      description: 'Van klassieke kapsels tot een prachtige baard. Ontdek onze behandelingen.',
      icon: '&#9986;'
    },
    {
      href: '/booking',
      label: 'RESERVEREN',
      title: 'Boek je Stoel',
      description: 'Online reserveren zorgt ervoor dat je de aandacht krijgt die je verdient. Drie simpele stappen en klaar.',
      icon: '&#9201;'
    },
    {
      href: '/contact',
      label: 'CONTACT',
      title: 'Kom Langs',
      description: 'Bezoek onze zaak of neem contact op. Graag helpen we je met vragen, tips of een walk-in afspraak.',
      icon: '&#8982;'
    }
  ];
</script>

<svelte:head>
  <title>Cyrus Kapsalon — Perfecte Sneden, Timeless Style</title>
  <meta name="description" content="Cyrus Kapsalon — Vakwerk sinds 1994. Boek een afspraak voor haarsneden, skin fades, warme scheerbeurt en exclusieve grooming services." />
</svelte:head>

<HeroSection {heroRevealed} {heroOffset} />

<!-- Intro strip -->
<section id="intro" class="py-20 bg-surface">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8 text-center">
    <div use:reveal class="section-divider mx-auto mb-8"></div>
    <p use:reveal={{ delay: 1 }} class="font-display text-subheading text-bone-warm italic mb-4">
      Vakwerk sinds 1994
    </p>
    <p use:reveal={{ delay: 2 }} class="font-body text-body-lg text-bone-muted max-w-lg mx-auto" style="font-size: 1.125rem; line-height: 1.7; letter-spacing: 0.01em;">
      Een barbershop gericht op vakmanschap, authenticiteit en het principe dat elke kapsel telt.
    </p>
  </div>
</section>

<!-- Feature cards -->
<section class="py-section bg-surface-low">
  <div class="max-w-[1200px] mx-auto px-6 md:px-8">
    <div class="grid md:grid-cols-3 gap-6 md:gap-8">
      {#each featureCards as card, i}
        <a
          href={card.href}
          use:reveal={{ delay: i + 1 }}
          class="group bg-surface-base p-8 md:p-10 border border-white/5 hover:border-gold-500/20 transition-all duration-500 relative overflow-hidden"
        >
          <div class="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-gold-500/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
          <span class="text-gold-500 text-3xl block mb-6">{@html card.icon}</span>
          <span class="font-body text-label text-gold-500 block mb-3">{card.label}</span>
          <h3 class="font-display text-subheading text-bone mb-3 group-hover:text-gold-400 transition-colors">{card.title}</h3>
          <p class="font-body text-body text-bone-warm" style="font-size: 1rem; line-height: 1.7; letter-spacing: 0.01em;">{card.description}</p>
          <span class="inline-block mt-6 font-body text-label text-gold-500 group-hover:translate-x-1 transition-transform">&rarr;</span>
        </a>
      {/each}
    </div>
  </div>
</section>
