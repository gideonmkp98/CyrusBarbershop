import { contactSchema } from '$lib/utils/validation';
import { rateLimit, getClientIp } from '$lib/server/rateLimit';
import type { RequestHandler } from './$types';

// Contact form is public, unauthenticated. Rate limit to 5 requests / minute / IP
// to avoid spam + log floods once email sending is wired up.
const RATE_LIMIT = { capacity: 5, refillPerSecond: 5 / 60 };

export const POST: RequestHandler = async ({ request }) => {
  const ip = getClientIp(request.headers);
  const limit = rateLimit(`contact:${ip}`, RATE_LIMIT);
  if (!limit.allowed) {
    return new Response(JSON.stringify({ error: 'Te veel verzoeken, probeer later opnieuw' }), {
      status: 429,
      headers: {
        'Content-Type': 'application/json',
        'Retry-After': String(Math.ceil(limit.retryAfterMs / 1000))
      }
    });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Ongeldige invoer' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    console.warn('[contact] validation failed:', parsed.error.issues);
    return new Response(JSON.stringify({ error: 'Ongeldige invoer' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Log the contact submission (replace with email sending in production)
  console.log('Contact submission:', parsed.data);

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};