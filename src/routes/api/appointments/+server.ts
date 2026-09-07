import { db } from '$lib/server/db/index';
import { appointments, appointmentAddOns, services, users } from '$lib/server/db/schema';
import { appointmentSchema } from '$lib/utils/validation';
import { sendBookingConfirmation } from '$lib/server/mail/sendBookingConfirmation';
import { sendBookingNotification } from '$lib/server/mail/sendBookingNotification';
import { rateLimit, getClientIp } from '$lib/server/rateLimit';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { sql, ne, eq, and, isNull, inArray } from 'drizzle-orm';
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

// Public booking endpoint: 10 attempts / minute / IP.
// Caps casual abuse (scripted attempts to find open slots) without affecting real users.
const RATE_LIMIT = { capacity: 10, refillPerSecond: 10 / 60 };

export const POST: RequestHandler = async ({ request }) => {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`booking:${ip}`, RATE_LIMIT);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: 'Te veel verzoeken, probeer later opnieuw' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000))
      }
    });
  }

  // Allow disabling public bookings while keeping the website live.
  if (process.env.BOOKING_ENABLED === 'false') {
    return new Response(
      JSON.stringify({
        error: 'Online boeken is momenteel niet mogelijk. Bel of app ons om een afspraak te maken.'
      }),
      { status: 503, headers: { 'Content-Type': 'application/json' } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldige invoer' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const parsed = appointmentSchema.safeParse(body);

  if (!parsed.success) {
    console.warn('[appointments] validation failed:', parsed.error.issues);
    return new Response(JSON.stringify({ error: 'Ongeldige invoer' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { serviceId, staffId, date, timeSlot, clientName, clientEmail, clientPhone, notes, addOnIds } = parsed.data;

  // Get details of the main service being booked
  const serviceResult = await db
    .select({ id: services.id, name: services.name, price: services.price, duration: services.duration, category: services.category })
    .from(services)
    .where(eq(services.id, serviceId));

  if (serviceResult.length === 0) {
    return new Response(JSON.stringify({ error: 'Service niet gevonden' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const bookedService = serviceResult[0];

  // Resolve add-ons (must be category 'extra' and active)
  let resolvedAddOns: { id: number; name: string; price: string; duration: number }[] = [];
  if (addOnIds && addOnIds.length > 0) {
    const uniqueIds = Array.from(new Set(addOnIds));
    const addOnResults = await db
      .select({ id: services.id, name: services.name, price: services.price, duration: services.duration, category: services.category, isActive: services.isActive })
      .from(services)
      .where(inArray(services.id, uniqueIds));

    if (addOnResults.length !== uniqueIds.length) {
      return new Response(JSON.stringify({ error: 'Eén of meer extra behandelingen bestaan niet' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const invalid = addOnResults.filter(a => a.category !== 'extra' || !a.isActive);
    if (invalid.length > 0) {
      return new Response(JSON.stringify({ error: 'Geselecteerde extra\'s zijn niet beschikbaar' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    resolvedAddOns = addOnResults.map(a => ({
      id: a.id,
      name: a.name,
      price: a.price,
      duration: a.duration
    }));
  }

  const addOnTotalDuration = resolvedAddOns.reduce((sum, a) => sum + a.duration, 0);
  const newServiceDuration = bookedService.duration + addOnTotalDuration;
  const newStartMinutes = timeToMinutes(timeSlot);
  const newEndMinutes = newStartMinutes + newServiceDuration;

  // The overlap check and insert run inside a single transaction so concurrent
  // requests cannot both observe an empty slot and create double bookings.
  let appointmentId: number;
  try {
    appointmentId = await db.transaction(async (tx) => {
      const txConditions = [
        sql`${appointments.date} = ${date}`,
        ne(appointments.status, 'cancelled')
      ];

      if (staffId) {
        txConditions.push(eq(appointments.staffId, staffId));
      } else {
        txConditions.push(isNull(appointments.staffId));
      }

      const existingInTx = await tx
        .select({
          id: appointments.id,
          timeSlot: appointments.timeSlot,
          serviceId: appointments.serviceId
        })
        .from(appointments)
        .where(and(...txConditions));

      for (const appt of existingInTx) {
        const durResult = await tx
          .select({ duration: services.duration })
          .from(services)
          .where(eq(services.id, appt.serviceId));
        const existingDuration = durResult.length > 0 ? durResult[0].duration : 30;
        const existingStart = timeToMinutes(appt.timeSlot);
        const existingEnd = existingStart + existingDuration;

        if (hasOverlap(newStartMinutes, newEndMinutes, existingStart, existingEnd)) {
          throw new Error('OVERLAP');
        }
      }

      const insertResult = await tx.insert(appointments).values({
        serviceId,
        staffId: staffId || null,
        date: new Date(date + 'T00:00:00'),
        timeSlot,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        notes: notes || null
      });

      const newAppointmentId = insertResult[0].insertId;

      if (resolvedAddOns.length > 0) {
        await tx.insert(appointmentAddOns).values(
          resolvedAddOns.map(a => ({
            appointmentId: newAppointmentId,
            serviceId: a.id,
            price: a.price,
            duration: a.duration
          }))
        );
      }

      return newAppointmentId;
    });
  } catch (txError: any) {
    if (txError?.message === 'OVERLAP') {
      return new Response(JSON.stringify({ error: 'Dit moment overlapt met een bestaande afspraak' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('[appointments] transaction error:', txError);
    return new Response(JSON.stringify({ error: 'Interne fout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

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
      appointmentId,
      addOns: resolvedAddOns.map(a => ({ name: a.name, price: a.price }))
    });

    if (!mailResult.ok) {
      console.error('[BOOKING] Confirmation email not sent:', mailResult.reason);
    }

    // Notify the shop owner about the new booking. Independent of the
    // customer confirmation — a failure here never affects the booking.
    const addOnTotalPrice = resolvedAddOns.reduce(
      (sum, a) => sum + Number.parseFloat(a.price || '0'),
      Number.parseFloat(bookedService.price || '0')
    );
    const notifyResult = await sendBookingNotification({
      clientName,
      clientEmail,
      clientPhone: clientPhone || null,
      serviceName: bookedService.name,
      barberName,
      date,
      time: timeSlot,
      duration: newServiceDuration,
      price: Number.isFinite(addOnTotalPrice) ? addOnTotalPrice : bookedService.price,
      notes: notes || null,
      siteUrl: PUBLIC_SITE_URL || 'https://cyrusbarbershop.nl',
      appointmentId,
      addOns: resolvedAddOns.map(a => ({ name: a.name, price: a.price }))
    });

    if (!notifyResult.ok) {
      console.error('[BOOKING] Owner notification not sent:', notifyResult.reason);
    }
  } catch (mailError) {
    console.error('[BOOKING] Unexpected error while sending confirmation email:', mailError);
  }

  return new Response(JSON.stringify({ success: true, id: appointmentId }), {
    status: 201,
    headers: { 'Content-Type': 'application/json' }
  });
};