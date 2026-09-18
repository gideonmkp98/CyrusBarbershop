import { and, eq, inArray, ne, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
  appointments,
  appointmentAddOns,
  blockedTimes,
  openingHours,
  services,
  staffSchedules,
  staffTimeOff,
  users
} from '$lib/server/db/schema';

type Database = typeof db | any;

export type AppointmentConfiguration = {
  serviceId: number;
  staffId: number | null;
  date: string;
  timeSlot: string;
  addOnIds?: number[];
};

export type TimeOffConflict = {
  id: number;
  date: string;
  timeSlot: string;
  clientName: string;
  serviceName: string;
  status: 'confirmed' | 'completed' | 'cancelled' | 'no_show';
};

export class SchedulingError extends Error {
  constructor(message: string, public status = 400, public code = 'INVALID_SCHEDULE') {
    super(message);
  }
}

export function formatDateKey(value: Date | string): string {
  if (typeof value === 'string') return value.slice(0, 10);
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`;
}

export function parseDateKey(value: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new SchedulingError('Ongeldige datum');
  }

  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  if (formatDateKey(parsed) !== value) {
    throw new SchedulingError('Ongeldige datum');
  }
  return parsed;
}

export function validateDateRange(startDate: string, endDate: string): void {
  parseDateKey(startDate);
  parseDateKey(endDate);
  if (startDate > endDate) {
    throw new SchedulingError('De einddatum moet op of na de begindatum liggen');
  }
}

export function timeToMinutes(value: string): number {
	const match = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/.exec(value);
  if (!match) throw new SchedulingError('Ongeldig tijdstip');
  return Number(match[1]) * 60 + Number(match[2]);
}

function hasOverlap(start1: number, end1: number, start2: number, end2: number): boolean {
  return start1 < end2 && start2 < end1;
}

function isWithinBookingWindow(date: Date): boolean {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + 70);
  return date >= today && date <= maxDate;
}

export async function isStaffUnavailable(
  staffId: number,
  date: string,
  database: Database = db
): Promise<boolean> {
  const rows = await database
    .select({ id: staffTimeOff.id })
    .from(staffTimeOff)
    .where(and(
      eq(staffTimeOff.staffId, staffId),
      eq(staffTimeOff.status, 'approved'),
      sql`${staffTimeOff.startDate} <= ${date}`,
      sql`${staffTimeOff.endDate} >= ${date}`
    ))
    .limit(1);

  return rows.length > 0;
}

export async function findTimeOffConflicts(
  staffId: number,
  startDate: string,
  endDate: string,
  database: Database = db
): Promise<TimeOffConflict[]> {
  validateDateRange(startDate, endDate);

  const rows = await database
    .select({
      id: appointments.id,
      date: appointments.date,
      timeSlot: appointments.timeSlot,
      clientName: appointments.clientName,
      serviceName: services.name,
      status: appointments.status
    })
    .from(appointments)
    .innerJoin(services, eq(appointments.serviceId, services.id))
    .where(and(
      eq(appointments.staffId, staffId),
      ne(appointments.status, 'cancelled'),
      sql`${appointments.date} >= ${startDate}`,
      sql`${appointments.date} <= ${endDate}`
    ))
    .orderBy(appointments.date, appointments.timeSlot);

  return rows.map((row: any) => ({ ...row, date: formatDateKey(row.date) }));
}

async function validateStaffSlot(
  database: Database,
  staffId: number,
  date: string,
  dayOfWeek: number,
  startMinutes: number,
  endMinutes: number,
  excludeAppointmentId?: number
): Promise<string> {
  const barber = await database
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(and(eq(users.id, staffId), eq(users.isBarber, true), eq(users.isActive, true)))
    .limit(1);
  if (!barber[0]) throw new SchedulingError('Deze medewerker is niet beschikbaar voor boekingen', 400, 'INVALID_STAFF');

  if (await isStaffUnavailable(staffId, date, database)) {
    throw new SchedulingError('Deze medewerker is afwezig op deze datum', 409, 'STAFF_TIME_OFF');
  }

  const schedule = await database
    .select()
    .from(staffSchedules)
    .where(and(
      eq(staffSchedules.staffId, staffId),
      eq(staffSchedules.dayOfWeek, dayOfWeek),
      eq(staffSchedules.isActive, true)
    ))
    .limit(1);
  if (!schedule[0]?.openTime || !schedule[0]?.closeTime) {
    throw new SchedulingError('Deze medewerker werkt niet op deze dag', 409, 'NOT_WORKING');
  }
  if (startMinutes < timeToMinutes(schedule[0].openTime) || endMinutes > timeToMinutes(schedule[0].closeTime)) {
    throw new SchedulingError('Dit moment valt buiten de werktijden van de medewerker', 409, 'OUTSIDE_STAFF_HOURS');
  }

  const appointmentConditions: any[] = [
    sql`${appointments.date} = ${date}`,
    ne(appointments.status, 'cancelled'),
    eq(appointments.staffId, staffId)
  ];
  if (excludeAppointmentId) appointmentConditions.push(ne(appointments.id, excludeAppointmentId));
  const existing = await database
    .select({ id: appointments.id, timeSlot: appointments.timeSlot, serviceId: appointments.serviceId })
    .from(appointments)
    .where(and(...appointmentConditions));

  for (const appointment of existing) {
    const durationRows = await database
      .select({ duration: services.duration })
      .from(services)
      .where(eq(services.id, appointment.serviceId))
      .limit(1);
    const existingAddOns = await database
      .select({ duration: appointmentAddOns.duration })
      .from(appointmentAddOns)
      .where(eq(appointmentAddOns.appointmentId, appointment.id));
    const duration = (durationRows[0]?.duration ?? 30) + existingAddOns.reduce((sum: number, row: any) => sum + row.duration, 0);
    const existingStart = timeToMinutes(appointment.timeSlot);
    if (hasOverlap(startMinutes, endMinutes, existingStart, existingStart + duration)) {
      throw new SchedulingError('Dit moment overlapt met een bestaande afspraak', 409, 'OVERLAP');
    }
  }

  return barber[0].displayName;
}

export async function validateAppointmentConfiguration(
  database: Database,
  input: AppointmentConfiguration,
  options: { excludeAppointmentId?: number; enforceBookingWindow?: boolean } = {}
) {
  const appointmentDate = parseDateKey(input.date);
  const startMinutes = timeToMinutes(input.timeSlot);

  if (options.enforceBookingWindow && !isWithinBookingWindow(appointmentDate)) {
    throw new SchedulingError('Boeken kan maximaal 10 weken vooruit');
  }

  const serviceResult = await database
    .select({
      id: services.id,
      name: services.name,
      price: services.price,
      duration: services.duration,
      category: services.category,
      isActive: services.isActive
    })
    .from(services)
    .where(eq(services.id, input.serviceId))
    .limit(1);

  const service = serviceResult[0];
  if (!service || !service.isActive || service.category === 'extra') {
    throw new SchedulingError('Deze behandeling is niet beschikbaar', 400, 'INVALID_SERVICE');
  }

  const addOnIds = Array.from(new Set(input.addOnIds ?? []));
  let addOns: { id: number; name: string; price: string; duration: number }[] = [];
  if (addOnIds.length > 0) {
    const rows = await database
      .select({
        id: services.id,
        name: services.name,
        price: services.price,
        duration: services.duration,
        category: services.category,
        isActive: services.isActive
      })
      .from(services)
      .where(inArray(services.id, addOnIds));

    if (rows.length !== addOnIds.length || rows.some((row: any) => row.category !== 'extra' || !row.isActive)) {
      throw new SchedulingError("Een of meer extra's zijn niet beschikbaar", 400, 'INVALID_ADD_ON');
    }
    addOns = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      price: row.price,
      duration: row.duration
    }));
  }

  const totalDuration = service.duration + addOns.reduce((sum, addOn) => sum + addOn.duration, 0);
  const endMinutes = startMinutes + totalDuration;
  const dayOfWeek = appointmentDate.getDay() === 0 ? 7 : appointmentDate.getDay();

  const hours = await database
    .select()
    .from(openingHours)
    .where(and(eq(openingHours.dayOfWeek, dayOfWeek), eq(openingHours.isActive, true)))
    .limit(1);

  if (!hours[0]) throw new SchedulingError('De zaak is gesloten op deze dag', 409, 'CLOSED');
  if (startMinutes < timeToMinutes(hours[0].openTime) || endMinutes > timeToMinutes(hours[0].closeTime)) {
    throw new SchedulingError('Dit moment valt buiten de openingstijden', 409, 'OUTSIDE_OPENING_HOURS');
  }

  const blocked = await database
    .select({ id: blockedTimes.id })
    .from(blockedTimes)
    .where(and(sql`${blockedTimes.date} = ${input.date}`, eq(blockedTimes.timeSlot, input.timeSlot)))
    .limit(1);
  if (blocked[0]) throw new SchedulingError('Dit moment is geblokkeerd', 409, 'BLOCKED');

  let resolvedStaffId = input.staffId;
  let barberName: string | null = null;
  if (resolvedStaffId) {
    barberName = await validateStaffSlot(
      database, resolvedStaffId, input.date, dayOfWeek, startMinutes, endMinutes, options.excludeAppointmentId
    );
  } else {
    const candidates = await database
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.isBarber, true), eq(users.isActive, true)));
    for (const candidate of candidates) {
      try {
        barberName = await validateStaffSlot(
          database, candidate.id, input.date, dayOfWeek, startMinutes, endMinutes, options.excludeAppointmentId
        );
        resolvedStaffId = candidate.id;
        break;
      } catch (error) {
        if (!(error instanceof SchedulingError)) throw error;
      }
    }
    if (!resolvedStaffId) {
      throw new SchedulingError('Er is geen barber beschikbaar op dit moment', 409, 'NO_STAFF_AVAILABLE');
    }
  }

  return { service, addOns, totalDuration, barberName, resolvedStaffId, appointmentDate };
}
