import { dev } from '$app/environment';
import { contactSchema } from '$lib/utils/validation';
import { rateLimit, getClientIp } from '$lib/server/rateLimit';
import { sendContactEmails } from '$lib/server/mail';
import { PUBLIC_SITE_URL } from '$env/static/public';
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

  // Debug: log the actual body so we can diagnose browser-side state issues.
  console.log('[contact] received body:', JSON.stringify(body));

  // Sanitize: trim string fields and drop empties before Zod so we don't reject
  // browser submissions that contain stray whitespace from autocomplete.
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    for (const key of ['name', 'email', 'message']) {
      if (typeof b[key] === 'string') {
        b[key] = (b[key] as string).trim();
      }
    }
  }

  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    console.warn('[contact] validation failed:', parsed.error.issues);
    const errorBody = dev
      ? {
          error: 'Ongeldige invoer',
          issues: parsed.error.issues.map((i) => ({
            path: i.path,
            message: i.message
          }))
        }
      : { error: 'Ongeldige invoer' };
    return new Response(JSON.stringify(errorBody), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Send the customer confirmation + owner notification. Email failures are
  // logged server-side but never fail the submission — the message has been
  // accepted; mail problems are an internal matter.
  try {
    const mailResult = await sendContactEmails({
      name: parsed.data.name,
      email: parsed.data.email,
      message: parsed.data.message,
      siteUrl: PUBLIC_SITE_URL || 'https://cyrusbarbershop.nl'
    });

    if (!mailResult.customer.ok) {
      console.error('[CONTACT] Customer confirmation not sent:', mailResult.customer.reason);
    }
    if (!mailResult.owner.ok) {
      console.error('[CONTACT] Owner notification not sent:', mailResult.owner.reason);
    }
  } catch (mailError) {
    console.error('[CONTACT] Unexpected error while sending contact emails:', mailError);
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' }
  });
};