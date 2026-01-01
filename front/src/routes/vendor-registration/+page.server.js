// src/routes/vendor-dashboard/+page.server.js
import { redirect } from '@sveltejs/kit';

export const load = async ({ cookies, fetch, url }) => {
  console.log('📄 Dashboard server load started');
  
  const jwt = cookies.get('jwt');
  const userCookie = cookies.get('user');
  
  console.log('🔐 Auth check:', {
    hasJWT: !!jwt,
    hasUser: !!userCookie,
    pathname: url.pathname
  });
  
  // Redirect to login if not authenticated
  if (!jwt || !userCookie) {
    console.log('❌ No auth, redirecting to login');
    throw redirect(302, '/vendor-login');
  }
  
  let user;
  try {
    user = JSON.parse(userCookie);
    console.log('👤 User parsed:', user.email);
  } catch (e) {
    console.error('Failed to parse user cookie:', e);
    throw redirect(302, '/vendor-login');
  }
  
  // Get vendor data
  let vendor = null;
  let vendorId = null;
  let products = [];
  
  try {
    // Get vendor by user ID - FIXED for Strapi 5
    console.log('🔍 Fetching vendor for user ID:', user.id);
    const vendorRes = await fetch(
      `http://localhost:1337/api/vendors?filters[users_permissions_user][id][$eq]=${user.id}&populate=*`,
      {
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    if (vendorRes.ok) {
      const vendorData = await vendorRes.json();
      console.log('📦 Vendor response data:', vendorData);
      
      if (vendorData.data && vendorData.data.length > 0) {
        vendor = vendorData.data[0];
        vendorId = vendor.id;
        console.log('✅ Vendor found:', vendor.name || 'Vendor has no name');
        
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
        
        // ==============================================
        // PRODUCT FETCH LOGIC - UPDATED FOR STRAPI 5
        // ==============================================
        console.log('🛍️ Fetching products for vendor ID:', vendorId);
        
        // METHOD 1: Try fetching via vendor's populated products first
        if (vendor.products && Array.isArray(vendor.products)) {
          products = vendor.products;
          console.log('✅ Found products in vendor.populate:', products.length);
        } 
        
        // METHOD 2: If no products in vendor.populate, try direct query
        if (products.length === 0) {
          console.log('🔄 Trying direct products query...');
          
          // Get ALL products and filter by vendor
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
            console.log('📦 All products raw data:', allProductsData);
            
            if (allProductsData.data && Array.isArray(allProductsData.data)) {
              // Filter products that have this vendor in their vendors array
              products = allProductsData.data.filter(product => {
                // Check if product has vendors relation
                if (product.vendors && Array.isArray(product.vendors)) {
                  return product.vendors.some(v => v.id === vendorId);
                }
                return false;
              });
              
              console.log('✅ Filtered products for vendor:', products.length);
            }
          } else {
            console.error('❌ Products fetch failed:', allProductsRes.status);
          }
        }
        
        // METHOD 3: Try using the vendors filter in query
        if (products.length === 0) {
          console.log('🔄 Trying vendors filter in query...');
          
          const filteredProductsRes = await fetch(
            `http://localhost:1337/api/products?filters[vendors][id][$eq]=${vendorId}&populate=*`,
            {
              headers: {
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
              }
            }
          );
          
          if (filteredProductsRes.ok) {
            const filteredProductsData = await filteredProductsRes.json();
            console.log('📦 Filtered products response:', filteredProductsData);
            
            if (filteredProductsData.data && Array.isArray(filteredProductsData.data)) {
              products = filteredProductsData.data;
              console.log('✅ Found products via filter query:', products.length);
            }
          }
        }
        
      } else {
        console.log('📝 No vendor profile found for user');
        // Don't redirect - let user create profile
      }
    } else {
      console.error('❌ Vendor fetch failed:', vendorRes.status);
      // Check if it's an authorization error
      if (vendorRes.status === 401 || vendorRes.status === 403) {
        console.error('⚠️ JWT token might be invalid/expired');
        // Clear invalid cookies
        cookies.delete('jwt', { path: '/' });
        cookies.delete('user', { path: '/' });
        throw redirect(302, '/vendor-login');
      }
    }
    
  } catch (error) {
    console.error('💥 Error loading vendor data:', error);
  }
  
  // Get markets for dropdown
  let markets = [];
  try {
    console.log('🏪 Fetching markets...');
    const marketsRes = await fetch('http://localhost:1337/api/markets?populate=*', {
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (marketsRes.ok) {
      const marketsData = await marketsRes.json();
      markets = marketsData.data || [];
      console.log('✅ Markets loaded:', markets.length);
    } else {
      console.error('❌ Markets fetch failed:', marketsRes.status);
    }
  } catch (error) {
    console.error('❌ Failed to fetch markets:', error);
  }
  
  console.log('🎯 Dashboard load complete:', {
    user: user.email,
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