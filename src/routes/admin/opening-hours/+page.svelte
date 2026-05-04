<script lang="ts">
  let { data } = $props();

  // Day name mapping
  const dayNames: Record<number, string> = {
    1: 'Maandag',
    2: 'Dinsdag',
    3: 'Woensdag',
    4: 'Donderdag',
    5: 'Vrijdag',
    6: 'Zaterdag',
    7: 'Zondag'
  };

  // Create reactive local copy of opening hours
  let openingHours = $state<
    Array<{ id: number; dayOfWeek: number; openTime: string; closeTime: string; isActive: boolean }>
  >([]);

  $effect(() => {
    if (data.openingHours) {
      openingHours = [...data.openingHours];
    }
  });

  let error = $state('');
  let success = $state('');
  let savingId = $state<number | null>(null);

  // Initialize missing days with default values
  function initializeMissingDays() {
    for (let day = 1; day <= 7; day++) {
      const existingDay = openingHours.find((h) => h.dayOfWeek === day);
      if (!existingDay) {
        openingHours.push({
          id: 0,
          dayOfWeek: day,
          openTime: day <= 5 ? '09:00' : day === 6 ? '10:00' : '00:00',
          closeTime: day <= 5 ? '20:00' : day === 6 ? '18:00' : '00:00',
          isActive: day <= 6
        });
      }
    }
    openingHours.sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  }

  // Run initialization once
  if (openingHours.length < 7) {
    initializeMissingDays();
  }

  function formatTimeForInput(time: string): string {
    // Ensure time is in HH:MM format for input
    if (!time) return '00:00';
    return time;
  }

  async function saveHours(day: number) {
    error = '';
    success = '';
    savingId = day;

    const hours = openingHours.find((h) => h.dayOfWeek === day);
    if (!hours) return;

    try {
      const res = await fetch('/admin/api/opening-hours', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dayOfWeek: hours.dayOfWeek,
          openTime: hours.openTime,
          closeTime: hours.closeTime,
          isActive: hours.isActive
        })
      });

      const result = await res.json();

      if (res.ok) {
        success = `${dayNames[day]} bijgewerkt`;
        setTimeout(() => (success = ''), 3000);
      } else {
        error = result.error || 'Opslaan mislukt';
      }
    } catch {
      error = 'Netwerkfout. Probeer het opnieuw.';
    }
    savingId = null;
  }

  function toggleActive(day: number) {
    const hours = openingHours.find((h) => h.dayOfWeek === day);
    if (hours) {
      hours.isActive = !hours.isActive;
    }
  }
</script>

<svelte:head>
  <title>Openingstijden — Cyrus Beheer</title>
</svelte:head>

<h1 class="font-display text-heading text-bone mb-8">Openingstijden Beheer</h1>

{#if error}
  <div class="bg-red-900/20 border border-red-500/30 p-4 text-sm text-red-400 mb-6">{error}</div>
{/if}
{#if success}
  <div class="bg-green-900/20 border border-green-500/30 p-4 text-sm text-green-400 mb-6">{success}</div>
{/if}

<div class="bg-surface-base border border-white/5 overflow-hidden">
  <table class="w-full text-sm">
    <thead>
      <tr class="border-b border-white/5">
        <th class="text-left p-4 font-body text-label text-bone-muted">Dag</th>
        <th class="text-left p-4 font-body text-label text-bone-muted">Openingstijd</th>
        <th class="text-left p-4 font-body text-label text-bone-muted">Sluitingstijd</th>
        <th class="text-left p-4 font-body text-label text-bone-muted">Status</th>
        <th class="text-right p-4 font-body text-label text-bone-muted">Actie</th>
      </tr>
    </thead>
    <tbody>
      {#each openingHours as hours}
        <tr class="border-b border-white/5 last:border-0">
          <td class="p-4 font-body text-bone">
            {dayNames[hours.dayOfWeek]}
          </td>
          <td class="p-4">
            <input
              type="time"
              value={formatTimeForInput(hours.openTime)}
              onchange={(e) => {
                hours.openTime = e.currentTarget.value;
              }}
              disabled={!hours.isActive}
              class="bg-surface-low border border-white/10 px-3 py-2 text-bone font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </td>
          <td class="p-4">
            <input
              type="time"
              value={formatTimeForInput(hours.closeTime)}
              onchange={(e) => {
                hours.closeTime = e.currentTarget.value;
              }}
              disabled={!hours.isActive}
              class="bg-surface-low border border-white/10 px-3 py-2 text-bone font-body text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            />
          </td>
          <td class="p-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={hours.isActive}
                onchange={() => toggleActive(hours.dayOfWeek)}
                class="w-4 h-4 accent-gold-500"
              />
              <span class="font-body text-sm {hours.isActive ? 'text-green-500' : 'text-bone-muted'}">
                {hours.isActive ? 'Actief' : 'Gesloten'}
              </span>
            </label>
          </td>
          <td class="p-4 text-right">
            <button
              onclick={() => saveHours(hours.dayOfWeek)}
              disabled={savingId === hours.dayOfWeek}
              class="btn-primary py-2 px-4 text-sm"
            >
              {#if savingId === hours.dayOfWeek}Opslaan...{:else}Opslaan{/if}
            </button>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="mt-6 text-sm text-bone-muted">
  <p>Tip: Schakel "Gesloten" uit voor dagen dat de zaak gesloten is. De tijden worden dan genegeerd.</p>
</div>
