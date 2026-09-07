import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const user = locals.user;

  if (!user) {
    throw redirect(303, '/admin-login');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      imageUrl: user.imageUrl ?? null,
      role: user.role,
      isActive: user.isActive
    }
  };
};
