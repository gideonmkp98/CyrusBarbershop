<script lang="ts">
  import { onMount } from 'svelte';

  export let loaderHidden: boolean = false;
  export let onReady: (() => void) | undefined = undefined;

  onMount(() => {
    setTimeout(() => {
      loaderHidden = true;
      onReady?.();
    }, 1600);
  });
</script>

<div class="loader" class:hidden={loaderHidden}>
  <div class="loader-bar"></div>
</div>