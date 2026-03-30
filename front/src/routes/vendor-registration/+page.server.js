// src/routes/vendor-registration/+page.server.js
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
  const jwt = cookies.get('jwt');
  const userCookie = cookies.get('user');

  // Already logged in → send to dashboard
  if (jwt && userCookie) {
    throw redirect(302, '/vendor-dashboard');
  }

  // Public page — no auth required
  return {};
};
