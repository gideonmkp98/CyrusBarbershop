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
    onchange?: (value: string) => void;
  }

  let { type = 'text', id = '', label = '', value = '', required = false, rows = undefined, placeholder = ' ', cls = '', onchange } = $props<Props>();

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    value = target.value;
    onchange?.(value);
  }
</script>

<div class="field-group {cls}">
  {#if rows}
    <textarea {id} value={value} oninput={handleChange} {placeholder} {rows} class="resize-none" required={required || undefined}></textarea>
  {:else}
    <input {type} {id} value={value} oninput={handleChange} {placeholder} required={required || undefined} />
  {/if}
  <label for={id}>{label}</label>
</div>