import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

function getTrustedOrigins() {
	const siteUrl = process.env.PUBLIC_SITE_URL;
	if (!siteUrl) return [];
	try {
		return [new URL(siteUrl).origin];
	} catch {
		console.warn(`[CONFIG] PUBLIC_SITE_URL is not a valid URL: ${siteUrl}`);
		return [];
	}
}

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csrf: {
			// Trust the configured public site URL so POST requests from the live domain
			// (including sslip.io / reverse-proxy setups) are not rejected by CSRF checks.
			// Keep empty in dev/test so SvelteKit falls back to default same-origin behavior.
			trustedOrigins: getTrustedOrigins()
		}
	}
};

export default config;
