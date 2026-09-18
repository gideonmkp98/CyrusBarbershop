const START_INTERVAL_MINUTES = 15;

export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
}

function minutesToTime(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
}

/** Start intervals are independent of treatment duration, including add-ons. */
export function generateDynamicSlots(
  openMinutes: number,
  closeMinutes: number,
  appointments: Array<{ timeSlot: string; duration: number }>,
  blockedTimes: string[],
  serviceDuration: number,
  isToday: boolean,
  currentTimeMinutes: number
): { time: string; available: boolean }[] {
  if (!Number.isFinite(serviceDuration) || serviceDuration <= 0) return [];

  const occupied = appointments.map(appointment => {
    const start = timeToMinutes(appointment.timeSlot);
    return { start, end: start + appointment.duration };
  });
  const blocked = new Set(blockedTimes.map(timeToMinutes));
  const candidates = new Set<number>();

  // Preserve immediate starts after appointments, including e.g. 11:20.
  // Also keep a regular grid so bookings do not shift all later choices.
  for (const anchor of [openMinutes, ...occupied.map(appointment => appointment.end)]) {
    for (let start = Math.max(openMinutes, anchor); start + serviceDuration <= closeMinutes; start += START_INTERVAL_MINUTES) {
      candidates.add(start);
    }
  }

  return [...candidates].sort((a, b) => a - b)
    .filter(start => !blocked.has(start) && !occupied.some(appointment =>
      start < appointment.end && appointment.start < start + serviceDuration
    ))
    .map(start => ({
      time: minutesToTime(start),
      available: !isToday || start > currentTimeMinutes
    }));
}
