// src/routes/vendor-registration/+page.server.js
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies }) => {
  const jwt = cookies.get('jwt');
  const userCookie = cookies.get('user');

  // If already logged in, send them to the dashboard instead
  if (jwt && userCookie) {
    throw redirect(302, '/vendor-dashboard');
  }

  // Otherwise, let them access the registration page freely
  return {};
};