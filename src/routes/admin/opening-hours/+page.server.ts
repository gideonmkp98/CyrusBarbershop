import { redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db/index';
import { openingHours } from '$lib/server/db/schema';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, '/admin-login');
  }

  // Owners and managers can manage opening hours
  if (locals.user.role !== 'owner' && locals.user.role !== 'manager') {
    throw redirect(303, '/admin');
  }

  const hours = await db.select().from(openingHours).orderBy(openingHours.dayOfWeek);

  return { openingHours: hours };
};
