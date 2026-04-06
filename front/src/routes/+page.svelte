<script>
  import { getStrapiImageUrl, formatPrice } from '$lib/strapi.js';
  import { auth } from '$lib/stores/auth';
  import { goto } from '$app/navigation';
  import { browser } from '$app/environment';
  import { invalidateAll } from '$app/navigation';
  import { onMount } from 'svelte';
  import Slideshow from '$lib/components/Slideshow.svelte';

  export let data;

  let searchTerm = '';
  let debouncedSearch = '';
  let expandedMarkets = new Set();
  let searchTimer;
  let currentDateTime = new Date().toLocaleString('en-UG', {
    timeZone: 'Africa/Nairobi',
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short'
  });

  onMount(() => {
    const interval = setInterval(() => {
      currentDateTime = new Date().toLocaleString('en-UG', {
        timeZone: 'Africa/Nairobi',
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        timeZoneName: 'short'
      });
    }, 1000);
    return () => clearInterval(interval);
  });

  $: if (browser && data) {
    console.log('📊 Data received from server:', {
      hasError: !!data.error,
      allMarketsExists: !!data.allMarkets,
      allMarketsData: data.allMarkets?.data,
      marketsCount: data.allMarkets?.data?.length || 0,
      firstMarket: data.allMarkets?.data?.[0]
    });
  }

  $: markets = data?.allMarkets?.data || [];
  $: loading = !data?.allMarkets && !data?.error;

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

  $: filteredMarkets = markets.filter(market => {
    if (!debouncedSearch) return true;
    const term = debouncedSearch;
    if (market.name?.toLowerCase().includes(term)) return true;
    if (market.vendors?.some(v => v.name?.toLowerCase().includes(term))) return true;
    if (market.vendors?.some(v => v.products?.some(p => p.name?.toLowerCase().includes(term)))) return true;
    return false;
  });

  function toggleExpand(marketId) {
    const newExpanded = new Set(expandedMarkets);
    if (newExpanded.has(marketId)) {
      newExpanded.delete(marketId);
    } else {
      newExpanded.add(marketId);
    }
    expandedMarkets = newExpanded;
  }

  function navigateToLogin() { goto('/vendor-login'); }
  function navigateToRegistration() { goto('/vendor-registration'); }
  function navigateToDashboard() { goto('/vendor-dashboard'); }

  async function logout() {
    if (!browser) return;
    try {
      await auth.logout();
      await new Promise(resolve => setTimeout(resolve, 100));
      await invalidateAll();
      goto('/', { replaceState: true });
    } catch (error) {
      console.error('Logout error:', error);
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch (e) {}
      window.location.href = '/';
    }
  }

  function retry() { if (browser) location.reload(); }
  function getId(entity) {
    if (!entity) return Math.random().toString(36).substring(2, 11);
    return entity.id || Math.random().toString(36).substring(2, 11);
  }
  function clearSearch() { searchTerm = ''; debouncedSearch = ''; }
</script>

<svelte:head>
  <title>Mukatale.ug</title>
  <meta name="description" content="Discover the latest grocery prices across Ugandan markets">
</svelte:head>

<div class="min-h-screen bg-gray-100">

  <!-- ── Header ── -->
  <header class="bg-green-700 text-white sticky top-0 z-10 shadow-md">
    <div class="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
      <div class="flex items-center space-x-3">
        <span class="title-font text-white">Mukatale.ug</span>
      </div>
      <div class="flex items-center space-x-4">
        {#if $auth?.jwt}
          <button on:click={navigateToDashboard} class="bg-blue-600 text-white px-4 py-2 rounded-md text-sm hover:bg-blue-700 transition">
            Dashboard
          </button>
          <button on:click={logout} class="text-red-200 text-sm hover:text-red-100">
            Logout
          </button>
        {:else}
          <button on:click={navigateToLogin} class="border border-white text-white px-4 py-2 rounded-md text-sm hover:bg-green-600 transition">
            Login
          </button>
          <button on:click={navigateToRegistration} class="bg-white text-green-700 px-4 py-2 rounded-md text-sm hover:bg-gray-100 transition">
            Signup
          </button>
        {/if}
      </div>
    </div>
  </header>

  <!-- ── Hero ── -->
  <section class="bg-green-600 text-white py-10">
    <div class="max-w-7xl mx-auto px-4 text-center">
      <p class="text-lg md:text-xl">Discover the latest grocery prices across<br />different Ugandan markets</p>
      <div class="flex flex-wrap justify-center gap-4 mt-6 text-lg">
        <span>Fruits</span> <span>Vegetables</span> <span>Nuts</span>
        <span>Cereals</span> <span>Meat</span> <span>Chicken</span>
      </div>
      <div class="mt-6 text-sm text-green-100">
        {currentDateTime}
      </div>
    </div>
  </section>

  <!-- ── Search bar ── -->
  <div class="max-w-2xl mx-auto px-4 my-8">
    <div class="flex gap-2 items-center">
      <div class="flex-1 relative border border-green-300 rounded-full overflow-hidden bg-white shadow-sm">
        <input
          type="text"
          bind:value={searchTerm}
          placeholder="search groceries and markets"
          class="w-full px-5 py-3 text-gray-700 focus:outline-none"
        />
        {#if searchTerm}
          <button
            on:click={clearSearch}
            class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            title="Clear search"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        {/if}
      </div>
      <button class="bg-red-600 hover:bg-green-700 text-white w-12 h-12 flex items-center justify-center transition">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>
    </div>
  </div>

  <!-- ── Markets list ── -->
  <section id="markets" class="max-w-7xl mx-auto px-4 pb-12">
    {#if data?.error}
      <div class="p-4 bg-red-100 text-red-700 rounded-lg text-center">
        <p class="mb-2">{data.error}</p>
        <button on:click={retry} class="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700">Retry</button>
      </div>
    {:else if loading}
      <div class="space-y-4">
        {#each Array(3) as _, i (i)}
          <div class="bg-white rounded-xl shadow p-6 animate-pulse">
            <div class="h-6 bg-gray-200 rounded w-48 mb-2"></div>
            <div class="h-4 bg-gray-200 rounded w-32"></div>
          </div>
        {/each}
      </div>
    {:else if !markets.length && !loading}
      <div class="p-8 bg-yellow-50 text-yellow-800 rounded-lg text-center">
        <p class="text-lg mb-2">No market data available</p>
        <p class="text-sm mb-4">Markets will appear once vendors start registering</p>
        <button on:click={retry} class="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700">Refresh</button>
      </div>
    {:else if filteredMarkets.length === 0 && markets.length > 0}
      <div class="text-center py-16 bg-white rounded-xl shadow">
        <svg class="w-20 h-20 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <h3 class="text-xl font-semibold text-gray-700 mb-2">No matches found</h3>
        <p class="text-gray-500 mb-6">No markets, vendors, or products match "<span class="font-medium">{searchTerm}</span>"</p>
        <button on:click={clearSearch} class="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Clear Search</button>
      </div>
    {:else}
      {#each filteredMarkets as market (getId(market))}
        {@const marketId = getId(market)}
        {@const vendors = market.vendors || []}
        {@const isExpanded = expandedMarkets.has(marketId)}

        <div id={`market-${marketId}`} class="bg-white rounded-lg shadow mb-5 overflow-hidden transition-all">
          <button
            on:click={() => toggleExpand(marketId)}
            class="w-full p-5 text-left flex justify-between items-center bg-green-600 hover:bg-green-700 transition text-white"
          >
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <h3 class="text-xl font-bold">{market.name}</h3>
                <div class="flex items-center gap-2 text-sm text-green-100">
                  <span class="bg-green-700 px-3 py-1 rounded-full">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</span>
                  {#if market.location}
                    <span class="bg-green-700 px-3 py-1 rounded-full">{market.location}</span>
                  {/if}
                </div>
              </div>
            </div>
            <svg class="w-5 h-5 text-white transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {#if isExpanded}
            <div class="border-t border-gray-100 p-5 bg-gray-50">
              {#if vendors.length}
                <div class="space-y-5">
                  {#each vendors as vendor (getId(vendor))}
                    {@const products = vendor.products || []}
                    <div class="bg-white rounded-lg p-4 border border-gray-200">
                      <div class="flex items-start space-x-4 mb-4">
                        {#if vendor.image}
                          <img src={getStrapiImageUrl(vendor.image)} alt={vendor.name} class="w-12 h-12 rounded-full object-cover" loading="lazy" />
                        {:else}
                          <div class="w-12 h-12 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center">
                            <span class="text-blue-600 font-bold text-lg">{vendor.name?.[0]?.toUpperCase()}</span>
                          </div>
                        {/if}
                        <div class="flex-1">
                          <div class="flex flex-wrap justify-between items-start gap-2">
                            <div>
                              <h4 class="font-bold text-gray-900">{vendor.name}</h4>
                              {#if vendor.description}
                                <p class="text-gray-600 text-sm mt-1 line-clamp-2">{vendor.description}</p>
                              {/if}
                            </div>
                            <div class="flex items-center gap-2">
                              {#if vendor.verified}
                                <span class="inline-flex items-center text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                                  ✓ Verified
                                </span>
                              {/if}
                              <span class="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{products.length} product{products.length !== 1 ? 's' : ''}</span>
                            </div>
                          </div>
                          {#if vendor.contact || vendor.email}
                            <div class="mt-2 text-sm text-gray-500 flex flex-wrap gap-3">
                              {#if vendor.contact}<span>📞 {vendor.contact}</span>{/if}
                              {#if vendor.email}<span>✉️ {vendor.email}</span>{/if}
                            </div>
                          {/if}
                        </div>
                      </div>

                      {#if products.length}
                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-3">
                          {#each products as product (getId(product))}
                            <div class="bg-gray-50 p-3 rounded-lg border border-gray-200">
                              <div class="flex items-start gap-2">
                                {#if product.image}
                                  <img src={getStrapiImageUrl(product.image)} alt={product.name} class="w-12 h-12 object-cover rounded" />
                                {:else}
                                  <div class="w-12 h-12 bg-green-100 rounded flex items-center justify-center text-green-600 font-bold">
                                    {product.name?.[0]?.toUpperCase()}
                                  </div>
                                {/if}
                                <div class="flex-1">
                                  <div class="font-medium text-gray-900">{product.name}</div>
                                  <div class="text-green-700 font-bold">{formatPrice(product.price)}</div>
                                  {#if product.unit}<div class="text-xs text-gray-500">{product.unit}</div>{/if}
                                </div>
                              </div>
                            </div>
                          {/each}
                        </div>
                      {:else}
                        <p class="text-center text-gray-500 py-4">No products listed yet</p>
                      {/if}
                    </div>
                  {/each}
                </div>
              {:else}
                <div class="text-center py-8">
                  <p class="text-gray-500 mb-3">No vendors in this market yet</p>
                  <button
                    on:click={navigateToRegistration}
                    class="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    Become a vendor
                  </button>
                </div>
              {/if}
            </div>
          {/if}
        </div>
      {/each}
    {/if}
  </section>

  <!-- ── Slideshow / Advertising ── -->
  <div class="max-w-7xl mx-auto px-4 my-8">
    <Slideshow />
  </div>

  <!-- ── Footer ── -->
  <footer class="bg-white border-t border-gray-200 py-8 text-center text-sm text-gray-500">
    <p class="mb-2">copyright: Mukatale-ug 2025. All rights reserved.</p>
    <p class="mb-5 text-xs text-gray-400">Site still in development! Designed and developed by andrew Mwine</p>

    <div class="flex justify-center items-center gap-8">

      <!-- WhatsApp -->
      <a
        href="https://wa.me/256754284932"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link footer-link--whatsapp"
      >
        <svg class="footer-icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"
          />
          <path
            d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.533 5.845L.057 23.571a.5.5 0 0 0 .614.612l5.788-1.516A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.908a9.9 9.9 0 0 1-5.031-1.374l-.361-.214-3.735.979.997-3.648-.235-.374A9.862 9.862 0 0 1 2.092 12C2.092 6.534 6.534 2.092 12 2.092S21.908 6.534 21.908 12 17.466 21.908 12 21.908z"
          />
        </svg>
        WhatsApp
      </a>

      <span class="text-gray-300 select-none">|</span>

      <!-- LinkedIn -->
      <a
        href="https://www.linkedin.com/in/andrew-mwine-33709597"
        target="_blank"
        rel="noopener noreferrer"
        class="footer-link footer-link--linkedin"
      >
        <svg class="footer-icon" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path
            d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"
          />
        </svg>
        LinkedIn
      </a>

    </div>
  </footer>

</div>

<style>
  .title-font {
    font-family: 'Snell Roundhand', 'Bradley Hand', cursive;
    font-size: 2.5rem;
    font-weight: 700;
  }
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  /* Footer links */
  .footer-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 500;
    text-decoration: none;
    transition: opacity 0.2s;
  }
  .footer-link:hover { opacity: 0.75; }
  .footer-link--whatsapp { color: #16a34a; }
  .footer-link--linkedin { color: #2563eb; }
  .footer-icon {
    width: 1.25rem;
    height: 1.25rem;
    flex-shrink: 0;
  }
</style>