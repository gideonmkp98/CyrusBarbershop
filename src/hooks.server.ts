import type { Handle } from '@sveltejs/kit';
import { validateSession } from '$lib/server/auth';

export const handle: Handle = async ({ event, resolve }) => {
  const token = event.cookies.get('session_token');

  if (token) {
    const user = await validateSession(token);
    if (user) {
      event.locals.user = user;
    }
  }

  return resolve(event);
};