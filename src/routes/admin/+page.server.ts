import { db } from '$lib/server/db/index';
import { appointments, services, staffTimeOff, users } from '$lib/server/db/schema';
import { eq, asc, sql, and } from 'drizzle-orm';
import { appointmentStaffScope } from '$lib/server/appointment-scope';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  // Staff zien uitsluitend hun eigen afspraken (zelfde scope als op /admin/appointments).
  const staffScope = appointmentStaffScope(locals.user);
  // Format dates as YYYY-MM-DD using local date, not UTC
  const todayDate = new Date();
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`;

  const weekFromNowDate = new Date(Date.now() + 6 * 24 * 60 * 60 * 1000);
  const weekFromNow = `${weekFromNowDate.getFullYear()}-${String(weekFromNowDate.getMonth() + 1).padStart(2, '0')}-${String(weekFromNowDate.getDate()).padStart(2, '0')}`;

  const todayAppts = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      timeSlot: appointments.timeSlot,
      clientName: appointments.clientName,
      serviceName: services.name,
      duration: services.duration,
      clientPhone: appointments.clientPhone,
      barberName: users.displayName,
      staffId: appointments.staffId,
      status: appointments.status
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(users, eq(appointments.staffId, users.id))
    .where(staffScope ? and(sql`${appointments.date} = ${today}`, staffScope) : sql`${appointments.date} = ${today}`)
    .orderBy(asc(appointments.timeSlot));

  const weekAppts = await db
    .select({
      id: appointments.id,
      date: appointments.date,
      timeSlot: appointments.timeSlot,
      clientName: appointments.clientName,
      serviceName: services.name,
      duration: services.duration,
      clientPhone: appointments.clientPhone,
      barberName: users.displayName,
      staffId: appointments.staffId,
      status: appointments.status
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .leftJoin(users, eq(appointments.staffId, users.id))
    .where(
      staffScope
        ? and(sql`${appointments.date} BETWEEN ${today} AND ${weekFromNow}`, staffScope)
        : sql`${appointments.date} BETWEEN ${today} AND ${weekFromNow}`
    )
    .orderBy(asc(appointments.date), asc(appointments.timeSlot));

  const formatDateKey = (value: unknown) => {
    if (value instanceof Date) {
      return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
    }

    return String(value);
  };

  const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

  const weekDays = Array.from({ length: 7 }, (_, index) => {
    const date = new Date(todayDate);
    date.setDate(todayDate.getDate() + index);
    const key = formatDateKey(date);
    const count = weekAppts.filter((appt) => formatDateKey(appt.date) === key).length;

    return {
      key,
      label: index === 0 ? 'Vandaag' : capitalize(date.toLocaleDateString('nl-NL', { weekday: 'long' })),
      day: date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit' }),
      count
    };
  });

  const timeOffConditions: any[] = [
    eq(staffTimeOff.status, 'approved'),
    sql`${staffTimeOff.startDate} <= ${weekFromNow}`,
    sql`${staffTimeOff.endDate} >= ${today}`
  ];
  if (locals.user?.role === 'staff') timeOffConditions.push(eq(staffTimeOff.staffId, locals.user.id));
  const upcomingTimeOff = await db
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
    .where(and(...timeOffConditions))
    .orderBy(asc(staffTimeOff.startDate));

  return {
    todayCount: todayAppts.length,
    weekCount: weekAppts.length,
    busiestDay: weekDays.reduce((best, day) => day.count > best.count ? day : best, weekDays[0]),
    weekDays,
    upcomingTimeOff: upcomingTimeOff.map((entry) => ({
      ...entry,
      startDate: formatDateKey(entry.startDate),
      endDate: formatDateKey(entry.endDate)
    })),
    nextAppointment: weekAppts.find((appt) => appt.status === 'confirmed') ?? null,
    weekAppointments: weekAppts.map((appt) => ({
      ...appt,
      date: formatDateKey(appt.date)
    }))
  };
};
