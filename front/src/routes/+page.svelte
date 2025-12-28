<script>
  import { getStrapiImageUrl, formatPrice } from '$lib/strapi.js';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { invalidateAll } from '$app/navigation';

  export let data;

  let searchTerm = '';
  let debouncedSearch = '';
  let expandedMarkets = new Set();
  let searchTimer;

  // DEBUG: Log data structure on browser
  $: if (browser && data) {
    console.log('📊 Data received from server:', {
      hasError: !!data.error,
      allMarketsExists: !!data.allMarkets,
      allMarketsData: data.allMarkets?.data,
      marketsCount: data.allMarkets?.data?.length || 0,
      firstMarket: data.allMarkets?.data?.[0]
    });
  }

  // GET MARKETS - Correct for Strapi v5 transformed data
  $: markets = data?.allMarkets?.data || [];
  
  // Loading state
  $: loading = !data?.allMarkets && !data?.error;

  // Debounce search
  $: {
    if (searchTimer) clearTimeout(searchTimer);
    
    if (searchTerm.trim()) {
      searchTimer = setTimeout(() => {
        debouncedSearch = searchTerm.toLowerCase().trim();
      }, 300);
    } else {
      debouncedSearch = '';
    }
  }

  // Filter markets
  $: filteredMarkets = markets.filter(market => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch;

    // Search in market name
    if (market.name?.toLowerCase().includes(term)) return true;

    // Search in vendor names
    if (market.vendors?.some(v => v.name?.toLowerCase().includes(term))) return true;

    // Search in product names
    if (market.vendors?.some(v => 
      v.products?.some(p => p.name?.toLowerCase().includes(term))
    )) return true;

    return false;
  });

  // Toggle market expansion
  function toggleExpand(marketId) {
    const newExpanded = new Set(expandedMarkets);
    if (newExpanded.has(marketId)) {
      newExpanded.delete(marketId);
    } else {
      newExpanded.add(marketId);
    }
    expandedMarkets = newExpanded;
  }

  // Navigation functions - UPDATED TO FIX LOGIN REDIRECT
  function navigateToLogin() {
    goto('/vendor-login');
  }

  function navigateToRegistration() {
    goto('/vendor-registration');
  }

  function navigateToDashboard() {
    goto('/vendor-dashboard');
  }

  async function logout() {
    // Only run in browser
    if (!browser) return;
    
    try {
      console.log('Starting logout process...');
      
      // Clear auth store and localStorage using the proper logout method
      await auth.logout();
      
      // Small delay to ensure clean state
      await new Promise(resolve => setTimeout(resolve, 100));
      
      console.log('Auth cleared, navigating home...');
      
      // Invalidate all cached data
      await invalidateAll();
      
      // Use goto for SPA navigation (keeps you in the SvelteKit app)
      goto('/', { replaceState: true });
      
    } catch (error) {
      console.error('Logout error:', error);
      
      // Emergency cleanup
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {
        console.warn('Could not clear storage:', e);
      }
      
      // Force hard reload as last resort
      window.location.href = '/';
    }
  }

  function retry() {
    if (browser) {
      location.reload();
    }
  }

  // Get unique ID for Svelte key
  function getId(entity) {
    if (!entity) return Math.random().toString(36).substring(2, 11);
    return entity.id || Math.random().toString(36).substring(2, 11);
  }

  // Clear search
  function clearSearch() {
    searchTerm = '';
    debouncedSearch = '';
  }
</script>

<svelte:head>
  <title>Market Price Hub</title>
  <meta name="description" content="Compare vendor prices across Uganda's markets">
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <!-- HEADER -->
  <header class="bg-white shadow-sm sticky top-0 z-10">
    <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <div class="flex items-center space-x-3">
        <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-lg">MP</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Market Price Hub</h1>
      </div>
      <div class="flex items-center space-x-4">
        {#if $auth?.jwt}
          <!-- Logged in: Show Dashboard and Logout -->
          <button 
            on:click={navigateToDashboard}
            class="text-blue-600 border border-blue-200 px-4 py-2 rounded text-sm hover:bg-blue-50 transition-colors flex items-center"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Dashboard
          </button>
          <button
            on:click={logout}
            class="text-red-600 text-sm hover:text-red-700 hover:bg-red-50 px-3 py-2 rounded transition-colors flex items-center"
          >
            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Logout
          </button>
        {:else}
          <!-- Not logged in: Show Vendor Login and Become a Vendor -->
          <button 
            on:click={navigateToLogin}
            class="text-blue-600 border border-blue-200 px-4 py-2 rounded text-sm hover:bg-blue-50 transition-colors flex items-center"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Vendor Login
          </button>
          <button 
            on:click={navigateToRegistration}
            class="bg-blue-600 text-white px-5 py-2 rounded text-sm hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Become a Vendor
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- HERO SECTION -->
  <section class="bg-gradient-to-r from-blue-700 to-indigo-800 text-white py-20">
    <div class="max-w-7xl mx-auto px-4 text-center">
      <h1 class="text-4xl md:text-5xl font-extrabold mb-4">Compare Vendor Prices</h1>
      <p class="text-lg md:text-xl mb-8">Find the best deals across markets in Uganda</p>
      <a 
        href="#markets" 
        class="inline-block bg-white text-blue-700 px-8 py-3 rounded-lg font-bold hover:bg-blue-50 transition-colors"
      >
        View Markets
      </a>
    </div>
  </section>

  <!-- SEARCH SECTION -->
  <div class="max-w-2xl mx-auto my-12 px-4">
    <div class="relative">
      <input
        type="text"
        bind:value={searchTerm}
        placeholder="Search markets, vendors, or products..."
        class="w-full p-4 pl-12 border border-gray-300 rounded-full text-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <svg class="absolute left-4 top-5 w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      {#if searchTerm}
        <button
          on:click={clearSearch}
          class="absolute right-4 top-4 text-gray-400 hover:text-gray-600"
          title="Clear search"
        >
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      {/if}
    </div>
  </div>

  <!-- ERROR / LOADING STATES -->
  {#if data?.error}
    <div class="max-w-2xl mx-auto px-4 mb-8">
      <div class="p-4 bg-red-100 text-red-700 rounded-lg text-center">
        <p class="mb-2">{data.error}</p>
        <button 
          on:click={retry} 
          class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    </div>
  {:else if loading}
    <div class="max-w-7xl mx-auto px-4 space-y-4">
      {#each Array(3) as _, i (i)}
        <div class="bg-white rounded-xl shadow p-6 animate-pulse">
          <div class="h-6 bg-gray-200 rounded w-48 mb-2"></div>
          <div class="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      {/each}
    </div>
  {:else if !markets.length && !loading}
    <div class="max-w-2xl mx-auto px-4 mb-8">
      <div class="p-8 bg-yellow-50 text-yellow-800 rounded-lg text-center">
        <p class="text-lg mb-2">No market data available</p>
        <p class="text-sm mb-4">Markets will appear once vendors start registering</p>
        <button 
          on:click={retry} 
          class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors"
        >
          Refresh
        </button>
      </div>
    </div>
  {/if}

  <!-- MARKETS SECTION -->
  <section id="markets" class="pb-20 px-4">
    <div class="max-w-7xl mx-auto">
      {#if filteredMarkets.length > 0}
        <div class="mb-6">
          <h2 class="text-2xl font-bold text-gray-800">Available Markets</h2>
          <p class="text-gray-600">
            Showing {filteredMarkets.length} of {markets.length} market{markets.length !== 1 ? 's' : ''}
            {#if debouncedSearch}
              matching "<span class="font-medium">{searchTerm}</span>"
            {/if}
          </p>
        </div>

        {#each filteredMarkets as market (getId(market))}
          {@const marketId = getId(market)}
          {@const vendors = market.vendors || []}
          {@const isExpanded = expandedMarkets.has(marketId)}
          
          <div class="bg-white rounded-xl shadow-lg mb-6 overflow-hidden transition-all duration-300 hover:shadow-xl">
            <!-- Market Header -->
            <button
              on:click={() => toggleExpand(marketId)}
              class="w-full p-6 text-left flex justify-between items-center hover:bg-gray-50 transition-colors cursor-pointer"
              aria-expanded={isExpanded}
            >
              <div class="flex-1">
                <div class="flex items-start justify-between">
                  <div>
                    <h3 class="text-xl font-bold text-gray-900">{market.name}</h3>
                    <div class="mt-2 flex flex-wrap items-center gap-2">
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800">
                        <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {vendors.length} vendor{vendors.length !== 1 ? 's' : ''}
                      </span>
                      {#if market.location}
                        <span class="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-800">
                          <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {market.location}
                        </span>
                      {/if}
                    </div>
                  </div>
                  <svg 
                    class="w-6 h-6 text-gray-500 ml-4 transition-transform duration-300 {isExpanded ? 'rotate-180' : ''}" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </button>

            <!-- Market Details (Expanded) -->
            {#if isExpanded}
              <div class="border-t border-gray-200">
                <div class="p-6 bg-gray-50">
                  {#if vendors.length > 0}
                    <div class="space-y-6">
                      <h4 class="text-lg font-semibold text-gray-700">Vendors in this Market</h4>
                      
                      {#each vendors as vendor (getId(vendor))}
                        {@const products = vendor.products || []}
                        
                        <div class="bg-white rounded-lg border border-gray-200 p-5 hover:border-blue-300 transition-colors">
                          <!-- Vendor Info -->
                          <div class="flex items-start space-x-4 mb-5">
                            {#if vendor.image}
                              <img
                                src={getStrapiImageUrl(vendor.image)}
                                alt={`${vendor.name}'s profile`}
                                class="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                                loading="lazy"
                              />
                            {:else}
                              <div class="w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                                <span class="text-blue-600 font-bold text-xl">{vendor.name?.[0]?.toUpperCase() || 'V'}</span>
                              </div>
                            {/if}
                            <div class="flex-1">
                              <div class="flex flex-col md:flex-row md:items-center justify-between gap-2">
                                <div>
                                  <h5 class="text-xl font-bold text-gray-900">{vendor.name}</h5>
                                  {#if vendor.description}
                                    <p class="text-gray-600 text-sm mt-1 line-clamp-2">{vendor.description}</p>
                                  {/if}
                                </div>
                                <div class="flex items-center space-x-3">
                                  {#if vendor.verified}
                                    <span class="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                                      <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                                        <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                                      </svg>
                                      Verified
                                    </span>
                                  {/if}
                                  <span class="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-800">
                                    <svg class="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                    </svg>
                                    {products.length} product{products.length !== 1 ? 's' : ''}
                                  </span>
                                </div>
                              </div>

                              <!-- Contact Information -->
                              {#if vendor.contact || vendor.email}
                                <div class="mt-4 space-y-2">
                                  {#if vendor.contact}
                                    <p class="text-sm text-gray-600 flex items-center">
                                      <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                      </svg>
                                      {vendor.contact}
                                    </p>
                                  {/if}
                                  {#if vendor.email}
                                    <p class="text-sm text-gray-600 flex items-center">
                                      <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                      </svg>
                                      {vendor.email}
                                    </p>
                                  {/if}
                                </div>
                              {/if}
                            </div>
                          </div>

                          <!-- Products -->
                          {#if products.length > 0}
                            <div>
                              <h6 class="font-semibold text-gray-700 mb-4 flex items-center">
                                <svg class="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Available Products
                              </h6>
                              <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {#each products as product (getId(product))}
                                  <div class="bg-gray-50 p-4 rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
                                    <div class="flex items-start space-x-3">
                                      {#if product.image}
                                        <img
                                          src={getStrapiImageUrl(product.image)}
                                          alt={product.name}
                                          class="w-16 h-16 rounded-lg object-cover"
                                          loading="lazy"
                                        />
                                      {:else}
                                        <div class="w-16 h-16 bg-gradient-to-br from-green-100 to-emerald-100 rounded-lg flex items-center justify-center">
                                          <span class="text-green-600 font-bold text-lg">{product.name?.[0]?.toUpperCase() || 'P'}</span>
                                        </div>
                                      {/if}
                                      <div class="flex-1">
                                        <div class="flex justify-between items-start">
                                          <div>
                                            <p class="font-bold text-gray-900">{product.name}</p>
                                            {#if product.unit}
                                              <p class="text-sm text-gray-600">{product.unit}</p>
                                            {/if}
                                          </div>
                                          <span class="font-bold text-green-600 text-lg whitespace-nowrap">
                                            {formatPrice(product.price)}
                                          </span>
                                        </div>
                                        {#if product.description}
                                          <p class="text-sm text-gray-600 mt-2 line-clamp-2">{product.description}</p>
                                        {/if}
                                        {#if product.category}
                                          <span class="inline-block mt-2 px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded">
                                            {product.category}
                                          </span>
                                        {/if}
                                      </div>
                                    </div>
                                  </div>
                                {/each}
                              </div>
                            </div>
                          {:else}
                            <div class="text-center py-6 bg-gray-50 rounded-lg">
                              <svg class="w-12 h-12 text-gray-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              <p class="text-gray-500">No products available yet</p>
                              <p class="text-sm text-gray-400 mt-1">Check back soon for updates</p>
                            </div>
                          {/if}
                        </div>
                      {/each}
                    </div>
                  {:else}
                    <div class="text-center py-10">
                      <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      <h5 class="text-lg font-medium text-gray-700 mb-2">No vendors yet</h5>
                      <p class="text-gray-500 mb-4">Be the first vendor in this market!</p>
                      <button
                        on:click={navigateToRegistration}
                        class="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <svg class="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Register as Vendor
                      </button>
                    </div>
                  {/if}
                </div>
              </div>
            {/if}
          </div>
        {/each}
      {:else if !loading && markets.length > 0}
        <!-- No search results -->
        <div class="text-center py-16 bg-white rounded-xl shadow">
          <svg class="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <h3 class="text-xl font-semibold text-gray-700 mb-2">No matches found</h3>
          <p class="text-gray-500 mb-6">
            No markets, vendors, or products match "<span class="font-medium">{searchTerm}</span>"
          </p>
          <div class="space-x-3">
            <button
              on:click={clearSearch}
              class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear Search
            </button>
            <button
              on:click={navigateToRegistration}
              class="px-5 py-2 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Register Vendor
            </button>
          </div>
        </div>
      {/if}
    </div>
  </section>

  <!-- FOOTER -->
  <footer class="bg-gray-900 text-white py-8">
    <div class="max-w-7xl mx-auto px-4">
      <div class="flex flex-col md:flex-row justify-between items-center">
        <div class="mb-6 md:mb-0">
          <div class="flex items-center space-x-3 mb-4">
            <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span class="text-white font-bold text-lg">MP</span>
            </div>
            <h2 class="text-xl font-bold">Market Price Hub</h2>
          </div>
          <p class="text-gray-400 text-sm">Connecting vendors and customers across Uganda</p>
        </div>
        <div class="flex space-x-6">
          <a 
            href="/about" 
            class="text-gray-400 hover:text-white transition-colors"
          >
            About
          </a>
          <a 
            href="/contact" 
            class="text-gray-400 hover:text-white transition-colors"
          >
            Contact
          </a>
          <a 
            href="/terms" 
            class="text-gray-400 hover:text-white transition-colors"
          >
            Terms
          </a>
          <a 
            href="/privacy" 
            class="text-gray-400 hover:text-white transition-colors"
          >
            Privacy
          </a>
        </div>
      </div>
      <div class="border-t border-gray-800 mt-8 pt-8 text-center">
        <p class="text-gray-500 text-sm">&copy; {new Date().getFullYear()} Market Price Hub. All rights reserved.</p>
      </div>
    </div>
  </footer>
</div>

<style>
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
</style>