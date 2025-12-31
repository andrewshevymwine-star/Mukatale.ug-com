// src/routes/vendor-dashboard/+page.server.js
import { redirect } from '@sveltejs/kit';
import { STRAPI_URL } from '$lib/strapi';

export const load = async ({ cookies, fetch }) => {
  const jwt = cookies.get('jwt');
  const userCookie = cookies.get('user');
  const vendorIdCookie = cookies.get('vendorId');
  
  console.log('📊 Dashboard load - JWT:', !!jwt, 'VendorId:', vendorIdCookie);
  
  // No JWT? Redirect to login
  if (!jwt) {
    console.log('❌ No JWT, redirecting to login');
    throw redirect(302, '/vendor-login');
  }
  
  // No user cookie? Also redirect to login
  if (!userCookie) {
    console.log('❌ No user cookie, redirecting to login');
    cookies.delete('jwt', { path: '/' });
    throw redirect(302, '/vendor-login');
  }
  
  try {
    // Parse user from cookie
    const user = JSON.parse(userCookie);
    console.log('👤 User from cookie:', user.email, 'ID:', user.id);
    
    let vendor = null;
    let currentVendorId = vendorIdCookie;
    
    // If we don't have vendorId cookie, check if user has vendor profile
    if (!currentVendorId) {
      console.log('🔄 No vendorId cookie, checking for vendor profile...');
      
      const vendorRes = await fetch(
        `${STRAPI_URL}/api/vendors?filters[users_permissions_user][id][$eq]=${user.id}&populate=*`,
        { 
          headers: { 
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();
        console.log('🔍 Vendor check result:', vendorData.data?.length || 0, 'vendors found');
        
        if (vendorData.data && vendorData.data.length > 0) {
          vendor = vendorData.data[0];
          currentVendorId = vendor.id.toString();
          
          // Set vendorId cookie
          cookies.set('vendorId', currentVendorId, {
            path: '/',
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
            maxAge: 60 * 60 * 24 * 7
          });
          
          console.log('✅ Vendor found, cookie set:', currentVendorId);
        } else {
          // No vendor profile - redirect to registration
          console.log('❌ No vendor profile found, redirecting to registration');
          throw redirect(302, '/vendor-registration?completeProfile=true');
        }
      } else {
        console.log('❌ Vendor check failed, redirecting to registration');
        throw redirect(302, '/vendor-registration?completeProfile=true');
      }
    }
    
    // If we have vendorId but haven't loaded vendor data yet
    if (currentVendorId && !vendor) {
      console.log('📥 Loading vendor data for ID:', currentVendorId);
      
      const vendorRes = await fetch(
        `${STRAPI_URL}/api/vendors/${currentVendorId}?populate=*`,
        { 
          headers: { 
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (vendorRes.ok) {
        const vendorData = await vendorRes.json();
        vendor = vendorData.data || vendorData;
        console.log('✅ Vendor data loaded:', vendor?.name);
      } else {
        // Vendor not found - clear cookie and redirect
        console.log('❌ Vendor not found with ID, clearing cookie');
        cookies.delete('vendorId', { path: '/' });
        throw redirect(302, '/vendor-registration?completeProfile=true');
      }
    }
    
    // Get vendor's products
    let products = [];
    if (currentVendorId) {
      console.log('📦 Loading products for vendor:', currentVendorId);
      
      try {
        // Fetch products filtered by vendor (many-to-many relation)
        const productsRes = await fetch(
          `${STRAPI_URL}/api/products?populate=*&filters[vendors][id][$eq]=${currentVendorId}&sort=createdAt:desc`,
          { 
            headers: { 
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json'
            } 
          }
        );
        
        if (productsRes.ok) {
          const productsData = await productsRes.json();
          products = productsData.data || [];
          console.log('✅ Products loaded:', products.length);
          
          // Debug: Log the first product to see structure
          if (products.length > 0) {
            console.log('🔍 First product:', {
              id: products[0].id,
              name: products[0].name,
              vendors: products[0].vendors
            });
          }
        } else {
          console.log('❌ Products fetch failed:', productsRes.status);
          
          // Try alternative: fetch all products and filter client-side
          const allProductsRes = await fetch(
            `${STRAPI_URL}/api/products?populate=*&sort=createdAt:desc`,
            { 
              headers: { 
                'Authorization': `Bearer ${jwt}`,
                'Content-Type': 'application/json'
              } 
            }
          );
          
          if (allProductsRes.ok) {
            const allProductsData = await allProductsRes.json();
            const allProducts = allProductsData.data || [];
            
            // Filter products that have currentVendorId in their vendors array
            products = allProducts.filter(product => {
              if (!product.vendors || !Array.isArray(product.vendors)) return false;
              return product.vendors.some(v => v.id === parseInt(currentVendorId));
            });
            
            console.log('✅ Products filtered client-side:', products.length);
          }
        }
      } catch (productsError) {
        console.error('💥 Products fetch error:', productsError);
      }
    }
    
    // Get markets for dropdown
    let markets = [];
    try {
      console.log('🏪 Loading markets...');
      
      const marketsRes = await fetch(
        `${STRAPI_URL}/api/markets?populate=*`,
        { 
          headers: { 
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          } 
        }
      );
      
      if (marketsRes.ok) {
        const marketsData = await marketsRes.json();
        markets = marketsData.data || [];
        console.log('✅ Markets loaded:', markets.length);
      }
    } catch (marketError) {
      console.log('⚠️ Market fetch error:', marketError);
    }
    
    // Return data to page
    console.log('🎉 Dashboard load successful');
    console.log('📊 Summary:', {
      user: user.email,
      vendor: vendor?.name,
      products: products.length,
      markets: markets.length
    });
    
    return {
      user,
      vendor,
      products,
      markets,
      jwt
    };
    
  } catch (error) {
    // If it's a redirect error, re-throw it
    if (error?.status === 302) {
      console.log('🔄 Redirecting:', error.location);
      throw error;
    }
    
    console.error('💥 Dashboard load error:', error);
    
    // Clear all auth cookies on error
    cookies.delete('jwt', { path: '/' });
    cookies.delete('user', { path: '/' });
    cookies.delete('vendorId', { path: '/' });
    cookies.delete('vendor', { path: '/' });
    
    throw redirect(302, '/vendor-login');
  }
};