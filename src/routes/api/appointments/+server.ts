import { db } from '$lib/server/db/index';
import { appointments, services } from '$lib/server/db/schema';
import { appointmentSchema } from '$lib/utils/validation';
import { sql, ne, eq, and, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/** Calculate end time in minutes from a timeSlot string and duration in minutes */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Check if two time ranges overlap */
function hasOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && start2 < end1;
}

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

  // Get duration of the service being booked
  const serviceResult = await db
    .select({ duration: services.duration })
    .from(services)
    .where(eq(services.id, serviceId));

  if (serviceResult.length === 0) {
    return new Response(JSON.stringify({ error: 'Service niet gevonden' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const newServiceDuration = serviceResult[0].duration;
  const newStartMinutes = timeToMinutes(timeSlot);
  const newEndMinutes = newStartMinutes + newServiceDuration;

  // Get all existing appointments for this staff member on this date
  const bookingConditions = [
    sql`${appointments.date} = ${date}`,
    ne(appointments.status, 'cancelled')
  ];

  if (staffId) {
    bookingConditions.push(eq(appointments.staffId, staffId));
  } else {
    bookingConditions.push(isNull(appointments.staffId));
  }

  const existingAppointments = await db
    .select({
      id: appointments.id,
      timeSlot: appointments.timeSlot,
      serviceId: appointments.serviceId
    })
    .from(appointments)
    .where(and(...bookingConditions));

  // Check for overlap with each existing appointment
  for (const appointment of existingAppointments) {
    const existingServiceResult = await db
      .select({ duration: services.duration })
      .from(services)
      .where(eq(services.id, appointment.serviceId));

    const existingDuration = existingServiceResult.length > 0
      ? existingServiceResult[0].duration
      : 30;

    const existingStartMinutes = timeToMinutes(appointment.timeSlot);
    const existingEndMinutes = existingStartMinutes + existingDuration;

    if (hasOverlap(newStartMinutes, newEndMinutes, existingStartMinutes, existingEndMinutes)) {
      return new Response(JSON.stringify({ error: 'Dit moment overlapt met een bestaande afspraak' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
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