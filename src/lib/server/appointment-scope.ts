import { eq } from 'drizzle-orm';
import { appointments } from '$lib/server/db/schema';
import type { SQL } from 'drizzle-orm';

type SessionUser = {
  id: number;
  role: 'owner' | 'manager' | 'staff';
} | null | undefined;

/**
 * Gedeelde staff-scope voor afspraken: staff mogen uitsluitend afspraken zien
 * die aan henzelf toegewezen zijn. Owner/manager zien alles.
 * Combineer het resultaat met andere condities via and() / ||.
 */
export function appointmentStaffScope(user: SessionUser): SQL | undefined {
  if (!user || user.role !== 'staff') return undefined;
  return eq(appointments.staffId, user.id);
}