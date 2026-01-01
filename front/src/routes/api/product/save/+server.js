// src/routes/api/product/save/+server.js (Updated for Strapi v5)
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
    const { productId, vendorId, productData } = data;
    
    console.log('💾 Saving product (Strapi v5):', { productId, vendorId });
    
    // Prepare product data for Strapi v5 (NO data wrapper!)
    const strapiData = {
      name: productData.name,
      description: productData.description,
      price: productData.price,
      unit: productData.unit || 'piece',
      category: productData.category || '',
      vendors: [{ id: parseInt(vendorId) }]  // Strapi v5 uses array of objects
    };
    
    // Handle image upload for Strapi v5
    if (productData.imageFile) {
      try {
        const base64Data = productData.imageFile.split(',')[1];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: 'image/jpeg' });
        
        const formDataStrapi = new FormData();
        formDataStrapi.append('files', blob, 'product-image.jpg');
        
        // Strapi v5 upload endpoint
        const uploadRes = await fetch('http://localhost:1337/api/upload', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${jwt}` },
          body: formDataStrapi
        });
        
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          // Strapi v5 returns array of uploaded files
          strapiData.image = uploadData[0].id;
        }
      } catch (uploadError) {
        console.error('Image upload error:', uploadError);
      }
    }
    
    let response;
    if (productId) {
      // Update existing product - NO data wrapper in Strapi v5!
      console.log('🔄 Updating product:', productId);
      response = await fetch(`http://localhost:1337/api/products/${productId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(strapiData)  // No { data: ... } wrapper!
      });
    } else {
      // Create new product - NO data wrapper in Strapi v5!
      console.log('🆕 Creating new product');
      response = await fetch('http://localhost:1337/api/products', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(strapiData)  // No { data: ... } wrapper!
      });
    }
    
    console.log('📥 Strapi v5 response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Strapi v5 error:', errorText);
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed to save product: ${errorText}` 
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await response.json();
    console.log('✅ Product saved:', result);
    
    return new Response(JSON.stringify({ 
      success: true,
      product: result  // Already flat in Strapi v5
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('💥 Product save error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}