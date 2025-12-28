// routes/api/vendors/[id]/+server.js
import { json } from '@sveltejs/kit';

export async function PUT({ request, params, cookies }) {
  const token = cookies.get('jwt');
  
  if (!token) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const response = await fetch(`${process.env.STRAPI_URL}/api/vendors/${params.id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    const data = await response.json();
    return json(data);
  } catch (err) {
    console.error('Error updating vendor:', err);
    return json({ error: 'Failed to update vendor' }, { status: 500 });
  }
}
