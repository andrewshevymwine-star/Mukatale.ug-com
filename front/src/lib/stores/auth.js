// src/lib/stores/auth.js
import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { PUBLIC_STRAPI_URL } from '$env/static/public';

const STRAPI = PUBLIC_STRAPI_URL;

const safeParse = (str) => {
  try { return str ? JSON.parse(str) : null; }
  catch { return null; }
};

const initialState = {
  user:            null,
  vendor:          null,
  vendorId:        null,
  jwt:             null,
  isLoading:       true,
  isAuthenticated: false,
  hasVendorProfile: false,
  initialized:     false
};

const createAuthStore = () => {
  const { subscribe, set, update } = writable(initialState);

  const getCookie = (name) => {
    if (!browser) return null;
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return decodeURIComponent(parts.pop().split(';').shift());
    return null;
  };

  return {
    subscribe,
    set,
    update,

    // ── Init ────────────────────────────────────────────────────────
    init: async () => {
      if (!browser) {
        set({ ...initialState, isLoading: false, initialized: true });
        return;
      }

      try {
        const jwtCookie      = getCookie('jwt');
        const userCookie     = getCookie('user');
        const vendorCookie   = getCookie('vendor');
        const vendorIdCookie = getCookie('vendorId');

        const user     = safeParse(userCookie);
        const vendor   = safeParse(vendorCookie);
        const vendorId = vendorIdCookie || null;

        if (jwtCookie && user) {
          set({
            user,
            vendor,
            vendorId,
            jwt:             jwtCookie,
            isLoading:       false,
            isAuthenticated: true,
            hasVendorProfile: !!vendor,
            initialized:     true
          });

          // Sync to localStorage
          localStorage.setItem('jwt', jwtCookie);
          localStorage.setItem('user', JSON.stringify(user));
          if (vendor) {
            localStorage.setItem('vendor', JSON.stringify(vendor));
            localStorage.setItem('vendorId', vendorId);
          }
          return;
        }

        // Fallback to localStorage
        const storedJwt      = localStorage.getItem('jwt');
        const storedUser     = safeParse(localStorage.getItem('user'));
        const storedVendor   = safeParse(localStorage.getItem('vendor'));
        const storedVendorId = localStorage.getItem('vendorId');

        if (storedJwt && storedUser) {
          set({
            user:            storedUser,
            vendor:          storedVendor,
            vendorId:        storedVendorId,
            jwt:             storedJwt,
            isLoading:       false,
            isAuthenticated: true,
            hasVendorProfile: !!storedVendor,
            initialized:     true
          });
        } else {
          set({ ...initialState, isLoading: false, initialized: true });
        }
      } catch (error) {
        console.error('Auth init error:', error);
        set({ ...initialState, isLoading: false, initialized: true });
      }
    },

    // ── updateFromServer — used after registration/login ────────────
    updateFromServer: (serverData) => {
      if (!serverData) return;

      const state = {
        user:            serverData.user     || null,
        vendor:          serverData.vendor   || null,
        vendorId:        serverData.vendorId || null,
        jwt:             serverData.jwt      || null,
        isLoading:       false,
        isAuthenticated: !!(serverData.jwt || serverData.user),
        hasVendorProfile: !!(serverData.vendor),
        initialized:     true
      };

      set(state);

      if (browser) {
        if (state.jwt)    localStorage.setItem('jwt',      state.jwt);
        if (state.user)   localStorage.setItem('user',     JSON.stringify(state.user));
        if (state.vendor) {
          localStorage.setItem('vendor',   JSON.stringify(state.vendor));
          localStorage.setItem('vendorId', String(state.vendorId));
        }
      }
    },

    // ── updateVendorProfile — used after profile edits ──────────────
    updateVendorProfile: (updatedVendor) => {
      update(state => {
        const newVendor = { ...state.vendor, ...updatedVendor };
        if (browser) {
          localStorage.setItem('vendor',   JSON.stringify(newVendor));
          localStorage.setItem('vendorId', String(newVendor.id));
        }
        return {
          ...state,
          vendor:          newVendor,
          vendorId:        newVendor.id,
          hasVendorProfile: true
        };
      });
    },

    // ── updateFromServer alias used by old dashboard code ───────────
    updateVendor: (vendor) => {
      update(state => {
        if (browser) {
          localStorage.setItem('vendor',   JSON.stringify(vendor));
          localStorage.setItem('vendorId', String(vendor.id));
        }
        return { ...state, vendor, vendorId: vendor.id, hasVendorProfile: true };
      });
    },

    // ── Logout ──────────────────────────────────────────────────────
    logout: async () => {
      if (!browser) return;

      try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}

      ['jwt', 'user', 'vendor', 'vendorId'].forEach(key => {
        localStorage.removeItem(key);
        document.cookie = `${key}=; Max-Age=0; path=/`;
      });

      set({ ...initialState, isLoading: false, initialized: true });
      window.location.href = '/';
    },

    // ── Check vendor profile ────────────────────────────────────────
    checkVendorProfile: async () => {
      if (!browser) return false;

      try {
        const jwt = getCookie('jwt');
        if (!jwt) return false;

        const response = await fetch(`${STRAPI}/api/users/me?populate[vendor]=*`, {
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

if (browser) { auth.init(); }