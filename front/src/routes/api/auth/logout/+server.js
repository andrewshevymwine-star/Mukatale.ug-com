// src/routes/auth/logout/+server.js
import { redirect } from '@sveltejs/kit';

export async function POST({ cookies }) {
  console.log('🚪 POST logout requested');
  
  // Get user info for logging
  const userCookie = cookies.get('user');
  const user = userCookie ? JSON.parse(userCookie) : null;
  console.log('👤 Logging out:', user?.email || 'Unknown');
  
  // Clear all auth cookies
  cookies.delete('jwt', { path: '/' });
  cookies.delete('user', { path: '/' });
  cookies.delete('vendorId', { path: '/' });
  cookies.delete('vendor', { path: '/' });
  
  console.log('✅ Cookies cleared');
  
  // Always redirect to home page
  throw redirect(303, '/');
}

export async function GET({ cookies }) {
  console.log('🚪 GET logout requested');
  
  // Clear all auth cookies
  cookies.delete('jwt', { path: '/' });
  cookies.delete('user', { path: '/' });
  cookies.delete('vendorId', { path: '/' });
  cookies.delete('vendor', { path: '/' });
  
  // Redirect to home page
  throw redirect(303, '/');
}