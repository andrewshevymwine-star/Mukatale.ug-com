// src/routes/vendor-login/+page.server.js
import { redirect } from '@sveltejs/kit';

export const actions = {
  login: async ({ request, cookies, fetch }) => {
    try {
      const formData = await request.formData();
      const identifier = formData.get('identifier');
      const password = formData.get('password');
      
      console.log('🔐 Login attempt for:', identifier);
      
      // Validation
      if (!identifier || !password) {
        return {
          success: false,
          error: 'Email and password are required'
        };
      }

      // Login to Strapi
      const strapiResponse = await fetch('http://localhost:1337/api/auth/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          identifier: identifier.trim(),
          password: password
        })
      });
      
      if (!strapiResponse.ok) {
        const errorData = await strapiResponse.json().catch(() => ({}));
        console.log('❌ Strapi login failed:', errorData.error?.message);
        return {
          success: false,
          error: errorData.error?.message || 'Invalid email or password'
        };
      }

      const authData = await strapiResponse.json();
      const jwt = authData.jwt;
      const user = authData.user;
      
      if (!jwt || !user) {
        return {
          success: false,
          error: 'Authentication failed'
        };
      }
      
      console.log('✅ User authenticated:', user.email, 'ID:', user.id);
      
      // Set auth cookies
      cookies.set('jwt', jwt, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      cookies.set('user', JSON.stringify(user), {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
      });
      
      // 🔥 CRITICAL: Check if user has vendor profile
      console.log('🔍 Checking vendor profile for user ID:', user.id);
      
      // CORRECT QUERY: Use users_permissions_user (not user)
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
        console.log('📦 Vendor data:', vendorData);
        
        if (vendorData.data && vendorData.data.length > 0) {
          const vendor = vendorData.data[0];
          const vendorId = vendor.id;
          
          console.log('🎯 Vendor found! ID:', vendorId, 'Name:', vendor.name);
          
          // Set vendor cookies
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
          
          // REDIRECT TO DASHBOARD
          console.log('🚀 Redirecting to VENDOR DASHBOARD');
          throw redirect(302, '/vendor-dashboard');
        } else {
          console.log('📝 No vendor profile found');
        }
      } else {
        console.log('❌ Vendor check failed:', vendorRes.status);
      }
      
      // If we get here, NO vendor profile was found
      console.log('📝 Redirecting to registration');
      throw redirect(302, '/vendor-registration?completeProfile=true');
      
    } catch (error) {
      // If it's a redirect error, re-throw it
      if (error?.status === 302) {
        throw error;
      }
      console.error('💥 Login error:', error);
      return {
        success: false,
        error: 'Server error. Please try again.'
      };
    }
  }
};

export const load = async ({ cookies, url }) => {
  const jwt = cookies.get('jwt');
  const userCookie = cookies.get('user');
  
  console.log('📄 Login page load - Cookies:', {
    hasJWT: !!jwt,
    hasUser: !!userCookie,
    pathname: url.pathname
  });
  
  // If already logged in, redirect to dashboard
  if (jwt && userCookie) {
    console.log('✅ Already logged in, redirecting to dashboard');
    throw redirect(302, '/vendor-dashboard');
  }
  
  return {
    isAuthenticated: !!jwt,
    user: userCookie ? JSON.parse(userCookie) : null
  };
};