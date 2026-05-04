<script lang="ts">
  import { reveal } from '$lib/actions/reveal';

  interface Props {
    delay?: number;
  }

  let { delay = undefined } = $props<Props>();
</script>

<div use:reveal={{ delay }} class="section-divider mx-auto"></div>