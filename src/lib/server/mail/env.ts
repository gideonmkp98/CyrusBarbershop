// Provide a single source for private environment variables used by the mail module.
// In SvelteKit server code `$env/dynamic/private` ultimately reads from `process.env`,
// and plain Node/TSX scripts (such as `scripts/test-email.ts`) only have `process.env`.
// Using `process.env` directly keeps the mail module usable in both contexts.

export function getMailEnv(): Record<string, string | undefined> {
	return process.env;
}
