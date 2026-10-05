import { randomUUID } from 'node:crypto';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { appointments, sessions, users } from './db/schema';

export class UserLifecycleError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

// Use the shop's timezone, independent of the application/database host timezone.
export function shopDateTime(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Amsterdam', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)!.value;
  return { date: `${part('year')}-${part('month')}-${part('day')}`, time: `${part('hour')}:${part('minute')}` };
}

export async function changeUserLifecycle(
  actorRole: string, id: unknown, action: 'delete' | 'activate' | 'deactivate'
) {
  const targetId = Number(id);
  if (!Number.isSafeInteger(targetId) || targetId <= 0) throw new UserLifecycleError('Ongeldige gebruiker', 400);
  if (actorRole !== 'owner' && actorRole !== 'manager') throw new UserLifecycleError('Toegang geweigerd', 403);

  await db.transaction(async tx => {
    // Booking creation takes this same lock before assigning a staff member.
    const [target] = await tx.select().from(users)
      .where(and(eq(users.id, targetId), isNull(users.deletedAt))).limit(1).for('update');
    if (!target) throw new UserLifecycleError('Gebruiker niet gevonden', 404);
    if (target.role === 'owner') throw new UserLifecycleError('Owner account kan niet gewijzigd worden', 403);
    if (actorRole === 'manager' && target.role === 'manager') {
      throw new UserLifecycleError('Alleen owner kan managers wijzigen', 403);
    }

    if (action === 'delete') {
      const now = shopDateTime();
      // Locking read sees bookings committed while we waited for the user lock.
      const upcoming = await tx.select({ id: appointments.id }).from(appointments).where(and(
        eq(appointments.staffId, targetId), eq(appointments.status, 'confirmed'),
        sql`(${appointments.date} > ${now.date} OR (${appointments.date} = ${now.date} AND ${appointments.timeSlot} >= ${now.time}))`
      )).for('update');
      if (upcoming.length) {
        throw new UserLifecycleError(
          `Deze medewerker heeft nog ${upcoming.length} toekomstige bevestigde afspraak/afspraken. Zet deze eerst over of annuleer ze. Je kunt het account wel direct deactiveren.`, 409
        );
      }
      // Free the unique email for a NEW account; historical records keep this ID.
      // Never store the old address in the placeholder or preserve login credentials.
      await tx.update(users).set({
        deletedAt: new Date(), isActive: false,
        email: `deleted-${targetId}-${randomUUID()}@deleted.invalid`, passwordHash: ''
      }).where(eq(users.id, targetId));
    } else {
      await tx.update(users).set({ isActive: action === 'activate' }).where(eq(users.id, targetId));
    }
    if (action !== 'activate') await tx.delete(sessions).where(eq(sessions.userId, targetId));
  });
}
