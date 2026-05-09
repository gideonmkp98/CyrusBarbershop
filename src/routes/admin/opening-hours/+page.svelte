<script lang="ts">
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

  let error = $state('');
  let success = $state('');
  let saving = $state(false);

  // Work with normalized time data directly
  let days = $derived.by(() => {
    if (!data?.openingHours) return [];
    
    // Create a map of dayOfWeek to hours data
    const dayMap = new Map();
    
    data.openingHours.forEach(h => {
      dayMap.set(h.dayOfWeek, {
        ...h,
        openTime: h.openTime?.substring(0, 5) || '00:00',
        closeTime: h.closeTime?.substring(0, 5) || '00:00'
      });
    });
    
    // Ensure all 7 days exist
    for (let day = 1; day <= 7; day++) {
      if (!dayMap.has(day)) {
        dayMap.set(day, {
          id: 0,
          dayOfWeek: day,
          openTime: day <= 5 ? '09:00' : day === 6 ? '10:00' : '10:00',
          closeTime: day <= 5 ? '20:00' : day === 6 ? '18:00' : '10:00',
          isActive: day <= 6
        });
      }
    }
    
    // Convert to array and sort
    return Array.from(dayMap.values()).sort((a, b) => a.dayOfWeek - b.dayOfWeek);
  });

  async function saveAllHours() {
    error = '';
    success = '';
    saving = true;

    // Validate
    const validationErrors: string[] = [];
    for (const h of days) {
      if (h.isActive) {
        if (!h.openTime || !h.closeTime) {
          validationErrors.push(`${dayNames[h.dayOfWeek]}: beide tijden zijn verplicht`);
        } else if (h.closeTime <= h.openTime) {
          validationErrors.push(`${dayNames[h.dayOfWeek]}: sluitingstijd moet na openingstijd liggen`);
        }
      }
    }

    if (validationErrors.length > 0) {
      error = validationErrors.join(', ');
      saving = false;
      return;
    }

    try {
      const promises = days.map((h) =>
        fetch('/admin/api/opening-hours', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            dayOfWeek: h.dayOfWeek,
            openTime: h.isActive ? h.openTime : '00:00',
            closeTime: h.isActive ? h.closeTime : '00:00',
            isActive: h.isActive
          })
        })
      );

      const responses = await Promise.all(promises);
      const hasErrors = responses.some((res) => !res.ok);

      if (hasErrors) {
        const firstError = await responses.find((res) => !res.ok)?.json();
        error = firstError?.error || 'Opslaan mislukt';
      } else {
        success = 'Alle openingstijden bijgewerkt!';
        setTimeout(() => (success = ''), 3000);
      }
    } catch (err) {
      error = 'Netwerkfout';
    }
    saving = false;
  }

  function toggleActive(day: number) {
    const idx = days.findIndex((h) => h.dayOfWeek === day);
    if (idx >= 0) {
      days[idx].isActive = !days[idx].isActive;
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
      </tr>
    </thead>
    <tbody>
      {#each days as h}
        <tr class="border-b border-white/5 last:border-0">
          <td class="p-4 font-body text-bone">{dayNames[h.dayOfWeek]}</td>
          <td class="p-4">
            <input
              type="time"
              value={h.openTime}
              onchange={(e) => (h.openTime = e.currentTarget.value)}
              disabled={!h.isActive}
              class="bg-surface-low border border-white/10 px-3 py-2 text-bone font-body text-sm disabled:opacity-50"
            />
          </td>
          <td class="p-4">
            <input
              type="time"
              value={h.closeTime}
              onchange={(e) => (h.closeTime = e.currentTarget.value)}
              disabled={!h.isActive}
              class="bg-surface-low border border-white/10 px-3 py-2 text-bone font-body text-sm disabled:opacity-50"
            />
          </td>
          <td class="p-4">
            <label class="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={h.isActive}
                onchange={() => toggleActive(h.dayOfWeek)}
                class="w-4 h-4 accent-gold-500"
              />
              <span class="font-body text-sm {h.isActive ? 'text-green-500' : 'text-bone-muted'}">
                {h.isActive ? 'Actief' : 'Gesloten'}
              </span>
            </label>
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
</div>

<div class="mt-6 flex gap-4">
  <button onclick={saveAllHours} disabled={saving} class="btn-primary py-2 px-6">
    {#if saving}
      Opslaan...
    {:else}
      Alles Opslaan
    {/if}
  </button>
  <p class="text-sm text-bone-muted self-center">
    Tip: Schakel "Gesloten" uit voor dagen dat de zaak gesloten is. De tijden worden dan genegeerd.
  </p>
</div>
