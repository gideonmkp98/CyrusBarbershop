import { db } from '$lib/server/db/index';
import { staffSchedules } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  const staffId = parseInt(params.id, 10);

  if (isNaN(staffId)) {
    return new Response(JSON.stringify({ error: 'Ongeldig staffId' }), { status: 400 });
  }

  const schedules = await db
    .select()
    .from(staffSchedules)
    .where(eq(staffSchedules.staffId, staffId));

  // Convert to set of working days (1-7) where staff is active and has times
  const workingDays = schedules
    .filter(s => s.isActive && s.openTime && s.closeTime)
    .map(s => s.dayOfWeek);

  return new Response(JSON.stringify({ workingDays }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
