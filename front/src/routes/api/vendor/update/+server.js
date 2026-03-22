// src/routes/api/vendor/update/+server.js
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
      name: formData.name?.trim() || undefined,
      contact: formData.contact?.trim() || undefined,
      email: formData.email?.trim() || undefined,
    };

    // manyToOne relation: use documentId string (preferred shorthand in v5)
    if (formData.market) {
      payload.market = formData.market;  // assuming frontend sends documentId as string
      // If frontend sends numeric id, you'll need to map id → documentId first (see note below)
    }

    // Image handling (if new upload)
    if (formData.imageFile && formData.imageFile.startsWith('data:image')) {
      try {
        const base64Data = formData.imageFile.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });

        const uploadForm = new FormData();
        uploadForm.append('files', blob, 'vendor-image.jpg');

        const uploadRes = await fetch('http://localhost:1337/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${jwt}` },
          body: uploadForm,
        });

        if (!uploadRes.ok) throw new Error('Image upload failed');

        const uploaded = await uploadRes.json();
        if (uploaded?.length > 0) {
          payload.image = uploaded[0].documentId;  // ← v5 uses documentId for media!
        }
      } catch (err) {
        console.error('Image upload error:', err);
        // Optional: continue without image or return error
      }
    }

    // Update using documentId (vendorId here is likely the numeric id – wait!)
    // PROBLEM: Your frontend uses numeric vendorId, but v5 DELETE/UPDATE uses documentId
    // Solution: First fetch the vendor to get its documentId

    // Step 1: Fetch vendor to get real documentId
    const fetchRes = await fetch(
      `http://localhost:1337/api/vendors?filters[id][$eq]=${vendorId}&fields=documentId`,
      { headers: { 'Authorization': `Bearer ${jwt}` } }
    );

    if (!fetchRes.ok) throw new Error('Failed to fetch vendor');

    const { data } = await fetchRes.json();
    if (!data?.length) throw new Error('Vendor not found');

    const documentId = data[0].documentId;
    if (!documentId) throw new Error('Missing documentId');

    // Step 2: Perform update with documentId
    const updateRes = await fetch(`http://localhost:1337/api/vendors/${documentId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),  // flat!
    });

    if (!updateRes.ok) {
      const errText = await updateRes.text();
      console.error('Update failed:', updateRes.status, errText);
      return new Response(JSON.stringify({ success: false, error: errText || 'Update failed' }), {
        status: updateRes.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const result = await updateRes.json();
    // v5 returns { data: { ...flattened fields... }, meta: {} }

    return new Response(JSON.stringify({
      success: true,
      vendor: result.data  // flattened vendor object
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Vendor update error:', error);
    return new Response(JSON.stringify({ success: false, error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}