<script lang="ts">
  import '../app.css';
  import { onMount } from 'svelte';
  import { scrollStore } from '$lib/stores/scroll';
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
<Navbar />
<MobileMenu />

<main>
  <slot />
</main>

<Footer onNewsletterSubmit={handleNewsletterSubmit} />