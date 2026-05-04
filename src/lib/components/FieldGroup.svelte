<script lang="ts">
  interface Props {
    type?: string;
    id?: string;
    label?: string;
    value?: string;
    required?: boolean;
    rows?: number;
    placeholder?: string;
    cls?: string;
  }

  let { type = 'text', id = '', label = '', value = '', required = false, rows = undefined, placeholder = ' ', cls = '' } = $props<Props>();
</script>

<div class="field-group {cls}">
  {#if rows}
    <textarea {id} bind:value {placeholder} {rows} class="resize-none" required={required || undefined}></textarea>
  {:else}
    <input {type} {id} bind:value {placeholder} required={required || undefined} />
  {/if}
  <label for={id}>{label}</label>
</div>