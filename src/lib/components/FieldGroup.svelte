<script lang="ts">
  export let type: string = 'text';
  export let id: string = '';
  export let label: string = '';
  export let value: string = '';
  export let required: boolean = false;
  export let rows: number | undefined = undefined;
  export let placeholder: string = ' ';
  export let cls: string = '';
</script>

<div class="field-group {cls}">
  {#if rows}
    <textarea {id} bind:value {placeholder} {rows} class="resize-none" required={required || undefined}></textarea>
  {:else}
    <input {type} {id} bind:value {placeholder} required={required || undefined} />
  {/if}
  <label for={id}>{label}</label>
</div>