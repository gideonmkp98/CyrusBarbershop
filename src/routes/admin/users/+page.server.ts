import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { createUserSchema } from '$lib/utils/validation';
import { eq } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const isMaster = locals.user?.role === 'master';

  if (!isMaster) {
    return { isMaster: false, users: [] };
  }

  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    isActive: users.isActive
  }).from(users);

  return { isMaster: true, users: allUsers };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (locals.user?.role !== 'master') {
      return new Response(JSON.stringify({ error: 'Toegang geweigerd' }), { status: 403 });
    }

    const body = await request.json();

    // Handle toggle active
    if (body.id !== undefined && body.isActive !== undefined) {
      await db.update(users).set({ isActive: body.isActive }).where(eq(users.id, body.id));
      return new Response(JSON.stringify({ success: true }));
    }

    // Handle create user
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.issues.map(i => i.message).join(', ') }), { status: 400 });
    }

    const { email, password, displayName } = parsed.data;
    const passwordHash = await hashPassword(password);

    try {
      await db.insert(users).values({ email, passwordHash, displayName, role: 'staff' });
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        return new Response(JSON.stringify({ error: 'Dit e-mailadres is al in gebruik' }), { status: 409 });
      }
      throw e;
    }

    return new Response(JSON.stringify({ success: true }));
  }
};