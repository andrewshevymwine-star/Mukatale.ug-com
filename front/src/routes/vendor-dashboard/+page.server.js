// src/routes/vendor-dashboard/+page.server.js
import { redirect } from '@sveltejs/kit';
import { STRAPI_URL } from '$env/static/private';

const STRAPI = STRAPI_URL;

export const load = async ({ cookies, fetch }) => {
  const jwt        = cookies.get('jwt');
  const userCookie = cookies.get('user');

  if (!jwt || !userCookie) throw redirect(302, '/vendor-login');

  let user;
  try {
    user = JSON.parse(userCookie);
  } catch (e) {
    throw redirect(302, '/vendor-login');
  }

  const headers = { 'Authorization': `Bearer ${jwt}` };

  // ── Fire vendor, markets, categories all at once ─────────────────
  const [vendorRes, marketsRes, categoriesRes] = await Promise.all([
    fetch(`${STRAPI}/api/vendors?filters[users_permissions_user][id][$eq]=${user.id}&populate=*`, { headers }),
    fetch(`${STRAPI}/api/markets?fields[0]=id&fields[1]=name&fields[2]=location&sort=name:asc`, { headers }),
    fetch(`${STRAPI}/api/categories?fields[0]=id&fields[1]=name&sort=name:asc`, { headers })
  ]);

  // ── Handle expired JWT ────────────────────────────────────────────
  if (vendorRes.status === 401 || vendorRes.status === 403) {
    cookies.delete('jwt',      { path: '/' });
    cookies.delete('user',     { path: '/' });
    cookies.delete('vendor',   { path: '/' });
    cookies.delete('vendorId', { path: '/' });
    throw redirect(302, '/vendor-login');
  }

  // ── Parse vendor ──────────────────────────────────────────────────
  let vendor   = null;
  let vendorId = null;
  let products = [];

  if (vendorRes.ok) {
    const vendorData = await vendorRes.json();
    if (vendorData.data?.length > 0) {
      vendor   = vendorData.data[0];
      vendorId = vendor.id;

      cookies.set('vendor',   JSON.stringify(vendor), { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 });
      cookies.set('vendorId', vendorId.toString(),    { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 });

      // ── Fetch products only after we have vendorId ────────────────
      const productsRes = await fetch(
        `${STRAPI}/api/products?filters[vendors][id][$eq]=${vendorId}&populate=*`,
        { headers }
      );

      if (productsRes.ok) {
        const productsData = await productsRes.json();
        products = Array.isArray(productsData.data) ? productsData.data : [];
      }
    }
  }

  // ── Parse markets + categories ────────────────────────────────────
  const markets    = marketsRes.ok    ? (await marketsRes.json()).data    || [] : [];
  const categories = categoriesRes.ok ? (await categoriesRes.json()).data || [] : [];

  return {
    user,
    vendor,
    vendorId,
    products,
    markets,
    categories,
    isAuthenticated:  true,
    hasVendorProfile: !!vendor
  };
};