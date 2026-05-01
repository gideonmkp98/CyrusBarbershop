<script lang="ts">
  export let summaryService: string;
  export let summaryDate: string;
  export let summaryTime: string;
  export let summaryTotal: string;
  export let canConfirm: boolean;
  export let onConfirm: () => void;
</script>

<div class="lg:sticky lg:top-32 bg-surface-base p-8 border border-gold-500/15">
  <h3 class="font-display text-subheading text-gold-300 mb-8 uppercase tracking-[0.15em]">Samenvatting</h3>
  <div class="space-y-5 mb-8">
    <div class="flex justify-between items-start">
      <span class="font-body text-label text-bone-muted">SERVICE</span>
      <span class="font-body text-body text-right">{summaryService}</span>
    </div>
    <div class="flex justify-between items-start">
      <span class="font-body text-label text-bone-muted">DATUM</span>
      <span class="font-body text-body text-right">{summaryDate}</span>
    </div>
    <div class="flex justify-between items-start">
      <span class="font-body text-label text-bone-muted">MOMENT</span>
      <span class="font-body text-body text-right">{summaryTime}</span>
    </div>
    <div class="border-t border-white/10 pt-5 flex justify-between items-center">
      <span class="font-body text-label text-gold-500">TOTAAL</span>
      <span class="font-display text-heading text-bone">{summaryTotal}</span>
    </div>
  </div>
  <button
    class="btn-primary w-full py-4 tracking-[0.2em]"
    class:opacity-50={!canConfirm}
    class:cursor-not-allowed={!canConfirm}
    onclick={onConfirm}
    disabled={!canConfirm}
  >
    BEVESTIG BOEKING
  </button>
  <p class="text-[10px] text-bone-muted mt-6 text-center leading-relaxed">
    Door te bevestigen ga je akkoord met ons annuleringsbeleid van 24 uur. Er wordt spoedig een bevestigingsmail verzonden.
  </p>
</div>