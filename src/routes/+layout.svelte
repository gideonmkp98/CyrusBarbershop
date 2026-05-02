<script lang="ts">
  import { page } from '$app/state';
  import '../app.css';
  import { onMount } from 'svelte';
  import { scrollStore } from '$lib/stores/scroll';
  import { showGlobalNav, showGlobalFooter } from '$lib/stores/layout';
  import GrainOverlay from '$lib/components/GrainOverlay.svelte';
  import Loader from '$lib/components/Loader.svelte';
  import ScrollProgress from '$lib/components/ScrollProgress.svelte';
  import Navbar from '$lib/components/Navbar.svelte';
  import MobileMenu from '$lib/components/MobileMenu.svelte';
  import Footer from '$lib/components/Footer.svelte';

  let loaderHidden = false;

  onMount(() => {
    scrollStore.init();
  });

  function handleNewsletterSubmit(e: Event) { e.preventDefault(); }
</script>

<GrainOverlay />
<Loader bind:loaderHidden />
<ScrollProgress />

{#if $showGlobalNav}
  <Navbar />
  <MobileMenu />
{/if}

<main>
  <slot />
</main>

{#if $showGlobalFooter}
  <Footer onNewsletterSubmit={handleNewsletterSubmit} />
{/if}