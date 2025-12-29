// src/lib/stores/auth.js
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';

const createAuthStore = () => {
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
    
    // Initialize from localStorage (sync with server cookies)
    init: () => {
      if (!browser) return;
      
      try {
        // Try to sync with server cookies first
        const cookies = document.cookie.split(';').reduce((acc, cookie) => {
          const [key, value] = cookie.trim().split('=');
          acc[key] = decodeURIComponent(value);
          return acc;
        }, {});
        
        const user = cookies.user ? JSON.parse(cookies.user) : null;
        const vendor = cookies.vendor ? JSON.parse(cookies.vendor) : null;
        const vendorId = cookies.vendorId || null;
        const jwt = cookies.jwt || null;
        
        if (jwt && user) {
          set({
            user,
            jwt,
            vendor,
            vendorId,
            hasVendorProfile: !!vendor,
            loading: false
          });
          
          // Also update localStorage for backward compatibility
          localStorage.setItem('jwt', jwt);
          localStorage.setItem('user', JSON.stringify(user));
          if (vendor) {
            localStorage.setItem('vendor', JSON.stringify(vendor));
            localStorage.setItem('vendorId', vendorId);
          }
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
      }
    },
    
    // Update from server response
    updateFromServer: (serverData) => {
      if (!serverData) return;
      
      const authState = {
        user: serverData.user || null,
        jwt: serverData.jwt || null,
        vendor: serverData.vendor || null,
        vendorId: serverData.vendorId || null,
        hasVendorProfile: serverData.hasVendorProfile || false,
        loading: false
      };
      
      set(authState);
      
      // Update localStorage
      if (authState.jwt) {
        localStorage.setItem('jwt', authState.jwt);
      }
      if (authState.user) {
        localStorage.setItem('user', JSON.stringify(authState.user));
      }
      if (authState.vendor) {
        localStorage.setItem('vendor', JSON.stringify(authState.vendor));
        localStorage.setItem('vendorId', authState.vendorId);
      }
    },
    
    // Logout
    logout: () => {
      set({ 
        user: null, 
        jwt: null, 
        vendor: null, 
        vendorId: null,
        hasVendorProfile: false,
        loading: false 
      });
      
      // Clear localStorage
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      localStorage.removeItem('vendor');
      localStorage.removeItem('vendorId');
      
      // Clear cookies by making a request to logout endpoint
      if (browser) {
        fetch('/api/logout', { method: 'POST' }).catch(() => {});
      }
      
      return { success: true };
    },
    
    // Check if user has vendor profile (for client-side checks)
    checkVendorProfile: async () => {
      update(state => ({ ...state, loading: true }));
      
      try {
        const jwt = localStorage.getItem('jwt');
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        
        if (!jwt || !user) {
          throw new Error('Not authenticated');
        }
        
        const response = await fetch(
          `http://localhost:1337/api/vendors?filters[users_permissions_user][id][$eq]=${user.id}&populate=*`,
          { 
            headers: { 
              'Authorization': `Bearer ${jwt}`,
              'Content-Type': 'application/json'
            } 
          }
        );
        
        if (response.ok) {
          const vendorData = await response.json();
          const hasVendorProfile = vendorData.data && vendorData.data.length > 0;
          
          update(state => ({ 
            ...state, 
            hasVendorProfile,
            loading: false 
          }));
          
          return { hasVendorProfile };
        }
      } catch (error) {
        console.error('Vendor check error:', error);
        update(state => ({ ...state, loading: false }));
      }
      
      return { hasVendorProfile: false };
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