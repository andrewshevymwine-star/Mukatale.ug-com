// src/routes/api/product/delete/+server.js
import { json } from '@sveltejs/kit';
import { STRAPI_URL } from '$env/static/private';

const STRAPI = STRAPI_URL;

export async function POST({ request, cookies }) {
  console.log('🚀 Product delete endpoint called');

  try {
    const jwt = cookies.get('jwt');
    if (!jwt) {
      return json({ success: false, error: 'Please log in again' }, { status: 401 });
    }

    const { productId, vendorId } = await request.json();

    if (!productId) {
      return json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }

    // ── Fetch product to get documentId and verify ownership ───────
    console.log(`🔍 Fetching product id=${productId}`);
    const productRes = await fetch(
      `${STRAPI}/api/products?filters[id][$eq]=${productId}&populate=vendors`,
      { headers: { 'Authorization': `Bearer ${jwt}` } }
    );

    if (!productRes.ok) {
      return json({ success: false, error: 'Product not found or access denied' }, { status: productRes.status });
    }

    const productResponse = await productRes.json();
    if (!productResponse.data || productResponse.data.length === 0) {
      return json({ success: false, error: 'Product not found' }, { status: 404 });
    }

    const productData = productResponse.data[0];
    const documentId  = productData.documentId;

    if (!documentId) {
      return json({ success: false, error: 'Document ID not found' }, { status: 500 });
    }

    const vendorIds = (productData.vendors || []).map(v => v.id);
    if (vendorId && !vendorIds.includes(parseInt(vendorId))) {
      return json({ success: false, error: 'You do not own this product' }, { status: 403 });
    }

    // ── Attempt DELETE ─────────────────────────────────────────────
    const deleteRes = await fetch(`${STRAPI}/api/products/${documentId}`, {
      method:  'DELETE',
      headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' }
    });

    if (deleteRes.ok) {
      console.log('✅ Product deleted');
      return json({ success: true, message: 'Product deleted successfully' });
    }

    // ── Fallback: disconnect vendor relation ───────────────────────
    console.log('🔄 DELETE failed, disconnecting vendor relation...');
    const updateRes = await fetch(`${STRAPI}/api/products/${documentId}`, {
      method:  'PUT',
      headers: { 'Authorization': `Bearer ${jwt}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: { vendors: { disconnect: [{ id: parseInt(vendorId) }] } }
      })
    });

    if (updateRes.ok) {
      return json({ success: true, message: 'Product removed from your inventory' });
    }

    const updateError = await updateRes.json();
    return json({ success: false, error: updateError.error?.message || 'Failed to remove product' }, { status: updateRes.status });

  } catch (error) {
    console.error('💥 Delete error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}