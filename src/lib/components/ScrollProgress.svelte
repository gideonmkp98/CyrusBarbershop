<script lang="ts">
  import { scrollStore } from '$lib/stores/scroll';
  import { onMount } from 'svelte';

  onMount(() => scrollStore.init());
</script>

<div class="scroll-progress" style="transform: scaleX({$scrollStore.progress})"></div>