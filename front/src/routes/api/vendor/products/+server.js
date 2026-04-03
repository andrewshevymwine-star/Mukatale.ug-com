// src/routes/api/vendor/products/+server.js
import { STRAPI_URL } from '$env/static/private';

const STRAPI = STRAPI_URL;

export async function GET({ cookies, fetch }) {
  try {
    const jwt      = cookies.get('jwt');
    const vendorId = cookies.get('vendorId');

    if (!jwt) {
      return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
        status: 401, headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('📦 Loading products for vendor:', vendorId);

    const response = await fetch(
      `${STRAPI}/api/products?filters[vendors][id][$eq]=${vendorId}&populate=*`,
      { headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      return new Response(JSON.stringify({ success: false, error: `Failed to load products: ${response.status}` }), {
        status: response.status, headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    console.log('✅ Products loaded:', result.data?.length || 0);

    return new Response(JSON.stringify({ success: true, products: result.data || [] }), {
      status: 200, headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Load products error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' }
    });
  }
}