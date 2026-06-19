<script lang="ts">
  import { CheckCircle, Clock3, XCircle } from 'lucide-svelte';

  let { data } = $props();

  const dayNames: Record<number, string> = {
    1: 'Maandag',
    2: 'Dinsdag',
    3: 'Woensdag',
    4: 'Donderdag',
    5: 'Vrijdag',
    6: 'Zaterdag',
    7: 'Zondag'
  };

  let saving = $state<Record<number, boolean>>({});
  let saveStatus = $state<Record<number, 'success' | 'error' | null>>({});
  let errorMessage = $state('');
  let flashMessage = $state('');
  let flashType = $state<'success' | 'error' | null>(null);
  let flashTimeout: ReturnType<typeof setTimeout> | null = null;

  let days = $state<Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    isActive: boolean;
  }>>([]);

  $effect(() => {
    if (data?.openingHours && data.openingHours.length > 0) {
      const hoursMap = new Map(data.openingHours.map(h => [h.dayOfWeek, h]));

      days = Array.from({ length: 7 }, (_, i) => {
        const dayOfWeek = i + 1;
        const existing = hoursMap.get(dayOfWeek);
        return {
          dayOfWeek,
          openTime: existing?.openTime?.substring(0, 5) ?? '09:00',
          closeTime: existing?.closeTime?.substring(0, 5) ?? '17:00',
          isActive: existing?.isActive ?? true
        };
      });
    } else {
      days = Array.from({ length: 7 }, (_, i) => {
        const dayOfWeek = i + 1;
        const isWeekend = dayOfWeek === 6 || dayOfWeek === 7;
        return {
          dayOfWeek,
          openTime: isWeekend ? '10:00' : '09:00',
          closeTime: isWeekend ? '16:00' : '17:00',
          isActive: dayOfWeek <= 6
        };
      });
    }
  });

  function showFlash(message: string, type: 'success' | 'error') {
    flashMessage = message;
    flashType = type;

    if (flashTimeout) clearTimeout(flashTimeout);
    flashTimeout = setTimeout(() => {
      flashMessage = '';
      flashType = null;
    }, 2600);
  }

  async function saveDay(day: typeof days[0]) {
    const dayNum = day.dayOfWeek;
    saving[dayNum] = true;
    saveStatus[dayNum] = null;
    errorMessage = '';

    try {
      const body: Record<string, unknown> = {
        dayOfWeek: day.dayOfWeek,
        isActive: day.isActive
      };

      if (day.isActive) {
        body.openTime = day.openTime;
        body.closeTime = day.closeTime;

        if (!day.openTime || !day.closeTime) {
          errorMessage = `${dayNames[day.dayOfWeek]}: Vul beide tijden in`;
          saving[dayNum] = false;
          return;
        }

        if (day.closeTime <= day.openTime) {
          errorMessage = `${dayNames[day.dayOfWeek]}: Sluitingstijd moet na openingstijd liggen`;
          saving[dayNum] = false;
          return;
        }
      } else {
        body.openTime = '00:00';
        body.closeTime = '00:00';
      }

      const res = await fetch('/admin/api/opening-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const result = await res.json();

      if (res.ok) {
        saveStatus[dayNum] = 'success';
        showFlash(`${dayNames[day.dayOfWeek]} opgeslagen`, 'success');
        setTimeout(() => { saveStatus[dayNum] = null; }, 2000);
      } else {
        saveStatus[dayNum] = 'error';
        errorMessage = result.error || `Fout bij opslaan ${dayNames[day.dayOfWeek]}`;
        showFlash(errorMessage, 'error');
      }
    } catch {
      saveStatus[dayNum] = 'error';
      errorMessage = 'Netwerkfout. Probeer opnieuw.';
      showFlash(errorMessage, 'error');
    }

    saving[dayNum] = false;
  }

  function toggleActive(dayOfWeek: number) {
    const day = days.find(d => d.dayOfWeek === dayOfWeek);
    if (day) {
      const nextActive = !day.isActive;
      day.isActive = nextActive;

      if (nextActive && (!day.openTime || !day.closeTime || day.closeTime <= day.openTime)) {
        const isWeekend = day.dayOfWeek === 6 || day.dayOfWeek === 7;
        day.openTime = isWeekend ? '10:00' : '09:00';
        day.closeTime = isWeekend ? '16:00' : '17:00';
      }

      saveDay(day);
    }
  }

  function updateTime(dayOfWeek: number, field: 'openTime' | 'closeTime', value: string) {
    const day = days.find(d => d.dayOfWeek === dayOfWeek);
    if (day) {
      day[field] = value;
    }
  }

  function formatHours(day: typeof days[0]): string {
    if (!day.isActive) return 'Gesloten';
    return `${day.openTime} - ${day.closeTime}`;
  }
</script>

<svelte:head>
  <title>Openingstijden - Cyrus Beheer</title>
</svelte:head>

<div class="space-y-6">
  <section class="border border-white/5 bg-surface-base p-6 md:p-8">
    <span class="font-body text-label text-gold-500">BESCHIKBAARHEID</span>
    <h1 class="mt-3 font-display text-heading text-bone">Openingstijden</h1>
    <p class="mt-3 max-w-xl font-body text-sm leading-7 text-bone-muted">
      Stel per dag in wanneer klanten afspraken kunnen boeken.
    </p>
  </section>

  {#if errorMessage}
    <div class="bg-red-500/10 border border-red-500/20 p-4 text-sm text-red-400 flex items-start gap-3">
      <XCircle class="shrink-0 mt-0.5" size={18} />
      <span>{errorMessage}</span>
    </div>
  {/if}

  {#if flashMessage && flashType}
    <div
      class="fixed right-6 top-6 z-50 flex items-center gap-3 border px-4 py-3 shadow-xl {flashType === 'success'
        ? 'border-gold-500/25 bg-surface-base text-bone'
        : 'border-red-500/25 bg-surface-base text-red-400'}"
      role="status"
    >
      {#if flashType === 'success'}
        <CheckCircle size={18} class="text-gold-500" />
      {:else}
        <XCircle size={18} class="text-red-400" />
      {/if}
      <span class="font-body text-sm">{flashMessage}</span>
    </div>
  {/if}

  <section class="grid gap-4 xl:grid-cols-2">
    {#each days as day}
      <article class="border border-white/5 bg-surface-base p-5 transition-opacity {day.isActive ? '' : 'opacity-70'}">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="font-display text-subheading text-bone">{dayNames[day.dayOfWeek]}</h2>
            <div class="mt-3 flex flex-wrap items-center gap-2">
              <span class="inline-flex items-center gap-2 border px-2.5 py-1 font-body text-xs {day.isActive ? 'border-gold-500/20 bg-gold-500/10 text-gold-500' : 'border-white/10 bg-surface-low text-bone-muted'}">
                <Clock3 size={13} />
                {day.isActive ? 'Open' : 'Gesloten'}
              </span>
              <span class="font-body text-sm text-bone-muted">{formatHours(day)}</span>
            </div>
          </div>

          <div class="flex items-center gap-3">
            <button
              onclick={() => toggleActive(day.dayOfWeek)}
              class="relative h-6 w-12 rounded-full transition-colors {day.isActive ? 'bg-gold-500' : 'bg-surface-low border border-white/10'}"
              aria-label="{day.isActive ? 'Sluiten' : 'Openen'} {dayNames[day.dayOfWeek]}"
            >
              <span class="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-surface transition-transform {day.isActive ? 'translate-x-6' : 'translate-x-0'}"></span>
            </button>
          </div>
        </div>

        <div class="mt-6 grid grid-cols-[1fr_auto_1fr] items-end gap-3">
          <div>
            <label for="open-{day.dayOfWeek}" class="mb-2 block font-body text-xs text-bone-muted">Opening</label>
            <input
              id="open-{day.dayOfWeek}"
              type="time"
              value={day.openTime}
              oninput={(e) => updateTime(day.dayOfWeek, 'openTime', e.currentTarget.value)}
              onchange={() => saveDay(day)}
              disabled={!day.isActive}
              class="w-full bg-surface-low border border-white/10 px-4 py-3 font-body text-base text-bone transition-colors focus:border-gold-500 focus:outline-none disabled:opacity-40"
            />
          </div>

          <span class="pb-3 font-body text-sm text-bone-muted">tot</span>

          <div>
            <label for="close-{day.dayOfWeek}" class="mb-2 block font-body text-xs text-bone-muted">Sluiting</label>
            <input
              id="close-{day.dayOfWeek}"
              type="time"
              value={day.closeTime}
              oninput={(e) => updateTime(day.dayOfWeek, 'closeTime', e.currentTarget.value)}
              onchange={() => saveDay(day)}
              disabled={!day.isActive}
              class="w-full bg-surface-low border border-white/10 px-4 py-3 font-body text-base text-bone transition-colors focus:border-gold-500 focus:outline-none disabled:opacity-40"
            />
          </div>
        </div>
      </article>
    {/each}
  </section>

  <div class="border border-white/5 bg-surface-low p-4">
    <p class="font-body text-sm text-bone-muted">
      <span class="font-semibold text-gold-500">Opslaan:</span> wijzigingen worden automatisch opgeslagen wanneer je een tijd wijzigt of een dag opent/sluit.
    </p>
  </div>
</div>
