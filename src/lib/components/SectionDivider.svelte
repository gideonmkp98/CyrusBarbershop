<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  export let delay: number | undefined = undefined;
</script>

<div use:reveal={{ delay }} class="section-divider mx-auto"></div>