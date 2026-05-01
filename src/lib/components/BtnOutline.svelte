<script lang="ts">
  export let href: string | undefined = undefined;
  export let type: 'button' | 'submit' = 'button';
  export let cls: string = '';
</script>

{#if href}
  <a {href} class="btn-outline {cls}">
    <slot />
  </a>
{:else}
  <button {type} class="btn-outline {cls}">
    <slot />
  </button>
{/if}