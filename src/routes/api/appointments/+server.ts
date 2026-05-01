import { db } from '$lib/server/db/index';
import { appointments } from '$lib/server/db/schema';
import { appointmentSchema } from '$lib/utils/validation';
import { sql, ne } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const parsed = appointmentSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Validatie mislukt', issues: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { serviceId, date, timeSlot, clientName, clientEmail, clientPhone, notes } = parsed.data;

  // Double-booking check
  const existing = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(sql`${appointments.date} = ${date} AND ${appointments.timeSlot} = ${timeSlot} AND ${appointments.status} != 'cancelled'`);

  if (existing.length > 0) {
    return new Response(JSON.stringify({ error: 'Dit moment is al geboekt' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await db.insert(appointments).values({
    serviceId,
    date: new Date(date + 'T00:00:00'),
    timeSlot,
    clientName,
    clientEmail,
    clientPhone: clientPhone || null,
    notes: notes || null
  });

  return new Response(JSON.stringify({ success: true, id: result[0].insertId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};