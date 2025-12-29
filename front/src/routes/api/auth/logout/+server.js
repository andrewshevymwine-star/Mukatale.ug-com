// src/routes/auth/logout/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ cookies }) {
  console.log('🚪 Logout requested');
  
  // Clear all cookies
  cookies.delete('jwt', { path: '/' });
  cookies.delete('user', { path: '/' });
  cookies.delete('vendorId', { path: '/' });
  cookies.delete('vendor', { path: '/' });
  
  console.log('✅ All cookies cleared');
  
  return json({ 
    success: true, 
    message: 'Logged out successfully' 
  });
}