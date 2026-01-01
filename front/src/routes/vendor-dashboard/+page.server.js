// src/routes/vendor-dashboard/+page.server.js
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies, fetch, url }) => {
  console.log('📄 Dashboard server load started');
  
  const jwt = cookies.get('jwt');
  const userCookie = cookies.get('user');
  
  // Redirect to login if not authenticated
  if (!jwt || !userCookie) {
    throw redirect(302, '/vendor-login');
  }
  
  let user;
  try {
    user = JSON.parse(userCookie);
  } catch (e) {
    throw redirect(302, '/vendor-login');
  }
  
  let vendor = null;
  let vendorId = null;
  let products = [];
  
  try {
    // 1. GET VENDOR PROFILE
    console.log('🔍 Fetching vendor for user ID:', user.id);
    const vendorRes = await fetch(
      `http://localhost:1337/api/vendors?filters[users_permissions_user][id][$eq]=${user.id}&populate[market][fields][0]=id&populate[market][fields][1]=name`,
      {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (vendorRes.ok) {
      const vendorData = await vendorRes.json();
      
      if (vendorData.data && vendorData.data.length > 0) {
        vendor = vendorData.data[0];
        vendorId = vendor.id;
        console.log('✅ Vendor found:', vendor.name);
        
        // Update vendor cookies
        cookies.set('vendor', JSON.stringify(vendor), {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7
        });
        
        cookies.set('vendorId', vendorId.toString(), {
          path: '/',
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          maxAge: 60 * 60 * 24 * 7
        });
        
        // 2. GET PRODUCTS FOR THIS VENDOR
        console.log('🛍️ Fetching products for vendor ID:', vendorId);
        
        // OPTION 1: Try direct products query with vendor filter
        const productsRes = await fetch(
          `http://localhost:1337/api/products?filters[vendors][id][$eq]=${vendorId}&populate=*`,
          {
            headers: {
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json'
            }
          }
        );
        
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          console.log('📦 Products response:', productsData);
          
          if (productsData.data) {
            products = Array.isArray(productsData.data) ? productsData.data : [productsData.data];
            console.log(`✅ Found ${products.length} products via vendor filter`);
          }
        } else {
          console.error('❌ Products fetch failed:', productsRes.status);
          
          // OPTION 2: Fallback - get all products and filter client-side
          console.log('🔄 Trying fallback: get all products...');
          const allProductsRes = await fetch(
            `http://localhost:1337/api/products?populate=*`,
            {
              headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (allProductsRes.ok) {
            const allProductsData = await allProductsRes.json();
            if (allProductsData.data) {
              const allProducts = Array.isArray(allProductsData.data) ? allProductsData.data : [allProductsData.data];
              
              // Filter products by vendor
              products = allProducts.filter(product => {
                if (product.vendors && Array.isArray(product.vendors)) {
                  return product.vendors.some(v => v.id === vendorId);
                }
                return false;
              });
              
              console.log(`✅ Filtered ${products.length} products for vendor`);
            }
          }
        }
      }
    }
    
  } catch (error) {
    console.error('💥 Error loading vendor data:', error);
  }
  
  // Get markets for dropdown
  let markets = [];
  try {
    const marketsRes = await fetch('http://localhost:1337/api/markets', {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    });
    
    if (marketsRes.ok) {
      const marketsData = await marketsRes.json();
      markets = marketsData.data || [];
    }
  } catch (error) {
    console.error('❌ Failed to fetch markets:', error);
  }
  
  console.log('🎯 Dashboard load complete:', {
    vendor: vendor?.name || 'No vendor',
    products: products.length,
    markets: markets.length
  });
  
  return {
    user,
    vendor,
    vendorId,
    products,
    markets,
    isAuthenticated: true,
    hasVendorProfile: !!vendor
  };
};