import { db } from '$lib/server/db/index';
import { openingHours, appointments, blockedTimes, staffSchedules, users } from '$lib/server/db/schema';
import { eq, and, ne, sql, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const dateStr = url.searchParams.get('date');
  const staffIdParam = url.searchParams.get('staffId');
  // New parameter: when "all" is passed, combine availability from all barbers
  const allBarbersParam = url.searchParams.get('allBarbers');

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Response(JSON.stringify({ error: 'Ongeldig datumformaat' }), { status: 400 });
  }

  const staffId = staffIdParam ? parseInt(staffIdParam, 10) : null;
  const combineAllBarbers = allBarbersParam === 'true';
  // Parse date as local date, not UTC. Split the date string and create local date.
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

  // Get current date/time to filter out past slots
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  const isToday = dateStr === todayStr;
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  console.log('[availability] date:', dateStr, 'dayOfWeek:', dayOfWeek, 'staffId:', staffId, 'combineAllBarbers:', combineAllBarbers, 'isToday:', isToday, 'currentTimeMinutes:', currentTimeMinutes);

  // Get business opening hours for this day
  const businessHours = await db
    .select()
    .from(openingHours)
    .where(and(eq(openingHours.dayOfWeek, dayOfWeek), eq(openingHours.isActive, true)));

  console.log('[availability] businessHours:', businessHours);

  if (businessHours.length === 0) {
    console.log('[availability] No business hours for this day');
    return new Response(JSON.stringify({ date: dateStr, slots: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const businessOpenTime = businessHours[0].openTime;
  const businessCloseTime = businessHours[0].closeTime;

  // Generate 30-minute time slots based on business hours
  const slots: { time: string; available: boolean }[] = [];
  const [openH, openM] = businessOpenTime.split(':').map(Number);
  const [closeH, closeM] = businessCloseTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let mins = openMinutes; mins < closeMinutes; mins += 30) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push({ time: timeStr, available: true });
  }

  // COMBINE ALL BARBERS MODE: when no staffId and allBarbers=true
  if (combineAllBarbers && !staffId) {
    console.log('[availability] Combining availability from all barbers');

    // Get all barbers (users with role staff/owner/manager)
    const allBarbers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.role, ['owner', 'manager', 'staff']));

    if (allBarbers.length === 0) {
      return new Response(JSON.stringify({ date: dateStr, slots }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const barberIds = allBarbers.map(b => b.id);

    // Build a map of which barbers are available at each time slot
    const slotAvailability = new Map<string, number[]>();

    for (const barberId of barberIds) {
      // Check staff schedule for this barber
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

      // Skip barber if not working this day
      if (staffSchedule.length === 0 || !staffSchedule[0].openTime || !staffSchedule[0].closeTime) {
        continue;
      }

      // Constrain staff schedule to business hours
      const staffOpenMins = timeToMinutes(staffSchedule[0].openTime!);
      const staffCloseMins = timeToMinutes(staffSchedule[0].closeTime!);
      const businessOpenMins = timeToMinutes(businessOpenTime);
      const businessCloseMins = timeToMinutes(businessCloseTime);

      const effectiveOpenMins = Math.max(staffOpenMins, businessOpenMins);
      const effectiveCloseMins = Math.min(staffCloseMins, businessCloseMins);

      if (effectiveOpenMins >= effectiveCloseMins) {
        continue;
      }

      // Check which slots this barber has available
      const bookingConditions = [
        sql`${appointments.date} = ${dateStr}`,
        ne(appointments.status, 'cancelled'),
        eq(appointments.staffId, barberId)
      ];

      const booked = await db
        .select({ timeSlot: appointments.timeSlot })
        .from(appointments)
        .where(and(...bookingConditions));

      const bookedSet = new Set(booked.map(b => b.timeSlot));

      // Add this barber to available slots
      for (const slot of slots) {
        if (!bookedSet.has(slot.time)) {
          const availableBarbers = slotAvailability.get(slot.time) || [];
          availableBarbers.push(barberId);
          slotAvailability.set(slot.time, availableBarbers);
        }
      }
    }

    // Mark slots as unavailable if no barber is available
    for (const slot of slots) {
      const availableBarbers = slotAvailability.get(slot.time) || [];
      slot.available = availableBarbers.length > 0;
    }

    // Filter out past times if this is today
    if (isToday) {
      for (const slot of slots) {
        const [slotH, slotM] = slot.time.split(':').map(Number);
        const slotMinutes = slotH * 60 + slotM;
        if (slotMinutes <= currentTimeMinutes) {
          slot.available = false;
        }
      }
    }

    console.log('[availability] Combined slot availability:', Object.fromEntries(slotAvailability));

    return new Response(JSON.stringify({ date: dateStr, slots, combinedMode: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // SINGLE BARBER MODE: when staffId is provided
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

    console.log('[availability] staffSchedule:', staffSchedule);

    // Staff not working this day
    if (staffSchedule.length === 0 || !staffSchedule[0].openTime || !staffSchedule[0].closeTime) {
      console.log('[availability] Staff not working this day');
      return new Response(JSON.stringify({ date: dateStr, slots: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Constrain staff schedule to business hours
    const staffOpenMins = timeToMinutes(staffSchedule[0].openTime!);
    const staffCloseMins = timeToMinutes(staffSchedule[0].closeTime!);
    const businessOpenMins = timeToMinutes(businessOpenTime);
    const businessCloseMins = timeToMinutes(businessCloseTime);

    // Use the later of staff open / business open
    const effectiveOpenMins = Math.max(staffOpenMins, businessOpenMins);
    // Use the earlier of staff close / business close
    const effectiveCloseMins = Math.min(staffCloseMins, businessCloseMins);

    // If no overlap, staff schedule is outside business hours
    if (effectiveOpenMins >= effectiveCloseMins) {
      return new Response(JSON.stringify({ date: dateStr, slots: [] }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const openTime = minutesToTime(effectiveOpenMins);
    const closeTime = minutesToTime(effectiveCloseMins);

    // Regenerate slots based on effective hours (30-minute intervals)
    slots.length = 0;
    const [effOpenH, effOpenM] = openTime.split(':').map(Number);
    const [effCloseH, effCloseM] = closeTime.split(':').map(Number);
    const effOpenMinutes = effOpenH * 60 + effOpenM;
    const effCloseMinutes = effCloseH * 60 + effCloseM;

    for (let mins = effOpenMinutes; mins < effCloseMinutes; mins += 30) {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
      slots.push({ time: timeStr, available: true });
    }

    // Get existing bookings for this staff member on this date
    const bookingConditions = [
      sql`${appointments.date} = ${dateStr}`,
      ne(appointments.status, 'cancelled'),
      eq(appointments.staffId, staffId)
    ];

    const booked = await db
      .select({ timeSlot: appointments.timeSlot })
      .from(appointments)
      .where(and(...bookingConditions));

    console.log('[availability] booked slots:', booked);

    // Get blocked times (global blocks apply to everyone)
    const blocked = await db
      .select({ timeSlot: blockedTimes.timeSlot })
      .from(blockedTimes)
      .where(sql`${blockedTimes.date} = ${dateStr}`);

    const unavailableSet = new Set([
      ...booked.map(b => b.timeSlot),
      ...blocked.map(b => b.timeSlot)
    ]);

    for (const slot of slots) {
      if (unavailableSet.has(slot.time)) {
        slot.available = false;
      }
    }
  } else {
    // NO STAFF SELECTED YET: return all slots as available (will be filtered when date is selected)
    // Get blocked times (global blocks apply to everyone)
    const blocked = await db
      .select({ timeSlot: blockedTimes.timeSlot })
      .from(blockedTimes)
      .where(sql`${blockedTimes.date} = ${dateStr}`);

    for (const slot of slots) {
      if (blocked.some(b => b.timeSlot === slot.time)) {
        slot.available = false;
      }
    }
  }

  // Filter out past times if this is today
  if (isToday) {
    for (const slot of slots) {
      const [slotH, slotM] = slot.time.split(':').map(Number);
      const slotMinutes = slotH * 60 + slotM;
      if (slotMinutes <= currentTimeMinutes) {
        slot.available = false;
      }
    }
  }

  return new Response(JSON.stringify({ date: dateStr, slots }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
