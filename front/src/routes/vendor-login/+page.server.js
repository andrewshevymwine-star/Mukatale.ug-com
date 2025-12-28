// src/routes/vendor-login/+page.server.js
import { redirect } from '@sveltejs/kit';

export const actions = {
  login: async ({ request, cookies, fetch }) => {
    try {
      const formData = await request.formData();
      const identifier = formData.get('identifier');
      const password = formData.get('password');
      
      console.log('SSR Login attempt for:', identifier);
      
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
      
      console.log('SSR Login successful for user:', user.email);
      
      // Set JWT cookie (httpOnly for security)
      cookies.set('jwt', jwt, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7 // 7 days
      });
      
      // Set user cookie (non-httpOnly for client-side access)
      cookies.set('user', JSON.stringify(user), {
        path: '/',
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7
      });
      
      // Check for vendor profile
      let vendor = null;
      let vendorId = null;
      
      try {
        const vendorRes = await fetch(
          `http://localhost:1337/api/vendors?filters[users_permissions_user][id][$eq]=${user.id}&populate=*`,
          { headers: { 'Authorization': `Bearer ${jwt}` } }
        );
        
        if (vendorRes.ok) {
          const vendorData = await vendorRes.json();
          if (vendorData.data && vendorData.data.length > 0) {
            vendor = vendorData.data[0];
            vendorId = vendor.id;
            
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
            
            return {
              success: true,
              redirectTo: '/vendor-dashboard',
              user,
              vendor,
              vendorId
            };
          }
        }
      } catch (error) {
        console.log('Vendor check failed:', error.message);
      }
      
      // No vendor found
      return {
        success: true,
        redirectTo: '/vendor-registration?completeProfile=true',
        user
      };
      
    } catch (error) {
      console.error('SSR Login error:', error);
      return {
        success: false,
        error: 'Server error. Please try again.'
      };
    }
  }
};

export const load = async ({ cookies, fetch, url }) => {
  const jwt = cookies.get('jwt');
  const userCookie = cookies.get('user');
  
  if (jwt && userCookie) {
    try {
      const user = JSON.parse(userCookie);
      
      // Verify token is still valid
      const userRes = await fetch('http://localhost:1337/api/users/me', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      
      if (userRes.ok) {
        // Check for vendor profile
        const vendorRes = await fetch(
          `http://localhost:1337/api/vendors?filters[users_permissions_user][id][$eq]=${user.id}&populate=*`,
          { headers: { 'Authorization': `Bearer ${jwt}` } }
        );
        
        if (vendorRes.ok) {
          const vendorData = await vendorRes.json();
          const hasVendorProfile = vendorData.data && vendorData.data.length > 0;
          
          if (hasVendorProfile) {
            // Already logged in with vendor profile - redirect to dashboard
            throw redirect(302, '/vendor-dashboard');
          } else if (!url.searchParams.has('completeProfile')) {
            // Has account but no vendor profile - suggest registration
            throw redirect(302, '/vendor-registration?completeProfile=true');
          }
        }
      }
    } catch (error) {
      if (error?.status === 302) throw error;
      
      // Clear invalid cookies
      cookies.delete('jwt', { path: '/' });
      cookies.delete('user', { path: '/' });
      cookies.delete('vendor', { path: '/' });
      cookies.delete('vendorId', { path: '/' });
    }
  }
  
  // Return empty props if not authenticated
  return {
    isAuthenticated: !!jwt,
    user: userCookie ? JSON.parse(userCookie) : null
  };
};