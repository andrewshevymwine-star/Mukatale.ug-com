import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Create auth store
export const auth = writable({
  user: null,
  vendor: null,
  jwt: null,
  isLoading: true,
  isAuthenticated: false
});

// Initialize auth on client side
export async function initAuth() {
  if (!browser) return;
  
  try {
    // Check if we have a JWT in localStorage (for client-side persistence)
    const storedJwt = localStorage.getItem('jwt');
    const storedUser = localStorage.getItem('user');
    const storedVendor = localStorage.getItem('vendor');
    
    if (storedJwt && storedUser) {
      // Verify with server
      const response = await fetch('/api/verify-auth', {
        headers: {
          'Authorization': `Bearer ${storedJwt}`
        }
      });
      
      if (response.ok) {
        auth.set({
          user: JSON.parse(storedUser),
          vendor: storedVendor ? JSON.parse(storedVendor) : null,
          jwt: storedJwt,
          isLoading: false,
          isAuthenticated: true
        });
        return;
      }
    }
    
    // Not authenticated
    auth.set({
      user: null,
      vendor: null,
      jwt: null,
      isLoading: false,
      isAuthenticated: false
    });
    
  } catch (error) {
    console.error('Auth initialization error:', error);
    auth.set({
      user: null,
      vendor: null,
      jwt: null,
      isLoading: false,
      isAuthenticated: false
    });
  }
}

// Login function (for client-side use if needed)
export async function login(identifier, password) {
  if (!browser) {
    throw new Error('Login is only available in the browser');
  }
  
  const response = await fetch('/vendor-login?/vendor', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      identifier,
      password,
      rememberMe: 'on'
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Login failed');
  }
  
  return response.json();
}

// Logout function
export async function logout() {
  if (!browser) return;
  
  // Call server logout endpoint
  await fetch('/api/logout', { method: 'POST' });
  
  // Clear localStorage
  localStorage.removeItem('jwt');
  localStorage.removeItem('user');
  localStorage.removeItem('vendor');
  
  // Update store
  auth.set({
    user: null,
    vendor: null,
    jwt: null,
    isLoading: false,
    isAuthenticated: false
  });
  
  // Redirect to home
  window.location.href = '/';
}

// Initialize on load
if (browser) {
  initAuth();
}