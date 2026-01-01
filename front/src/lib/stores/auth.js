// src/lib/stores/auth.js
import { writable, derived } from 'svelte/store';
import { browser } from '$app/environment';
import { getVendorByUserId } from '$lib/strapi';

const createAuthStore = () => {
  const initialState = {
    user: null,
    jwt: null,
    vendor: null,
    vendorId: null,
    hasVendorProfile: false,
    loading: false,
    initialized: false
  };

  const { subscribe, set, update } = writable(initialState);

  return {
    subscribe,
    set,
    update,
    
    // Initialize auth - check both localStorage and server
    init: async () => {
      if (!browser) return;
      
      update(state => ({ ...state, loading: true, initialized: false }));
      
      try {
        console.log('🔐 Auth: Initializing...');
        
        // First, try localStorage (client-side fallback)
        const localStorageJWT = localStorage.getItem('jwt');
        const localStorageUser = localStorage.getItem('user');
        const localStorageVendor = localStorage.getItem('vendor');
        const localStorageVendorId = localStorage.getItem('vendorId');
        
        if (localStorageJWT && localStorageUser) {
          console.log('📱 Auth: Found credentials in localStorage');
          try {
            const user = JSON.parse(localStorageUser);
            const vendor = localStorageVendor ? JSON.parse(localStorageVendor) : null;
            const vendorId = localStorageVendorId || (vendor?.id || null);
            
            set({
              user,
              jwt: localStorageJWT,
              vendor,
              vendorId,
              hasVendorProfile: !!vendor,
              loading: false,
              initialized: true
            });
            
            console.log('✅ Auth: Initialized from localStorage');
            
            // Verify with server in background
            setTimeout(() => this.verifyWithServer(), 100);
            
            return { success: true, source: 'localStorage' };
          } catch (e) {
            console.error('❌ Auth: Failed to parse localStorage data:', e);
            // Clear invalid data
            localStorage.removeItem('jwt');
            localStorage.removeItem('user');
            localStorage.removeItem('vendor');
            localStorage.removeItem('vendorId');
          }
        }
        
        // If no localStorage, check server cookies
        console.log('🔄 Auth: No localStorage, checking server...');
        const serverAuth = await this.verifyWithServer();
        
        if (serverAuth.success) {
          console.log('✅ Auth: Initialized from server');
          return { success: true, source: 'server' };
        } else {
          console.log('❌ Auth: Not authenticated');
          set({ ...initialState, loading: false, initialized: true });
          return { success: false, message: serverAuth.message };
        }
        
      } catch (error) {
        console.error('💥 Auth initialization error:', error);
        set({ ...initialState, loading: false, initialized: true });
        return { success: false, error: error.message };
      }
    },
    
    // Verify auth with server
    verifyWithServer: async () => {
      try {
        console.log('🔍 Auth: Verifying with server...');
        const response = await fetch('/api/auth/verify', {
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Server error: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.authenticated) {
          console.log('✅ Auth: Server verification successful');
          
          // Update store
          set({
            user: data.user,
            jwt: data.jwt,
            vendor: data.vendor || null,
            vendorId: data.vendorId || null,
            hasVendorProfile: data.hasVendorProfile || false,
            loading: false,
            initialized: true
          });
          
          // Update localStorage
          localStorage.setItem('jwt', data.jwt);
          localStorage.setItem('user', JSON.stringify(data.user));
          if (data.vendor) {
            localStorage.setItem('vendor', JSON.stringify(data.vendor));
            localStorage.setItem('vendorId', data.vendorId);
          }
          
          return { success: true, data };
        } else {
          console.log('❌ Auth: Server verification failed - not authenticated');
          // Clear any stale localStorage
          localStorage.removeItem('jwt');
          localStorage.removeItem('user');
          localStorage.removeItem('vendor');
          localStorage.removeItem('vendorId');
          
          set({ ...initialState, loading: false, initialized: true });
          return { success: false, message: data.message };
        }
        
      } catch (error) {
        console.error('💥 Auth: Server verification error:', error);
        return { success: false, error: error.message };
      }
    },
    
    // Update from server response (used after login)
    updateFromServer: (serverData) => {
      if (!serverData) return;
      
      console.log('🔄 Auth: Updating from server data');
      
      const authState = {
        user: serverData.user || null,
        jwt: serverData.jwt || null,
        vendor: serverData.vendor || null,
        vendorId: serverData.vendorId || null,
        hasVendorProfile: serverData.hasVendorProfile || false,
        loading: false,
        initialized: true
      };
      
      set(authState);
      
      // Update localStorage
      if (browser) {
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
      }
      
      console.log('✅ Auth: Store updated from server');
    },
    
    // Load vendor profile (for when vendor exists but not in store)
    loadVendorProfile: async () => {
      update(state => ({ ...state, loading: true }));
      
      try {
        const jwt = localStorage.getItem('jwt');
        const userStr = localStorage.getItem('user');
        
        if (!jwt || !userStr) {
          throw new Error('Not authenticated');
        }
        
        const user = JSON.parse(userStr);
        console.log('🔍 Auth: Loading vendor profile for user:', user.id);
        
        const vendor = await getVendorByUserId(user.id, jwt);
        
        if (vendor) {
          const updatedState = {
            user,
            jwt,
            vendor,
            vendorId: vendor.id,
            hasVendorProfile: true,
            loading: false,
            initialized: true
          };
          
          set(updatedState);
          
          // Update localStorage
          localStorage.setItem('vendor', JSON.stringify(vendor));
          localStorage.setItem('vendorId', vendor.id);
          
          console.log('✅ Auth: Vendor profile loaded');
          return { success: true, vendor };
        } else {
          console.log('📝 Auth: No vendor profile found');
          update(state => ({ 
            ...state, 
            vendor: null,
            vendorId: null,
            hasVendorProfile: false,
            loading: false 
          }));
          return { success: false, error: 'No vendor profile found' };
        }
      } catch (error) {
        console.error('❌ Auth: Load vendor profile error:', error);
        update(state => ({ ...state, loading: false }));
        return { success: false, error: error.message };
      }
    },
    
    // Update vendor profile in store
    updateVendorProfile: (updatedVendorData) => {
      update(state => {
        const newVendor = {
          ...state.vendor,
          ...updatedVendorData
        };
        
        console.log('🔄 Auth: Updating vendor profile in store');
        
        // Update localStorage
        if (browser) {
          localStorage.setItem('vendor', JSON.stringify(newVendor));
          localStorage.setItem('vendorId', newVendor.id);
        }
        
        return {
          ...state,
          vendor: newVendor,
          vendorId: newVendor.id,
          hasVendorProfile: true
        };
      });
    },
    
    // Check authentication status
    checkAuth: () => {
      if (!browser) return { isAuthenticated: false };
      
      const jwt = localStorage.getItem('jwt');
      const user = localStorage.getItem('user');
      const vendor = localStorage.getItem('vendor');
      
      return {
        isAuthenticated: !!(jwt && user),
        hasJWT: !!jwt,
        hasUser: !!user,
        hasVendor: !!vendor
      };
    },
    
    // Logout
    logout: () => {
      console.log('👋 Auth: Logging out');
      
      set({ 
        user: null, 
        jwt: null, 
        vendor: null, 
        vendorId: null,
        hasVendorProfile: false,
        loading: false,
        initialized: true
      });
      
      // Clear localStorage
      localStorage.removeItem('jwt');
      localStorage.removeItem('user');
      localStorage.removeItem('vendor');
      localStorage.removeItem('vendorId');
      
      // Clear server cookies via API call
      if (browser) {
        fetch('/api/auth/logout', { method: 'POST' })
          .then(() => console.log('✅ Auth: Server cookies cleared'))
          .catch(err => console.error('❌ Auth: Failed to clear server cookies:', err));
      }
      
      console.log('✅ Auth: Logout complete');
      
      return { success: true };
    }
  };
};

export const auth = createAuthStore();

// Derived stores
export const isAuthenticated = derived(auth, $auth => !!$auth.jwt && $auth.initialized);
export const currentUser = derived(auth, $auth => $auth.user);
export const currentVendor = derived(auth, $auth => $auth.vendor);
export const hasVendorProfile = derived(auth, $auth => $auth.hasVendorProfile);
export const isLoading = derived(auth, $auth => $auth.loading);
export const isInitialized = derived(auth, $auth => $auth.initialized);