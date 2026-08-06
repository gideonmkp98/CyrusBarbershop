import { db } from '$lib/server/db/index';
import { services } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
  const result = await db
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.displayOrder));

  const bookingEnabled = process.env.BOOKING_ENABLED !== 'false';

  return { services: result, bookingEnabled };
};