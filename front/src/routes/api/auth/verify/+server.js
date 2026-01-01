// src/routes/api/auth/verify/+server.js
export async function GET({ cookies, fetch }) {
    try {
      const jwt = cookies.get('jwt');
      const userCookie = cookies.get('user');
      
      console.log('🔐 Auth verify - Cookies present:', { 
        hasJWT: !!jwt, 
        hasUser: !!userCookie 
      });
      
      if (!jwt || !userCookie) {
        return new Response(JSON.stringify({
          authenticated: false,
          message: 'No authentication cookies found'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      let user;
      try {
        user = JSON.parse(userCookie);
      } catch (e) {
        console.error('❌ Failed to parse user cookie:', e);
        return new Response(JSON.stringify({
          authenticated: false,
          message: 'Invalid user data'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Verify JWT with Strapi
      console.log('🔍 Verifying JWT with Strapi...');
      const verifyResponse = await fetch('http://localhost:1337/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${jwt}`
        }
      });
      
      if (!verifyResponse.ok) {
        console.log('❌ Strapi JWT verification failed:', verifyResponse.status);
        return new Response(JSON.stringify({
          authenticated: false,
          message: 'Invalid or expired token'
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      const userData = await verifyResponse.json();
      console.log('✅ Strapi user verified:', userData.email);
      
      // Get vendor data
      let vendor = null;
      let vendorId = null;
      let hasVendorProfile = false;
      
      const vendorCookie = cookies.get('vendor');
      const vendorIdCookie = cookies.get('vendorId');
      
      if (vendorCookie) {
        try {
          vendor = JSON.parse(vendorCookie);
          vendorId = vendorIdCookie || vendor.id;
          hasVendorProfile = true;
          console.log('✅ Vendor found in cookies:', vendor.name);
        } catch (e) {
          console.error('❌ Failed to parse vendor cookie:', e);
        }
      } else {
        // Try to fetch vendor from Strapi if not in cookies
        console.log('🔄 Vendor not in cookies, fetching from Strapi...');
        const vendorRes = await fetch(
          `http://localhost:1337/api/vendors?filters[users_permissions_user][id][$eq]=${userData.id}&populate=*`,
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
            vendor = { id: vendorData.data[0].id, ...vendorData.data[0] };
            vendorId = vendor.id;
            hasVendorProfile = true;
            console.log('✅ Vendor found in Strapi:', vendor.name);
          }
        }
      }
      
      return new Response(JSON.stringify({
        authenticated: true,
        user: userData,
        jwt,
        vendor,
        vendorId,
        hasVendorProfile
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store'
        }
      });
      
    } catch (error) {
      console.error('💥 Auth verification error:', error);
      return new Response(JSON.stringify({
        authenticated: false,
        message: 'Server error during authentication'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }