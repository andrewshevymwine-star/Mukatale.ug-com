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
  let revealedContacts = new Set();
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

  function toggleContact(vendorId) {
    const newRevealed = new Set(revealedContacts);
    if (newRevealed.has(vendorId)) {
      newRevealed.delete(vendorId);
    } else {
      newRevealed.add(vendorId);
    }
    revealedContacts = newRevealed;
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
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet">
</svelte:head>

<div class="page-root">

  <!-- ── Header ── -->
  <header class="site-header">
    <div class="header-inner">
      <div class="logo-wrap">
        <div class="logo-badge">M</div>
        <span class="logo-text">Mukatale<span class="logo-dot">.ug</span></span>
      </div>
      <nav class="header-nav">
        {#if $auth?.jwt}
          <button on:click={navigateToDashboard} class="btn btn-primary">Dashboard</button>
          <button on:click={logout} class="btn btn-ghost-danger">Logout</button>
        {:else}
          <button on:click={navigateToLogin} class="btn btn-outline">Login</button>
          <button on:click={navigateToRegistration} class="btn btn-primary">Signup</button>
        {/if}
      </nav>
    </div>
  </header>

  <!-- ── Hero ── -->
  <section class="hero">
    <div class="hero-bg-pattern"></div>
    <div class="hero-content">
      <p class="hero-eyebrow">Live market prices · Uganda</p>
      <h1 class="hero-heading">Compare prices.<br/>Shop smarter.</h1>
      <p class="hero-sub">Fresh produce prices from markets across Uganda, updated daily by verified vendors.</p>

      <!-- Search -->
      <div class="search-wrap">
        <div class="search-box">
          <svg class="search-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
          </svg>
          <input
            type="text"
            bind:value={searchTerm}
            placeholder="Search groceries, markets or vendors…"
            class="search-input"
          />
          {#if searchTerm}
            <button on:click={clearSearch} class="search-clear" title="Clear">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="18" height="18">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          {/if}
        </div>
      </div>

      <!-- Category pills -->
      <div class="category-pills">
        {#each ['🍌 Fruits', '🥦 Vegetables', '🥜 Nuts', '🌾 Cereals', '🥩 Meat', '🍗 Chicken'] as cat}
          <span class="pill">{cat}</span>
        {/each}
      </div>

      <p class="hero-datetime">{currentDateTime}</p>
    </div>
  </section>

  <!-- ── Markets list ── -->
  <section class="markets-section">
    <div class="markets-inner">

      {#if data?.error}
        <div class="state-card state-error">
          <p>{data.error}</p>
          <button on:click={retry} class="btn btn-danger">Retry</button>
        </div>

      {:else if loading}
        {#each Array(3) as _, i (i)}
          <div class="skeleton-card">
            <div class="skeleton-line wide"></div>
            <div class="skeleton-line narrow"></div>
          </div>
        {/each}

      {:else if !markets.length && !loading}
        <div class="state-card state-empty">
          <p class="state-title">No market data yet</p>
          <p class="state-sub">Markets appear once vendors register.</p>
          <button on:click={retry} class="btn btn-outline">Refresh</button>
        </div>

      {:else if filteredMarkets.length === 0 && markets.length > 0}
        <div class="state-card state-empty">
          <svg class="state-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
          </svg>
          <p class="state-title">No results for "<strong>{searchTerm}</strong>"</p>
          <button on:click={clearSearch} class="btn btn-primary">Clear Search</button>
        </div>

      {:else}
        {#each filteredMarkets as market (getId(market))}
          {@const marketId = getId(market)}
          {@const vendors = market.vendors || []}
          {@const isExpanded = expandedMarkets.has(marketId)}

          <div class="market-card" id={`market-${marketId}`}>
            <!-- Market header (accordion toggle) -->
            <button class="market-header" on:click={() => toggleExpand(marketId)}>
              <div class="market-header-left">
                <div class="market-icon">
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                      d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"/>
                  </svg>
                </div>
                <div>
                  <h3 class="market-name">{market.name}</h3>
                  {#if market.location}
                    <span class="market-location">📍 {market.location}</span>
                  {/if}
                </div>
              </div>
              <div class="market-header-right">
                <span class="vendor-count">{vendors.length} vendor{vendors.length !== 1 ? 's' : ''}</span>
                <svg class="chevron {isExpanded ? 'open' : ''}" fill="none" stroke="currentColor" viewBox="0 0 24 24" width="20" height="20">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/>
                </svg>
              </div>
            </button>

            <!-- Expanded market body -->
            {#if isExpanded}
              <div class="market-body">
                {#if vendors.length}
                  <div class="vendor-list">
                    {#each vendors as vendor (getId(vendor))}
                      {@const products = vendor.products || []}
                      {@const vendorId = getId(vendor)}
                      {@const contactRevealed = revealedContacts.has(vendorId)}

                      <div class="vendor-card">
                        <!-- Vendor identity strip -->
                        <div class="vendor-identity">
                          {#if vendor.image}
                            <img src={getStrapiImageUrl(vendor.image)} alt={vendor.name} class="vendor-avatar" loading="lazy"/>
                          {:else}
                            <div class="vendor-avatar-fallback">{vendor.name?.[0]?.toUpperCase()}</div>
                          {/if}

                          <div class="vendor-info">
                            <div class="vendor-name-row">
                              <h4 class="vendor-name">{vendor.name}</h4>
                              {#if vendor.verified}
                                <span class="verified-badge">✓ Verified</span>
                              {/if}
                            </div>
                            {#if vendor.description}
                              <p class="vendor-desc">{vendor.description}</p>
                            {/if}
                          </div>

                          <span class="product-count-badge">{products.length} item{products.length !== 1 ? 's' : ''}</span>
                        </div>

                        <!-- Products grid — PRODUCT FIRST -->
                        {#if products.length}
                          <div class="products-grid">
                            {#each products as product (getId(product))}
                              <div class="product-card">
                                <div class="product-img-wrap">
                                  {#if product.image}
                                    <img src={getStrapiImageUrl(product.image)} alt={product.name} class="product-img" loading="lazy"/>
                                  {:else}
                                    <div class="product-img-fallback">{product.name?.[0]?.toUpperCase()}</div>
                                  {/if}
                                </div>
                                <div class="product-details">
                                  <span class="product-name">{product.name}</span>
                                  {#if product.unit}
                                    <span class="product-unit">per {product.unit}</span>
                                  {/if}
                                  <span class="product-price">{formatPrice(product.price)}</span>
                                </div>
                              </div>
                            {/each}
                          </div>
                        {:else}
                          <p class="no-products">No products listed yet.</p>
                        {/if}

                        <!-- Contact footer -->
                        {#if vendor.contact}
                          <div class="vendor-footer">
                            {#if contactRevealed}
                              <a href={`tel:${vendor.contact}`} class="contact-reveal">
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="15" height="15">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                </svg>
                                {vendor.contact}
                              </a>
                            {:else}
                              <button class="btn-view-contact" on:click={() => toggleContact(vendorId)}>
                                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" width="14" height="14">
                                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                                    d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/>
                                </svg>
                                View Contact
                              </button>
                            {/if}
                          </div>
                        {/if}

                      </div>
                    {/each}
                  </div>

                {:else}
                  <div class="no-vendors">
                    <p>No vendors in this market yet.</p>
                    <button on:click={navigateToRegistration} class="btn btn-primary">Become a Vendor</button>
                  </div>
                {/if}
              </div>
            {/if}
          </div>
        {/each}
      {/if}

    </div>
  </section>

  <!-- ── Slideshow / Advertising ── -->
  <!-- <div class="slideshow-wrap">
    <Slideshow />
  </div> -->

  <!-- ── Footer ── -->
  <footer class="site-footer">
    <p class="footer-copy">© 2026 Mukatale.ug · All rights reserved.</p>
    <p class="footer-dev">Designed & developed by Andrew Mwine — Tukyakola</p>
    <div class="footer-links">
      <a href="https://wa.me/256754284932" target="_blank" rel="noopener noreferrer" class="footer-link footer-wa">
        <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
          <path d="M12 0C5.373 0 0 5.373 0 12c0 2.124.558 4.118 1.533 5.845L.057 23.571a.5.5 0 0 0 .614.612l5.788-1.516A11.944 11.944 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.908a9.9 9.9 0 0 1-5.031-1.374l-.361-.214-3.735.979.997-3.648-.235-.374A9.862 9.862 0 0 1 2.092 12C2.092 6.534 6.534 2.092 12 2.092S21.908 6.534 21.908 12 17.466 21.908 12 21.908z"/>
        </svg>
        WhatsApp
      </a>
      <span class="footer-sep">|</span>
      <a href="https://www.linkedin.com/in/andrew-mwine-33709597" target="_blank" rel="noopener noreferrer" class="footer-link footer-li">
        <svg fill="currentColor" viewBox="0 0 24 24" width="18" height="18">
          <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
        </svg>
        LinkedIn
      </a>
    </div>
  </footer>

</div>

<style>
  /* ── Tokens ── */
  :root {
    --green-dark:   #14532d;
    --green-mid:    #166534;
    --green-main:   #16a34a;
    --green-light:  #dcfce7;
    --green-pale:   #f0fdf4;
    --amber:        #d97706;
    --amber-light:  #fef3c7;
    --red:          #dc2626;
    --gray-50:      #f9fafb;
    --gray-100:     #f3f4f6;
    --gray-200:     #e5e7eb;
    --gray-400:     #9ca3af;
    --gray-500:     #6b7280;
    --gray-700:     #374151;
    --gray-900:     #111827;
    --white:        #ffffff;
    --radius-sm:    6px;
    --radius-md:    12px;
    --radius-lg:    18px;
    --shadow-sm:    0 1px 3px rgba(0,0,0,.08);
    --shadow-md:    0 4px 16px rgba(0,0,0,.10);
    --shadow-lg:    0 8px 32px rgba(0,0,0,.14);
    --font-display: 'Playfair Display', Georgia, serif;
    --font-body:    'DM Sans', system-ui, sans-serif;
  }

  /* ── Reset / base ── */
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  .page-root {
    min-height: 100vh;
    background: var(--gray-50);
    font-family: var(--font-body);
    color: var(--gray-900);
  }

  /* ── Header ── */
  .site-header {
    background: var(--green-dark);
    position: sticky;
    top: 0;
    z-index: 50;
    box-shadow: 0 2px 12px rgba(0,0,0,.18);
  }
  .header-inner {
    max-width: 1200px;
    margin: 0 auto;
    padding: 0 1.25rem;
    height: 64px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .logo-wrap {
    display: flex;
    align-items: center;
    gap: .65rem;
  }
  .logo-badge {
    width: 36px; height: 36px;
    background: var(--green-main);
    border-radius: 10px;
    display: flex; align-items: center; justify-content: center;
    font-family: var(--font-display);
    font-size: 1.1rem; font-weight: 800;
    color: var(--white);
  }
  .logo-text {
    font-family: var(--font-display);
    font-size: 1.45rem; font-weight: 700;
    color: var(--white);
    letter-spacing: -.01em;
  }
  .logo-dot { color: #86efac; }
  .header-nav { display: flex; align-items: center; gap: .75rem; }

  /* ── Buttons ── */
  .btn {
    display: inline-flex; align-items: center; gap: .4rem;
    padding: .48rem 1.1rem;
    border-radius: var(--radius-sm);
    font-family: var(--font-body); font-size: .875rem; font-weight: 500;
    cursor: pointer; border: 2px solid transparent;
    transition: all .18s ease;
    white-space: nowrap;
  }
  .btn-primary   { background: var(--green-main); color: var(--white); }
  .btn-primary:hover { background: #15803d; }
  .btn-outline   { background: transparent; color: var(--white); border-color: rgba(255,255,255,.5); }
  .btn-outline:hover { border-color: var(--white); background: rgba(255,255,255,.08); }
  .btn-ghost-danger { background: transparent; color: #fca5a5; font-size: .85rem; border: none; }
  .btn-ghost-danger:hover { color: #f87171; }
  .btn-danger    { background: var(--red); color: var(--white); }
  .btn-danger:hover { background: #b91c1c; }

  /* ── Hero ── */
  .hero {
    background: var(--green-mid);
    position: relative;
    overflow: hidden;
    padding: 4rem 1.25rem 3.5rem;
    text-align: center;
  }
  .hero-bg-pattern {
    position: absolute; inset: 0;
    background-image:
      radial-gradient(circle at 15% 50%, rgba(255,255,255,.04) 0%, transparent 55%),
      radial-gradient(circle at 85% 20%, rgba(255,255,255,.05) 0%, transparent 50%);
    pointer-events: none;
  }
  .hero-content {
    position: relative;
    max-width: 680px;
    margin: 0 auto;
  }
  .hero-eyebrow {
    display: inline-block;
    background: rgba(255,255,255,.12);
    color: #bbf7d0;
    font-size: .78rem; font-weight: 600;
    letter-spacing: .08em; text-transform: uppercase;
    padding: .3rem .9rem; border-radius: 99px;
    margin-bottom: 1rem;
  }
  .hero-heading {
    font-family: var(--font-display);
    font-size: clamp(2rem, 5vw, 3.2rem);
    font-weight: 800; line-height: 1.15;
    color: var(--white);
    margin-bottom: .85rem;
  }
  .hero-sub {
    color: #bbf7d0;
    font-size: 1rem; line-height: 1.6;
    margin-bottom: 2rem;
  }

  /* Search */
  .search-wrap { margin-bottom: 1.5rem; }
  .search-box {
    display: flex; align-items: center;
    background: var(--white);
    border-radius: 99px;
    padding: .45rem .45rem .45rem 1.1rem;
    box-shadow: 0 4px 24px rgba(0,0,0,.18);
    max-width: 540px; margin: 0 auto;
  }
  .search-icon { width: 20px; height: 20px; color: var(--gray-400); flex-shrink: 0; }
  .search-input {
    flex: 1;
    border: none; outline: none;
    background: transparent;
    font-family: var(--font-body); font-size: .95rem; color: var(--gray-900);
    padding: .35rem .6rem;
  }
  .search-input::placeholder { color: var(--gray-400); }
  .search-clear {
    background: none; border: none; cursor: pointer;
    color: var(--gray-400); padding: .25rem .5rem;
    display: flex; align-items: center;
    transition: color .15s;
  }
  .search-clear:hover { color: var(--gray-700); }

  /* Category pills */
  .category-pills {
    display: flex; flex-wrap: wrap; justify-content: center; gap: .5rem;
    margin-bottom: 1.5rem;
  }
  .pill {
    background: rgba(255,255,255,.13);
    color: var(--white);
    font-size: .82rem; font-weight: 500;
    padding: .32rem .9rem; border-radius: 99px;
    border: 1px solid rgba(255,255,255,.2);
  }
  .hero-datetime {
    color: rgba(255,255,255,.5);
    font-size: .75rem;
  }

  /* ── Markets section ── */
  .markets-section { padding: 2.5rem 1.25rem 3.5rem; }
  .markets-inner { max-width: 1200px; margin: 0 auto; }

  /* ── State cards ── */
  .state-card {
    background: var(--white); border-radius: var(--radius-lg);
    padding: 3rem; text-align: center;
    display: flex; flex-direction: column; align-items: center; gap: 1rem;
    box-shadow: var(--shadow-sm);
  }
  .state-error { border-left: 4px solid var(--red); }
  .state-empty { border-left: 4px solid var(--amber); }
  .state-icon { width: 56px; height: 56px; color: var(--gray-200); }
  .state-title { font-size: 1.1rem; font-weight: 600; color: var(--gray-700); }
  .state-sub { font-size: .9rem; color: var(--gray-500); }

  /* ── Skeleton ── */
  .skeleton-card {
    background: var(--white); border-radius: var(--radius-lg);
    padding: 1.5rem; margin-bottom: 1rem;
    box-shadow: var(--shadow-sm);
    display: flex; flex-direction: column; gap: .75rem;
  }
  .skeleton-line {
    height: 14px; background: var(--gray-200); border-radius: 6px;
    animation: pulse 1.4s ease-in-out infinite;
  }
  .skeleton-line.wide { width: 55%; }
  .skeleton-line.narrow { width: 30%; }
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: .45; }
  }

  /* ── Market card ── */
  .market-card {
    background: var(--white);
    border-radius: var(--radius-lg);
    box-shadow: var(--shadow-sm);
    margin-bottom: 1.25rem;
    overflow: hidden;
    border: 1px solid var(--gray-200);
    transition: box-shadow .2s;
  }
  .market-card:hover { box-shadow: var(--shadow-md); }

  .market-header {
    width: 100%;
    display: flex; align-items: center; justify-content: space-between;
    padding: 1.1rem 1.4rem;
    background: none; border: none; cursor: pointer;
    text-align: left;
    border-bottom: 1px solid var(--gray-100);
    transition: background .18s;
  }
  .market-header:hover { background: var(--green-pale); }
  .market-header-left { display: flex; align-items: center; gap: 1rem; }
  .market-icon {
    width: 40px; height: 40px;
    background: var(--green-light);
    border-radius: var(--radius-sm);
    display: flex; align-items: center; justify-content: center;
    color: var(--green-main); flex-shrink: 0;
  }
  .market-name {
    font-family: var(--font-display);
    font-size: 1.1rem; font-weight: 700;
    color: var(--gray-900);
  }
  .market-location { font-size: .8rem; color: var(--gray-500); margin-top: .1rem; }
  .market-header-right { display: flex; align-items: center; gap: .75rem; }
  .vendor-count {
    font-size: .78rem; font-weight: 600;
    background: var(--green-light); color: var(--green-dark);
    padding: .28rem .75rem; border-radius: 99px;
  }
  .chevron { color: var(--gray-400); transition: transform .22s ease; }
  .chevron.open { transform: rotate(180deg); }

  /* ── Market body ── */
  .market-body { padding: 1.25rem; background: var(--gray-50); }
  .vendor-list { display: flex; flex-direction: column; gap: 1.25rem; }

  /* ── Vendor card ── */
  .vendor-card {
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-md);
    overflow: hidden;
  }

  .vendor-identity {
    display: flex; align-items: flex-start; gap: .9rem;
    padding: 1rem 1rem .75rem;
    border-bottom: 1px solid var(--gray-100);
  }
  .vendor-avatar {
    width: 44px; height: 44px;
    border-radius: 50%; object-fit: cover; flex-shrink: 0;
    border: 2px solid var(--green-light);
  }
  .vendor-avatar-fallback {
    width: 44px; height: 44px;
    border-radius: 50%; flex-shrink: 0;
    background: linear-gradient(135deg, var(--green-light), #a7f3d0);
    display: flex; align-items: center; justify-content: center;
    font-weight: 700; font-size: 1.1rem; color: var(--green-dark);
    border: 2px solid var(--green-light);
  }
  .vendor-info { flex: 1; min-width: 0; }
  .vendor-name-row { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }
  .vendor-name { font-weight: 700; font-size: .95rem; color: var(--gray-900); }
  .verified-badge {
    font-size: .7rem; font-weight: 600;
    background: var(--green-light); color: var(--green-dark);
    padding: .15rem .55rem; border-radius: 99px;
  }
  .vendor-desc {
    font-size: .8rem; color: var(--gray-500);
    margin-top: .2rem;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  }
  .product-count-badge {
    font-size: .72rem; font-weight: 600;
    background: var(--amber-light); color: var(--amber);
    padding: .25rem .65rem; border-radius: 99px;
    white-space: nowrap; flex-shrink: 0; align-self: flex-start; margin-top: .1rem;
  }

  /* ── Products grid ── */
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: .75rem;
    padding: 1rem;
  }
  .product-card {
    background: var(--white);
    border: 1px solid var(--gray-200);
    border-radius: var(--radius-sm);
    overflow: hidden;
    transition: box-shadow .18s, transform .18s;
  }
  .product-card:hover { box-shadow: var(--shadow-md); transform: translateY(-2px); }
  .product-img-wrap { width: 100%; aspect-ratio: 1; overflow: hidden; background: var(--gray-100); }
  .product-img { width: 100%; height: 100%; object-fit: cover; display: block; }
  .product-img-fallback {
    width: 100%; height: 100%;
    display: flex; align-items: center; justify-content: center;
    font-size: 2rem; font-weight: 700;
    color: var(--green-main); background: var(--green-pale);
  }
  .product-details {
    padding: .55rem .6rem .6rem;
    display: flex; flex-direction: column; gap: .15rem;
  }
  .product-name {
    font-size: .82rem; font-weight: 600;
    color: var(--gray-900);
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .product-unit { font-size: .7rem; color: var(--gray-400); }
  .product-price {
    font-size: .95rem; font-weight: 700;
    color: var(--green-main);
    margin-top: .1rem;
  }

  /* ── Contact footer ── */
  .vendor-footer {
    padding: .65rem 1rem;
    border-top: 1px solid var(--gray-100);
    background: var(--gray-50);
    display: flex; align-items: center;
  }
  .btn-view-contact {
    display: inline-flex; align-items: center; gap: .4rem;
    background: var(--green-main); color: var(--white);
    border: none; border-radius: var(--radius-sm);
    font-family: var(--font-body); font-size: .78rem; font-weight: 600;
    padding: .38rem .85rem; cursor: pointer;
    transition: background .18s;
  }
  .btn-view-contact:hover { background: #15803d; }
  .contact-reveal {
    display: inline-flex; align-items: center; gap: .45rem;
    color: var(--green-dark); font-size: .83rem; font-weight: 600;
    text-decoration: none;
    background: var(--green-light);
    padding: .35rem .85rem; border-radius: var(--radius-sm);
    transition: background .18s;
  }
  .contact-reveal:hover { background: #bbf7d0; }

  /* ── No products / no vendors ── */
  .no-products {
    padding: .75rem 1rem 1rem;
    font-size: .85rem; color: var(--gray-400);
    text-align: center;
  }
  .no-vendors {
    text-align: center; padding: 2.5rem 1rem;
    display: flex; flex-direction: column; align-items: center; gap: .85rem;
    color: var(--gray-500); font-size: .9rem;
  }

  /* ── Slideshow ── */
  .slideshow-wrap { max-width: 1200px; margin: 0 auto; padding: 0 1.25rem 2.5rem; }

  /* ── Footer ── */
  .site-footer {
    background: var(--white);
    border-top: 1px solid var(--gray-200);
    padding: 2rem 1.25rem;
    text-align: center;
  }
  .footer-copy { font-size: .85rem; color: var(--gray-700); font-weight: 500; }
  .footer-dev { font-size: .75rem; color: var(--gray-400); margin: .3rem 0 1.2rem; }
  .footer-links { display: flex; justify-content: center; align-items: center; gap: .85rem; }
  .footer-link {
    display: inline-flex; align-items: center; gap: .4rem;
    font-size: .85rem; font-weight: 500; text-decoration: none;
    transition: opacity .18s;
  }
  .footer-link:hover { opacity: .7; }
  .footer-wa { color: #16a34a; }
  .footer-li { color: #2563eb; }
  .footer-sep { color: var(--gray-200); }

  /* ── Responsive ── */
  @media (max-width: 640px) {
    .hero { padding: 3rem 1rem 2.5rem; }
    .products-grid { grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); }
    .market-name { font-size: 1rem; }
  }
</style>