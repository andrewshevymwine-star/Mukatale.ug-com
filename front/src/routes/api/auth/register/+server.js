// src/routes/api/auth/register/+server.js
import { json } from '@sveltejs/kit';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

export async function POST({ request, cookies }) {
  const { username, email, password, name, contact, market } = await request.json();

  try {
    console.log('👤 Starting registration for:', email);
    
    // 1. Register user in Strapi
    const registerRes = await fetch(`${STRAPI_URL}/api/auth/local/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const registerData = await registerRes.json();

    if (!registerRes.ok) {
      console.error('❌ User registration failed:', registerData.error);
      return json({ error: registerData.error?.message || 'Registration failed' }, { status: 400 });
    }

    console.log('✅ User registered successfully:', registerData.user.email);
    console.log('🔑 User ID:', registerData.user.id);

    // 2. Create vendor profile - Try different approaches for the relationship
    let vendorCreated = false;
    let vendorId = null;
    
    try {
      // Try approach 1: Direct ID assignment
      const vendorData1 = {
        data: {
          name: name || username,
          contact: contact || '',
          email: email,
          users_permissions_user: registerData.user.id,
          market: market ? [market] : []
        }
      };

      console.log('📦 Attempt 1 - Creating vendor with direct ID:', vendorData1);

      let vendorRes = await fetch(`${STRAPI_URL}/api/vendors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${registerData.jwt}`
        },
        body: JSON.stringify(vendorData1)
      });

      // If first approach fails, try approach 2: Object format
      if (!vendorRes.ok) {
        console.log('🔄 Attempt 1 failed, trying object format...');
        
        const vendorData2 = {
          data: {
            name: name || username,
            contact: contact || '',
            email: email,
            users_permissions_user: {
              id: registerData.user.id,
              username: registerData.user.username,
              email: registerData.user.email
            },
            market: market ? [market] : []
          }
        };

        console.log('📦 Attempt 2 - Creating vendor with object:', vendorData2);

        vendorRes = await fetch(`${STRAPI_URL}/api/vendors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${registerData.jwt}`
          },
          body: JSON.stringify(vendorData2)
        });
      }

      // If second approach fails, try approach 3: Without relationship first
      if (!vendorRes.ok) {
        console.log('🔄 Attempt 2 failed, trying without relationship...');
        
        const vendorData3 = {
          data: {
            name: name || username,
            contact: contact || '',
            email: email
            // Skip relationships for now
          }
        };

        console.log('📦 Attempt 3 - Creating vendor without relationships:', vendorData3);

        vendorRes = await fetch(`${STRAPI_URL}/api/vendors`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${registerData.jwt}`
          },
          body: JSON.stringify(vendorData3)
        });
      }

      console.log('📡 Final vendor creation response status:', vendorRes.status);

      if (vendorRes.ok) {
        const vendor = await vendorRes.json();
        vendorCreated = true;
        vendorId = vendor.data.id;
        console.log('✅ Vendor profile created successfully. ID:', vendorId);
        
        // Now try to update the user with vendor reference
        try {
          const updateUserRes = await fetch(`${STRAPI_URL}/api/users/${registerData.user.id}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${registerData.jwt}`
            },
            body: JSON.stringify({ 
              vendor: vendorId 
            })
          });
          
          if (updateUserRes.ok) {
            console.log('✅ User updated with vendor reference');
          } else {
            console.warn('⚠️ Could not update user with vendor reference');
          }
        } catch (updateError) {
          console.warn('⚠️ User update skipped:', updateError.message);
        }
      } else {
        const errorText = await vendorRes.text();
        console.error('❌ All vendor creation attempts failed. Status:', vendorRes.status);
        console.error('❌ Error response:', errorText);
      }
    } catch (vendorError) {
      console.error('❌ Vendor creation exception:', vendorError);
    }

    // Prepare user data for client
    const user = {
      id: registerData.user.id,
      username: registerData.user.username,
      email: registerData.user.email,
      name: name || registerData.user.username,
      vendor: vendorCreated ? { id: vendorId } : null
    };

    console.log('✅ Registration process completed');
    console.log('👤 Final user data:', user);

    // Set HTTP-only cookie for security
    cookies.set('jwt', registerData.jwt, {
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24
    });

    return json({ 
      user,
      jwt: registerData.jwt,
      vendorCreated
    });

  } catch (e) {
    console.error('❌ Server error during registration:', e);
    return json({ error: 'Server error - please try again later' }, { status: 500 });
  }
}