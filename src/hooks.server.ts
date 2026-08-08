import type { Handle } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { validateSession } from '$lib/server/auth';

// In production, silence noisy debug `console.log` calls (e.g. `[LOGIN] Attempt`)
// but keep `console.warn`/`error` so real problems still surface.
if (!dev && typeof console !== 'undefined') {
	const originalLog = console.log;
	console.log = (...args: unknown[]) => {
		const first = args[0];
		if (typeof first === 'string' && /^\[(LOGIN|DEBUG|availability)/.test(first)) {
			return;
		}
		originalLog(...args);
	};
}

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