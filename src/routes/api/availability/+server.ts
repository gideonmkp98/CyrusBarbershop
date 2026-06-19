import { db } from '$lib/server/db/index';
import { openingHours, appointments, blockedTimes, staffSchedules, users, services } from '$lib/server/db/schema';
import { eq, and, ne, sql, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/**
 * Generate dynamic time slots based on existing appointments.
 * Instead of fixed 30-min intervals, slots start at:
 * - Opening time
 * - End time of each existing appointment
 * This prevents gaps (e.g., if appointment ends at 12:45, next slot is 12:45)
 */
function generateDynamicSlots(
  openMinutes: number,
  closeMinutes: number,
  existingAppointments: Array<{ timeSlot: string; duration: number }>,
  blockedTimesList: string[],
  serviceDuration: number,
  isToday: boolean,
  currentTimeMinutes: number
): { time: string; available: boolean }[] {
  const slots: { time: string; available: boolean }[] = [];
  const blockedSet = new Set(blockedTimesList);

  // Sort appointments by start time
  const sortedAppointments = [...existingAppointments].sort((a, b) =>
    timeToMinutes(a.timeSlot) - timeToMinutes(b.timeSlot)
  );

  // Start from opening time
  let nextAvailableTime = openMinutes;

  for (const appt of sortedAppointments) {
    const apptStart = timeToMinutes(appt.timeSlot);
    const apptEnd = apptStart + appt.duration;

    // Generate all possible slots before this appointment
    while (nextAvailableTime + serviceDuration <= apptStart) {
      const slotTime = minutesToTime(nextAvailableTime);
      // Check if this slot is not globally blocked
      if (!blockedSet.has(slotTime)) {
        // Check if slot is not in the past
        const isPast = isToday && nextAvailableTime <= currentTimeMinutes;
        slots.push({ time: slotTime, available: !isPast });
      }
      nextAvailableTime += serviceDuration;
    }

    // Move next available time to end of this appointment
    nextAvailableTime = Math.max(nextAvailableTime, apptEnd);
  }

  // Add slots after the last appointment until closing
  while (nextAvailableTime + serviceDuration <= closeMinutes) {
    const slotTime = minutesToTime(nextAvailableTime);
    if (!blockedSet.has(slotTime)) {
      const isPast = isToday && nextAvailableTime <= currentTimeMinutes;
      slots.push({ time: slotTime, available: !isPast });
    }
    nextAvailableTime += serviceDuration;
  }

  return slots;
}

/**
 * Generate fixed 30-minute slots (fallback when no service duration is known)
 */
function generateFixedSlots(
  openMinutes: number,
  closeMinutes: number,
  blockedTimesList: string[],
  isToday: boolean,
  currentTimeMinutes: number
): { time: string; available: boolean }[] {
  const slots: { time: string; available: boolean }[] = [];
  const blockedSet = new Set(blockedTimesList);

  for (let mins = openMinutes; mins < closeMinutes; mins += 30) {
    const slotTime = minutesToTime(mins);
    if (blockedSet.has(slotTime)) {
      slots.push({ time: slotTime, available: false });
      continue;
    }
    const isPast = isToday && mins <= currentTimeMinutes;
    slots.push({ time: slotTime, available: !isPast });
  }

  return slots;
}

export const GET: RequestHandler = async ({ url }) => {
  const dateStr = url.searchParams.get('date');
  const staffIdParam = url.searchParams.get('staffId');
  const allBarbersParam = url.searchParams.get('allBarbers');
  const serviceIdParam = url.searchParams.get('serviceId');

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Response(JSON.stringify({ error: 'Ongeldig datumformaat' }), { status: 400 });
  }

  const staffId = staffIdParam ? parseInt(staffIdParam, 10) : null;
  const combineAllBarbers = allBarbersParam === 'true';
  const serviceId = serviceIdParam ? parseInt(serviceIdParam, 10) : null;

  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

  // Fetch service duration if serviceId is provided
  let serviceDuration = 30;
  if (serviceId) {
    const serviceResult = await db
      .select({ duration: services.duration })
      .from(services)
      .where(eq(services.id, serviceId));
    if (serviceResult.length > 0) {
      serviceDuration = serviceResult[0].duration || 30;
    }
  }

  // Get current date/time to filter out past slots
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = dateStr === todayStr;
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  console.log('[availability] date:', dateStr, 'dayOfWeek:', dayOfWeek, 'staffId:', staffId, 'combineAllBarbers:', combineAllBarbers, 'serviceDuration:', serviceDuration);

  // Get business opening hours for this day
  const businessHours = await db
    .select()
    .from(openingHours)
    .where(and(eq(openingHours.dayOfWeek, dayOfWeek), eq(openingHours.isActive, true)));

  if (businessHours.length === 0) {
    console.log('[availability] No business hours for this day');
    return new Response(JSON.stringify({ date: dateStr, slots: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const businessOpenTime = businessHours[0].openTime;
  const businessCloseTime = businessHours[0].closeTime;
  const businessOpenMins = timeToMinutes(businessOpenTime);
  const businessCloseMins = timeToMinutes(businessCloseTime);

  // Get global blocked times
  const blocked = await db
    .select({ timeSlot: blockedTimes.timeSlot })
    .from(blockedTimes)
    .where(sql`${blockedTimes.date} = ${dateStr}`);
  const globalBlockedTimes = blocked.map(b => b.timeSlot);

  // COMBINE ALL BARBERS MODE
  if (combineAllBarbers && !staffId) {
    console.log('[availability] Combining availability from all barbers');

    const allBarbers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ['owner', 'manager', 'staff']));

    if (allBarbers.length === 0) {
      return new Response(JSON.stringify({ date: dateStr, slots: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const barberIds = allBarbers.map(b => b.id);
    const slotAvailability = new Map<string, number[]>();

    for (const barberId of barberIds) {
      const staffSchedule = await db
        .select()
        .from(staffSchedules)
        .where(
          and(
            eq(staffSchedules.staffId, barberId),
            eq(staffSchedules.dayOfWeek, dayOfWeek),
            eq(staffSchedules.isActive, true)
          )
        );

      if (staffSchedule.length === 0 || !staffSchedule[0].openTime || !staffSchedule[0].closeTime) {
        continue;
      }

      const staffOpenMins = timeToMinutes(staffSchedule[0].openTime!);
      const staffCloseMins = timeToMinutes(staffSchedule[0].closeTime!);
      const effectiveOpenMins = Math.max(staffOpenMins, businessOpenMins);
      const effectiveCloseMins = Math.min(staffCloseMins, businessCloseMins);

      if (effectiveOpenMins >= effectiveCloseMins) {
        continue;
      }

      // Get existing appointments for this barber
      const bookingConditions = [
        sql`${appointments.date} = ${dateStr}`,
        ne(appointments.status, 'cancelled'),
        eq(appointments.staffId, barberId)
      ];

      const booked = await db
        .select({
          timeSlot: appointments.timeSlot,
          serviceId: appointments.serviceId
        })
        .from(appointments)
        .where(and(...bookingConditions));

      // Get duration for each appointment
      const appointmentsWithDuration = [];
      for (const booking of booked) {
        const serviceResult = await db
          .select({ duration: services.duration })
          .from(services)
          .where(eq(services.id, booking.serviceId));
        const duration = serviceResult.length > 0 ? serviceResult[0].duration : 30;
        appointmentsWithDuration.push({ timeSlot: booking.timeSlot, duration });
      }

      // Generate dynamic slots for this barber
      const barberSlots = generateDynamicSlots(
        effectiveOpenMins,
        effectiveCloseMins,
        appointmentsWithDuration,
        globalBlockedTimes,
        serviceDuration,
        isToday,
        currentTimeMinutes
      );

      // Add this barber to available slots
      for (const slot of barberSlots) {
        if (slot.available) {
          const availableBarbers = slotAvailability.get(slot.time) || [];
          availableBarbers.push(barberId);
          slotAvailability.set(slot.time, availableBarbers);
        }
      }
    }

    // Build final slots list from combined availability
    const allTimes = new Set<string>();
    for (const [time, barbers] of slotAvailability) {
      if (barbers.length > 0) {
        allTimes.add(time);
      }
    }

    const slots = Array.from(allTimes)
      .sort()
      .map(time => ({ time, available: true }));

    console.log('[availability] Combined slots:', slots);

    return new Response(JSON.stringify({ date: dateStr, slots, combinedMode: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // SINGLE BARBER MODE
  if (staffId) {
    const staffSchedule = await db
      .select()
      .from(staffSchedules)
      .where(
        and(
          eq(staffSchedules.staffId, staffId),
          eq(staffSchedules.dayOfWeek, dayOfWeek),
          eq(staffSchedules.isActive, true)
        )
      );

    if (staffSchedule.length === 0 || !staffSchedule[0].openTime || !staffSchedule[0].closeTime) {
      console.log('[availability] Staff not working this day');
      return new Response(JSON.stringify({ date: dateStr, slots: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const staffOpenMins = timeToMinutes(staffSchedule[0].openTime!);
    const staffCloseMins = timeToMinutes(staffSchedule[0].closeTime!);
    const effectiveOpenMins = Math.max(staffOpenMins, businessOpenMins);
    const effectiveCloseMins = Math.min(staffCloseMins, businessCloseMins);

    if (effectiveOpenMins >= effectiveCloseMins) {
      return new Response(JSON.stringify({ date: dateStr, slots: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get existing appointments
    const bookingConditions = [
      sql`${appointments.date} = ${dateStr}`,
      ne(appointments.status, 'cancelled'),
      eq(appointments.staffId, staffId)
    ];

    const booked = await db
      .select({
        timeSlot: appointments.timeSlot,
        serviceId: appointments.serviceId
      })
      .from(appointments)
      .where(and(...bookingConditions));

    // Get duration for each appointment
    const appointmentsWithDuration = [];
    for (const booking of booked) {
      const serviceResult = await db
        .select({ duration: services.duration })
        .from(services)
        .where(eq(services.id, booking.serviceId));
      const duration = serviceResult.length > 0 ? serviceResult[0].duration : 30;
      appointmentsWithDuration.push({ timeSlot: booking.timeSlot, duration });
    }

    console.log('[availability] Appointments with duration:', appointmentsWithDuration);

    // Generate dynamic slots
    const slots = generateDynamicSlots(
      effectiveOpenMins,
      effectiveCloseMins,
      appointmentsWithDuration,
      globalBlockedTimes,
      serviceDuration,
      isToday,
      currentTimeMinutes
    );

    console.log('[availability] Dynamic slots:', slots);

    return new Response(JSON.stringify({ date: dateStr, slots }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // NO STAFF SELECTED: return fixed slots (no duration-based logic yet)
  const slots = generateFixedSlots(
    businessOpenMins,
    businessCloseMins,
    globalBlockedTimes,
    isToday,
    currentTimeMinutes
  );

  return new Response(JSON.stringify({ date: dateStr, slots }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
