// src/routes/api/markets/+server.js
import { json } from '@sveltejs/kit';
import { STRAPI_URL } from '$env/static/private';

const STRAPI = STRAPI_URL;

export async function GET({ cookies }) {
  const jwt = cookies.get('jwt');

  if (!jwt) {
    return json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const res = await fetch(`${STRAPI}/api/markets?populate=*`, {
      headers: { 'Authorization': `Bearer ${jwt}` }
    });

    if (!res.ok) {
      return json({ error: 'Failed to fetch markets' }, { status: 400 });
    }

    return json(await res.json());
  } catch (error) {
    console.error('Error fetching markets:', error);
    return json({ error: 'Server error' }, { status: 500 });
  }
}