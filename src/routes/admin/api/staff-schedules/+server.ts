import { db } from '$lib/server/db/index';
import { staffSchedules, openingHours } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

export const GET: RequestHandler = async ({ url }) => {
  const staffId = url.searchParams.get('staffId');

  if (!staffId) {
    return new Response(JSON.stringify({ error: 'staffId vereist' }), { status: 400 });
  }

  const schedules = await db
    .select()
    .from(staffSchedules)
    .where(eq(staffSchedules.staffId, parseInt(staffId, 10)))
    .orderBy(staffSchedules.dayOfWeek);

  return new Response(JSON.stringify({ schedules }), {
    headers: { 'Content-Type': 'application/json' }
  });
};

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const { staffId, dayOfWeek, openTime, closeTime, isActive = true } = body;

  if (!staffId || dayOfWeek === undefined) {
    return new Response(JSON.stringify({ error: 'staffId en dayOfWeek vereist' }), { status: 400 });
  }

  const staffIdNum = parseInt(staffId, 10);
  const dayOfWeekNum = parseInt(dayOfWeek, 10);

  // Validate dayOfWeek (1-7)
  if (dayOfWeekNum < 1 || dayOfWeekNum > 7) {
    return new Response(JSON.stringify({ error: 'dayOfWeek moet tussen 1 en 7 zijn' }), { status: 400 });
  }

  // Validate times: staff schedule must be within business opening hours
  if (openTime && closeTime) {
    const businessHours = await db
      .select()
      .from(openingHours)
      .where(and(eq(openingHours.dayOfWeek, dayOfWeekNum), eq(openingHours.isActive, true)));

    if (businessHours.length > 0) {
      const bizOpen = timeToMinutes(businessHours[0].openTime);
      const bizClose = timeToMinutes(businessHours[0].closeTime);
      const staffOpen = timeToMinutes(openTime);
      const staffClose = timeToMinutes(closeTime);

      // Staff cannot work before business opens or after business closes
      if (staffOpen < bizOpen || staffClose > bizClose) {
        return new Response(JSON.stringify({
          error: `Werktijd moet binnen openingstijden vallen (${businessHours[0].openTime} - ${businessHours[0].closeTime})`
        }), { status: 400 });
      }

      // Staff close time must be after open time
      if (staffClose <= staffOpen) {
        return new Response(JSON.stringify({ error: 'Sluitingstijd moet na openingstijd zijn' }), { status: 400 });
      }
    }
  }

  // Check if schedule exists
  const existing = await db
    .select()
    .from(staffSchedules)
    .where(and(eq(staffSchedules.staffId, staffIdNum), eq(staffSchedules.dayOfWeek, dayOfWeekNum)));

  let result;

  if (existing.length > 0) {
    // Update existing
    result = await db
      .update(staffSchedules)
      .set({
        openTime: openTime || null,
        closeTime: closeTime || null,
        isActive
      })
      .where(and(eq(staffSchedules.staffId, staffIdNum), eq(staffSchedules.dayOfWeek, dayOfWeekNum)));
  } else {
    // Insert new
    result = await db.insert(staffSchedules).values({
      staffId: staffIdNum,
      dayOfWeek: dayOfWeekNum,
      openTime: openTime || null,
      closeTime: closeTime || null,
      isActive
    });
  }

  return new Response(JSON.stringify({ success: true, id: result[0]?.insertId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};

export const DELETE: RequestHandler = async ({ url }) => {
  const staffId = url.searchParams.get('staffId');
  const dayOfWeek = url.searchParams.get('dayOfWeek');

  if (!staffId || !dayOfWeek) {
    return new Response(JSON.stringify({ error: 'staffId en dayOfWeek vereist' }), { status: 400 });
  }

  await db
    .delete(staffSchedules)
    .where(
      and(
        eq(staffSchedules.staffId, parseInt(staffId, 10)),
        eq(staffSchedules.dayOfWeek, parseInt(dayOfWeek, 10))
      )
    );

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
