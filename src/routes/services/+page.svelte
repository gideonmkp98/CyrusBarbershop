<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  import ServicesSection from '$lib/components/ServicesSection.svelte';
  import CtaSection from '$lib/components/CtaSection.svelte';

  let { data } = $props();
</script>

<svelte:head>
  <title>Behandelingen — Cyrus Kapsalon</title>
</svelte:head>

<ServicesSection services={data.services} />

<CtaSection />