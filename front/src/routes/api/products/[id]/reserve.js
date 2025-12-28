import { json } from '@sveltejs/kit';

const STRAPI_URL = import.meta.env.VITE_STRAPI_URL || 'http://localhost:1337';

// Get products for a vendor
export async function GET({ url, cookies }) {
	const jwt = cookies.get('jwt');
	
	if (!jwt) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const vendorId = url.searchParams.get('vendorId');
		if (!vendorId) {
			return json({ error: 'Vendor ID required' }, { status: 400 });
		}

		const res = await fetch(
			`${STRAPI_URL}/api/products?filters[vendors][id][$eq]=${vendorId}&populate=*`,
			{
				headers: {
					'Authorization': `Bearer ${jwt}`
				}
			}
		);

		if (!res.ok) {
			return json({ error: 'Failed to fetch products' }, { status: 400 });
		}

		const data = await res.json();
		return json(data);
	} catch (error) {
		console.error('Error fetching products:', error);
		return json({ error: 'Server error' }, { status: 500 });
	}
}

// Create new product
export async function POST({ request, cookies }) {
	const jwt = cookies.get('jwt');
	
	if (!jwt) {
		return json({ error: 'Unauthorized' }, { status: 401 });
	}

	try {
		const body = await request.json();
		
		const res = await fetch(`${STRAPI_URL}/api/products`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${jwt}`
			},
			body: JSON.stringify(body)
		});

		if (!res.ok) {
			const errorData = await res.json();
			return json({ error: errorData.error?.message || 'Failed to create product' }, { status: 400 });
		}

		const data = await res.json();
		return json(data);
	} catch (error) {
		console.error('Error creating product:', error);
		return json({ error: 'Server error' }, { status: 500 });
	}
}