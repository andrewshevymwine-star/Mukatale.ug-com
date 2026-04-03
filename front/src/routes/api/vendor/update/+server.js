// src/routes/api/vendor/update/+server.js
import { STRAPI_URL } from '$env/static/private';

const STRAPI = STRAPI_URL;

export async function POST({ request, cookies }) {
  try {
    const jwt = cookies.get('jwt');
    if (!jwt) {
      return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { vendorId, formData } = await request.json();
    console.log('Updating vendor:', vendorId, formData);

    // Prepare flat payload (Strapi v5: no { data: ... })
    const payload = {
      name:    formData.name?.trim()    || undefined,
      contact: formData.contact?.trim() || undefined,
      email:   formData.email?.trim()   || undefined,
    };

    if (formData.market) {
      payload.market = formData.market;
    }

    // ── Image upload ───────────────────────────────────────────────
    if (formData.imageFile && formData.imageFile.startsWith('data:image')) {
      try {
        const base64Data     = formData.imageFile.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteArray      = new Uint8Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteArray[i] = byteCharacters.charCodeAt(i);
        }
        const blob       = new Blob([byteArray], { type: 'image/jpeg' });
        const uploadForm = new FormData();
        uploadForm.append('files', blob, 'vendor-image.jpg');

        const uploadRes = await fetch(`${STRAPI}/api/upload`, {
          method:  'POST',
          headers: { 'Authorization': `Bearer ${jwt}` },
          body:    uploadForm
        });

        if (!uploadRes.ok) throw new Error('Image upload failed');

        const uploaded = await uploadRes.json();
        if (uploaded?.length > 0) {
          payload.image = uploaded[0].documentId;
        }
      } catch (err) {
        console.error('Image upload error:', err);
      }
    }

    // ── Step 1: Get documentId from numeric vendorId ───────────────
    const fetchRes = await fetch(
      `${STRAPI}/api/vendors?filters[id][$eq]=${vendorId}&fields=documentId`,
      { headers: { 'Authorization': `Bearer ${jwt}` } }
    );

    if (!fetchRes.ok) throw new Error('Failed to fetch vendor');

    const { data } = await fetchRes.json();
    if (!data?.length)   throw new Error('Vendor not found');

    const documentId = data[0].documentId;
    if (!documentId) throw new Error('Missing documentId');

    // ── Step 2: Update vendor ──────────────────────────────────────
    const updateRes = await fetch(`${STRAPI}/api/vendors/${documentId}`, {
      method:  'PUT',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type':  'application/json'
      },
      body: JSON.stringify({ data: payload })
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Update failed:', updateRes.status, errText);
      return new Response(JSON.stringify({ success: false, error: errText || 'Update failed' }), {
        status:  updateRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await updateRes.json();

    return new Response(JSON.stringify({
      success: true,
      vendor:  result.data
    }), {
      status:  200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Vendor update error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status:  500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}