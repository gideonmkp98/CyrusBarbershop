<script lang="ts">
  export let href: string | undefined = undefined;
  export let type: 'button' | 'submit' = 'button';
  export let disabled: boolean = false;
  export let cls: string = '';
</script>

{#if href}
  <a {href} class="btn-primary {cls}" class:opacity-50={disabled} class:cursor-not-allowed={disabled}>
    <slot />
  </a>
{:else}
  <button {type} {disabled} class="btn-primary {cls}" class:opacity-50={disabled} class:cursor-not-allowed={disabled}>
    <slot />
  </button>
{/if}