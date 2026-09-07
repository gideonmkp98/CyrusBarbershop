import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appointments, appointmentAddOns, services, users } from '$lib/server/db/schema';
import { appointmentSchema } from '$lib/utils/validation';
import { eq, and, sql, desc, ne, isNull, inArray } from 'drizzle-orm';
import type { RequestHandler } from './$types';

/** Minuten vanaf een HH:MM tijdslot */
function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

/** Twee tijdranges overlappen? */
function hasOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && start2 < end1;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = appointmentSchema.safeParse(body);

    if (!parsed.success) {
      return json({ error: 'Validatie mislukt', issues: parsed.error.issues }, { status: 400 });
    }

    const { serviceId, staffId, date, timeSlot, clientName, clientEmail, clientPhone, notes, addOnIds } = parsed.data;
    const appointmentDate = new Date(date + 'T00:00:00');

    // Staff may only create appointments assigned to themselves.
    const assignedStaffId = locals.user.role === 'staff' ? locals.user.id : staffId;

    // Hoofdbehandeling ophalen
    const serviceResult = await db
      .select({ id: services.id, name: services.name, duration: services.duration, category: services.category, isActive: services.isActive })
      .from(services)
      .where(eq(services.id, serviceId))
      .limit(1);

    if (serviceResult.length === 0) {
      return json({ error: 'Service niet gevonden' }, { status: 404 });
    }

    const bookedService = serviceResult[0];

    // Barber-displaynaam ophalen voor client-side weergave
    let barberName: string | null = null;
    if (assignedStaffId) {
      const staffResult = await db
        .select({ displayName: users.displayName })
        .from(users)
        .where(eq(users.id, assignedStaffId))
        .limit(1);
      if (staffResult.length > 0) barberName = staffResult[0].displayName;
    }

    // Extras valideren (moeten category 'extra' en actief zijn)
    let resolvedAddOns: { id: number; price: string; duration: number }[] = [];
    if (addOnIds && addOnIds.length > 0) {
      const uniqueIds = Array.from(new Set(addOnIds));
      const addOnResults = await db
        .select({ id: services.id, price: services.price, duration: services.duration, category: services.category, isActive: services.isActive })
        .from(services)
        .where(inArray(services.id, uniqueIds));

      if (addOnResults.length !== uniqueIds.length) {
        return json({ error: 'Eén of meer extra behandelingen bestaan niet' }, { status: 400 });
      }

      const invalid = addOnResults.filter(a => a.category !== 'extra' || !a.isActive);
      if (invalid.length > 0) {
        return json({ error: 'Geselecteerde extra\'s zijn niet beschikbaar' }, { status: 400 });
      }

      resolvedAddOns = addOnResults.map(a => ({ id: a.id, price: a.price, duration: a.duration }));
    }

    const addOnTotalDuration = resolvedAddOns.reduce((sum, a) => sum + a.duration, 0);
    const totalDuration = bookedService.duration + addOnTotalDuration;
    const newStart = timeToMinutes(timeSlot);
    const newEnd = newStart + totalDuration;

    // Overlap-check + insert in één transactie (voorkomt dubbele boekingen bij gelijktijdigheid)
    let appointmentId: number;
    try {
      appointmentId = await db.transaction(async (tx) => {
        const txConditions: any[] = [
          sql`${appointments.date} = ${appointmentDate}`,
          ne(appointments.status, 'cancelled')
        ];

        if (assignedStaffId) {
          txConditions.push(eq(appointments.staffId, assignedStaffId));
        } else {
          txConditions.push(isNull(appointments.staffId));
        }

        const existing = await tx
          .select({ id: appointments.id, timeSlot: appointments.timeSlot, serviceId: appointments.serviceId })
          .from(appointments)
          .where(and(...txConditions));

        for (const appt of existing) {
          const durResult = await tx
            .select({ duration: services.duration })
            .from(services)
            .where(eq(services.id, appt.serviceId))
            .limit(1);
          const existingDuration = durResult.length > 0 ? durResult[0].duration : 30;
          const existingStart = timeToMinutes(appt.timeSlot);
          const existingEnd = existingStart + existingDuration;

          if (hasOverlap(newStart, newEnd, existingStart, existingEnd)) {
            throw new Error('OVERLAP');
          }
        }

        const insertResult = await tx.insert(appointments).values({
          serviceId,
          staffId: assignedStaffId || null,
          date: appointmentDate,
          timeSlot,
          clientName,
          clientEmail: clientEmail || '',
          clientPhone: clientPhone || null,
          notes: notes || null,
          status: 'confirmed'
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
        return json({ error: 'Dit moment overlapt met een bestaande afspraak' }, { status: 409 });
      }
      throw txError;
    }

    const dateStr = `${appointmentDate.getFullYear()}-${String(appointmentDate.getMonth() + 1).padStart(2, '0')}-${String(appointmentDate.getDate()).padStart(2, '0')}`;

    return json({
      success: true,
      id: appointmentId,
      appointment: {
        id: appointmentId,
        date: dateStr,
        timeSlot,
        clientName,
        clientEmail: clientEmail || '',
        clientPhone: clientPhone || null,
        serviceName: bookedService.name,
        status: 'confirmed',
        barberName,
        staffId: assignedStaffId || null,
        serviceId
      }
    }, { status: 201 });
  } catch (error: any) {
    console.error('Fout bij aanmaken afspraak:', error);
    return json({ error: 'Er is iets misgegaan bij het aanmaken van de afspraak' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status } = body as { id?: unknown; status?: 'completed' | 'cancelled' | 'no_show' };

    if (
      typeof id === 'undefined' ||
      typeof status !== 'string' ||
      !['completed', 'cancelled', 'no_show'].includes(status)
    ) {
      return json({ error: 'Ongeldige aanvraag' }, { status: 400 });
    }

    const appointmentId = parseInt(String(id), 10);
    if (!appointmentId) {
      return json({ error: 'Ongeldig ID' }, { status: 400 });
    }

    // Staff mogen alleen eigen afspraken bijwerken.
    const target = await db
      .select({ staffId: appointments.staffId })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (target.length === 0) {
      return json({ error: 'Afspraak niet gevonden' }, { status: 404 });
    }

    if (locals.user.role === 'staff' && target[0].staffId !== locals.user.id) {
      return json({ error: 'Geen toegang tot deze afspraak' }, { status: 403 });
    }

    await db.update(appointments).set({ status }).where(eq(appointments.id, appointmentId));
    return json({ success: true });
  } catch (error: any) {
    console.error('Fout bij bijwerken status:', error);
    return json({ error: 'Er is iets misgegaan bij het bijwerken van de status' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const cursor = url.searchParams.get('cursor');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    // If date range provided, return appointments in that range
    if (startDate || endDate) {
      const startCond = startDate ? sql`${appointments.date} >= ${startDate}` : undefined;
      const endCond = endDate ? sql`${appointments.date} <= ${endDate}` : undefined;
      const dateWhere = startCond && endCond ? and(startCond, endCond) : startCond || endCond;
      // Staff are scoped to their own appointments only.
      const staffScope = locals.user.role === 'staff' ? eq(appointments.staffId, locals.user.id) : undefined;
      const whereClause = dateWhere && staffScope
        ? and(dateWhere, staffScope)
        : dateWhere || staffScope;

      const result = await db
        .select({
          id: appointments.id,
          date: appointments.date,
          timeSlot: appointments.timeSlot,
          clientName: appointments.clientName,
          clientEmail: appointments.clientEmail,
          clientPhone: appointments.clientPhone,
          serviceName: services.name,
          status: appointments.status,
          barberName: users.displayName,
          staffId: appointments.staffId,
          serviceId: appointments.serviceId
        })
        .from(appointments)
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(users, eq(appointments.staffId, users.id))
        .where(whereClause)
        .orderBy(desc(appointments.date))
        .limit(limit + 1); // Fetch one extra to check if there's more

      const formatted = result.map(apt => ({
        ...apt,
        date: apt.date instanceof Date
          ? `${apt.date.getFullYear()}-${String(apt.date.getMonth() + 1).padStart(2, '0')}-${String(apt.date.getDate()).padStart(2, '0')}`
          : apt.date
      }));

      // Check if there are more results
      let hasMore = false;
      let nextCursor: string | null = null;
      if (formatted.length > limit) {
        hasMore = true;
        const lastItem = formatted.pop(); // Remove the extra item
        nextCursor = lastItem ? String(lastItem.id) : null;
      }

      return json({ appointments: formatted, hasMore, nextCursor });
    }

    // Cursor-based pagination for infinite scroll
    if (cursor) {
      const cursorId = parseInt(cursor, 10);
      const cursorCond = cursorId ? sql`${appointments.id} < ${cursorId}` : undefined;
      const staffScope = locals.user.role === 'staff' ? eq(appointments.staffId, locals.user.id) : undefined;
      const whereClause = cursorCond && staffScope
        ? and(cursorCond, staffScope)
        : cursorCond || staffScope;

      const result = await db
        .select({
          id: appointments.id,
          date: appointments.date,
          timeSlot: appointments.timeSlot,
          clientName: appointments.clientName,
          clientEmail: appointments.clientEmail,
          clientPhone: appointments.clientPhone,
          serviceName: services.name,
          status: appointments.status,
          barberName: users.displayName,
          staffId: appointments.staffId,
          serviceId: appointments.serviceId
        })
        .from(appointments)
        .innerJoin(services, eq(appointments.serviceId, services.id))
        .leftJoin(users, eq(appointments.staffId, users.id))
        .where(whereClause)
        .orderBy(desc(appointments.date))
        .limit(limit + 1);

      const formatted = result.map(apt => ({
        ...apt,
        date: apt.date instanceof Date
          ? `${apt.date.getFullYear()}-${String(apt.date.getMonth() + 1).padStart(2, '0')}-${String(apt.date.getDate()).padStart(2, '0')}`
          : apt.date
      }));

      let hasMore = false;
      let nextCursor: string | null = null;
      if (formatted.length > limit) {
        hasMore = true;
        const lastItem = formatted.pop();
        nextCursor = lastItem ? String(lastItem.id) : null;
      }

      return json({ appointments: formatted, hasMore, nextCursor });
    }

    // Fallback: return services and staff for the create form
    const allServices = await db.query.services.findMany({
      where: (services, { eq }) => eq(services.isActive, true),
      orderBy: (services, { asc }) => [asc(services.displayOrder), asc(services.name)]
    });

    const allStaff = await db.query.users.findMany({
      where: (users, { eq }) => eq(users.isBarber, true),
      columns: { id: true, email: true, displayName: true, role: true }
    });

    return json({ services: allServices, staff: allStaff });
  } catch (error: any) {
    console.error('Fout bij ophalen data:', error);
    return json({ error: 'Er is iets misgegaan bij het ophalen van de gegevens' }, { status: 500 });
  }
};
