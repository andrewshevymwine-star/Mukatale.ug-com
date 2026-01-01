// src/routes/api/vendor/products/+server.js
export async function GET({ cookies, fetch }) {
  try {
    const jwt = cookies.get('jwt');
    const vendorId = cookies.get('vendorId');
    
    if (!jwt) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Not authenticated' 
      }), { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log('📦 Loading products for vendor:', vendorId);
    
    // Strapi v5 query - filter products by vendor
    const response = await fetch(
      `http://localhost:1337/api/products?filters[vendors][id][$eq]=${vendorId}&populate=*`,
      {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (!response.ok) {
      const errorText = await response.text();
      return new Response(JSON.stringify({ 
        success: false, 
        error: `Failed to load products: ${errorText}` 
      }), { 
        status: response.status,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const result = await response.json();
    console.log('✅ Products loaded:', result.data?.length || 0);
    
    return new Response(JSON.stringify({ 
      success: true,
      products: result.data || []  // Strapi v5 returns { data: [...], meta: {...} }
    }), { 
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
    
  } catch (error) {
    console.error('Load products error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}