// src/routes/vendor-login/+page.server.js
import { redirect } from '@sveltejs/kit';
import { STRAPI_URL } from '$env/static/private';

const STRAPI = STRAPI_URL;

export const actions = {
  login: async ({ request, cookies, fetch }) => {
    try {
      const formData   = await request.formData();
      const identifier = formData.get('identifier');
      const password   = formData.get('password');

      if (!identifier || !password) {
        return { success: false, error: 'Email/phone and password are required' };
      }

      // ── Authenticate with Strapi ─────────────────────────────────
      const strapiResponse = await fetch(`${STRAPI}/api/auth/local`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identifier: identifier.trim(), password })
      });

      if (!strapiResponse.ok) {
        const errorData = await strapiResponse.json().catch(() => ({}));
        return { success: false, error: errorData.error?.message || 'Invalid credentials' };
      }

      const authData = await strapiResponse.json();
      const { jwt, user } = authData;

      if (!jwt || !user) {
        return { success: false, error: 'Authentication failed' };
      }

      console.log('✅ User authenticated:', user.email);

      // ── Set auth cookies ─────────────────────────────────────────
      const cookieOpts = {
        path:     '/',
        sameSite: 'lax',
        secure:   process.env.NODE_ENV === 'production',
        maxAge:   60 * 60 * 24 * 7
      };

      cookies.set('jwt',  jwt,                   { ...cookieOpts, httpOnly: true });
      cookies.set('user', JSON.stringify(user),   cookieOpts);

      // ── Check for vendor profile ─────────────────────────────────
      const vendorRes = await fetch(
        `${STRAPI}/api/vendors?filters[users_permissions_user][id][$eq]=${user.id}&populate=*`,
        { headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' } }
      );

      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();

        if (vendorData.data && vendorData.data.length > 0) {
          const vendor   = vendorData.data[0];
          const vendorId = vendor.id;

          cookies.set('vendor',   JSON.stringify(vendor), cookieOpts);
          cookies.set('vendorId', vendorId.toString(),    cookieOpts);

          console.log('🚀 Vendor found, redirecting to dashboard');
          throw redirect(302, '/vendor-dashboard');
        }
      }

      // No vendor profile — send to registration to complete profile
      console.log('📝 No vendor profile, redirecting to registration');
      throw redirect(302, '/vendor-registration?completeProfile=true');

    } catch (error) {
      if (error?.status === 302) throw error;
      console.error('💥 Login error:', error);
      return { success: false, error: 'Server error. Please try again.' };
    }
  }
};

export const load = async ({ cookies, url }) => {
  const jwt        = cookies.get('jwt');
  const userCookie = cookies.get('user');

  if (jwt && userCookie) {
    throw redirect(302, '/vendor-dashboard');
  }

  return { isAuthenticated: false };
};