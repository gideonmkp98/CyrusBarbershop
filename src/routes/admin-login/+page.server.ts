import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { verifyPassword, createSession, signSessionToken } from '$lib/server/auth';
import { loginSchema } from '$lib/utils/validation';
import { eq } from 'drizzle-orm';
import { fail, redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    throw redirect(302, '/admin');
  }
};

export const actions: Actions = {
  default: async ({ request, cookies, url }) => {
    const formData = await request.formData();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;

    const parsed = loginSchema.safeParse({ email, password });

    if (!parsed.success) {
      return fail(400, { error: 'Ongeldig e-mailadres of wachtwoord' });
    }

    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (result.length === 0) {
      // Same error as below to avoid email enumeration.
      return fail(401, { error: 'Ongeldig e-mailadres of wachtwoord' });
    }

    const user = result[0];

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      // Same error as "user not found" to avoid leaking which emails are registered.
      return fail(401, { error: 'Ongeldig e-mailadres of wachtwoord' });
    }

    if (!user.isActive) {
      return fail(403, { error: 'Account is gedeactiveerd' });
    }

    const token = await createSession(user.id);
    const signedToken = signSessionToken(token);

    if (dev) {
      console.log('[LOGIN] success userId=' + user.id);
    }

    // Use PUBLIC_SITE_URL to determine if cookies should be secure. This is more
    // reliable than url.protocol behind reverse proxies, which may report https
    // even when the browser is on http.
    const isHttps = PUBLIC_SITE_URL?.toLowerCase().startsWith('https://') ?? false;
    cookies.set('session_token', signedToken, {
      path: '/',
      httpOnly: true,
      secure: isHttps,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7
    });

    throw redirect(302, '/admin');
  }
};