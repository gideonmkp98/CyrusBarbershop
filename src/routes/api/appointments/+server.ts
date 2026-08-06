import { db } from '$lib/server/db/index';
import { appointments, services, users } from '$lib/server/db/schema';
import { appointmentSchema } from '$lib/utils/validation';
import { sendBookingConfirmation } from '$lib/server/mail/sendBookingConfirmation';
import { PUBLIC_SITE_URL } from '$env/static/public';
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
  // Allow disabling public bookings while keeping the website live.
  if (process.env.BOOKING_ENABLED === 'false') {
    return new Response(
      JSON.stringify({
        error: 'Online boeken is momenteel niet mogelijk. Bel of app ons om een afspraak te maken.'
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const body = await request.json();
  const parsed = appointmentSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Validatie mislukt', issues: parsed.error.issues }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { serviceId, staffId, date, timeSlot, clientName, clientEmail, clientPhone, notes } = parsed.data;

  // Get details of the service being booked
  const serviceResult = await db
    .select({ name: services.name, price: services.price, duration: services.duration })
    .from(services)
    .where(eq(services.id, serviceId));

  if (serviceResult.length === 0) {
    return new Response(JSON.stringify({ error: 'Service niet gevonden' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const bookedService = serviceResult[0];
  const newServiceDuration = bookedService.duration;
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

  const appointmentId = result[0].insertId;

  // Send confirmation email after the booking has been persisted.
  // Email failures are logged but never fail the booking itself.
  try {
    let barberName: string | null = null;
    if (staffId) {
      const barberResult = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, staffId))
        .limit(1);
      barberName = barberResult[0]?.displayName ?? null;
    }

    const mailResult = await sendBookingConfirmation({
      to: clientEmail,
      clientName,
      serviceName: bookedService.name,
      barberName,
      date,
      time: timeSlot,
      duration: bookedService.duration,
      price: bookedService.price,
      notes: notes || null,
      siteUrl: PUBLIC_SITE_URL || 'https://cyrusbarbershop.nl',
      appointmentId
    });

    if (!mailResult.ok) {
      console.error('[BOOKING] Confirmation email not sent:', mailResult.reason);
    }
  } catch (mailError) {
    console.error('[BOOKING] Unexpected error while sending confirmation email:', mailError);
  }

  return new Response(JSON.stringify({ success: true, id: appointmentId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};