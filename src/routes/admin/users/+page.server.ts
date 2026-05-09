import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { createUserSchema } from '$lib/utils/validation';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const canManageUsers = locals.user?.role === 'owner' || locals.user?.role === 'manager';

  if (!canManageUsers) {
    return { canManageUsers: false, users: [] };
  }

  const allUsers = await db.select({
    id: users.id,
    email: users.email,
    displayName: users.displayName,
    role: users.role,
    isActive: users.isActive,
    isBarber: users.isBarber
  }).from(users);

  return { canManageUsers, users: allUsers };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    console.log('[DEBUG] locals.user:', locals.user);

    if (locals.user?.role !== 'owner' && locals.user?.role !== 'manager') {
      console.log('[DEBUG] Access denied, role:', locals.user?.role);
      return fail(403, { error: 'Toegang geweigerd' });
    }

    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());
    console.log('[DEBUG] Request body:', body);

    // Handle toggle active
    if (body.id !== undefined && body.isActive !== undefined) {
      await db.update(users).set({ isActive: body.isActive }).where(eq(users.id, body.id));
      return { success: true, action: 'toggle' };
    }

    // Handle create user
    const parsed = createUserSchema.safeParse(body);
    console.log('[DEBUG] Validation result:', parsed.success ? 'valid' : 'invalid', parsed.success ? '' : parsed.error.issues);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map(e => e.message).join(', ');
      return fail(400, { error: errorMessage });
    }

    const { email, password, displayName } = parsed.data;
    console.log('[DEBUG] Creating user:', { email, displayName });

    try {
      const passwordHash = await hashPassword(password);
      console.log('[DEBUG] Password hashed, inserting...');
      await db.insert(users).values({ email, passwordHash, displayName, role: 'staff' });
      console.log('[DEBUG] User created successfully');
    } catch (e: any) {
      console.error('[DEBUG] Database error:', e);
      console.error('[DEBUG] Error details:', JSON.stringify(e, null, 2));
      if (e.code === 'ER_DUP_ENTRY') {
        return fail(409, { error: 'Dit e-mailadres is al in gebruik' });
      }
      return fail(500, { error: e.message || String(e) || 'Database fout' });
    }

    return { success: true, action: 'create' };
  }
};