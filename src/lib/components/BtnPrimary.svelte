<script lang="ts">
  interface Props {
    href?: string;
    type?: 'button' | 'submit';
    disabled?: boolean;
    cls?: string;
  }

  let { href = undefined, type = 'button', disabled = false, cls = '' } = $props<Props>();
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