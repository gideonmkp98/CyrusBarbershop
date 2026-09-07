import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { db } from '$lib/server/db/index';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp']
]);

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const POST: RequestHandler = async ({ request, locals }) => {
  if (locals.user?.role !== 'owner') {
    return jsonResponse({ error: "Alleen owner kan barberfoto's wijzigen" }, locals.user ? 403 : 401);
  }

  const formData = await request.formData();
  const userId = parseInt(String(formData.get('userId') || ''), 10);
  const file = formData.get('avatar');

  if (!userId) {
    return jsonResponse({ error: 'Ongeldige gebruiker' }, 400);
  }

  if (!(file instanceof File)) {
    return jsonResponse({ error: 'Geen bestand ontvangen' }, 400);
  }

  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    return jsonResponse({ error: 'Gebruik een JPG, PNG of WebP afbeelding' }, 400);
  }

  if (file.size > MAX_FILE_SIZE) {
    return jsonResponse({ error: 'Afbeelding mag maximaal 2 MB zijn' }, 400);
  }

  const targetUser = await db
    .select({ id: users.id, isBarber: users.isBarber })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!targetUser[0]) {
    return jsonResponse({ error: 'Gebruiker niet gevonden' }, 404);
  }

  if (!targetUser[0].isBarber) {
    return jsonResponse({ error: "Foto's kunnen alleen voor barbers worden ingesteld" }, 400);
  }

  const uploadsDir = path.resolve('static', 'uploads', 'barbers');
  await mkdir(uploadsDir, { recursive: true });

  const filename = `${userId}-${randomUUID()}.${extension}`;
  const diskPath = path.join(uploadsDir, filename);
  const imageUrl = `/uploads/barbers/${filename}`;

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(diskPath, buffer);
  await db.update(users).set({ imageUrl }).where(eq(users.id, userId));

  return jsonResponse({ success: true, imageUrl });
};

export const DELETE: RequestHandler = async ({ request, locals }) => {
  if (locals.user?.role !== 'owner') {
    return jsonResponse({ error: "Alleen owner kan barberfoto's wijzigen" }, locals.user ? 403 : 401);
  }

  const body = await request.json();
  const userId = parseInt(String(body.userId || ''), 10);

  if (!userId) {
    return jsonResponse({ error: 'Ongeldige gebruiker' }, 400);
  }

  await db.update(users).set({ imageUrl: null }).where(eq(users.id, userId));

  return jsonResponse({ success: true, imageUrl: null });
};
