import { changeUserLifecycle, UserLifecycleError } from '$lib/server/user-lifecycle';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { createUserSchema } from '$lib/utils/validation';
import { isNull } from 'drizzle-orm';
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
    imageUrl: users.imageUrl,
    role: users.role,
    isActive: users.isActive,
    isBarber: users.isBarber
  }).from(users).where(isNull(users.deletedAt));

  return { canManageUsers, currentUserRole: locals.user?.role, users: allUsers };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {

    if (locals.user?.role !== 'owner' && locals.user?.role !== 'manager') {
      return fail(403, { error: 'Toegang geweigerd' });
    }

    const formData = await request.formData();
    const body = Object.fromEntries(formData.entries());

    // Handle toggle active
    if (body.id !== undefined && body.isActive !== undefined) {
      if (body.isActive !== 'true' && body.isActive !== 'false') return fail(400, { error: 'Ongeldige status' });
      try {
        await changeUserLifecycle(locals.user.role, body.id, body.isActive === 'true' ? 'activate' : 'deactivate');
      } catch (error) {
        if (error instanceof UserLifecycleError) return fail(error.status, { error: error.message });
        throw error;
      }
      return { success: true, action: 'toggle' };
    }

    // Handle create user
    const parsed = createUserSchema.safeParse(body);
    if (!parsed.success) {
      const errorMessage = parsed.error.issues.map(e => e.message).join(', ');
      return fail(400, { error: errorMessage });
    }

    const { email, password, displayName } = parsed.data;

    try {
      const passwordHash = await hashPassword(password);
      await db.insert(users).values({ email, passwordHash, displayName, role: 'staff' });
    } catch (e: any) {
      console.error('[DEBUG] Database error:', e);
      console.error('[DEBUG] Error details:', JSON.stringify(e, null, 2));
      if (e.code === 'ER_DUP_ENTRY' || e.cause?.code === 'ER_DUP_ENTRY') {
        return fail(409, { error: 'Dit e-mailadres is al in gebruik' });
      }
      return fail(500, { error: e.message || String(e) || 'Database fout' });
    }

    return { success: true, action: 'create' };
  }
};
