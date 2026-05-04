import { db } from '$lib/server/db/index';
import { openingHours } from '$lib/server/db/schema';
import type { RequestHandler } from './$types';

// GET: Load all opening hours (public endpoint)
export const GET: RequestHandler = async () => {
  const hours = await db.select().from(openingHours).orderBy(openingHours.dayOfWeek);

  return new Response(JSON.stringify({ hours }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
