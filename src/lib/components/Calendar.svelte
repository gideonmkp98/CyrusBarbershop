<script lang="ts">
  interface CalendarDay {
    empty?: boolean;
    day?: number;
    date?: Date;
    disabled?: boolean;
    selected?: boolean;
    fullyBooked?: boolean;
  }

  let {
    calMonth,
    calYear,
    selectedDate,
    selectDay,
    changeMonth,
    selectedStaffId
  }: {
    calMonth: number;
    calYear: number;
    selectedDate: Date | null;
    selectDay: (day: CalendarDay) => void;
    changeMonth: (dir: number) => void;
    selectedStaffId: number | null;
  } = $props();

  let calMonthYear = $derived(new Date(calYear, calMonth).toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' }).toUpperCase());

  // Track which days the selected barber works (1=Mon, 7=Sun)
  let workingDays = $state<Set<number>>(new Set([1, 2, 3, 4, 5, 6])); // Default: Mon-Sat
  let loadingWorkingDays = $state(false);

  // Track fully booked days when "no preference" is selected
  let fullyBookedDays = $state<Set<string>>(new Set());

  // Fetch staff schedule when barber selection changes
  $effect(() => {
    if (selectedStaffId !== null && selectedStaffId !== undefined) {
      fetchWorkingDays(selectedStaffId);
      fullyBookedDays = new Set(); // Reset fully booked days when specific barber selected
    } else {
      // No barber selected - fetch combined availability for the visible month
      workingDays = new Set([1, 2, 3, 4, 5, 6]);
      fetchFullyBookedDays(calMonth, calYear);
    }
  });

  // Refetch fully booked days when month/year changes (only in "no preference" mode)
  $effect(() => {
    if (selectedStaffId === null) {
      fetchFullyBookedDays(calMonth, calYear);
    }
  });

  async function fetchWorkingDays(staffId: number) {
    loadingWorkingDays = true;
    try {
      const res = await fetch(`/api/staff-schedules/${staffId}`);
      if (res.ok) {
        const data = await res.json();
        workingDays = new Set(data.workingDays || [1, 2, 3, 4, 5, 6]);
      }
    } catch {
      workingDays = new Set([1, 2, 3, 4, 5, 6]);
    }
    loadingWorkingDays = false;
  }

  async function fetchFullyBookedDays(month: number, year: number) {
    // Check all days in the month for combined availability
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const bookedDays = new Set<string>();

    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

      // Skip Sundays (already disabled) and past dates
      const today = new Date();
      if (date < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
        continue;
      }
      if (dayOfWeek === 7) {
        continue;
      }

      // Check if any barber is available on this day
      const yearStr = year;
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${yearStr}-${monthStr}-${dayStr}`;

      try {
        const res = await fetch(`/api/availability?date=${dateStr}&allBarbers=true`);
        if (res.ok) {
          const data = await res.json();
          const hasAvailability = data.slots?.some((s: any) => s.available);
          if (!hasAvailability) {
            bookedDays.add(dateStr);
          }
        }
      } catch {
        // On error, don't mark as fully booked - let user try
      }
    }

    fullyBookedDays = bookedDays;
  }

  let calendarDays = $derived(buildCalendarDays(calMonth, calYear, selectedDate, workingDays, fullyBookedDays, selectedStaffId));

  function buildCalendarDays(
    month: number,
    year: number,
    selDate: Date | null,
    workingDaysSet: Set<number>,
    fullyBookedSet: Set<string>,
    staffId: number | null
  ): CalendarDay[] {
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const startDay = firstDay === 0 ? 6 : firstDay - 1;
    const days: CalendarDay[] = [];
    for (let i = 0; i < startDay; i++) days.push({ empty: true });
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month, d);
      const isPast = date < new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Convert Sun from 0 to 7
      const isSunday = date.getDay() === 0;
      const isNotWorkingDay = staffId !== null ? !workingDaysSet.has(dayOfWeek) : false;

      // Check if fully booked (only for "no preference" mode)
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const isFullyBooked = staffId === null && fullyBookedSet.has(dateStr);

      days.push({
        day: d,
        date,
        disabled: isPast || isSunday || isNotWorkingDay || isFullyBooked,
        selected: selDate !== null && selDate.getDate() === d && selDate.getMonth() === month && selDate.getFullYear() === year,
        fullyBooked: isFullyBooked
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
        <div
          class="cal-day"
          class:disabled={day.disabled}
          class:selected={day.selected}
          role="button"
          tabindex={day.disabled ? -1 : 0}
          aria-disabled={day.disabled}
          onclick={() => selectDay(day)}
          onkeydown={(e) => (e.key === 'Enter' || e.key === ' ') && selectDay(day)}
        >
          {day.day}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .cal-day.disabled {
    opacity: 0.3;
    cursor: not-allowed;
    background: rgba(0, 0, 0, 0.2) !important;
  }

</style>
