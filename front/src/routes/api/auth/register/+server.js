// src/routes/api/auth/register/+server.js
import { json } from '@sveltejs/kit';
import { STRAPI_URL } from '$env/static/private';

const STRAPI = STRAPI_URL;

export async function POST({ request, cookies }) {
  const { username, email, password, name, contact, market } = await request.json();

  try {
    console.log('👤 Starting registration for:', email);

    // ── 1. Register user in Strapi ─────────────────────────────────
    const registerRes = await fetch(`${STRAPI}/api/auth/local/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, email, password })
    });

    const registerData = await registerRes.json();

    if (!registerRes.ok) {
      console.error('❌ User registration failed:', registerData.error);
      return json({ error: registerData.error?.message || 'Registration failed' }, { status: 400 });
    }

    console.log('✅ User registered:', registerData.user.email, 'ID:', registerData.user.id);

    // ── 2. Create vendor profile ───────────────────────────────────
    let vendorCreated = false;
    let vendorId      = null;

    try {
      // Attempt 1: direct ID assignment
      let vendorRes = await fetch(`${STRAPI}/api/vendors`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${registerData.jwt}` },
        body: JSON.stringify({
          data: {
            name:                    name || username,
            contact:                 contact || '',
            email,
            users_permissions_user:  registerData.user.id,
            market:                  market ? [market] : []
          }
        })
      });

      // Attempt 2: object format
      if (!vendorRes.ok) {
        console.log('🔄 Attempt 1 failed, trying object format...');
        vendorRes = await fetch(`${STRAPI}/api/vendors`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${registerData.jwt}` },
          body: JSON.stringify({
            data: {
              name:    name || username,
              contact: contact || '',
              email,
              users_permissions_user: {
                id:       registerData.user.id,
                username: registerData.user.username,
                email:    registerData.user.email
              },
              market: market ? [market] : []
            }
          })
        });
      }

      // Attempt 3: without relationships
      if (!vendorRes.ok) {
        console.log('🔄 Attempt 2 failed, trying without relationships...');
        vendorRes = await fetch(`${STRAPI}/api/vendors`, {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${registerData.jwt}` },
          body: JSON.stringify({
            data: { name: name || username, contact: contact || '', email }
          })
        });
      }

      if (vendorRes.ok) {
        const vendor = await vendorRes.json();
        vendorCreated = true;
        vendorId      = vendor.data.id;
        console.log('✅ Vendor created, ID:', vendorId);

        // Update user with vendor reference
        try {
          await fetch(`${STRAPI}/api/users/${registerData.user.id}`, {
            method:  'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${registerData.jwt}` },
            body: JSON.stringify({ vendor: vendorId })
          });
        } catch (updateErr) {
          console.warn('⚠️ User update skipped:', updateErr.message);
        }
      } else {
        const errText = await vendorRes.text();
        console.error('❌ All vendor creation attempts failed:', vendorRes.status, errText);
      }
    } catch (vendorErr) {
      console.error('❌ Vendor creation exception:', vendorErr);
    }

    // ── 3. Set cookie and respond ──────────────────────────────────
    cookies.set('jwt', registerData.jwt, {
      path:     '/',
      httpOnly: true,
      sameSite: 'strict',
      secure:   process.env.NODE_ENV === 'production',
      maxAge:   60 * 60 * 24 * 7
    });

    return json({
      user: {
        id:       registerData.user.id,
        username: registerData.user.username,
        email:    registerData.user.email,
        name:     name || registerData.user.username,
        vendor:   vendorCreated ? { id: vendorId } : null
      },
      jwt: registerData.jwt,
      vendorCreated
    });

  } catch (e) {
    console.error('❌ Server error during registration:', e);
    return json({ error: 'Server error - please try again later' }, { status: 500 });
  }
}