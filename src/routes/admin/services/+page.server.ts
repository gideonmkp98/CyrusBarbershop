import { db } from '$lib/server/db/index';
import { services } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

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