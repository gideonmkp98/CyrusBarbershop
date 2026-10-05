import { changeUserLifecycle, UserLifecycleError } from '$lib/server/user-lifecycle';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { createUserSchema } from '$lib/utils/validation';
import { eq, and, ne, isNull } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function canModifyTarget(currentRole: App.Locals['user']['role'], targetId: number): Promise<Response | null> {
  const target = await db.select({ role: users.role }).from(users).where(and(eq(users.id, targetId), isNull(users.deletedAt))).limit(1);

  if (!target[0]) {
    return jsonResponse({ error: 'Gebruiker niet gevonden' }, 404);
  }

  if (target[0].role === 'owner') {
    return jsonResponse({ error: 'Owner account kan niet gewijzigd worden' }, 403);
  }

  if (currentRole === 'manager' && target[0].role === 'manager') {
    return jsonResponse({ error: 'Alleen owner kan managers wijzigen' }, 403);
  }

  return null;
}

async function canUpdateBarberStatus(currentRole: App.Locals['user']['role'], targetId: number): Promise<Response | null> {
  const target = await db.select({ role: users.role }).from(users).where(and(eq(users.id, targetId), isNull(users.deletedAt))).limit(1);

  if (!target[0]) {
    return jsonResponse({ error: 'Gebruiker niet gevonden' }, 404);
  }

  if (target[0].role === 'owner' && currentRole !== 'owner') {
    return jsonResponse({ error: 'Alleen owner kan het master account aanpassen' }, 403);
  }

  if (currentRole === 'manager' && target[0].role === 'manager') {
    return jsonResponse({ error: 'Alleen owner kan managers wijzigen' }, 403);
  }

  return null;
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const userRole = locals.user?.role;
  if (userRole !== 'owner' && userRole !== 'manager') {
    return jsonResponse({ error: 'Toegang geweigerd' }, locals.user ? 403 : 401);
  }

  const body = await request.json();
  if (body.id !== undefined && (!Number.isSafeInteger(Number(body.id)) || Number(body.id) <= 0)) {
    return jsonResponse({ error: 'Ongeldige gebruiker' }, 400);
  }
  if (body.id !== undefined) body.id = Number(body.id);
  if (body.id !== undefined && body.delete !== true) {
    const [target] = await db.select({ id: users.id }).from(users)
      .where(and(eq(users.id, Number(body.id)), isNull(users.deletedAt))).limit(1);
    if (!target) return jsonResponse({ error: 'Gebruiker niet gevonden' }, 404);
  }

  // Handle toggle active
  if (body.id !== undefined && body.isActive !== undefined) {
    if (typeof body.isActive !== 'boolean') return jsonResponse({ error: 'Ongeldige status' }, 400);
    return lifecycleResponse(userRole, body.id, body.isActive ? 'activate' : 'deactivate');
  }

  // Handle toggle isBarber
  if (body.id !== undefined && body.isBarber !== undefined) {
    const targetId = parseInt(String(body.id), 10);
    const denied = await canUpdateBarberStatus(userRole, targetId);
    if (denied) return denied;

    await db.update(users).set({ isBarber: body.isBarber }).where(and(eq(users.id, body.id), isNull(users.deletedAt)));
    return jsonResponse({ success: true });
  }

  // Handle editing a staff member's details (name, email and/or new password).
  // Owner and manager may edit, but a manager cannot edit another manager (enforced by canModifyTarget).
  if (body.edit === true && body.id !== undefined) {
    const targetId = parseInt(String(body.id), 10);
    if (!targetId) {
      return jsonResponse({ error: 'Ongeldige gebruiker' }, 400);
    }

    const denied = await canModifyTarget(userRole, targetId);
    if (denied) return denied;

    const updates: Partial<typeof users.$inferInsert> = {};

    if (body.displayName !== undefined) {
      const displayName = String(body.displayName).trim();
      if (displayName.length < 2 || displayName.length > 100) {
        return jsonResponse({ error: 'Naam moet tussen 2 en 100 tekens zijn' }, 400);
      }
      updates.displayName = displayName;
    }

    if (body.email !== undefined) {
      const email = String(body.email).trim();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return jsonResponse({ error: 'Ongeldig e-mailadres' }, 400);
      }
      const existing = await db.select({ id: users.id }).from(users)
        .where(and(eq(users.email, email), ne(users.id, targetId)))
        .limit(1);
      if (existing[0]) {
        return jsonResponse({ error: 'Dit e-mailadres is al in gebruik' }, 409);
      }
      updates.email = email;
    }

    if (body.password !== undefined && String(body.password).length > 0) {
      const parsedPassword = createUserSchema.shape.password.safeParse(String(body.password));
      if (!parsedPassword.success) {
        const errorMessage = parsedPassword.error.issues.map(e => e.message).join(', ');
        return jsonResponse({ error: errorMessage }, 400);
      }
      updates.passwordHash = await hashPassword(parsedPassword.data);
    }

    if (Object.keys(updates).length === 0) {
      return jsonResponse({ error: 'Geen wijzigingen opgegeven' }, 400);
    }

    await db.update(users).set(updates).where(and(eq(users.id, targetId), isNull(users.deletedAt)));
    return jsonResponse({ success: true });
  }

  // Handle owner edits for display name.
  if (body.id !== undefined && body.displayName !== undefined) {
    if (userRole !== 'owner') {
      return jsonResponse({ error: "Alleen owner kan namen en foto's wijzigen" }, 403);
    }

    const targetId = parseInt(String(body.id), 10);
    if (!targetId) {
      return jsonResponse({ error: 'Ongeldige gebruiker' }, 400);
    }

    const displayName = String(body.displayName).trim();
    if (displayName.length < 2 || displayName.length > 100) {
      return jsonResponse({ error: 'Naam moet tussen 2 en 100 tekens zijn' }, 400);
    }

    await db.update(users).set({ displayName }).where(and(eq(users.id, targetId), isNull(users.deletedAt)));
    return jsonResponse({ success: true });
  }

  // Handle role change
  if (body.id !== undefined && body.role !== undefined) {
    const denied = await canModifyTarget(userRole, Number(body.id));
    if (denied) return denied;
    if (body.role !== 'staff' && body.role !== 'manager') return jsonResponse({ error: 'Ongeldige rol' }, 400);
    const userToChange = await db.select({ role: users.role }).from(users).where(and(eq(users.id, body.id), isNull(users.deletedAt))).limit(1);
    const targetRole = userToChange[0]?.role;

    // Prevent changing owner account (only owner can change owner, and only to staff/manager)
    if (targetRole === 'owner') {
      return jsonResponse({ error: 'Owner account kan niet gewijzigd worden' }, 403);
    }
    // Prevent promoting to owner (only existing owner can create/change to owner - but we block this entirely)
    if (body.role === 'owner') {
      return jsonResponse({ error: 'Kan geen gebruiker promoveren tot owner' }, 403);
    }
    // Manager cannot promote to manager (only owner can do this)
    if (userRole === 'manager' && body.role === 'manager') {
      return jsonResponse({ error: 'Alleen owner kan gebruikers promoveren tot manager' }, 403);
    }

    await db.update(users).set({ role: body.role }).where(and(eq(users.id, body.id), isNull(users.deletedAt)));
    return jsonResponse({ success: true });
  }

  // Handle delete user
  if (body.id !== undefined && body.delete === true) {
    return lifecycleResponse(userRole, body.id, 'delete');
  }

  // Handle create user
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    const errorMessage = parsed.error.issues.map(e => e.message).join(', ');
    return jsonResponse({ error: errorMessage }, 400);
  }

  const { email, password, displayName } = parsed.data;
  const isBarber = body.isBarber === true;

  try {
    const passwordHash = await hashPassword(password);
    const result = await db.insert(users).values({ email, passwordHash, displayName, role: 'staff', isBarber });

    // Get the ID of the newly created user
    const createdUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    const userId = createdUser[0]?.id;

    return jsonResponse({ success: true, id: userId });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY' || e.cause?.code === 'ER_DUP_ENTRY') {
      return jsonResponse({ error: 'Dit e-mailadres is al in gebruik' }, 409);
    }
    console.error('[users] INSERT error:', e);
    return jsonResponse({ error: 'Interne fout' }, 500);
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  const userRole = locals.user?.role;
  if (userRole !== 'owner' && userRole !== 'manager') {
    return jsonResponse({ error: 'Toegang geweigerd' }, locals.user ? 403 : 401);
  }

  const body = await request.json();

  return lifecycleResponse(userRole, body.id, 'delete');
};

async function lifecycleResponse(role: string, id: unknown, action: 'delete' | 'activate' | 'deactivate') {
  try {
    await changeUserLifecycle(role, id, action);
    return jsonResponse({ success: true });
  } catch (error) {
    if (error instanceof UserLifecycleError) return jsonResponse({ error: error.message }, error.status);
    console.error('[users] lifecycle error:', error);
    return jsonResponse({ error: 'Wijziging mislukt. Probeer opnieuw.' }, 500);
  }
}
