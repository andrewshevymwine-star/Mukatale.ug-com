// src/lib/stores/auth.js (SSR compatible)
import { writable } from 'svelte/store';
import { browser } from '$app/environment';

// Helper to safely parse JSON
const safeParse = (str) => {
  try {
    return str ? JSON.parse(str) : null;
  } catch {
    return null;
  }
};

// Initialize store with SSR-safe default
const initialState = {
  user: null,
  vendor: null,
  vendorId: null,
  jwt: null,
  isLoading: true,
  isAuthenticated: false
};

// Create writable store
const createAuthStore = () => {
  const { subscribe, set, update } = writable(initialState);
  
  return {
    subscribe,
    set,
    update,
    
    // Initialize auth - SSR safe
    init: async () => {
      if (!browser) {
        // Server-side: set loading to false but don't try to access browser APIs
        set({
          ...initialState,
          isLoading: false
        });
        return;
      }
      
      // Client-side only
      try {
        // Helper to get cookie client-side
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
          return null;
        };
        
        // Get auth data from cookies (set by server)
        const jwtCookie = getCookie('jwt');
        const userCookie = getCookie('user');
        const vendorCookie = getCookie('vendor');
        const vendorIdCookie = getCookie('vendorId');
        
        // Parse cookies
        const user = userCookie ? safeParse(userCookie) : null;
        const vendor = vendorCookie ? safeParse(vendorCookie) : null;
        const vendorId = vendorIdCookie || null;
        
        if (jwtCookie && user) {
          // We have auth data from cookies
          set({
            user,
            vendor,
            vendorId,
            jwt: jwtCookie,
            isLoading: false,
            isAuthenticated: true
          });
          
          // Also sync to localStorage for backward compatibility
          localStorage.setItem('jwt', jwtCookie);
          localStorage.setItem('user', JSON.stringify(user));
          if (vendor) {
            localStorage.setItem('vendor', JSON.stringify(vendor));
            localStorage.setItem('vendorId', vendorId);
          }
        } else {
          // No auth cookies, check localStorage (legacy)
          const storedJwt = localStorage.getItem('jwt');
          const storedUser = localStorage.getItem('user');
          const storedVendor = localStorage.getItem('vendor');
          const storedVendorId = localStorage.getItem('vendorId');
          
          if (storedJwt && storedUser) {
            set({
              user: safeParse(storedUser),
              vendor: storedVendor ? safeParse(storedVendor) : null,
              vendorId: storedVendorId,
              jwt: storedJwt,
              isLoading: false,
              isAuthenticated: true
            });
          } else {
            // Not authenticated
            set({
              ...initialState,
              isLoading: false
            });
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        set({
          ...initialState,
          isLoading: false
        });
      }
    },
    
    // Login function - use server actions instead
    login: async (identifier, password) => {
      if (!browser) {
        throw new Error('Login requires browser');
      }
      
      const formData = new FormData();
      formData.append('identifier', identifier);
      formData.append('password', password);
      
      const response = await fetch('/vendor-login?/login', {
        method: 'POST',
        body: formData
      });
      
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Login failed' }));
        throw new Error(error.error || 'Login failed');
      }
      
      const result = await response.json();
      
      if (result.success) {
        // Update store
        set({
          user: result.user,
          vendor: result.vendor || null,
          vendorId: result.vendorId || null,
          jwt: null, // JWT is httpOnly cookie
          isLoading: false,
          isAuthenticated: true
        });
        
        // Store in localStorage for quick access
        localStorage.setItem('user', JSON.stringify(result.user));
        if (result.vendor) {
          localStorage.setItem('vendor', JSON.stringify(result.vendor));
          localStorage.setItem('vendorId', result.vendorId);
        }
      }
      
      return result;
    },
    
    // Logout - SSR safe
    logout: async () => {
      if (!browser) return;
      
      try {
        await fetch('/auth/logout', { method: 'POST' }).catch(() => {});
      } catch (error) {
        console.error('Logout API error:', error);
      }
      
      // Clear client storage
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      localStorage.removeItem('vendor');
      localStorage.removeItem('vendorId');
      
      // Clear cookies client-side
      document.cookie = 'jwt=; Max-Age=0; path=/';
      document.cookie = 'user=; Max-Age=0; path=/';
      document.cookie = 'vendor=; Max-Age=0; path=/';
      document.cookie = 'vendorId=; Max-Age=0; path=/';
      
      // Update store
      set({
        ...initialState,
        isLoading: false
      });
      
      // Redirect
      window.location.href = '/';
    },
    
    // Check vendor profile
    checkVendorProfile: async () => {
      if (!browser) return false;
      
      try {
        const getCookie = (name) => {
          const value = `; ${document.cookie}`;
          const parts = value.split(`; ${name}=`);
          if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
          return null;
        };
        
        const jwt = getCookie('jwt');
        if (!jwt) return false;
        
        const response = await fetch('http://localhost:1337/api/users/me?populate[vendor]=*', {
          headers: { 'Authorization': `Bearer ${jwt}` }
        });
        
        if (response.ok) {
          const userData = await response.json();
          return !!(userData.vendor?.data || userData.vendor?.id);
        }
      } catch (error) {
        console.error('Check vendor profile error:', error);
      }
      
      return false;
    }
  };
};

export const auth = createAuthStore();

// Derived stores for easy access
export const user = {
  subscribe: auth.subscribe,
  current: (callback) => {
    let value;
    auth.subscribe(v => { value = v.user; })();
    return value;
  }
};

export const isAuthenticated = {
  subscribe: auth.subscribe,
  current: (callback) => {
    let value;
    auth.subscribe(v => { value = v.isAuthenticated; })();
    return value;
  }
};

// Initialize in browser
if (browser) {
  auth.init();
}