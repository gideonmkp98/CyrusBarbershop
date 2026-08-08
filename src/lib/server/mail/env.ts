// Provide a single source for private environment variables used by the mail module.
// In SvelteKit server code `$env/dynamic/private` ultimately reads from `process.env`,
// and plain Node/TSX scripts (such as `scripts/test-email.ts`) only have `process.env`.
// Using `process.env` directly keeps the mail module usable in both contexts.

export function getMailEnv(): Record<string, string | undefined> {
	return process.env;
}

/**
 * Returns the email address that receives contact-form submissions.
 * Falls back to OWNER_EMAIL so the notification still works even if the
 * dedicated env var is not set. Returns undefined when neither is configured.
 */
export function getContactNotifyEmail(): string | undefined {
	const dedicated = process.env.CONTACT_NOTIFY_EMAIL;
	if (dedicated && dedicated.trim().length > 0) return dedicated.trim();
	const fallback = process.env.OWNER_EMAIL;
	if (fallback && fallback.trim().length > 0) return fallback.trim();
	return undefined;
}
