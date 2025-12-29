// src/routes/vendor-dashboard/+page.server.js
import { redirect } from '@sveltejs/kit';

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
      
      // CORRECT QUERY: Use users_permissions_user
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
        `http://localhost:1337/api/vendors/${currentVendorId}?populate=*`,
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
      
      const productsRes = await fetch(
        `http://localhost:1337/api/products?filters[vendor][id][$eq]=${currentVendorId}&populate=*&sort=createdAt:desc`,
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
      }
    }
    
    // Get markets for dropdown
    let markets = [];
    try {
      console.log('🏪 Loading markets...');
      
      const marketsRes = await fetch(
        `http://localhost:1337/api/markets?populate=*`,
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
    return {
      user,
      vendor,
      products,
      markets,
      jwt // Pass JWT to frontend if needed
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