// routes/api/products/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ request, cookies }) {
  const token = cookies.get('jwt');
  
  if (!token) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const response = await fetch(`${process.env.STRAPI_URL}/api/products`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    return json(data);
  } catch (err) {
    console.error('Error creating product:', err);
    return json({ error: 'Failed to create product' }, { status: 500 });
  }
}