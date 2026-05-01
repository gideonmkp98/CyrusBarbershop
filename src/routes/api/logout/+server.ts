import { deleteSession } from '$lib/server/auth';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ cookies }) => {
  const token = cookies.get('session_token');
  if (token) {
    await deleteSession(token);
    cookies.delete('session_token', { path: '/' });
  }
  return new Response(null, { status: 200 });
};