import { db } from '$lib/server/db/index';
import { appointments, services } from '$lib/server/db/schema';
import { eq, desc, sql, and, gte, lte } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  // Format dates as YYYY-MM-DD using local date, not UTC
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;
  
  const weekFromNowDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
  const weekFromNow = `${weekFromNowDate.getFullYear()}-${String(weekFromNowDate.getMonth() + 1).padStart(2, '0')}-${String(weekFromNowDate.getDate()).padStart(2, '0')}`;

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