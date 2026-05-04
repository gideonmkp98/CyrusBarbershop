import bcrypt from 'bcryptjs';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { hashPassword } from '$lib/server/auth';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request, locals }) => {
  const userId = locals.user?.id;
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Niet ingelogd' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const body = await request.json();

  // Handle email change
  if (body.email !== undefined) {
    const email = body.email?.trim();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(JSON.stringify({ error: 'Ongeldig e-mailadres' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if email is already taken by another user
    const existingUser = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
    if (existingUser.length > 0 && existingUser[0].id !== userId) {
      return new Response(JSON.stringify({ error: 'Dit e-mailadres is al in gebruik' }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await db.update(users).set({ email }).where(eq(users.id, userId));
    return new Response(JSON.stringify({ success: true, message: 'E-mailadres bijgewerkt' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Handle password change
  if (body.newPassword !== undefined) {
    const { currentPassword, newPassword } = body;

    if (!currentPassword || !newPassword) {
      return new Response(JSON.stringify({ error: 'Vul alle velden in' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (newPassword.length < 8) {
      return new Response(JSON.stringify({ error: 'Wachtwoord moet minimaal 8 tekens zijn' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verify current password
    const user = await db.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)).limit(1);
    if (!user[0]) {
      return new Response(JSON.stringify({ error: 'Gebruiker niet gevonden' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const validPassword = await bcrypt.compare(currentPassword, user[0].passwordHash);
    if (!validPassword) {
      return new Response(JSON.stringify({ error: 'Huidig wachtwoord is onjuist' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const newPasswordHash = await hashPassword(newPassword);
    await db.update(users).set({ passwordHash: newPasswordHash }).where(eq(users.id, userId));
    return new Response(JSON.stringify({ success: true, message: 'Wachtwoord bijgewerkt' }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({ error: 'Ongeldig verzoek' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
};
