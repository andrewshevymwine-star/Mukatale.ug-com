// src/routes/api/vendor/update/+server.js
import { STRAPI_URL } from '$env/static/private';

export async function POST({ request, cookies }) {
  try {
    const jwt = cookies.get('jwt');
    if (!jwt) {
      return new Response(
        JSON.stringify({ success: false, error: 'Not authenticated' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const { vendorId, formData } = await request.json();

    console.log('Updating vendor:', vendorId, formData);

    // Prepare flat payload for Strapi v5
    const payload = {};

    if (formData.name?.trim()) payload.name = formData.name.trim();
    if (formData.contact?.trim()) payload.contact = formData.contact.trim();
    if (formData.email?.trim()) payload.email = formData.email.trim();
    if (formData.market) payload.market = formData.market;

    // ── Image upload ───────────────────────────────────────────────
    if (formData.imageFile && formData.imageFile.startsWith('data:image')) {
      try {
        const matches = formData.imageFile.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new Error('Invalid base64 image data');
        }

        const mimeType = matches[1];
        const base64Data = matches[2];

        const byteCharacters = atob(base64Data);
        const byteArray = new Uint8Array(byteCharacters.length);

        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }

        const blob = new Blob([byteArray], { type: mimeType });

        const uploadForm = new FormData();
        uploadForm.append('files', blob, 'vendor-image.jpg');

        const uploadRes = await fetch(`${STRAPI_URL}/api/upload`, {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${jwt}` },
          body: uploadForm
        });

        if (!uploadRes.ok) {
          const errText = await uploadRes.text();
          console.error('Image upload failed:', errText);
          throw new Error('Image upload failed');
        }

        const uploaded = await uploadRes.json();

        if (uploaded?.length > 0) {
          payload.image = uploaded[0].id;
        }
      } catch (err) {
        console.error('Image upload error:', err);
        // Continue without image instead of failing the whole update
      }
    }

    // ── Step 1: Get documentId and existing product IDs ───────────
    const fetchRes = await fetch(
      `${STRAPI_URL}/api/vendors?filters[id][$eq]=${vendorId}&fields=documentId&populate[products][fields][0]=id`,
      {
        headers: { 'Authorization': `Bearer ${jwt}` }
      }
    );

    if (!fetchRes.ok) {
      throw new Error(`Failed to fetch vendor: ${fetchRes.status}`);
    }

    const { data } = await fetchRes.json();

    if (!data?.length) {
      throw new Error('Vendor not found');
    }

    const documentId = data[0].documentId;
    if (!documentId) {
      throw new Error('Missing documentId');
    }

    // ── Preserve existing product relations ───────────────────────
    const existingProductIds = data[0].products?.map(p => p.id) ?? [];
    payload.products = { connect: existingProductIds, disconnect: [] };

    // ── Step 2: Update vendor ──────────────────────────────────────
    const updateRes = await fetch(`${STRAPI_URL}/api/vendors/${documentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: payload })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Update failed:', updateRes.status, errText);

      return new Response(
        JSON.stringify({ success: false, error: errText || 'Update failed' }),
        {
          status: updateRes.status,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const result = await updateRes.json();

    return new Response(
      JSON.stringify({
        success: true,
        vendor: result.data
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  } catch (error) {
    console.error('Vendor update error:', error);
    return new Response(
      JSON.stringify({ success: false, error: error.message || 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}