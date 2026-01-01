// src/routes/api/product/delete/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
  console.log('🚀 Product delete endpoint called (Strapi v5)');
  
  try {
    const jwt = cookies.get('jwt');
    if (!jwt) {
      console.log('❌ No JWT found in cookies');
      return json({ success: false, error: 'Please log in again' }, { status: 401 });
    }
    
    const body = await request.json();
    const { productId, vendorId } = body; // Assuming productId is the numeric id
    
    if (!productId) {
      return json({ success: false, error: 'Product ID is required' }, { status: 400 });
    }
    
    // First, fetch the product using numeric id to get documentId and verify ownership
    console.log(`🔍 Fetching product with id=${productId}`);
    const productRes = await fetch(
      `http://localhost:1337/api/products?filters[id][$eq]=${productId}&populate=vendors`,
      {
        headers: { 'Authorization': `Bearer ${jwt}` }
      }
    );
    
    if (!productRes.ok) {
      const errorData = await productRes.json();
      console.log('❌ Failed to fetch product:', errorData);
      return json({ success: false, error: 'Product not found or access denied' }, { status: productRes.status });
    }
    
    const productResponse = await productRes.json();
    if (!productResponse.data || productResponse.data.length === 0) {
      return json({ success: false, error: 'Product not found' }, { status: 404 });
    }
    
    const productData = productResponse.data[0];
    console.log('📄 Product data:', productData);
    
    const documentId = productData.documentId;
    if (!documentId) {
      return json({ success: false, error: 'Document ID not found in product data' }, { status: 500 });
    }
    
    const vendorIds = (productData.vendors || []).map(v => v.id);
    console.log('👥 Product vendors:', vendorIds);
    console.log('👤 Current vendor ID:', vendorId);
    
    if (vendorId && !vendorIds.includes(parseInt(vendorId))) {
      return json({ success: false, error: 'You do not own this product' }, { status: 403 });
    }
    
    // Option 1: Try direct DELETE using documentId (requires 'delete' permission)
    const deleteResponse = await fetch(
      `http://localhost:1337/api/products/${documentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );
    
    console.log(`📥 Strapi DELETE response: ${deleteResponse.status} ${deleteResponse.statusText}`);
    
    if (deleteResponse.ok) {
      console.log('✅ Product deleted successfully');
      return json({ success: true, message: 'Product deleted successfully' });
    }
    
    // If DELETE fails, fallback to disconnecting relation (requires 'update' permission)
    console.log('🔄 DELETE failed, disconnecting vendor relation...');
    
    const updatePayload = {
      data: {
        vendors: {
          disconnect: [{ id: parseInt(vendorId) }]
        }
      }
    };
    
    const updateRes = await fetch(
      `http://localhost:1337/api/products/${documentId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updatePayload)
      }
    );
    
    console.log(`📥 Strapi UPDATE response: ${updateRes.status} ${updateRes.statusText}`);
    
    if (updateRes.ok) {
      console.log('✅ Vendor disconnected from product');
      return json({ success: true, message: 'Product removed from your inventory' });
    }
    
    const updateError = await updateRes.json();
    console.log('❌ Update failed:', updateError);
    return json({ success: false, error: updateError.error?.message || 'Failed to remove product' }, { status: updateRes.status });
    
  } catch (error) {
    console.error('💥 Delete endpoint error:', error);
    return json({ success: false, error: error.message }, { status: 500 });
  }
}