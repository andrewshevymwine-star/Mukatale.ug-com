// src/routes/api/product/save/+server.js
import { STRAPI_URL } from '$env/static/private';

const STRAPI = STRAPI_URL;

export async function POST({ request, cookies, fetch }) {
  try {
    const jwt = cookies.get('jwt');

    if (!jwt) {
      return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();

    // Dashboard sends { productId, vendorId, formData }
    const { productId, vendorId, formData } = body;

    console.log('💾 Saving product:', { productId, vendorId });

    if (!vendorId) {
      return new Response(JSON.stringify({ success: false, error: 'Vendor ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ── Build Strapi payload ───────────────────────────────────────
    // Strapi v5 uses { data: ... } wrapper for POST/PUT on collection types
    const strapiPayload = {
      data: {
        name:        formData.name,
        description: formData.description || '',
        price:       parseFloat(formData.price),
        unit:        formData.unit || 'piece',

        // category is a oneWay relation — send as ID
        category: formData.category ? parseInt(formData.category) : null,

        // vendors is manyToMany — send as array of IDs
        vendors: [parseInt(vendorId)],

        // markets is manyToMany — send as array of IDs if market is set
        ...(formData.market ? { markets: [parseInt(formData.market)] } : {})
      }
    };

    // ── Handle image upload ────────────────────────────────────────
    if (formData.imageFile) {
      try {
        console.log('📸 Uploading product image...');

        const base64Data    = formData.imageFile.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteArray      = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }

        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        const fd   = new FormData();
        fd.append('files', blob, `product-${Date.now()}.jpg`);

        const uploadRes = await fetch(`${STRAPI}/api/upload`, {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${jwt}` },
          body:    fd
        });

        if (uploadRes.ok) {
          const uploaded = await uploadRes.json();
          strapiPayload.data.image = uploaded[0].id;
          console.log('✅ Image uploaded, ID:', uploaded[0].id);
        } else {
          console.warn('⚠️ Image upload failed, continuing without image');
        }
      } catch (uploadErr) {
        console.error('Image upload error:', uploadErr);
        // Continue saving without image rather than failing
      }
    }

    // ── Save to Strapi ─────────────────────────────────────────────
    let response;

    if (productId) {
      console.log('🔄 Updating product:', productId);
      response = await fetch(`${STRAPI}/api/products/${productId}`, {
        method:  'PUT',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify(strapiPayload)
      });
    } else {
      console.log('🆕 Creating new product');
      response = await fetch(`${STRAPI}/api/products`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type':  'application/json'
        },
        body: JSON.stringify(strapiPayload)
      });
    }

    console.log('📥 Strapi response status:', response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Strapi error:', errorText);
      return new Response(JSON.stringify({
        success: false,
        error:   `Failed to save product: ${response.status}`
      }), {
        status:  response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await response.json();
    console.log('✅ Product saved, ID:', result.data?.id || result.id);

    return new Response(JSON.stringify({
      success: true,
      product: result.data || result
    }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('💥 Product save error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}