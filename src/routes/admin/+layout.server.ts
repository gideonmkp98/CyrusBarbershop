import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
  // Protect all admin routes
  if (!locals.user) {
    throw redirect(302, '/admin-login');
  }

  return {
    user: locals.user
  };
};
