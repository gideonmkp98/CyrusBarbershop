import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { appointments, services, users } from '$lib/server/db/schema';
import { appointmentSchema } from '$lib/utils/validation';
import { eq, and, sql, desc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) {
    return json({ error: 'Niet ingelogd' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const parsed = appointmentSchema.safeParse(body);

    if (!parsed.success) {
      return json({ error: 'Validatie mislukt' }, { status: 400 });
    }

    const { serviceId, staffId, date, timeSlot, clientName, clientEmail, clientPhone, notes } = parsed.data;
    const appointmentDate = new Date(date + 'T00:00:00');

    // Staff may only create appointments assigned to themselves.
    const assignedStaffId = locals.user.role === 'staff' ? locals.user.id : staffId;

    // Controleer of het tijdstip niet al bezet is
    const existingAppointment = await db.query.appointments.findFirst({
      where: and(
        eq(appointments.date, appointmentDate),
        eq(appointments.timeSlot, timeSlot),
        staffId ? eq(appointments.staffId, staffId) : undefined
      )
    });

    if (existingAppointment) {
      return json({ error: 'Dit tijdstip is al bezet' }, { status: 409 });
    }

    // Maak de afspraak aan
    const result = await db.insert(appointments).values({
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

    return json({ success: true, id: result[0].insertId }, { status: 201 });
  } catch (error: any) {
    console.error('Fout bij aanmaken afspraak:', error);
    return json({ error: 'Er is iets misgegaan bij het aanmaken van de afspraak' }, { status: 500 });
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
