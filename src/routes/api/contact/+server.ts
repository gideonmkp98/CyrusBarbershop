import { dev } from '$app/environment';
import { contactSchema } from '$lib/utils/validation';
import { rateLimit, getClientIp } from '$lib/server/rateLimit';
import { sendContactEmails } from '$lib/server/mail';
import { PUBLIC_SITE_URL } from '$env/static/public';
import type { RequestHandler } from './$types';

// Contact form is public, unauthenticated. Rate limit to 5 requests / minute / IP
// to avoid spam + log floods once email sending is wired up.
const RATE_LIMIT = { capacity: 5, refillPerSecond: 5 / 60 };

// Anti-spam: honeypot + time-trap. Bots fill all fields including hidden ones,
// and submit instantly. We silently drop these without telling the spammer
// anything useful — the API returns success so they don't iterate.
const MIN_MESSAGE_WORDS = 10;
const MIN_RENDER_MS = 1500;

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

  // Anti-spam gates. Run BEFORE Zod so we never leak validation feedback to
  // bots (they'd iterate). Silently return success on spam hits so the bot
  // can't tell its submission was rejected.
  if (body && typeof body === 'object') {
    const b = body as Record<string, unknown>;
    // Honeypot: hidden field must be empty. Bots fill every input they see.
    if (typeof b.hp === 'string' && b.hp.length > 0) {
      console.warn('[contact] spam: honeypot filled from ip=%s', ip);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
    // Time-trap: humans take >1.5s to fill a form; bots submit instantly.
    const rt = typeof b.renderTime === 'number' ? b.renderTime : 0;
    if (rt < MIN_RENDER_MS) {
      console.warn('[contact] spam: renderTime too low (%dms) from ip=%s', rt, ip);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    console.warn('[contact] validation failed:', parsed.error.issues);
    // Translate Zod issues to Dutch, field-specific messages for the UI.
    // Keep the schema details server-side (don't expose paths/limits in prod).
    const fieldMessages: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const field = String(issue.path[0] ?? '');
      if (!field || fieldMessages[field]) continue;
      if (issue.code === 'too_small') {
        fieldMessages[field] =
          field === 'name'
            ? 'Naam is te kort (minimaal 2 tekens)'
            : field === 'message'
              ? 'Bericht is te kort (minimaal 3 tekens)'
              : 'Veld is te kort';
      } else if (issue.code === 'too_big') {
        fieldMessages[field] =
          field === 'name'
            ? 'Naam is te lang (maximaal 100 tekens)'
            : 'Bericht is te lang (maximaal 2000 tekens)';
      } else if (issue.code === 'invalid_string' && field === 'email') {
        fieldMessages[field] = 'Ongeldig e-mailadres';
      } else {
        fieldMessages[field] = 'Ongeldige invoer';
      }
    }
    // Don't expose the generic "Ongeldige invoer" banner when we already have
    // field-level messages — otherwise the user sees the same complaint twice.
    const hasFieldErrors = Object.keys(fieldMessages).length > 0;
    const errorBody = dev
      ? {
          error: hasFieldErrors ? undefined : 'Ongeldige invoer',
          issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message })),
          fields: fieldMessages
        }
      : {
          error: hasFieldErrors ? undefined : 'Ongeldige invoer',
          fields: fieldMessages
        };
    return new Response(JSON.stringify(errorBody), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // Word-count gate (only after Zod passes so message is sanitized). Bots can
  // pass the schema but still spam with one-word junk; require a real question.
  const wordCount = parsed.data.message.split(/\s+/).filter(Boolean).length;
  if (wordCount < MIN_MESSAGE_WORDS) {
    console.warn('[contact] message too short: %d words from ip=%s', wordCount, ip);
    return new Response(
      JSON.stringify({
        error: undefined,
        fields: {
          message: `Bericht is te kort (minimaal ${MIN_MESSAGE_WORDS} woorden)`
        }
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
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