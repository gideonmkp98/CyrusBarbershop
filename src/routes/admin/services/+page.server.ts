import { db } from '$lib/server/db/index';
import { services } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const canManageServices = locals.user?.role === 'owner' || locals.user?.role === 'manager';

  if (!canManageServices) {
    return { canManageServices: false, services: [] };
  }

  const allServices = await db.select({
    id: services.id,
    name: services.name,
    slug: services.slug,
    description: services.description,
    price: services.price,
    duration: services.duration,
    category: services.category,
    isSignature: services.isSignature,
    displayOrder: services.displayOrder,
    isActive: services.isActive
  }).from(services).orderBy(services.displayOrder, services.name);

  return { canManageServices, services: allServices };
};

export const actions: Actions = {
  default: async ({ request, locals }) => {
    if (locals.user?.role !== 'owner' && locals.user?.role !== 'manager') {
      return fail(403, { error: 'Toegang geweigerd' });
    }

    // Check content type and parse accordingly
    const contentType = request.headers.get('content-type') || '';
    let body: any;

    if (contentType.includes('application/json')) {
      body = await request.json();
    } else {
      const formData = await request.formData();
      body = Object.fromEntries(formData.entries());
    }

    const action = body._action || body.action || 'create';

    // Handle delete
    if (action === 'delete' || body._action === 'delete') {
      const id = parseInt(String(body.id || ''), 10);
      if (!id) {
        return fail(400, { error: 'ID is verplicht' });
      }
      try {
        await db.delete(services).where(eq(services.id, id));
        return { success: true, action: 'delete' };
      } catch (e: any) {
        return fail(500, { error: e.message || 'Database fout' });
      }
    }

    // Handle toggle active
    if (action === 'toggle' || body._action === 'toggle') {
      const id = parseInt(String(body.id || ''), 10);
      const isActive = body.isActive === 'true' || body.isActive === true || body.isActive === 'on';
      if (!id) {
        return fail(400, { error: 'ID is verplicht' });
      }
      try {
        await db.update(services).set({ isActive: !isActive }).where(eq(services.id, id));
        return { success: true, action: 'toggle' };
      } catch (e: any) {
        return fail(500, { error: e.message || 'Database fout' });
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
      return fail(400, { error: 'Naam en prijs zijn verplicht' });
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
        return { success: true, action: 'update' };
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
        return { success: true, action: 'create', id: result[0]?.insertId };
      }
    } catch (e: any) {
      if (e.code === 'ER_DUP_ENTRY') {
        return fail(409, { error: 'Een service met deze naam bestaat al' });
      }
      return fail(500, { error: e.message || 'Database fout' });
    }
  }
};
