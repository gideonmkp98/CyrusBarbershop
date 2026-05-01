import { db } from '$lib/server/db/index';
import { openingHours, appointments, blockedTimes } from '$lib/server/db/schema';
import { eq, and, ne, sql } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url }) => {
  const dateStr = url.searchParams.get('date');
  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return new Response(JSON.stringify({ error: 'Ongeldig datumformaat' }), { status: 400 });
  }

  const date = new Date(dateStr + 'T00:00:00');
  const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay();

  // Check if open on this day
  const hours = await db
    .select()
    .from(openingHours)
    .where(and(eq(openingHours.dayOfWeek, dayOfWeek), eq(openingHours.isActive, true)));

  if (hours.length === 0) {
    return new Response(JSON.stringify({ date: dateStr, slots: [] }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { openTime, closeTime } = hours[0];

  // Generate hourly time slots
  const slots: { time: string; available: boolean }[] = [];
  const [openH, openM] = openTime.split(':').map(Number);
  const [closeH, closeM] = closeTime.split(':').map(Number);
  const openMinutes = openH * 60 + openM;
  const closeMinutes = closeH * 60 + closeM;

  for (let mins = openMinutes; mins < closeMinutes; mins += 60) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    const timeStr = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
    slots.push({ time: timeStr, available: true });
  }

  // Get existing bookings for this date
  const booked = await db
    .select({ timeSlot: appointments.timeSlot })
    .from(appointments)
    .where(and(sql`${appointments.date} = ${dateStr}`, ne(appointments.status, 'cancelled')));

  // Get blocked times
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

  return new Response(JSON.stringify({ date: dateStr, slots }), {
    headers: { 'Content-Type': 'application/json' }
  });
};