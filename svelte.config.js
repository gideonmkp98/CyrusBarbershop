import adapter from '@sveltejs/adapter-node';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter(),
		csrf: {
			// Disable automatic origin check. On deployments with reverse proxies / IP-based
			// domains (e.g. sslip.io) the Origin header may not match SvelteKit's idea of the
			// request origin, causing a 403 on every POST. Cookies remain httpOnly + sameSite=lax.
			checkOrigin: false
		}
	}
};

export default config;