// src/lib/strapi.server.js - Server-side ONLY
import { VITE_STRAPI_URL } from '$env/static/private';

const STRAPI_URL = VITE_STRAPI_URL || 'http://localhost:1337';

/* ---------- SIMPLE REQUEST FUNCTION ---------- */
export async function request(endpoint, options = {}) {
  const { jwt = null, method = 'GET', data = null, query = {} } = options;
  
  const url = new URL(`${STRAPI_URL}${endpoint}`);
  
  // Add query parameters
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (typeof value === 'object') {
        url.searchParams.append(key, JSON.stringify(value));
      } else {
        url.searchParams.append(key, value.toString());
      }
    }
  });
  
  console.log('🌐 Strapi Request:', url.toString());
  
  try {
    const res = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(jwt ? { Authorization: `Bearer ${jwt}` } : {})
      },
      body: data ? JSON.stringify(data) : null
    });
    
    const json = await res.json();
    
    if (!res.ok) {
      console.error('❌ Strapi API Error:', json);
      throw new Error(json.error?.message || `HTTP ${res.status}`);
    }
    
    return json;
  } catch (error) {
    console.error('Request failed:', error);
    throw error;
  }
}

/* ---------- MARKET FUNCTIONS ---------- */
export async function getMarkets() {
  return await request('/api/markets', { 
    query: { populate: '*' } 
  });
}

/* ---------- AUTH FUNCTIONS ---------- */
export async function serverLogin(identifier, password) {
  return await request('/api/auth/local', {
    method: 'POST',
    data: { identifier, password }
  });
}

export async function serverGetCurrentUser(jwt) {
  return await request('/api/users/me', { jwt });
}

/* ---------- UTILITY FUNCTIONS ---------- */
export function getStrapiImageUrl(image) {
  if (!image) return null;
  
  // Strapi v5 format
  if (image.url) {
    return image.url.startsWith('http') ? image.url : `${STRAPI_URL}${image.url}`;
  }
  
  // Handle array of images
  if (Array.isArray(image) && image[0]?.url) {
    const url = image[0].url;
    return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
  }
  
  // Handle media object with data
  if (image.data) {
    const media = Array.isArray(image.data) ? image.data[0] : image.data;
    if (media?.attributes?.url) {//this is not a strapi5 format
      const url = media.attributes.url;//this is not a strapi5 format
      return url.startsWith('http') ? url : `${STRAPI_URL}${url}`;
    }
  }
  
  return null;
}

export function formatPrice(price) {
  if (!price && price !== 0) return 'UGX 0';
  return new Intl.NumberFormat('en-UG', {
    style: 'currency',
    currency: 'UGX',
    minimumFractionDigits: 0
  }).format(price);
}