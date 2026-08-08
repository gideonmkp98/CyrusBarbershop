import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { createUserSchema } from '$lib/utils/validation';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

async function canModifyTarget(currentRole: App.Locals['user']['role'], targetId: number): Promise<Response | null> {
  const target = await db.select({ role: users.role }).from(users).where(eq(users.id, targetId)).limit(1);

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
  const target = await db.select({ role: users.role }).from(users).where(eq(users.id, targetId)).limit(1);

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

  // Handle toggle active
  if (body.id !== undefined && body.isActive !== undefined) {
    const targetId = parseInt(String(body.id), 10);
    const denied = await canModifyTarget(userRole, targetId);
    if (denied) return denied;

    await db.update(users).set({ isActive: body.isActive }).where(eq(users.id, body.id));
    return jsonResponse({ success: true });
  }

  // Handle toggle isBarber
  if (body.id !== undefined && body.isBarber !== undefined) {
    const targetId = parseInt(String(body.id), 10);
    const denied = await canUpdateBarberStatus(userRole, targetId);
    if (denied) return denied;

    await db.update(users).set({ isBarber: body.isBarber }).where(eq(users.id, body.id));
    return jsonResponse({ success: true });
  }

  // Handle role change
  if (body.id !== undefined && body.role !== undefined) {
    const userToChange = await db.select({ role: users.role }).from(users).where(eq(users.id, body.id)).limit(1);
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

    await db.update(users).set({ role: body.role }).where(eq(users.id, body.id));
    return jsonResponse({ success: true });
  }

  // Handle delete user
  if (body.id !== undefined && body.delete === true) {
    const userToDelete = await db.select({ role: users.role }).from(users).where(eq(users.id, body.id)).limit(1);

    // Prevent deleting owner account
    if (userToDelete[0]?.role === 'owner') {
      return jsonResponse({ error: 'Owner account kan niet verwijderd worden' }, 403);
    }
    // Manager cannot delete other managers
    if (userRole === 'manager' && userToDelete[0]?.role === 'manager') {
      return jsonResponse({ error: 'Alleen owner kan managers verwijderen' }, 403);
    }

    await db.delete(users).where(eq(users.id, body.id));
    return jsonResponse({ success: true });
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
    if (e.code === 'ER_DUP_ENTRY') {
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

  const userToDelete = await db.select({ role: users.role }).from(users).where(eq(users.id, body.id)).limit(1);

  // Prevent deleting owner account
  if (userToDelete[0]?.role === 'owner') {
    return jsonResponse({ error: 'Owner account kan niet verwijderd worden' }, 403);
  }
  // Manager cannot delete other managers
  if (userRole === 'manager' && userToDelete[0]?.role === 'manager') {
    return jsonResponse({ error: 'Alleen owner kan managers verwijderen' }, 403);
  }

  try {
    await db.delete(users).where(eq(users.id, body.id));
    return jsonResponse({ success: true });
  } catch (e: any) {
    console.error('[users] DELETE error:', e);
    return jsonResponse({ error: 'Interne fout' }, 500);
  }
};
