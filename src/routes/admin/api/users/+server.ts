import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { createUserSchema } from '$lib/utils/validation';
import { eq, and } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  const userRole = locals.user?.role;
  if (userRole !== 'owner' && userRole !== 'manager') {
    return new Response(JSON.stringify({ error: 'Toegang geweigerd' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();

  // Handle toggle active
  if (body.id !== undefined && body.isActive !== undefined) {
    await db.update(users).set({ isActive: body.isActive }).where(eq(users.id, body.id));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Handle role change
  if (body.id !== undefined && body.role !== undefined) {
    const userToChange = await db.select({ role: users.role }).from(users).where(eq(users.id, body.id)).limit(1);
    const targetRole = userToChange[0]?.role;

    // Prevent changing owner account (only owner can change owner, and only to staff/manager)
    if (targetRole === 'owner') {
      return new Response(JSON.stringify({ error: 'Owner account kan niet gewijzigd worden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Prevent promoting to owner (only existing owner can create/change to owner - but we block this entirely)
    if (body.role === 'owner') {
      return new Response(JSON.stringify({ error: 'Kan geen gebruiker promoveren tot owner' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Manager cannot promote to manager (only owner can do this)
    if (userRole === 'manager' && body.role === 'manager') {
      return new Response(JSON.stringify({ error: 'Alleen owner kan gebruikers promoveren tot manager' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.update(users).set({ role: body.role }).where(eq(users.id, body.id));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Handle delete user
  if (body.id !== undefined && body.delete === true) {
    const userToDelete = await db.select({ role: users.role }).from(users).where(eq(users.id, body.id)).limit(1);

    // Prevent deleting owner account
    if (userToDelete[0]?.role === 'owner') {
      return new Response(JSON.stringify({ error: 'Owner account kan niet verwijderd worden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Manager cannot delete other managers
    if (userRole === 'manager' && userToDelete[0]?.role === 'manager') {
      return new Response(JSON.stringify({ error: 'Alleen owner kan managers verwijderen' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.delete(users).where(eq(users.id, body.id));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Handle create user
  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    const errorMessage = parsed.error.issues.map(e => e.message).join(', ');
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const { email, password, displayName } = parsed.data;

  try {
    const passwordHash = await hashPassword(password);
    const result = await db.insert(users).values({ email, passwordHash, displayName, role: 'staff' });

    // Get the ID of the newly created user
    const createdUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    const userId = createdUser[0]?.id;

    return new Response(JSON.stringify({ success: true, id: userId }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      return new Response(JSON.stringify({ error: 'Dit e-mailadres is al in gebruik' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    return new Response(JSON.stringify({ error: e.message || 'Database fout' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  const userRole = locals.user?.role;
  if (userRole !== 'owner' && userRole !== 'manager') {
    return new Response(JSON.stringify({ error: 'Toegang geweigerd' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();

  const userToDelete = await db.select({ role: users.role }).from(users).where(eq(users.id, body.id)).limit(1);

  // Prevent deleting owner account
  if (userToDelete[0]?.role === 'owner') {
    return new Response(JSON.stringify({ error: 'Owner account kan niet verwijderd worden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }
  // Manager cannot delete other managers
  if (userRole === 'manager' && userToDelete[0]?.role === 'manager') {
    return new Response(JSON.stringify({ error: 'Alleen owner kan managers verwijderen' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    await db.delete(users).where(eq(users.id, body.id));
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e.message || 'Verwijderen mislukt' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};