<script lang="ts">
  interface Props {
    type?: string;
    id?: string;
    label?: string;
    value?: string;
    required?: boolean;
    rows?: number;
    placeholder?: string;
    pattern?: string;
    cls?: string;
    onchange?: (value: string) => void;
  }

  let {
    type = 'text',
    id = '',
    label = '',
    value = '',
    required = false,
    rows = undefined,
    placeholder = ' ',
    pattern = undefined,
    cls = '',
    onchange
  } = $props<Props>();

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    if (onchange) {
      onchange(target.value);
    }
  }
</script>

<div class="field-group {cls}">
  {#if rows}
    <textarea {id} {value} onchange={handleChange} oninput={handleChange} {placeholder} {rows} class="resize-none" required={required || undefined}></textarea>
  {:else}
    <input {type} {id} {value} onchange={handleChange} oninput={handleChange} {placeholder} {pattern} required={required || undefined} />
  {/if}
  <label for={id}>{label}</label>
</div>
