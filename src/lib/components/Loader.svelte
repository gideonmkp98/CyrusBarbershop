<script lang="ts">
  import { onMount } from 'svelte';

  interface Props {
    loaderHidden?: boolean;
    onReady?: () => void;
  }

  let { loaderHidden = false, onReady = undefined } = $props<Props>();

  onMount(() => {
    setTimeout(() => {
      loaderHidden = true;
      onReady?.();
    }, 800);
  });
</script>

<div class="loader" class:hidden={loaderHidden}>
  <div class="loader-bar"></div>
</div>