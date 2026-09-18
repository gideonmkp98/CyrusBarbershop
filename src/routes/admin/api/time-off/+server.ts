import { json } from '@sveltejs/kit';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { staffTimeOff, users } from '$lib/server/db/schema';
import { findTimeOffConflicts, formatDateKey, SchedulingError, validateDateRange } from '$lib/server/scheduling';
import { timeOffCreateSchema, timeOffReviewSchema } from '$lib/utils/validation';
import type { RequestHandler } from './$types';

type UserRole = NonNullable<App.Locals['user']>['role'];
const canReview = (role: UserRole) => role === 'owner' || role === 'manager';

async function assertBarber(staffId: number) {
  const target = await db
    .select({ id: users.id, displayName: users.displayName })
    .from(users)
    .where(and(eq(users.id, staffId), eq(users.isBarber, true), eq(users.isActive, true)))
    .limit(1);
  if (!target[0]) throw new SchedulingError('Medewerker is geen actieve barber', 400);
  return target[0];
}

async function hasOverlappingEntry(staffId: number, startDate: string, endDate: string, excludeId?: number) {
  const conditions: any[] = [
    eq(staffTimeOff.staffId, staffId),
    inArray(staffTimeOff.status, ['pending', 'approved']),
    sql`${staffTimeOff.startDate} <= ${endDate}`,
    sql`${staffTimeOff.endDate} >= ${startDate}`
  ];
  if (excludeId) conditions.push(sql`${staffTimeOff.id} <> ${excludeId}`);
  const rows = await db.select({ id: staffTimeOff.id }).from(staffTimeOff).where(and(...conditions)).limit(1);
  return rows.length > 0;
}

function serializeEntry(entry: any, employeeName?: string, conflicts: any[] = []) {
  return {
    ...entry,
    startDate: formatDateKey(entry.startDate),
    endDate: formatDateKey(entry.endDate),
    createdAt: entry.createdAt instanceof Date ? entry.createdAt.toISOString() : entry.createdAt,
    updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt.toISOString() : entry.updatedAt,
    reviewedAt: entry.reviewedAt instanceof Date ? entry.reviewedAt.toISOString() : entry.reviewedAt,
    employeeName,
    conflicts,
    conflictCount: conflicts.length
  };
}

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user) return json({ error: 'Niet ingelogd' }, { status: 401 });

  const conditions = locals.user.role === 'staff'
    ? eq(staffTimeOff.staffId, locals.user.id)
    : undefined;
  const entries = await db.select().from(staffTimeOff).where(conditions).orderBy(desc(staffTimeOff.createdAt));
  const staff = await db.select({ id: users.id, displayName: users.displayName }).from(users);
  const names = new Map(staff.map((row) => [row.id, row.displayName]));

  const result = await Promise.all(entries.map(async (entry) => {
    const conflicts = await findTimeOffConflicts(
      entry.staffId,
      formatDateKey(entry.startDate),
      formatDateKey(entry.endDate)
    );
    return serializeEntry(entry, names.get(entry.staffId), conflicts);
  }));

  return json({ entries: result });
};

export const POST: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Niet ingelogd' }, { status: 401 });

  try {
    const parsed = timeOffCreateSchema.safeParse(await request.json());
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Ongeldige invoer' }, { status: 400 });

    const body = parsed.data;
    validateDateRange(body.startDate, body.endDate);
    const staffId = locals.user.role === 'staff' ? locals.user.id : body.staffId;
    if (!staffId) return json({ error: 'Selecteer een medewerker' }, { status: 400 });
    const direct = canReview(locals.user.role) && body.direct;
    if (locals.user.role === 'staff' && body.direct) return json({ error: 'Geen toegang' }, { status: 403 });

    const employee = await assertBarber(staffId);
    if (await hasOverlappingEntry(staffId, body.startDate, body.endDate)) {
      return json({ error: 'Er bestaat al een aanvraag of afwezigheid in deze periode' }, { status: 409 });
    }

    const conflicts = await findTimeOffConflicts(staffId, body.startDate, body.endDate);
    if (direct && conflicts.length > 0 && !body.confirmConflicts) {
      return json({
        error: 'Deze periode bevat bestaande afspraken',
        requiresConfirmation: true,
        conflicts
      }, { status: 409 });
    }

    const now = new Date();
    const result = await db.insert(staffTimeOff).values({
      staffId,
      startDate: new Date(`${body.startDate}T00:00:00`),
      endDate: new Date(`${body.endDate}T00:00:00`),
      reason: body.reason || null,
      status: direct ? 'approved' : 'pending',
      entryType: direct ? 'direct' : 'request',
      requestedBy: locals.user.id,
      reviewedBy: direct ? locals.user.id : null,
      reviewedAt: direct ? now : null
    });

    const created = await db.select().from(staffTimeOff).where(eq(staffTimeOff.id, result[0].insertId)).limit(1);
    return json({ entry: serializeEntry(created[0], employee.displayName, conflicts) }, { status: 201 });
  } catch (error) {
    if (error instanceof SchedulingError) return json({ error: error.message }, { status: error.status });
    console.error('[time-off] create failed:', error);
    return json({ error: 'Afwezigheid kon niet worden opgeslagen' }, { status: 500 });
  }
};

export const PATCH: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Niet ingelogd' }, { status: 401 });
  if (!canReview(locals.user.role)) return json({ error: 'Geen toegang' }, { status: 403 });

  try {
    const parsed = timeOffReviewSchema.safeParse(await request.json());
    if (!parsed.success) return json({ error: parsed.error.issues[0]?.message || 'Ongeldige invoer' }, { status: 400 });
    const body = parsed.data;

    const rows = await db.select().from(staffTimeOff).where(eq(staffTimeOff.id, body.id)).limit(1);
    const entry = rows[0];
    if (!entry) return json({ error: 'Aanvraag niet gevonden' }, { status: 404 });
    if (entry.status !== 'pending') return json({ error: 'Deze aanvraag is al beoordeeld' }, { status: 409 });

    const startDate = formatDateKey(entry.startDate);
    const endDate = formatDateKey(entry.endDate);
    const conflicts = await findTimeOffConflicts(entry.staffId, startDate, endDate);
    if (body.status === 'approved' && conflicts.length > 0 && !body.confirmConflicts) {
      return json({
        error: 'Deze periode bevat bestaande afspraken',
        requiresConfirmation: true,
        conflicts
      }, { status: 409 });
    }

    await db.update(staffTimeOff).set({
      status: body.status,
      reviewedBy: locals.user.id,
      reviewedAt: new Date(),
      reviewerNote: body.reviewerNote || null
    }).where(eq(staffTimeOff.id, body.id));

    return json({ success: true, conflicts });
  } catch (error) {
    console.error('[time-off] review failed:', error);
    return json({ error: 'Aanvraag kon niet worden beoordeeld' }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  if (!locals.user) return json({ error: 'Niet ingelogd' }, { status: 401 });
  const id = Number((await request.json()).id);
  if (!Number.isInteger(id) || id <= 0) return json({ error: 'Ongeldig ID' }, { status: 400 });

  const rows = await db.select().from(staffTimeOff).where(eq(staffTimeOff.id, id)).limit(1);
  const entry = rows[0];
  if (!entry) return json({ error: 'Afwezigheid niet gevonden' }, { status: 404 });

  const mayDelete = canReview(locals.user.role) ||
    (entry.staffId === locals.user.id && entry.status === 'pending');
  if (!mayDelete) return json({ error: 'Geen toegang' }, { status: 403 });

  await db.delete(staffTimeOff).where(eq(staffTimeOff.id, id));
  return json({ success: true });
};
