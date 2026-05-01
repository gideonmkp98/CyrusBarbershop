import { contactSchema } from '$lib/utils/validation';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json();
  const parsed = contactSchema.safeParse(body);

  if (!parsed.success) {
    return new Response(JSON.stringify({ error: 'Validatie mislukt', issues: parsed.error.issues }), {
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