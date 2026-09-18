import { db } from '$lib/server/db/index';
import { appointments, appointmentAddOns } from '$lib/server/db/schema';
import { appointmentSchema } from '$lib/utils/validation';
import { sendBookingConfirmation } from '$lib/server/mail/sendBookingConfirmation';
import { sendBookingNotification } from '$lib/server/mail/sendBookingNotification';
import { rateLimit, getClientIp } from '$lib/server/rateLimit';
import { PUBLIC_SITE_URL } from '$env/static/public';
import { SchedulingError, validateAppointmentConfiguration } from '$lib/server/scheduling';
import type { RequestHandler } from './$types';

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
  if (!clientEmail) {
    return new Response(JSON.stringify({ error: 'E-mailadres is verplicht' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  let created: Awaited<ReturnType<typeof validateAppointmentConfiguration>>;
  let appointmentId: number;
  try {
    const result = await db.transaction(async (tx) => {
      const configuration = await validateAppointmentConfiguration(tx, {
        serviceId,
        staffId: staffId ?? null,
        date,
        timeSlot,
        addOnIds
      }, { enforceBookingWindow: true });
      const insertResult = await tx.insert(appointments).values({
        serviceId,
        staffId: configuration.resolvedStaffId,
        date: configuration.appointmentDate,
        timeSlot,
        clientName,
        clientEmail,
        clientPhone: clientPhone || null,
        notes: notes || null
      });

      const newAppointmentId = insertResult[0].insertId;

      if (configuration.addOns.length > 0) {
        await tx.insert(appointmentAddOns).values(
          configuration.addOns.map((addOn) => ({
            appointmentId: newAppointmentId,
            serviceId: addOn.id,
            price: addOn.price,
            duration: addOn.duration
          }))
        );
      }
      return { appointmentId: newAppointmentId, configuration };
    });
    appointmentId = result.appointmentId;
    created = result.configuration;
  } catch (error) {
    if (error instanceof SchedulingError) {
      return new Response(JSON.stringify({ error: error.message, code: error.code }), {
        status: error.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.error('[appointments] transaction error:', error);
    return new Response(JSON.stringify({ error: 'Interne fout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Send confirmation email after the booking has been persisted.
  // Email failures are logged but never fail the booking itself.
  try {
    const mailResult = await sendBookingConfirmation({
      to: clientEmail,
      clientName,
      serviceName: created.service.name,
      barberName: created.barberName,
      date,
      time: timeSlot,
      duration: created.service.duration,
      price: created.service.price,
      notes: notes || null,
      siteUrl: PUBLIC_SITE_URL || 'https://cyrusbarbershop.nl',
      appointmentId,
      addOns: created.addOns.map((addOn) => ({ name: addOn.name, price: addOn.price }))
    });

    if (!mailResult.ok) {
      console.error('[BOOKING] Confirmation email not sent:', mailResult.reason);
    }

    // Notify the shop owner about the new booking. Independent of the
    // customer confirmation — a failure here never affects the booking.
    const addOnTotalPrice = created.addOns.reduce(
      (sum, addOn) => sum + Number.parseFloat(addOn.price || '0'),
      Number.parseFloat(created.service.price || '0')
    );
    const notifyResult = await sendBookingNotification({
      clientName,
      clientEmail,
      clientPhone: clientPhone || null,
      serviceName: created.service.name,
      barberName: created.barberName,
      date,
      time: timeSlot,
      duration: created.totalDuration,
      price: Number.isFinite(addOnTotalPrice) ? addOnTotalPrice : created.service.price,
      notes: notes || null,
      siteUrl: PUBLIC_SITE_URL || 'https://cyrusbarbershop.nl',
      appointmentId,
      addOns: created.addOns.map((addOn) => ({ name: addOn.name, price: addOn.price }))
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
