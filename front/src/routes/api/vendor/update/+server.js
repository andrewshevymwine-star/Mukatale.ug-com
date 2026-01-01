// src/routes/api/vendor/update/+server.js
export async function POST({ request, cookies, fetch }) {
  try {
    const jwt = cookies.get('jwt');
    
    if (!jwt) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Not authenticated' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const data = await request.json();
    const { vendorId, formData } = data;
    
    console.log('👤 Updating vendor (Strapi v5):', vendorId);
    
    // Prepare data for Strapi v5
    const strapiData = {
      name: formData.name,
      Contact: formData.Contact,
      Email: formData.Email
    };
    
    // Add market if provided
    if (formData.market) {
      strapiData.market = { id: parseInt(formData.market) };
    }
    
    // Handle image upload
    if (formData.imageFile) {
      try {
        const base64Data = formData.imageFile.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        const formDataStrapi = new FormData();
        formDataStrapi.append('files', blob, 'vendor-image.jpg');
        
        const uploadRes = await fetch('http://localhost:1337/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${jwt}` },
          body: formDataStrapi
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          strapiData.image = uploadData[0].id;
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
      }
    }
    
    // Update vendor in Strapi v5
    const response = await fetch(`http://localhost:1337/api/vendors/${vendorId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ data: strapiData })
    });
    
    console.log('📥 Vendor update response:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed to update vendor: ${errorText}` 
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await response.json();
    
    return new Response(JSON.stringify({ 
      success: true,
      vendor: result  // Already flat in Strapi v5
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Vendor update error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}