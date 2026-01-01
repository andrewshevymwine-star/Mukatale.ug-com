// src/lib/strapi.js
import { browser } from '$app/environment';

// Strapi API URL
export const STRAPI_URL = import.meta.env.PUBLIC_STRAPI_URL || 'http://localhost:1337';

// Helper to get full image URL for Strapi v5
export function getStrapiImageUrl(image) {
  if (!image) return null;
  
  // If it's already a full URL
  if (typeof image === 'string' && image.startsWith('http')) {
    return image;
  }
  
  // If it's a relative URL
  if (typeof image === 'string') {
    return `${STRAPI_URL}${image.startsWith('/') ? image : '/' + image}`;
  }
  
  // Strapi v5 format - image is an object with url property
  if (image.url) {
    const url = image.url;
    return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
  }
  
  return null;
}

// Format price
export function formatPrice(price) {
  try {
    const amount = parseFloat(price) || 0;
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `UGX ${Math.round(price || 0)}`;
  }
}

// Upload file
export async function uploadFile(file, jwt) {
  if (!browser) throw new Error('File upload requires browser');
  if (!jwt) throw new Error('JWT required');
  if (!file) throw new Error('No file provided');
  
  const formData = new FormData();
  formData.append('files', file);
  
  const response = await fetch(`${STRAPI_URL}/api/upload`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`
    },
    body: formData
  });
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Upload failed: ${error}`);
  }
  
  return response.json();
}

// Create product - Strapi v5 format
export async function createProduct(productData, jwt) {
  if (!browser) throw new Error('Browser required');
  if (!jwt) throw new Error('JWT required');
  
  console.log('Creating product with data:', productData);
  
  // Strapi v5 format
  const formattedData = {
    data: productData
  };
  
  const response = await fetch(`${STRAPI_URL}/api/products`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formattedData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Create product error:', errorText);
    throw new Error(`Failed to create product: ${response.status} - ${errorText}`);
  }
  
  try {
    return await response.json();
  } catch (e) {
    return { success: true };
  }
}

// Delete product
export async function deleteProduct(productId, jwt) {
  if (!browser) throw new Error('Browser required');
  if (!jwt) throw new Error('JWT required');
  
  console.log('Deleting product:', productId);
  
  const response = await fetch(`${STRAPI_URL}/api/products/${productId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${jwt}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Delete product error:', errorText);
    throw new Error(`Failed to delete product: ${response.status} - ${errorText}`);
  }
  
  try {
    return await response.json();
  } catch (e) {
    return { success: true };
  }
}

// Get vendor details - Strapi v5 format
export async function getVendor(vendorId, jwt) {
  if (!browser) throw new Error('Browser required');
  if (!jwt) throw new Error('JWT required');
  
  console.log('Getting vendor:', vendorId);
  
  // Include all relations: market, products, and user
  const response = await fetch(
    `${STRAPI_URL}/api/vendors/${vendorId}?populate[market]=*&populate[products]=*&populate[image]=*&populate[users_permissions_user]=*`,
    {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Get vendor error:', errorText);
    throw new Error(`Failed to get vendor: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Strapi v5 returns data directly
  return {
    id: data.data.id,
    ...data.data
  };
}

// Update vendor - Strapi v5 format
export async function updateVendor(vendorId, vendorData, jwt) {
  if (!browser) throw new Error('Browser required');
  if (!jwt) throw new Error('JWT required');
  
  console.log('Updating vendor:', vendorId, vendorData);
  
  // Strapi v5 format
  const formattedData = {
    data: vendorData
  };
  
  const response = await fetch(`${STRAPI_URL}/api/vendors/${vendorId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(formattedData)
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Update vendor error:', errorText);
    throw new Error(`Failed to update vendor: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Strapi v5 returns data directly
  return {
    id: data.data.id,
    ...data.data
  };
}

// Get vendor by user ID - Strapi v5 format
export async function getVendorByUserId(userId, jwt) {
  if (!browser) throw new Error('Browser required');
  if (!jwt) throw new Error('JWT required');
  
  console.log('Getting vendor for user:', userId);
  
  const response = await fetch(
    `${STRAPI_URL}/api/vendors?filters[users_permissions_user][id][$eq]=${userId}&populate[market]=*&populate[products]=*&populate[image]=*`,
    {
      headers: {
        'Authorization': `Bearer ${jwt}`
      }
    }
  );
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Get vendor by user error:', errorText);
    throw new Error(`Failed to get vendor: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  
  // Strapi v5 returns array of data
  if (data.data && data.data.length > 0) {
    return {
      id: data.data[0].id,
      ...data.data[0]
    };
  }
  
  return null;
}

// Get all markets for dropdown
export async function getMarkets(jwt) {
  if (!browser) throw new Error('Browser required');
  if (!jwt) throw new Error('JWT required');
  
  const response = await fetch(`${STRAPI_URL}/api/markets?populate=*`, {
    headers: {
      'Authorization': `Bearer ${jwt}`
    }
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Get markets error:', errorText);
    throw new Error(`Failed to get markets: ${response.status} - ${errorText}`);
  }
  
  const data = await response.json();
  return data.data.map(market => ({
    id: market.id,
    ...market
  }));
}

// Capitalize text
export function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}