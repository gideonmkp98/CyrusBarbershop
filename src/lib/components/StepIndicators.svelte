<script lang="ts">
  import { reveal } from '$lib/actions/reveal';
  export let currentStep: number;
</script>

<div use:reveal={{ delay: 3 }} class="flex items-center gap-6 mb-12">
  <div class="step-num" class:active={currentStep === 1} class:completed={currentStep > 1} class:upcoming={currentStep < 1}>01</div>
  <div class="h-px bg-bone-muted/20 flex-grow"></div>
  <div class="step-num" class:active={currentStep === 2} class:completed={currentStep > 2} class:upcoming={currentStep < 2}>02</div>
  <div class="h-px bg-bone-muted/20 flex-grow"></div>
  <div class="step-num" class:active={currentStep === 3} class:completed={currentStep > 3} class:upcoming={currentStep < 3}>03</div>
</div>