import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appointments, appointmentAddOns, services, staffTimeOff, users } from '$lib/server/db/schema';
import { appointmentRescheduleSchema, appointmentSchema } from '$lib/utils/validation';
import { eq, and, sql, desc } from 'drizzle-orm';
import { appointmentStaffScope } from '$lib/server/appointment-scope';
import { SchedulingError, formatDateKey, validateAppointmentConfiguration } from '$lib/server/scheduling';
import type { RequestHandler } from './$types';

async function loadApprovedTimeOff(user: NonNullable<App.Locals['user']>, startDate?: string | null, endDate?: string | null) {
  const conditions: any[] = [eq(staffTimeOff.status, 'approved')];
  if (user.role === 'staff') conditions.push(eq(staffTimeOff.staffId, user.id));
  if (startDate) conditions.push(sql`${staffTimeOff.endDate} >= ${startDate}`);
  if (endDate) conditions.push(sql`${staffTimeOff.startDate} <= ${endDate}`);

  const rows = await db
    .select({
      id: staffTimeOff.id,
      staffId: staffTimeOff.staffId,
      startDate: staffTimeOff.startDate,
      endDate: staffTimeOff.endDate,
      reason: staffTimeOff.reason,
      employeeName: users.displayName
    })
    .from(staffTimeOff)
    .innerJoin(users, eq(staffTimeOff.staffId, users.id))
    .where(and(...conditions));

  return rows.map((entry) => ({
    ...entry,
    startDate: formatDateKey(entry.startDate),
    endDate: formatDateKey(entry.endDate)
  }));
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
    // Staff may only create appointments assigned to themselves.
    const assignedStaffId = locals.user.role === 'staff' ? locals.user.id : staffId ?? null;

    const created = await db.transaction(async (tx) => {
      const configuration = await validateAppointmentConfiguration(tx, {
        serviceId,
        staffId: assignedStaffId,
        date,
        timeSlot,
        addOnIds
      });
      const insertResult = await tx.insert(appointments).values({
          serviceId,
          staffId: configuration.resolvedStaffId,
          date: configuration.appointmentDate,
          timeSlot,
          clientName,
          clientEmail: clientEmail || '',
          clientPhone: clientPhone || null,
          notes: notes || null,
          status: 'confirmed'
        });

      const appointmentId = insertResult[0].insertId;
      if (configuration.addOns.length > 0) {
          await tx.insert(appointmentAddOns).values(
          configuration.addOns.map((addOn: any) => ({
              appointmentId,
              serviceId: addOn.id,
              price: addOn.price,
              duration: addOn.duration
            }))
          );
      }
      return { appointmentId, configuration };
    });

    return json({
      success: true,
      id: created.appointmentId,
      appointment: {
        id: created.appointmentId,
        date,
        timeSlot,
        clientName,
        clientEmail: clientEmail || '',
        clientPhone: clientPhone || null,
        serviceName: created.configuration.service.name,
        status: 'confirmed',
        barberName: created.configuration.barberName,
        staffId: created.configuration.resolvedStaffId,
        serviceId
      }
    }, { status: 201 });
  } catch (error: any) {
    if (error instanceof SchedulingError) {
      return json({ error: error.message, code: error.code }, { status: error.status });
    }
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

    if (body.serviceId !== undefined || body.staffId !== undefined || body.date !== undefined || body.timeSlot !== undefined) {
      if (locals.user.role === 'staff') {
        return json({ error: 'Alleen owner en manager kunnen afspraken verplaatsen' }, { status: 403 });
      }

      const parsed = appointmentRescheduleSchema.safeParse({
        ...body,
        id: Number(body.id),
        serviceId: Number(body.serviceId),
        staffId: Number(body.staffId)
      });
      if (!parsed.success) {
        return json({ error: parsed.error.issues[0]?.message || 'Ongeldige afspraakgegevens' }, { status: 400 });
      }

      const input = parsed.data;
      const existing = await db.select({ id: appointments.id }).from(appointments).where(eq(appointments.id, input.id)).limit(1);
      if (!existing[0]) return json({ error: 'Afspraak niet gevonden' }, { status: 404 });
      const existingAddOns = await db
        .select({ serviceId: appointmentAddOns.serviceId })
        .from(appointmentAddOns)
        .where(eq(appointmentAddOns.appointmentId, input.id));

      const configuration = await db.transaction(async (tx) => {
        const checked = await validateAppointmentConfiguration(tx, {
          serviceId: input.serviceId,
          staffId: input.staffId,
          date: input.date,
          timeSlot: input.timeSlot,
          addOnIds: existingAddOns.map((row) => row.serviceId)
        }, { excludeAppointmentId: input.id });

        await tx.update(appointments).set({
          serviceId: input.serviceId,
          staffId: input.staffId,
          date: checked.appointmentDate,
          timeSlot: input.timeSlot
        }).where(eq(appointments.id, input.id));
        return checked;
      });

      return json({
        success: true,
        appointment: {
          id: input.id,
          serviceId: input.serviceId,
          serviceName: configuration.service.name,
          staffId: input.staffId,
          barberName: configuration.barberName,
          date: input.date,
          timeSlot: input.timeSlot
        }
      });
    }

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
    if (error instanceof SchedulingError) {
      return json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error('Fout bij bijwerken status:', error);
    return json({ error: 'Er is iets misgegaan bij het bijwerken van de status' }, { status: 500 });
  }
};

export const GET: RequestHandler = async ({ url, locals }) => {
  if (!locals.user) {
    return json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const appointmentIdParam = url.searchParams.get('id');
    const startDate = url.searchParams.get('startDate');
    const endDate = url.searchParams.get('endDate');
    const cursor = url.searchParams.get('cursor');
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    if (appointmentIdParam) {
      const appointmentId = parseInt(appointmentIdParam, 10);
      if (!appointmentId) return json({ error: 'Ongeldig ID' }, { status: 400 });
      const rows = await db
        .select({ staffId: appointments.staffId })
        .from(appointments)
        .where(eq(appointments.id, appointmentId))
        .limit(1);
      if (!rows[0]) return json({ error: 'Afspraak niet gevonden' }, { status: 404 });
      if (locals.user.role === 'staff' && rows[0].staffId !== locals.user.id) {
        return json({ error: 'Geen toegang tot deze afspraak' }, { status: 403 });
      }
      const addOns = await db
        .select({ serviceId: appointmentAddOns.serviceId, duration: appointmentAddOns.duration })
        .from(appointmentAddOns)
        .where(eq(appointmentAddOns.appointmentId, appointmentId));
      return json({ addOns, addOnDuration: addOns.reduce((sum, addOn) => sum + addOn.duration, 0) });
    }

    // If date range provided, return appointments in that range
    if (startDate || endDate) {
      const startCond = startDate ? sql`${appointments.date} >= ${startDate}` : undefined;
      const endCond = endDate ? sql`${appointments.date} <= ${endDate}` : undefined;
      const dateWhere = startCond && endCond ? and(startCond, endCond) : startCond || endCond;
      // Staff are scoped to their own appointments only.
      const staffScope = appointmentStaffScope(locals.user);
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

      const timeOff = await loadApprovedTimeOff(locals.user, startDate, endDate);
      return json({ appointments: formatted, timeOff, hasMore, nextCursor });
    }

    // Cursor-based pagination for infinite scroll
    if (cursor) {
      const cursorId = parseInt(cursor, 10);
      const cursorCond = cursorId ? sql`${appointments.id} < ${cursorId}` : undefined;
      const staffScope = appointmentStaffScope(locals.user);
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
      where: (users, { eq, and }) => locals.user?.role === 'staff'
        ? and(eq(users.isBarber, true), eq(users.id, locals.user.id))
        : eq(users.isBarber, true),
      columns: { id: true, email: true, displayName: true, role: true }
    });

    return json({ services: allServices, staff: allStaff });
  } catch (error: any) {
    console.error('Fout bij ophalen data:', error);
    return json({ error: 'Er is iets misgegaan bij het ophalen van de gegevens' }, { status: 500 });
  }
};
