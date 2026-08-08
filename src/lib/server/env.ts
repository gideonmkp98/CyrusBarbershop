// Centralized server-side environment validation.
// Hard-fails in production when required secrets are missing or too short,
// so the server refuses to boot rather than silently running in an insecure mode.

import { dev } from '$app/environment';
import { SESSION_SECRET, DATABASE_URL } from '$env/static/private';
import { PUBLIC_SITE_URL } from '$env/static/public';

const SESSION_SECRET_MIN_LENGTH = 32;

interface EnvIssue {
	variable: string;
	message: string;
}

function validate(): EnvIssue[] {
	const issues: EnvIssue[] = [];

	if (!SESSION_SECRET) {
		issues.push({ variable: 'SESSION_SECRET', message: 'is not set' });
	} else if (SESSION_SECRET.length < SESSION_SECRET_MIN_LENGTH) {
		issues.push({
			variable: 'SESSION_SECRET',
			message: `is shorter than ${SESSION_SECRET_MIN_LENGTH} characters`
		});
	}

	if (!DATABASE_URL) {
		issues.push({ variable: 'DATABASE_URL', message: 'is not set' });
	}

	if (!PUBLIC_SITE_URL) {
		issues.push({ variable: 'PUBLIC_SITE_URL', message: 'is not set' });
	}

	return issues;
}

const issues = validate();

if (issues.length > 0) {
	const formatted = issues.map((i) => `  - ${i.variable} ${i.message}`).join('\n');
	if (dev) {
		// In dev, log a warning so developers notice without killing their session mid-edit.
		console.warn(`[ENV] Environment validation warnings:\n${formatted}`);
	} else {
		// In production, refuse to boot. Unsigned sessions + missing DB would
		// expose customer data; we prefer a crash over a silent insecure start.
		throw new Error(
			`[ENV] Refusing to start in production with invalid environment:\n${formatted}`
		);
	}
}

export const ENV_VALIDATED = true;