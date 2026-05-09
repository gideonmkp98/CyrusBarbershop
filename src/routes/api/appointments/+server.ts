import { db } from '$lib/server/db/index';
import { appointments } from '$lib/server/db/schema';
import { appointmentSchema } from '$lib/utils/validation';
import { sql, ne, eq, and, isNull } from 'drizzle-orm';
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

  const { serviceId, staffId, date, timeSlot, clientName, clientEmail, clientPhone, notes } = parsed.data;

  // Double-booking check: check if this staff member is already booked at this time
  const bookingConditions = [
    sql`${appointments.date} = ${date}`,
    sql`${appointments.timeSlot} = ${timeSlot}`,
    ne(appointments.status, 'cancelled')
  ];

  if (staffId) {
    // If staffId provided, check only that staff member's bookings
    bookingConditions.push(eq(appointments.staffId, staffId));
  } else {
    // If no staffId, check all appointments without staff assignment
    bookingConditions.push(isNull(appointments.staffId));
  }

  const existing = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(and(...bookingConditions));

  if (existing.length > 0) {
    return new Response(JSON.stringify({ error: 'Dit moment is al geboekt' }), {
      status: 409,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const result = await db.insert(appointments).values({
    serviceId,
    staffId: staffId || null,
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