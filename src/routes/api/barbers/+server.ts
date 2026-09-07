import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async () => {
  const barbers = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      imageUrl: users.imageUrl
    })
    .from(users)
    .where(and(eq(users.isBarber, true), eq(users.isActive, true)));

  return new Response(JSON.stringify({ barbers }), {
    headers: { 'Content-Type': 'application/json' }
  });
};
