<script lang="ts">
  interface Props {
    href?: string;
    type?: 'button' | 'submit';
    cls?: string;
  }

  let { href = undefined, type = 'button', cls = '' } = $props<Props>();
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