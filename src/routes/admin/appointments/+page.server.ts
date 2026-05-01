import { db } from '$lib/server/db/index';
import { appointments, services } from '$lib/server/db/schema';
import { eq, desc } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async () => {
  const result = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      timeSlot: appointments.timeSlot,
      clientName: appointments.clientName,
      clientEmail: appointments.clientEmail,
      serviceName: services.name,
      status: appointments.status
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .orderBy(desc(appointments.date));

  return { appointments: result };
};

export const actions: Actions = {
  default: async ({ request }) => {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !['completed', 'cancelled', 'no_show'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Ongeldige aanvraag' }), { status: 400 });
    }

    await db.update(appointments).set({ status }).where(eq(appointments.id, id));
    return new Response(JSON.stringify({ success: true }));
  }
};