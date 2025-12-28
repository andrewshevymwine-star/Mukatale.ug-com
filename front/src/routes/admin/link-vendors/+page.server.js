// src/routes/admin/link-vendors/+page.server.js
import { redirect } from '@sveltejs/kit';

export const actions = {
  linkAll: async ({ request, fetch }) => {
    try {
      const formData = await request.formData();
      const adminEmail = formData.get('adminEmail');
      const adminPassword = formData.get('adminPassword');
      
      if (!adminEmail || !adminPassword) {
        return { error: 'Admin credentials required' };
      }
      
      // Login as admin
      const loginRes = await fetch('http://localhost:1337/api/auth/local', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: adminEmail,
          password: adminPassword
        })
      });
      
      if (!loginRes.ok) {
        return { error: 'Invalid admin credentials' };
      }
      
      const authData = await loginRes.json();
      const adminJwt = authData.jwt;
      
      // Get all users
      const usersRes = await fetch('http://localhost:1337/api/users?populate=*', {
        headers: { 'Authorization': `Bearer ${adminJwt}` }
      });
      
      if (!usersRes.ok) {
        return { error: 'Failed to fetch users' };
      }
      
      const usersData = await usersRes.json();
      const users = usersData.data || usersData;
      
      const results = [];
      
      // Link each user to their vendor by email
      for (const user of users) {
        if (user.email) {
          // Find vendor with matching email
          const vendorRes = await fetch(
            `http://localhost:1337/api/vendors?filters[email][$eq]=${encodeURIComponent(user.email)}`,
            {
              headers: { 'Authorization': `Bearer ${adminJwt}` }
            }
          );
          
          if (vendorRes.ok) {
            const vendorData = await vendorRes.json();
            if (vendorData.data && vendorData.data.length > 0) {
              const vendor = vendorData.data[0];
              
              // Update vendor to link to user
              await fetch(`http://localhost:1337/api/vendors/${vendor.id}`, {
                method: 'PUT',
                headers: {
                  'Authorization': `Bearer ${adminJwt}`,
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                  data: {
                    users_permissions_user: user.id
                  }
                })
              });
              
              results.push({
                user: user.email,
                vendor: vendor.name,
                linked: true
              });
            }
          }
        }
      }
      
      return {
        success: true,
        message: `Linked ${results.length} vendors to users`,
        results
      };
      
    } catch (error) {
      return { error: error.message };
    }
  }
};

export async function load({ cookies }) {
  // Protect this route - only accessible with admin JWT
  const jwt = cookies.get('jwt');
  if (!jwt) {
    throw redirect(303, '/vendor-login');
  }
  
  return {};
}