// src/lib/stores/auth.js
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

// Helper function to safely parse localStorage
const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const createAuthStore = () => {
  // Initialize with empty state for SSR
  const initialState = {
    user: null,
    jwt: null,
    vendor: null,
    vendorId: null,
    hasVendorProfile: false,
    loading: false
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,
    set,
    update,
    
    // Initialize from localStorage - SSR safe
    init: () => {
      if (!browser) return;
      
      try {
        const storedJwt = localStorage.getItem('jwt');
        const storedUser = localStorage.getItem('user');
        const storedVendor = localStorage.getItem('vendor');
        const storedVendorId = localStorage.getItem('vendorId');
        
        if (storedJwt) {
          set({
            user: safeParse(storedUser),
            jwt: storedJwt,
            vendor: safeParse(storedVendor),
            vendorId: storedVendorId,
            hasVendorProfile: !!storedVendor,
            loading: false
          });
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    },
    
    // Client-side login
    login: async (identifier, password) => {
      if (!browser) {
        return { 
          success: false, 
          error: 'Login only available in browser',
          user: null,
          jwt: null,
          vendor: null,
          hasVendorProfile: false
        };
      }
      
      update(state => ({ ...state, loading: true }));
      try {
        const response = await fetch('http://localhost:1337/api/auth/local', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password })
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error?.message || `Login failed: ${response.status}`);
        }
        
        const data = await response.json();
        const user = data.user;
        const jwt = data.jwt;
        
        // Check for vendor profile
        let vendor = null;
        let vendorId = null;
        let hasVendorProfile = false;
        
        try {
          const vendorResponse = await fetch(
            `http://localhost:1337/api/vendors?populate=*`,
            { headers: { 'Authorization': `Bearer ${jwt}` } }
          );
          
          if (vendorResponse.ok) {
            const vendorData = await vendorResponse.json();
            if (vendorData.data?.length) {
              const foundVendor = vendorData.data.find(v => 
                v.user?.id === user.id || 
                v.users_permissions_user?.id === user.id
              );
              
              if (foundVendor) {
                vendor = foundVendor;
                vendorId = foundVendor.id;
                hasVendorProfile = true;
              }
            }
          }
        } catch (vendorError) {
          console.log('Vendor check error:', vendorError);
        }
        
        const authState = { 
          user, 
          jwt, 
          vendor, 
          vendorId,
          hasVendorProfile,
          loading: false 
        };
        
        set(authState);
        
        // Store in localStorage
        localStorage.setItem('jwt', jwt);
        localStorage.setItem('user', JSON.stringify(user));
        if (vendor) {
          localStorage.setItem('vendor', JSON.stringify(vendor));
          localStorage.setItem('vendorId', vendorId);
        }
        
        return {
          success: true,
          user,
          jwt,
          vendor,
          vendorId,
          hasVendorProfile,
          error: null
        };
      } catch (error) {
        console.error('Login error:', error);
        update(state => ({ ...state, loading: false }));
        
        return {
          success: false,
          error: error.message || 'Login failed',
          user: null,
          jwt: null,
          vendor: null,
          hasVendorProfile: false
        };
      }
    },
    
    // Client-side logout
    logout: () => {
      if (!browser) return { success: false, error: 'Browser only' };
      
      set({ 
        user: null, 
        jwt: null, 
        vendor: null, 
        vendorId: null,
        hasVendorProfile: false,
        loading: false 
      });
      
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      localStorage.removeItem('vendor');
      localStorage.removeItem('vendorId');
      
      return { success: true, error: null };
    }
  };
};

export const auth = createAuthStore();

// Derived stores
export const isAuthenticated = derived(auth, $auth => !!$auth.jwt);
export const currentUser = derived(auth, $auth => $auth.user);
export const currentVendor = derived(auth, $auth => $auth.vendor);
export const hasVendorProfile = derived(auth, $auth => $auth.hasVendorProfile);
export const isLoading = derived(auth, $auth => $auth.loading);