<script lang="ts">
  interface CalendarDay {
    empty?: boolean;
    day?: number;
    date?: Date;
    disabled?: boolean;
    selected?: boolean;
  }

  let {
    calMonth,
    calYear,
    selectedDate,
    selectDay,
    changeMonth
  }: {
    calMonth: number;
    calYear: number;
    selectedDate: Date | null;
    selectDay: (day: CalendarDay) => void;
    changeMonth: (dir: number) => void;
  } = $props();

  let calMonthYear = $derived(new Date(calYear, calMonth).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }).toUpperCase());

  let calendarDays = $derived(buildCalendarDays(calMonth, calYear, selectedDate));

  function buildCalendarDays(month: number, year: number, selDate: Date | null): CalendarDay[] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    const days: CalendarDay[] = [];
    for (let i = 0; i < startDay; i++) days.push({ empty: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const isSunday = date.getDay() === 0;
      days.push({
        day: d,
        date,
        disabled: isPast || isSunday,
        selected: selDate !== null && selDate.getDate() === d && selDate.getMonth() === month && selDate.getFullYear() === year
      });
    }
    return days;
  }

  const dayLabels = ['MA', 'DI', 'WO', 'DO', 'VR', 'ZA', 'ZO'];
</script>

<div class="bg-surface-low p-6 border border-white/5">
  <div class="flex justify-between items-center mb-6">
    <span class="font-body text-label">{calMonthYear}</span>
    <div class="flex gap-3">
      <button onclick={() => changeMonth(-1)} class="text-bone-warm hover:text-gold-500 transition-colors text-lg">&larr;</button>
      <button onclick={() => changeMonth(1)} class="text-bone-warm hover:text-gold-500 transition-colors text-lg">&rarr;</button>
    </div>
  </div>
  <div class="grid grid-cols-7 gap-1 text-center mb-3">
    {#each dayLabels as label}
      <span class="text-caption text-bone-muted">{label}</span>
    {/each}
  </div>
  <div class="grid grid-cols-7 gap-1">
    {#each calendarDays as day}
      {#if day.empty}
        <div class="cal-day empty"></div>
      {:else}
        <!-- svelte-ignore a11y_click_events_have_key_events a11y_no_static_element_interactions -->
        <div
          class="cal-day"
          class:disabled={day.disabled}
          class:selected={day.selected}
          onclick={() => selectDay(day)}
        >{day.day}</div>
      {/if}
    {/each}
  </div>
</div>