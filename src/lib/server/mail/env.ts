// Provide a single source for private environment variables used by the mail module.
//
// We use SvelteKit's `$env/dynamic/private`:
// - In dev it reads values from `.env` files (so local dev works out of the box).
// - In prod (adapter-node) it reads from `process.env` at runtime, i.e. the
//   environment injected by the deployment platform (Coolify).
//
// Using the *dynamic* module (instead of `$env/static/private`) is important
// because the static module injects values at BUILD time and requires every
// imported variable to be present during the build. Optional vars such as
// `CONTACT_NOTIFY_EMAIL` are not guaranteed to exist on the build server, which
// caused `MISSING_EXPORT` build failures. The dynamic module has no such
// requirement — a missing var simply resolves to `undefined` at runtime, which
// `getContactNotifyEmail()` handles via its `OWNER_EMAIL` fallback.
//
// Plain Node/TSX scripts (e.g. `scripts/test-email.ts`) are outside the
// SvelteKit runtime and keep using `process.env` directly.

import { env } from '$env/dynamic/private';

export function getMailEnv(): Record<string, string | undefined> {
	return {
		SMTP_HOST: env.SMTP_HOST,
		SMTP_PORT: env.SMTP_PORT,
		SMTP_USER: env.SMTP_USER,
		SMTP_PASSWORD: env.SMTP_PASSWORD,
		MAIL_FROM: env.MAIL_FROM,
		CONTACT_NOTIFY_EMAIL: env.CONTACT_NOTIFY_EMAIL,
		OWNER_EMAIL: env.OWNER_EMAIL
	};
}

/**
 * Returns the email address that receives contact-form submissions.
 * Falls back to OWNER_EMAIL so the notification still works even if the
 * dedicated env var is not set. Returns undefined when neither is configured.
 */
export function getContactNotifyEmail(): string | undefined {
	const dedicated = env.CONTACT_NOTIFY_EMAIL?.trim();
	if (dedicated) return dedicated;
	const fallback = env.OWNER_EMAIL?.trim();
	if (fallback) return fallback;
	return undefined;
}