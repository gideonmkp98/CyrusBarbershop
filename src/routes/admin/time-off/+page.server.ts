import { and, desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { staffTimeOff, users } from '$lib/server/db/schema';
import { findTimeOffConflicts, formatDateKey } from '$lib/server/scheduling';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const currentUser = locals.user!;
  const mayReview = currentUser.role === 'owner' || currentUser.role === 'manager';
  const entries = await db
    .select()
    .from(staffTimeOff)
    .where(currentUser.role === 'staff' ? eq(staffTimeOff.staffId, currentUser.id) : undefined)
    .orderBy(desc(staffTimeOff.createdAt));

  const staff = await db
    .select({ id: users.id, displayName: users.displayName, role: users.role })
    .from(users)
    .where(and(eq(users.isBarber, true), eq(users.isActive, true)))
    .orderBy(users.displayName);
  const names = new Map(staff.map((member) => [member.id, member.displayName]));

  const formatted = await Promise.all(entries.map(async (entry) => {
    const startDate = formatDateKey(entry.startDate);
    const endDate = formatDateKey(entry.endDate);
    const conflicts = await findTimeOffConflicts(entry.staffId, startDate, endDate);
    return {
      ...entry,
      startDate,
      endDate,
      employeeName: names.get(entry.staffId) || 'Onbekende medewerker',
      conflictCount: conflicts.length,
      conflicts,
      createdAt: entry.createdAt.toISOString(),
      updatedAt: entry.updatedAt.toISOString(),
      reviewedAt: entry.reviewedAt?.toISOString() ?? null
    };
  }));

  return { entries: formatted, staff, mayReview };
};
