// src/routes/vendor-registration/+page.server.js
export const actions = {
  register: async ({ request, cookies, fetch }) => {
    try {
      const formData = await request.formData();
      const username = formData.get('username');
      const email = formData.get('email');
      const password = formData.get('password');
      const confirmPassword = formData.get('confirmPassword');
      
      // Validation
      if (!username || !email || !password) {
        return {
          success: false,
          error: 'All fields are required'
        };
      }
      
      if (password !== confirmPassword) {
        return {
          success: false,
          error: 'Passwords do not match'
        };
      }
      
      if (password.length < 6) {
        return {
          success: false,
          error: 'Password must be at least 6 characters'
        };
      }
      
      // Register user
      const registerRes = await fetch('http://localhost:1337/api/auth/local/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          email: email.trim().toLowerCase(),
          password: password
        })
      });
      
      if (!registerRes.ok) {
        const errorData = await registerRes.json();
        return {
          success: false,
          error: errorData.error?.message || 'Registration failed'
        };
      }
      
      const authData = await registerRes.json();
      const jwt = authData.jwt;
      const user = authData.user;
      
      // Set JWT cookie
      cookies.set('jwt', jwt, {
        path: '/',
        httpOnly: true,
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 24 * 30
      });
      
      return {
        success: true,
        message: 'Registration successful!',
        user,
        redirectTo: '/vendor-registration?completeProfile=true'
      };
      
    } catch (error) {
      console.error('Registration error:', error);
      return {
        success: false,
        error: error.message || 'Registration failed'
      };
    }
  },
  
  completeProfile: async ({ request, cookies, fetch }) => {
    try {
      const jwt = cookies.get('jwt');
      if (!jwt) {
        return {
          success: false,
          error: 'Not authenticated'
        };
      }
      
      const formData = await request.formData();
      const vendorName = formData.get('vendorName');
      const marketId = formData.get('marketId');
      const description = formData.get('description');
      const contact = formData.get('contact');
      
      if (!vendorName) {
        return {
          success: false,
          error: 'Vendor name is required'
        };
      }
      
      // Get current user ID
      const userRes = await fetch('http://localhost:1337/api/users/me', {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      
      if (!userRes.ok) {
        return {
          success: false,
          error: 'Failed to verify user'
        };
      }
      
      const user = await userRes.json();
      
      // Create vendor
      const vendorRes = await fetch('http://localhost:1337/api/vendors', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            name: vendorName.trim(),
            description: description?.trim(),
            contact: contact?.trim(),
            users_permissions_user: user.id,
            market: marketId || null
          }
        })
      });
      
      if (!vendorRes.ok) {
        const errorData = await vendorRes.json();
        return {
          success: false,
          error: errorData.error?.message || 'Failed to create vendor profile'
        };
      }
      
      const vendorData = await vendorRes.json();
      const vendor = vendorData.data || vendorData;
      
      // Set vendor cookie
      cookies.set('vendorId', vendor.id.toString(), {
        path: '/',
        sameSite: 'lax',
        secure: false,
        maxAge: 60 * 60 * 24 * 30
      });
      
      return {
        success: true,
        message: 'Vendor profile created successfully!',
        vendor,
        redirectTo: '/vendor-dashboard'
      };
      
    } catch (error) {
      console.error('Complete profile error:', error);
      return {
        success: false,
        error: error.message || 'Failed to complete profile'
      };
    }
  }
};

export async function load({ cookies, fetch, url }) {
  const jwt = cookies.get('jwt');
  const vendorId = cookies.get('vendorId');
  
  // If user is logged in and has a vendor, redirect to dashboard
  if (jwt && vendorId) {
    // Check if vendor exists
    try {
      const vendorRes = await fetch(`http://localhost:1337/api/vendors/${vendorId}`, {
        headers: { 'Authorization': `Bearer ${jwt}` }
      });
      
      if (vendorRes.ok) {
        // Vendor exists, redirect to dashboard
        return {
          redirectTo: '/vendor-dashboard'
        };
      }
    } catch (error) {
      // Vendor check failed, continue
    }
  }
  
  // Get markets for dropdown
  let markets = [];
  try {
    const marketsRes = await fetch('http://localhost:1337/api/markets');
    if (marketsRes.ok) {
      const marketsData = await marketsRes.json();
      markets = marketsData.data || [];
    }
  } catch (error) {
    console.log('Failed to fetch markets:', error);
  }
  
  return {
    markets
  };
}