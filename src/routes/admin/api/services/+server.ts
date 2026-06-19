import { db } from '$lib/server/db/index';
import { services } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestHandler } from './$types';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const userRole = locals.user?.role;
  if (userRole !== 'owner' && userRole !== 'manager') {
    return jsonResponse({ error: 'Toegang geweigerd' }, locals.user ? 403 : 401);
  }

  const body = await request.json();
  const action = body._action || body.action || 'create';

  // Handle delete
  if (action === 'delete' || body._action === 'delete') {
    const id = parseInt(String(body.id || ''), 10);
    if (!id) {
      return jsonResponse({ error: 'ID is verplicht' }, 400);
    }
    try {
      await db.delete(services).where(eq(services.id, id));
      return jsonResponse({ success: true, action: 'delete' });
    } catch (e: any) {
      return jsonResponse({ error: e.message || 'Database fout' }, 500);
    }
  }

  // Handle toggle active
  if (action === 'toggle' || body._action === 'toggle') {
    const id = parseInt(String(body.id || ''), 10);
    const isActive = body.isActive === true || body.isActive === 'true' || body.isActive === 'on';
    if (!id) {
      return jsonResponse({ error: 'ID is verplicht' }, 400);
    }
    try {
      await db.update(services).set({ isActive: !isActive }).where(eq(services.id, id));
      return jsonResponse({ success: true, action: 'toggle' });
    } catch (e: any) {
      return jsonResponse({ error: e.message || 'Database fout' }, 500);
    }
  }

  // Handle create/update
  const id = body.id ? parseInt(String(body.id), 10) : null;
  const name = String(body.name || '');
  const description = String(body.description || '');
  const price = String(body.price || '');
  const duration = parseInt(String(body.duration || '45'), 10);
  const category = String(body.category || 'hair');
  const isSignature = body.isSignature === 'on' || body.isSignature === true;
  const isActive = body.isActive === 'on' || body.isActive === true || body.isActive !== 'off';

  if (!name || !price) {
    return jsonResponse({ error: 'Naam en prijs zijn verplicht' }, 400);
  }

  // Generate slug from name
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  try {
    if (id) {
      // Update existing
      await db.update(services).set({
        name,
        slug,
        description: description || null,
        price,
        duration,
        category,
        isSignature,
        isActive
      }).where(eq(services.id, id));
      return jsonResponse({ success: true, action: 'update' });
    } else {
      // Create new
      const result = await db.insert(services).values({
        name,
        slug,
        description: description || null,
        price,
        duration,
        category,
        isSignature,
        isActive,
        displayOrder: 0
      });
      return jsonResponse({ success: true, action: 'create', id: result[0]?.insertId });
    }
  } catch (e: any) {
    if (e.code === 'ER_DUP_ENTRY') {
      return jsonResponse({ error: 'Een service met deze naam bestaat al' }, 409);
    }
    return jsonResponse({ error: e.message || 'Database fout' }, 500);
  }
};