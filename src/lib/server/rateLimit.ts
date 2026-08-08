// In-memory token-bucket rate limiter.
// Scope: per-process. Good enough for adapter-node single-instance deployments;
// if you ever scale horizontally, swap this for a shared store (Redis, etc).

interface Bucket {
	tokens: number;
	lastRefill: number;
}

interface RateLimitConfig {
	/** Bucket capacity (max burst). */
	capacity: number;
	/** Tokens added per second. */
	refillPerSecond: number;
}

const buckets = new Map<string, Bucket>();

export function rateLimit(
	key: string,
	config: RateLimitConfig,
	now: number = Date.now()
): { allowed: boolean; remaining: number; retryAfterMs: number } {
	const bucket = buckets.get(key) ?? { tokens: config.capacity, lastRefill: now };

	// Refill since last check.
	const elapsedSeconds = (now - bucket.lastRefill) / 1000;
	bucket.tokens = Math.min(
		config.capacity,
		bucket.tokens + elapsedSeconds * config.refillPerSecond
	);
	bucket.lastRefill = now;

	if (bucket.tokens >= 1) {
		bucket.tokens -= 1;
		buckets.set(key, bucket);
		return { allowed: true, remaining: Math.floor(bucket.tokens), retryAfterMs: 0 };
	}

	// Not enough tokens: compute when one will be available.
	const tokensNeeded = 1 - bucket.tokens;
	const retryAfterMs = Math.ceil((tokensNeeded / config.refillPerSecond) * 1000);
	buckets.set(key, bucket);
	return { allowed: false, remaining: 0, retryAfterMs };
}

/** Best-effort client IP extraction. Trusts X-Forwarded-For first hop if present. */
export function getClientIp(headers: Headers): string {
	const forwarded = headers.get('x-forwarded-for');
	if (forwarded) {
		// Take the first hop (the actual client).
		return forwarded.split(',')[0].trim();
	}
	return headers.get('x-real-ip') ?? 'unknown';
}

// Periodic cleanup so the Map doesn't grow unbounded under attack.
const CLEANUP_INTERVAL_MS = 10 * 60 * 1000;
const BUCKET_TTL_MS = 60 * 60 * 1000;

if (typeof setInterval !== 'undefined') {
	const interval = setInterval(() => {
		const now = Date.now();
		for (const [key, bucket] of buckets.entries()) {
			if (now - bucket.lastRefill > BUCKET_TTL_MS) {
				buckets.delete(key);
			}
		}
	}, CLEANUP_INTERVAL_MS);
	// Don't keep the event loop alive just for cleanup.
	if (typeof interval.unref === 'function') interval.unref();
}