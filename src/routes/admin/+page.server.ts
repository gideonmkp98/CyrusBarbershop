import { db } from '$lib/server/db/index';
import { appointments, services } from '$lib/server/db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const today = new Date().toISOString().split('T')[0];
  const weekFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const todayAppts = await db
    .select({
      id: appointments.id,
      timeSlot: appointments.timeSlot,
      clientName: appointments.clientName,
      serviceName: services.name,
      status: appointments.status
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(sql`${appointments.date} = ${today}`);

  const weekAppts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(sql`${appointments.date} BETWEEN ${today} AND ${weekFromNow}`);

  const pendingAppts = await db
    .select({ id: appointments.id })
    .from(appointments)
    .where(eq(appointments.status, 'confirmed'));

  return {
    todayCount: todayAppts.length,
    weekCount: weekAppts.length,
    pendingCount: pendingAppts.length,
    todayAppointments: todayAppts
  };
};