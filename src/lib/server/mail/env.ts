// Provide a single source for private environment variables used by the mail module.
// We pull from SvelteKit's `$env/static/private` so values are loaded from
// `.env` reliably across dev/prod. Plain Node/TSX scripts can still use
// `process.env` (see `scripts/test-email.ts`) — they're outside the SvelteKit
// runtime and don't need this module.

import {
	SMTP_HOST,
	SMTP_PORT,
	SMTP_USER,
	SMTP_PASSWORD,
	MAIL_FROM,
	CONTACT_NOTIFY_EMAIL,
	OWNER_EMAIL
} from '$env/static/private';

export function getMailEnv(): Record<string, string | undefined> {
	return {
		SMTP_HOST,
		SMTP_PORT,
		SMTP_USER,
		SMTP_PASSWORD,
		MAIL_FROM,
		CONTACT_NOTIFY_EMAIL,
		OWNER_EMAIL
	};
}

/**
 * Returns the email address that receives contact-form submissions.
 * Falls back to OWNER_EMAIL so the notification still works even if the
 * dedicated env var is not set. Returns undefined when neither is configured.
 */
export function getContactNotifyEmail(): string | undefined {
	const dedicated = CONTACT_NOTIFY_EMAIL?.trim();
	if (dedicated) return dedicated;
	const fallback = OWNER_EMAIL?.trim();
	if (fallback) return fallback;
	return undefined;
}
