import { json } from '@sveltejs/kit';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

export async function GET({ cookies }) {
	const jwt = cookies.get('jwt');
	
	if (!jwt) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const res = await fetch(`${STRAPI_URL}/api/categories?populate=*`, {
			headers: {
				'Authorization': `Bearer ${jwt}`
			}
		});

		if (!res.ok) {
			return json({ error: 'Failed to fetch categories' }, { status: 400 });
		}

		const data = await res.json();
		return json(data);
	} catch (error) {
		console.error('Error fetching categories:', error);
		return json({ error: 'Server error' }, { status: 500 });
	}
}