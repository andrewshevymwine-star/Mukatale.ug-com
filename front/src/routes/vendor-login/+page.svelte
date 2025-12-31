<!-- src/routes/vendor-login/+page.svelte -->
<script>
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { STRAPI_URL } from '$lib/strapi';
  
  let email = '';
  let password = '';
  let loading = false;
  let error = '';
  let successMessage = '';
  
  async function handleLogin(e) {
    e.preventDefault();
    
    if (!email || !password) {
      error = 'Please enter both email and password';
      return;
    }
    
    loading = true;
    error = '';
    successMessage = '';
    
    try {
      // Login to Strapi
      const response = await fetch(`${STRAPI_URL}/api/auth/local`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          identifier: email,
          password: password
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error?.message || 'Login failed');
      }
      
      console.log('✅ Login successful:', data.user);
      
      // Check if user has a vendor profile
      const vendorCheck = await fetch(
        `${STRAPI_URL}/api/vendors?filters[users_permissions_user][id][$eq]=${data.user.id}&populate=*`,
        {
          headers: {
            'Authorization': `Bearer ${data.jwt}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const vendorData = await vendorCheck.json();
      const hasVendorProfile = vendorData.data && vendorData.data.length > 0;
      
      // Set cookies
      document.cookie = `jwt=${data.jwt}; path=/; max-age=${60 * 60 * 24 * 7}`;
      document.cookie = `user=${JSON.stringify(data.user)}; path=/; max-age=${60 * 60 * 24 * 7}`;
      
      if (hasVendorProfile) {
        const vendor = vendorData.data[0];
        document.cookie = `vendorId=${vendor.id}; path=/; max-age=${60 * 60 * 24 * 7}`;
        document.cookie = `vendor=${JSON.stringify(vendor)}; path=/; max-age=${60 * 60 * 24 * 7}`;
        
        // Redirect to dashboard
        window.location.href = '/vendor-dashboard';
      } else {
        // Redirect to registration to complete profile
        window.location.href = '/vendor-registration?completeProfile=true';
      }
      
    } catch (err) {
      console.error('Login error:', err);
      error = err.message || 'Login failed. Please check your credentials.';
    } finally {
      loading = false;
    }
  }
  
  // Redirect to registration page
  function goToRegistration() {
    goto('/vendor-registration');
  }
</script>

<svelte:head>
  <title>Vendor Login</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-gray-100 flex items-center justify-center p-4">
  <div class="w-full max-w-md">
    <!-- Logo/Brand -->
    <div class="text-center mb-10">
      <div class="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg mb-6">
        <svg class="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
        </svg>
      </div>
      <h1 class="text-3xl font-bold text-gray-900">Vendor Login</h1>
      <p class="text-gray-600 mt-2">Access your vendor dashboard</p>
    </div>
    
    <!-- Login Card -->
    <div class="bg-white rounded-2xl shadow-xl p-8">
      {#if error}
        <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm">
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            {error}
          </div>
        </div>
      {/if}
      
      {#if successMessage}
        <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm">
          <div class="flex items-center">
            <svg class="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            {successMessage}
          </div>
        </div>
      {/if}
      
      <form on:submit|preventDefault={handleLogin} class="space-y-6">
        <!-- Email -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            bind:value={email}
            required
            placeholder="you@example.com"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={loading}
          />
        </div>
        
        <!-- Password -->
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Password
          </label>
          <input
            type="password"
            bind:value={password}
            required
            placeholder="••••••••"
            class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
            disabled={loading}
          />
        </div>
        
        <!-- Login Button -->
        <button
          type="submit"
          disabled={loading}
          class="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {#if loading}
            <div class="flex items-center justify-center">
              <svg class="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Logging in...
            </div>
          {:else}
            Sign In to Dashboard
          {/if}
        </button>
      </form>
      
      <!-- Registration Link -->
      <div class="mt-8 pt-6 border-t border-gray-100 text-center">
        <p class="text-gray-600">
          Don't have a vendor account?
          <button
            on:click={goToRegistration}
            class="text-blue-600 hover:text-blue-800 font-medium ml-1"
          >
            Register here
          </button>
        </p>
      </div>
      
      <!-- Support Info -->
      <div class="mt-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
        <div class="flex items-start">
          <svg class="w-5 h-5 text-gray-400 mr-3 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p class="text-sm text-gray-600">
              If you're having trouble logging in, please contact support or check your email for verification.
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>