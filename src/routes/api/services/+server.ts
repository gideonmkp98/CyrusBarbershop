import { db } from '$lib/server/db/index';
import { services } from '$lib/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const result = await db
    .select()
    .from(services)
    .where(eq(services.isActive, true))
    .orderBy(asc(services.displayOrder));

  return new Response(JSON.stringify(result), {
    headers: { 'Content-Type': 'application/json' }
  });
};