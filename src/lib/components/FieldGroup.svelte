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
    value = $bindable(''),
    required = false,
    rows = undefined,
    placeholder = ' ',
    pattern = undefined,
    cls = '',
    onchange
  } = $props<Props>();

  function handleInput(e: Event) {
    const target = e.target as HTMLInputElement | HTMLTextAreaElement;
    // Sync the bound parent state.
    value = target.value;
    // Also notify the legacy onchange callback so existing callers that pass
    // `value={x} onchange={(v) => x = v}` keep working.
    if (onchange) onchange(target.value);
  }
</script>

<div class="field-group {cls}">
  {#if rows}
    <textarea {id} {value} oninput={handleInput} {placeholder} {rows} class="resize-none" required={required || undefined}></textarea>
  {:else}
    <input {type} {id} {value} oninput={handleInput} {placeholder} {pattern} required={required || undefined} />
  {/if}
  <label for={id}>{label}</label>
</div>