// src/lib/strapi.js
import { browser } from '$app/environment';
import { PUBLIC_STRAPI_URL } from '$env/static/public';

export const STRAPI_URL = PUBLIC_STRAPI_URL;

// ── Image URL helper ───────────────────────────────────────────────
export function getStrapiImageUrl(image) {
  if (!image) return null;

  if (typeof image === 'string') {
    return image.startsWith('http') ? image : `${STRAPI_URL}${image.startsWith('/') ? image : '/' + image}`;
  }

  if (image.url) {
    return image.url.startsWith('http') ? image.url : `${STRAPI_URL}${image.url}`;
  }

  return null;
}

// ── Price formatter ────────────────────────────────────────────────
export function formatPrice(price) {
  try {
    const amount = parseFloat(price) || 0;
    return new Intl.NumberFormat('en-UG', {
      style:                 'currency',
      currency:              'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `UGX ${Math.round(price || 0)}`;
  }
}

// ── File upload ────────────────────────────────────────────────────
export async function uploadFile(file, jwt) {
  if (!browser) throw new Error('File upload requires browser');
  if (!jwt)     throw new Error('JWT required');
  if (!file)    throw new Error('No file provided');

  const formData = new FormData();
  formData.append('files', file);

  const response = await fetch(`${STRAPI_URL}/api/upload`, {
    method:  'POST',
    headers: { 'Authorization': `Bearer ${jwt}` },
    body:    formData
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${await response.text()}`);
  }

  return response.json();
}

// ── Get vendor by user ID ──────────────────────────────────────────
export async function getVendorByUserId(userId, jwt) {
  if (!browser) throw new Error('Browser required');
  if (!jwt)     throw new Error('JWT required');

  const response = await fetch(
    `${STRAPI_URL}/api/vendors?filters[users_permissions_user][id][$eq]=${userId}&populate[market]=*&populate[products]=*&populate[image]=*`,
    { headers: { 'Authorization': `Bearer ${jwt}` } }
  );

  if (!response.ok) throw new Error(`Failed to get vendor: ${response.status}`);

  const data = await response.json();
  if (data.data && data.data.length > 0) {
    return { id: data.data[0].id, ...data.data[0] };
  }
  return null;
}

// ── Get all markets ────────────────────────────────────────────────
export async function getMarkets(jwt) {
  if (!browser) throw new Error('Browser required');
  if (!jwt)     throw new Error('JWT required');

  const response = await fetch(`${STRAPI_URL}/api/markets?populate=*`, {
    headers: { 'Authorization': `Bearer ${jwt}` }
  });

  if (!response.ok) throw new Error(`Failed to get markets: ${response.status}`);

  const data = await response.json();
  return data.data.map(market => ({ id: market.id, ...market }));
}

// ── Capitalize ─────────────────────────────────────────────────────
export function capitalize(text) {
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}