// routes/api/products/[id]/+server.js
import { json } from '@sveltejs/kit';

export async function PUT({ request, params, cookies }) {
  const token = cookies.get('jwt');
  
  if (!token) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const response = await fetch(`${process.env.STRAPI_URL}/api/products/${params.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    return json(data);
  } catch (err) {
    console.error('Error updating product:', err);
    return json({ error: 'Failed to update product' }, { status: 500 });
  }
}

export async function DELETE({ params, cookies }) {
  const token = cookies.get('jwt');
  
  if (!token) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const response = await fetch(`${process.env.STRAPI_URL}/api/products/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return json(data);
  } catch (err) {
    console.error('Error deleting product:', err);
    return json({ error: 'Failed to delete product' }, { status: 500 });
  }
}