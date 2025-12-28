// src/routes/api/auth/login/+server.js
export async function POST({ request }) {
    try {
      const { identifier, password } = await request.json();
      
      // Call Strapi authentication endpoint
      const response = await fetch('http://localhost:1337/api/auth/local', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ identifier, password }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        return new Response(
          JSON.stringify({ error: data.error?.message || 'Login failed' }),
          {
            status: response.status,
            headers: { 'Content-Type': 'application/json' }
          }
        );
      }
      
      // Successful login
      return new Response(
        JSON.stringify({
          jwt: data.jwt,
          user: data.user
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'Set-Cookie': [
              `jwt=${data.jwt}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict`,
              `user_id=${data.user.id}; Path=/; HttpOnly; Max-Age=86400; SameSite=Strict`
            ]
          }
        }
      );
      
    } catch (error) {
      console.error('Login API error:', error);
      return new Response(
        JSON.stringify({ error: 'Server error' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }