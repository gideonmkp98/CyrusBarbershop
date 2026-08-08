import { db } from '$lib/server/db/index';
import { appointments, services, users } from '$lib/server/db/schema';
import { eq, desc, and, sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

const PAGE_SIZE = 50;

export const load: PageServerLoad = async () => {
  // Haal de meest recente afspraken (pagina 1)
  const appointmentsResult = await db
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
    .orderBy(desc(appointments.date))
    .limit(PAGE_SIZE + 1);

  // Check if there are more results
  let hasMore = false;
  let nextCursor: string | null = null;
  if (appointmentsResult.length > PAGE_SIZE) {
    hasMore = true;
    const lastItem = appointmentsResult.pop();
    nextCursor = lastItem ? String(lastItem.id) : null;
  }

  // Format dates to YYYY-MM-DD strings
  const formattedAppointments = appointmentsResult.map(apt => ({
    ...apt,
    date: apt.date instanceof Date
      ? `${apt.date.getFullYear()}-${String(apt.date.getMonth() + 1).padStart(2, '0')}-${String(apt.date.getDate()).padStart(2, '0')}`
      : apt.date
  }));

  // Haal alle actieve services op
  const allServices = await db
    .select({
      id: services.id,
      name: services.name,
      price: services.price,
      duration: services.duration
    })
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(services.displayOrder, services.name);

  // Haal alle barbers/staff op
  const allStaff = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      role: users.role
    })
    .from(users)
    .where(eq(users.isBarber, true));

  return {
    appointments: formattedAppointments,
    services: allServices,
    staff: allStaff,
    nextCursor,
    hasMore
  };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    // Auth gate: form actions are POST endpoints reachable directly,
    // so the +layout.server.ts redirect does NOT protect this handler.
    if (!locals.user) {
      return new Response(JSON.stringify({ error: 'Niet ingelogd' }), { status: 401 });
    }

    let body: any;
    try {
      body = await request.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Ongeldige aanvraag' }), { status: 400 });
    }

    const { id, status } = body;

    if (!id || !['completed', 'cancelled', 'no_show'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Ongeldige aanvraag' }), { status: 400 });
    }

    const appointmentId = parseInt(String(id), 10);
    if (!appointmentId) {
      return new Response(JSON.stringify({ error: 'Ongeldig ID' }), { status: 400 });
    }

    // Staff may only modify appointments assigned to themselves.
    const target = await db
      .select({ staffId: appointments.staffId })
      .from(appointments)
      .where(eq(appointments.id, appointmentId))
      .limit(1);

    if (target.length === 0) {
      return new Response(JSON.stringify({ error: 'Afspraak niet gevonden' }), { status: 404 });
    }

    if (locals.user.role === 'staff' && target[0].staffId !== locals.user.id) {
      return new Response(JSON.stringify({ error: 'Geen toegang tot deze afspraak' }), { status: 403 });
    }

    await db.update(appointments).set({ status }).where(eq(appointments.id, appointmentId));
    return new Response(JSON.stringify({ success: true }));
  }
};