<script lang="ts">
  import { invalidateAll } from '$app/navigation';
  import { AlertTriangle, CalendarOff, Check, ChevronDown, Clock3, Plus, Trash2, X } from 'lucide-svelte';
  import { toast } from '$lib/stores/toast';

  let { data } = $props();

  type Conflict = {
    id: number;
    date: string;
    timeSlot: string;
    clientName: string;
    serviceName: string;
    status: string;
  };

  type TimeOffEntry = {
    id: number;
    staffId: number;
    employeeName: string;
    startDate: string;
    endDate: string;
    reason: string | null;
    status: 'pending' | 'approved' | 'rejected';
    entryType: 'request' | 'direct';
    reviewerNote: string | null;
    conflictCount: number;
    conflicts: Conflict[];
  };

  const today = (() => {
    const value = new Date();
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
  })();

  let entries = $derived<TimeOffEntry[]>(data.entries ?? []);
  let staffId = $state<number | null>(data.mayReview ? (data.staff[0]?.id ?? null) : data.user?.id ?? null);
  let startDate = $state(today);
  let endDate = $state(today);
  let reason = $state('');
  let submitting = $state(false);
  let directConflicts = $state<Conflict[]>([]);
  let directNeedsConfirmation = $state(false);

  let reviewEntry = $state<TimeOffEntry | null>(null);
  let reviewStatus = $state<'approved' | 'rejected'>('approved');
  let reviewerNote = $state('');
  let reviewConflicts = $state<Conflict[]>([]);
  let reviewNeedsConfirmation = $state(false);
  let reviewing = $state(false);

  const statusLabel = {
    pending: 'In behandeling',
    approved: 'Goedgekeurd',
    rejected: 'Afgewezen'
  };

  const statusClass = {
    pending: 'border-gold-500/25 bg-gold-500/10 text-gold-500',
    approved: 'border-green-500/25 bg-green-500/10 text-green-400',
    rejected: 'border-red-500/25 bg-red-500/10 text-red-400'
  };

  function formatDate(value: string) {
    return new Date(`${value}T00:00:00`).toLocaleDateString('nl-NL', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function periodLabel(entry: TimeOffEntry) {
    return entry.startDate === entry.endDate
      ? formatDate(entry.startDate)
      : `${formatDate(entry.startDate)} - ${formatDate(entry.endDate)}`;
  }

  async function submitTimeOff(confirmConflicts = false) {
    if (!staffId || !startDate || !endDate) return;
    submitting = true;
    try {
      const response = await fetch('/admin/api/time-off', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          startDate,
          endDate,
          reason,
          direct: data.mayReview,
          confirmConflicts
        })
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.requiresConfirmation) {
          directConflicts = result.conflicts ?? [];
          directNeedsConfirmation = true;
          return;
        }
        toast.error(result.error || 'Afwezigheid kon niet worden opgeslagen');
        return;
      }

      toast.success(data.mayReview ? 'Afwezigheid opgeslagen' : 'Aanvraag ingediend');
      reason = '';
      directConflicts = [];
      directNeedsConfirmation = false;
      await invalidateAll();
    } catch {
      toast.error('Afwezigheid kon niet worden opgeslagen');
    } finally {
      submitting = false;
    }
  }

  function openReview(entry: TimeOffEntry, status: 'approved' | 'rejected') {
    reviewEntry = entry;
    reviewStatus = status;
    reviewerNote = '';
    reviewConflicts = entry.conflicts ?? [];
    reviewNeedsConfirmation = status === 'approved' && entry.conflictCount > 0;
  }

  function closeReview() {
    reviewEntry = null;
    reviewConflicts = [];
    reviewNeedsConfirmation = false;
  }

  async function submitReview(confirmConflicts = false) {
    if (!reviewEntry) return;
    reviewing = true;
    try {
      const response = await fetch('/admin/api/time-off', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: reviewEntry.id,
          status: reviewStatus,
          reviewerNote,
          confirmConflicts
        })
      });
      const result = await response.json();
      if (!response.ok) {
        if (result.requiresConfirmation) {
          reviewConflicts = result.conflicts ?? [];
          reviewNeedsConfirmation = true;
          return;
        }
        toast.error(result.error || 'Aanvraag kon niet worden beoordeeld');
        return;
      }
      toast.success(reviewStatus === 'approved' ? 'Aanvraag goedgekeurd' : 'Aanvraag afgewezen');
      closeReview();
      await invalidateAll();
    } catch {
      toast.error('Aanvraag kon niet worden beoordeeld');
    } finally {
      reviewing = false;
    }
  }

  async function removeEntry(entry: TimeOffEntry) {
    if (!confirm(`Afwezigheid van ${entry.employeeName} verwijderen?`)) return;
    const response = await fetch('/admin/api/time-off', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: entry.id })
    });
    const result = await response.json();
    if (!response.ok) {
      toast.error(result.error || 'Verwijderen mislukt');
      return;
    }
    toast.success('Afwezigheid verwijderd');
    await invalidateAll();
  }
</script>

<svelte:head><title>Afwezigheid - Cyrus Beheer</title></svelte:head>

<div class="space-y-6">
  <header class="flex flex-wrap items-end justify-between gap-4">
    <div>
      <span class="font-body text-label text-gold-500">PLANNING</span>
      <h1 class="mt-3 font-display text-heading text-bone">Afwezigheid</h1>
      <p class="mt-2 max-w-2xl font-body text-sm leading-6 text-bone-muted">
        {data.mayReview
          ? 'Beheer vrije dagen en beoordeel aanvragen van medewerkers.'
          : 'Vraag vrije dagen aan en volg de status van je aanvragen.'}
      </p>
    </div>
  </header>

  <section class="border border-white/5 bg-surface-base">
    <div class="border-b border-white/5 p-5">
      <div class="flex items-center gap-3">
        <CalendarOff size={20} class="text-gold-500" />
        <div>
          <h2 class="font-display text-subheading text-bone">{data.mayReview ? 'Medewerker afwezig maken' : 'Vrij aanvragen'}</h2>
          <p class="mt-1 font-body text-xs text-bone-muted">Volledige dagen, inclusief begin- en einddatum.</p>
        </div>
      </div>
    </div>

    <form class="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-4" onsubmit={(event) => { event.preventDefault(); submitTimeOff(false); }}>
      {#if data.mayReview}
        <label class="block xl:col-span-1">
          <span class="mb-2 block font-body text-xs text-bone-muted">Medewerker</span>
          <select bind:value={staffId} required class="w-full border border-white/10 bg-surface-low px-3 py-2.5 font-body text-sm text-bone focus:border-gold-500 focus:outline-none">
            {#each data.staff as member}
              <option value={member.id}>{member.displayName}</option>
            {/each}
          </select>
        </label>
      {/if}

      <label class="block">
        <span class="mb-2 block font-body text-xs text-bone-muted">Van</span>
        <input type="date" bind:value={startDate} min={today} required class="w-full min-w-0 border border-white/10 bg-surface-low px-3 py-2.5 font-body text-sm text-bone focus:border-gold-500 focus:outline-none" />
      </label>
      <label class="block">
        <span class="mb-2 block font-body text-xs text-bone-muted">Tot en met</span>
        <input type="date" bind:value={endDate} min={startDate || today} required class="w-full min-w-0 border border-white/10 bg-surface-low px-3 py-2.5 font-body text-sm text-bone focus:border-gold-500 focus:outline-none" />
      </label>
      <label class="block {data.mayReview ? '' : 'md:col-span-2'}">
        <span class="mb-2 block font-body text-xs text-bone-muted">Reden <span class="text-bone-muted/60">(optioneel)</span></span>
        <input bind:value={reason} maxlength="500" placeholder="Bijv. vakantie" class="w-full border border-white/10 bg-surface-low px-3 py-2.5 font-body text-sm text-bone placeholder:text-bone-muted/40 focus:border-gold-500 focus:outline-none" />
      </label>

      {#if directNeedsConfirmation}
        <div class="md:col-span-2 xl:col-span-4 border border-amber-400/25 bg-amber-400/10 p-4">
          <div class="flex items-start gap-3">
            <AlertTriangle size={18} class="mt-0.5 shrink-0 text-amber-300" />
            <div class="min-w-0">
              <p class="font-body text-sm text-amber-200">{directConflicts.length} bestaande {directConflicts.length === 1 ? 'afspraak' : 'afspraken'} in deze periode</p>
              <p class="mt-1 font-body text-xs text-bone-muted">De afspraken blijven bestaan. Controleer ze voordat je doorgaat.</p>
              <div class="mt-3 grid gap-2 sm:grid-cols-2">
                {#each directConflicts as conflict}
                  <div class="border border-white/10 bg-surface-base px-3 py-2 font-body text-xs">
                    <span class="text-gold-500">{formatDate(conflict.date)} om {conflict.timeSlot.slice(0, 5)}</span>
                    <span class="mt-1 block truncate text-bone">{conflict.clientName} - {conflict.serviceName}</span>
                  </div>
                {/each}
              </div>
            </div>
          </div>
        </div>
      {/if}

      <div class="flex flex-wrap items-center gap-3 md:col-span-2 xl:col-span-4">
        <button type={directNeedsConfirmation ? 'button' : 'submit'} onclick={() => directNeedsConfirmation && submitTimeOff(true)} disabled={submitting || !staffId} class="inline-flex items-center gap-2 bg-gold-500 px-4 py-2.5 font-body text-sm text-surface transition-colors hover:bg-gold-400 disabled:opacity-50">
          {#if directNeedsConfirmation}<AlertTriangle size={16} /> Toch afwezig maken{:else}<Plus size={16} /> {data.mayReview ? 'Afwezigheid opslaan' : 'Aanvraag indienen'}{/if}
        </button>
        {#if directNeedsConfirmation}
          <button type="button" onclick={() => { directNeedsConfirmation = false; directConflicts = []; }} class="px-4 py-2.5 font-body text-sm text-bone-muted hover:text-bone">Annuleren</button>
        {/if}
      </div>
    </form>
  </section>

  <section class="border border-white/5 bg-surface-base">
    <div class="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 p-5">
      <div>
        <span class="font-body text-label text-bone-muted">OVERZICHT</span>
        <h2 class="mt-2 font-display text-subheading text-bone">{data.mayReview ? 'Aanvragen en afwezigheid' : 'Mijn aanvragen'}</h2>
      </div>
      <span class="border border-white/10 bg-surface-low px-2.5 py-1 font-body text-xs text-bone-muted">{entries.length} totaal</span>
    </div>

    {#if entries.length === 0}
      <div class="p-12 text-center">
        <CalendarOff size={28} class="mx-auto text-bone-muted/40" />
        <p class="mt-3 font-body text-sm text-bone-muted">Nog geen afwezigheid geregistreerd.</p>
      </div>
    {:else}
      <div class="divide-y divide-white/5">
        {#each entries as entry (entry.id)}
          <article class="p-5">
            <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-start">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <h3 class="font-display text-lg text-bone">{entry.employeeName}</h3>
                  <span class="border px-2 py-0.5 font-body text-[11px] {statusClass[entry.status]}">{statusLabel[entry.status]}</span>
                  {#if entry.entryType === 'direct'}
                    <span class="border border-white/10 bg-surface-low px-2 py-0.5 font-body text-[11px] text-bone-muted">Direct ingevoerd</span>
                  {/if}
                </div>
                <p class="mt-2 font-body text-sm text-bone">{periodLabel(entry)}</p>
                {#if entry.reason}<p class="mt-1 font-body text-sm text-bone-muted">{entry.reason}</p>{/if}
                {#if entry.reviewerNote}<p class="mt-2 border-l-2 border-white/10 pl-3 font-body text-xs text-bone-muted">Opmerking: {entry.reviewerNote}</p>{/if}

                {#if entry.conflictCount > 0}
                  <details class="mt-3">
                    <summary class="flex cursor-pointer list-none items-center gap-2 font-body text-xs text-amber-300">
                      <AlertTriangle size={15} /> {entry.conflictCount} bestaande {entry.conflictCount === 1 ? 'afspraak' : 'afspraken'} <ChevronDown size={14} />
                    </summary>
                    <div class="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {#each entry.conflicts as conflict}
                        <div class="border border-white/10 bg-surface-low px-3 py-2 font-body text-xs">
                          <span class="text-gold-500">{formatDate(conflict.date)} - {conflict.timeSlot.slice(0, 5)}</span>
                          <span class="mt-1 block truncate text-bone">{conflict.clientName}</span>
                          <span class="block truncate text-bone-muted">{conflict.serviceName}</span>
                        </div>
                      {/each}
                    </div>
                  </details>
                {/if}
              </div>

              <div class="flex flex-wrap gap-2 lg:justify-end">
                {#if data.mayReview && entry.status === 'pending'}
                  <button onclick={() => openReview(entry, 'approved')} class="inline-flex items-center gap-2 border border-green-500/25 bg-green-500/10 px-3 py-2 font-body text-xs text-green-400 hover:bg-green-500/20"><Check size={14} /> Goedkeuren</button>
                  <button onclick={() => openReview(entry, 'rejected')} class="inline-flex items-center gap-2 border border-red-500/25 bg-red-500/10 px-3 py-2 font-body text-xs text-red-400 hover:bg-red-500/20"><X size={14} /> Afwijzen</button>
                {/if}
                {#if data.mayReview || entry.status === 'pending'}
                  <button onclick={() => removeEntry(entry)} aria-label="Afwezigheid verwijderen" class="inline-flex h-9 w-9 items-center justify-center border border-white/10 text-bone-muted hover:border-red-500/30 hover:text-red-400"><Trash2 size={15} /></button>
                {/if}
              </div>
            </div>
          </article>
        {/each}
      </div>
    {/if}
  </section>
</div>

{#if reviewEntry}
  <div class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/75 p-4" role="presentation" onclick={closeReview}>
    <div class="max-h-[90vh] w-full max-w-xl overflow-y-auto border border-white/10 bg-surface-base p-5 sm:p-7" role="dialog" aria-modal="true" aria-labelledby="review-title" tabindex="-1" onclick={(event) => event.stopPropagation()} onkeydown={(event) => event.key === 'Escape' && closeReview()}>
      <div class="flex items-start justify-between gap-4">
        <div>
          <span class="font-body text-label {reviewStatus === 'approved' ? 'text-green-400' : 'text-red-400'}">AANVRAAG BEOORDELEN</span>
          <h2 id="review-title" class="mt-2 font-display text-subheading text-bone">{reviewStatus === 'approved' ? 'Goedkeuren' : 'Afwijzen'}: {reviewEntry.employeeName}</h2>
          <p class="mt-2 font-body text-sm text-bone-muted">{periodLabel(reviewEntry)}</p>
        </div>
        <button onclick={closeReview} aria-label="Sluiten" class="text-bone-muted hover:text-bone"><X size={20} /></button>
      </div>

      {#if reviewStatus === 'approved' && reviewConflicts.length > 0}
        <div class="mt-5 border border-amber-400/25 bg-amber-400/10 p-4">
          <p class="flex items-center gap-2 font-body text-sm text-amber-200"><AlertTriangle size={17} /> {reviewConflicts.length} conflicterende {reviewConflicts.length === 1 ? 'afspraak' : 'afspraken'}</p>
          <p class="mt-1 font-body text-xs text-bone-muted">Goedkeuren verwijdert of wijzigt deze afspraken niet.</p>
          <div class="mt-3 space-y-2">
            {#each reviewConflicts as conflict}
              <div class="flex flex-wrap justify-between gap-2 border border-white/10 bg-surface-base px-3 py-2 font-body text-xs">
                <span class="text-bone">{conflict.clientName} - {conflict.serviceName}</span>
                <span class="text-gold-500">{formatDate(conflict.date)}, {conflict.timeSlot.slice(0, 5)}</span>
              </div>
            {/each}
          </div>
        </div>
      {/if}

      <label class="mt-5 block">
        <span class="mb-2 block font-body text-xs text-bone-muted">Opmerking <span class="text-bone-muted/60">(optioneel)</span></span>
        <textarea bind:value={reviewerNote} maxlength="500" rows="3" class="w-full resize-y border border-white/10 bg-surface-low px-3 py-2 font-body text-sm text-bone focus:border-gold-500 focus:outline-none"></textarea>
      </label>

      <div class="mt-6 flex flex-wrap justify-end gap-3 border-t border-white/5 pt-5">
        <button onclick={closeReview} class="px-4 py-2.5 font-body text-sm text-bone-muted hover:text-bone">Annuleren</button>
        <button onclick={() => submitReview(reviewNeedsConfirmation)} disabled={reviewing} class="inline-flex items-center gap-2 px-4 py-2.5 font-body text-sm disabled:opacity-50 {reviewStatus === 'approved' ? 'bg-green-500 text-surface' : 'bg-red-500 text-white'}">
          {#if reviewing}<Clock3 size={16} class="animate-spin" /> Bezig...{:else if reviewNeedsConfirmation}<AlertTriangle size={16} /> Toch goedkeuren{:else if reviewStatus === 'approved'}<Check size={16} /> Goedkeuren{:else}<X size={16} /> Afwijzen{/if}
        </button>
      </div>
    </div>
  </div>
{/if}
