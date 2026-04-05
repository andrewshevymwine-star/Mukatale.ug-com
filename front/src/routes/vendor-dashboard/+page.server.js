// src/routes/vendor-dashboard/+page.server.js
import { redirect } from '@sveltejs/kit';
import { STRAPI_URL } from '$env/static/private';

const STRAPI = STRAPI_URL;

export const load = async ({ cookies, fetch, url }) => {
  console.log('📄 Dashboard server load started');

  const jwt        = cookies.get('jwt');
  const userCookie = cookies.get('user');

  if (!jwt || !userCookie) {
    throw redirect(302, '/vendor-login');
  }

  let user;
  try {
    user = JSON.parse(userCookie);
  } catch (e) {
    throw redirect(302, '/vendor-login');
  }

  let vendor   = null;
  let vendorId = null;
  let products = [];

  // ── 1. Fetch vendor profile ──────────────────────────────────────
  try {
    console.log('🔍 Fetching vendor for user ID:', user.id);

    const vendorRes = await fetch(
      // ✅ FIX: populate=* returns all relations including image and market in one shot
      `${STRAPI}/api/vendors?filters[users_permissions_user][id][$eq]=${user.id}&populate=*`,
      {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type':  'application/json'
        }
      }
    );

    if (vendorRes.ok) {
      const vendorData = await vendorRes.json();

      if (vendorData.data && vendorData.data.length > 0) {
        vendor   = vendorData.data[0];
        vendorId = vendor.id;
        console.log('✅ Vendor found:', vendor.name);

        // Update vendor cookies
        cookies.set('vendor',   JSON.stringify(vendor),    { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 });
        cookies.set('vendorId', vendorId.toString(),       { path: '/', sameSite: 'lax', secure: process.env.NODE_ENV === 'production', maxAge: 60 * 60 * 24 * 7 });

        // ── 2. Fetch products for this vendor ──────────────────────
        console.log('🛍️ Fetching products for vendor ID:', vendorId);

        const productsRes = await fetch(
          `${STRAPI}/api/products?filters[vendors][id][$eq]=${vendorId}&populate=*`,
          {
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type':  'application/json'
            }
          }
        );

        if (productsRes.ok) {
          const productsData = await productsRes.json();
          products = Array.isArray(productsData.data) ? productsData.data : [];
          console.log(`✅ Found ${products.length} products`);
        } else {
          console.error('❌ Products fetch failed:', productsRes.status);
        }
      } else {
        console.log('📝 No vendor profile found for this user');
      }
    } else {
      console.error('❌ Vendor fetch failed:', vendorRes.status);

      // Expired/invalid JWT — clear cookies and redirect
      if (vendorRes.status === 401 || vendorRes.status === 403) {
        cookies.delete('jwt',      { path: '/' });
        cookies.delete('user',     { path: '/' });
        cookies.delete('vendor',   { path: '/' });
        cookies.delete('vendorId', { path: '/' });
        throw redirect(302, '/vendor-login');
      }
    }
  } catch (error) {
    if (error?.status === 302) throw error; // re-throw redirects
    console.error('💥 Error loading vendor data:', error);
  }

  // ── 3. Fetch markets for the profile dropdown ────────────────────
  let markets = [];
  try {
    console.log('🏪 Fetching markets...');

    const marketsRes = await fetch(`${STRAPI}/api/markets?fields[0]=id&fields[1]=name&fields[2]=location&sort=name:asc`, {
      headers: { 'Authorization': `Bearer ${jwt}` }
    });

    if (marketsRes.ok) {
      const marketsData = await marketsRes.json();
      markets = marketsData.data || [];
      console.log(`✅ Markets loaded: ${markets.length}`);
    } else {
      console.error('❌ Markets fetch failed:', marketsRes.status);
    }
  } catch (error) {
    console.error('❌ Failed to fetch markets:', error);
  }

  // ── 4. Fetch categories for the product modal ────────────────────
  let categories = [];
  try {
    const categoriesRes = await fetch(`${STRAPI}/api/categories?fields[0]=id&fields[1]=name&sort=name:asc`, {
      headers: { 'Authorization': `Bearer ${jwt}` }
    });

    if (categoriesRes.ok) {
      const categoriesData = await categoriesRes.json();
      categories = categoriesData.data || [];
      console.log(`✅ Categories loaded: ${categories.length}`);
    } else {
      console.error('❌ Categories fetch failed:', categoriesRes.status);
    }
  } catch (error) {
    console.error('❌ Failed to fetch categories:', error);
  }

  console.log('🎯 Dashboard load complete:', {
    vendor:     vendor?.name || 'No vendor',
    products:   products.length,
    markets:    markets.length,
    categories: categories.length
  });

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