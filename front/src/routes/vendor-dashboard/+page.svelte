<!-- src/routes/vendor-dashboard/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { getStrapiImageUrl, formatPrice } from '$lib/strapi';
  import { PUBLIC_STRAPI_URL } from '$env/static/public';

  const STRAPI = PUBLIC_STRAPI_URL;

  export let data;

  // ── State ─────────────────────────────────────
  let markets    = data.markets  || [];
  let categories = data.categories || [];
  let products   = data.products || [];

  let editMode    = false;
  let isSaving    = false;
  let saveMessage = '';
  let saveError   = '';

  // Vendor profile form
  let formData = {
    name:         data.vendor?.name    || '',
    contact:      data.vendor?.contact || '',
    email:        data.vendor?.email   || '',
    market:       data.vendor?.market?.id || null,
    imageFile:    null,
    imagePreview: data.vendor?.image ? getStrapiImageUrl(data.vendor.image) : null
  };

  // Product modal
  let showModal       = false;
  let editingProduct  = null;
  let isSavingProduct = false;
  let productMessage  = '';
  let productError    = '';

  let productForm = {
    name:         '',
    description:  '',
    price:        '',
    unit:         '',
    category:     null,
    imageFile:    null,
    imagePreview: null
  };

  // Active tab
  let activeTab = 'products'; // 'products' | 'profile'

  // ── Auth init ──────────────────────────────────
  onMount(() => {
    auth.set({
      user:            data.user,
      vendor:          data.vendor,
      vendorId:        data.vendorId,
      hasVendorProfile: !!data.vendor,
      loading:         false,
      initialized:     true
    });
  });

  // ── Helpers ────────────────────────────────────
  async function fileToBase64(file) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.readAsDataURL(file);
      r.onload  = () => res(r.result);
      r.onerror = (e) => rej(e);
    });
  }

  function getMarketName() {
    if (data.vendor?.market?.name) return data.vendor.market.name;
    if (formData.market) {
      const m = markets.find(m => m.id == formData.market);
      return m?.name || 'Not selected';
    }
    return 'Not selected';
  }

  // ── Profile ────────────────────────────────────
  function handleProfileImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { saveError = 'Image must be under 5MB'; return; }
    formData.imageFile = file;
    const r = new FileReader();
    r.onload = (ev) => formData.imagePreview = ev.target.result;
    r.readAsDataURL(file);
    saveError = '';
  }

  async function handleSaveProfile() {
    isSaving    = true;
    saveMessage = '';
    saveError   = '';

    try {
      if (!formData.name.trim())    throw new Error('Vendor name is required');
      if (!formData.contact.trim()) throw new Error('Contact number is required');
      if (!formData.email.trim())   throw new Error('Email is required');

      const response = await fetch('/api/vendor/update', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: data.vendorId,
          formData: {
            name:      formData.name.trim(),
            contact:   formData.contact.trim(),
            email:     formData.email.trim(),
            market:    formData.market,
            imageFile: formData.imageFile ? await fileToBase64(formData.imageFile) : null
          }
        })
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.error || 'Failed to update profile');
      }

      const result = await response.json();
      if (result.vendor) {
        auth.updateVendorProfile(result.vendor);
        data.vendor = result.vendor;
      }

      saveMessage = 'Profile updated successfully!';
      editMode    = false;
      setTimeout(() => saveMessage = '', 3000);
    } catch (err) {
      saveError = err.message;
    } finally {
      isSaving = false;
    }
  }

  // ── Products ───────────────────────────────────
  function openModal(product = null) {
    editingProduct = product;
    productMessage = '';
    productError   = '';

    if (product) {
      productForm = {
        name:         product.name        || '',
        description:  product.description || '',
        price:        product.price       || '',
        unit:         product.unit        || '',
        category:     product.category?.id || null,
        imageFile:    null,
        imagePreview: product.image ? getStrapiImageUrl(product.image) : null
      };
    } else {
      productForm = { name: '', description: '', price: '', unit: '', category: null, imageFile: null, imagePreview: null };
    }

    showModal = true;
  }

  function closeModal() {
    showModal      = false;
    editingProduct = null;
  }

  function handleProductImage(e) {
    const file = e.target.files[0];
    if (!file) return;
    productForm.imageFile = file;
    const r = new FileReader();
    r.onload = (ev) => productForm.imagePreview = ev.target.result;
    r.readAsDataURL(file);
  }

  async function handleSaveProduct() {
    isSavingProduct = true;
    productMessage  = '';
    productError    = '';

    try {
      if (!productForm.name.trim())                      throw new Error('Product name is required');
      if (!productForm.price || +productForm.price <= 0) throw new Error('A valid price is required');
      if (!productForm.unit.trim())                      throw new Error('Unit is required (e.g. kg, piece)');
      if (!productForm.category)                         throw new Error('Please select a category');

      const response = await fetch('/api/product/save', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editingProduct?.id,
          vendorId:  data.vendorId,
          formData: {
            name:        productForm.name.trim(),
            description: productForm.description.trim(),
            price:       parseFloat(productForm.price),
            unit:        productForm.unit.trim(),
            category:    productForm.category,
            // Link product to vendor's market
            market:      data.vendor?.market?.id || formData.market || null,
            imageFile:   productForm.imageFile ? await fileToBase64(productForm.imageFile) : null
          }
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save product');

      productMessage = editingProduct ? 'Product updated!' : 'Product added!';
      await loadProducts();

      setTimeout(() => {
        if (productMessage) closeModal();
      }, 1200);

    } catch (err) {
      productError = err.message;
    } finally {
      isSavingProduct = false;
    }
  }

  async function loadProducts() {
    try {
      const res = await fetch('/api/vendor/products');
      if (res.ok) {
        const result = await res.json();
        products = result.products || [];
      }
    } catch (e) {
      console.error('Failed to load products:', e);
    }
  }

  async function deleteProduct(id) {
    if (!confirm('Delete this product? This cannot be undone.')) return;

    try {
      const res = await fetch('/api/product/delete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: id, vendorId: data.vendorId })
      });

      const result = await res.json();
      if (result.success) {
        products    = products.filter(p => p.id !== id);
        saveMessage = 'Product deleted.';
        setTimeout(() => saveMessage = '', 3000);
      } else {
        throw new Error(result.error || 'Delete failed');
      }
    } catch (err) {
      saveError = err.message;
      setTimeout(() => saveError = '', 5000);
    }
  }

  async function handleLogout() {
    await auth.logout();
    goto('/vendor-login');
  }
</script>

<svelte:head>
  <title>Dashboard – {data.vendor?.name || 'Mukatale.ug'}</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<div class="shell">

  <!-- ── Sidebar ── -->
  <aside class="sidebar">
    <a href="/" class="sidebar-logo">Mukatale.ug</a>

    <div class="vendor-card">
      <div class="avatar">
        {#if formData.imagePreview}
          <img src={formData.imagePreview} alt="vendor" />
        {:else}
          <span>{(data.vendor?.name || 'V')[0].toUpperCase()}</span>
        {/if}
        <div class="online-dot"></div>
      </div>
      <p class="vendor-name">{data.vendor?.name || 'Vendor'}</p>
      <p class="vendor-market">📍 {getMarketName()}</p>
    </div>

    <nav class="sidebar-nav">
      <button
        class="nav-item {activeTab === 'products' ? 'active' : ''}"
        on:click={() => activeTab = 'products'}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
        </svg>
        Products
        <span class="badge">{products.length}</span>
      </button>

      <button
        class="nav-item {activeTab === 'profile' ? 'active' : ''}"
        on:click={() => activeTab = 'profile'}
      >
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        My Profile
      </button>

      <a href="/" class="nav-item">
        <svg width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
            d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        Home
      </a>
    </nav>

    <button class="logout-btn" on:click={handleLogout}>
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      Logout
    </button>
  </aside>

  <!-- ── Main ── -->
  <main class="main">

    <!-- Toasts -->
    {#if saveMessage}
      <div class="toast toast-success">{saveMessage}</div>
    {/if}
    {#if saveError}
      <div class="toast toast-error">{saveError}</div>
    {/if}

    <!-- ── Products tab ── -->
    {#if activeTab === 'products'}
      <div class="page-header">
        <div>
          <h1 class="page-title">Your Products</h1>
          <p class="page-sub">Manage what you sell and keep prices up to date</p>
        </div>
        <button class="btn-primary" on:click={() => openModal()}>
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          Add Product
        </button>
      </div>

      {#if products.length === 0}
        <div class="empty-state">
          <div class="empty-icon">📦</div>
          <h3>No products yet</h3>
          <p>Add your first product to start appearing on the marketplace</p>
          <button class="btn-primary" on:click={() => openModal()}>Add your first product</button>
        </div>
      {:else}
        <div class="products-grid">
          {#each products as product (product.id)}
            <div class="product-card">
              <div class="product-img">
                {#if product.image}
                  <img src={getStrapiImageUrl(product.image)} alt={product.name} />
                {:else}
                  <span class="img-placeholder">{product.name[0].toUpperCase()}</span>
                {/if}
              </div>

              <div class="product-body">
                <div class="product-top">
                  <h3 class="product-name">{product.name}</h3>
                  <span class="product-price">UGX {formatPrice(product.price)}</span>
                </div>

                {#if product.description}
                  <p class="product-desc">{product.description}</p>
                {/if}

                <div class="product-meta">
                  <span class="tag">{product.unit}</span>
                  {#if product.category}
                    <span class="tag tag-green">
                      {product.category.name || product.category}
                    </span>
                  {/if}
                </div>

                <div class="product-actions">
                  <button class="action-btn edit" on:click={() => openModal(product)}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button class="action-btn delete" on:click={() => deleteProduct(product.id)}>
                    <svg width="15" height="15" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {/if}
    {/if}

    <!-- ── Profile tab ── -->
    {#if activeTab === 'profile'}
      <div class="page-header">
        <div>
          <h1 class="page-title">My Profile</h1>
          <p class="page-sub">Update your vendor information and market location</p>
        </div>
        {#if !editMode}
          <button class="btn-primary" on:click={() => editMode = true}>Edit Profile</button>
        {/if}
      </div>

      {#if editMode}
        <!-- Edit form -->
        <div class="card">
          <div class="card-header">
            <h2>Edit Profile</h2>
            <button class="text-btn" on:click={() => editMode = false}>Cancel</button>
          </div>

          <div class="profile-form">
            <div class="form-row">
              <div class="field">
                <label>Vendor / Business Name *</label>
                <input type="text" bind:value={formData.name} placeholder="Your business name" disabled={isSaving} />
              </div>
              <div class="field">
                <label>Phone Number *</label>
                <input type="tel" bind:value={formData.contact} placeholder="+256 700 123456" disabled={isSaving} />
              </div>
            </div>

            <div class="form-row">
              <div class="field">
                <label>Email Address *</label>
                <input type="email" bind:value={formData.email} placeholder="you@example.com" disabled={isSaving} />
              </div>
              <div class="field">
                <label>Market Location</label>
                <select bind:value={formData.market} disabled={isSaving}>
                  <option value="">Select your market</option>
                  {#each markets as m}
                    <option value={m.id}>{m.name}{m.location ? ` (${m.location})` : ''}</option>
                  {/each}
                </select>
              </div>
            </div>

            <!-- Image -->
            <div class="field">
              <label>Profile Photo</label>
              <div class="img-upload">
                {#if formData.imagePreview}
                  <img src={formData.imagePreview} alt="preview" class="img-preview" />
                {:else}
                  <div class="img-placeholder-lg">{(formData.name || 'V')[0].toUpperCase()}</div>
                {/if}
                <label class="upload-label">
                  {formData.imagePreview ? 'Change photo' : 'Upload photo'}
                  <input type="file" accept="image/*" on:change={handleProfileImage} hidden disabled={isSaving} />
                </label>
              </div>
            </div>

            <div class="form-footer">
              <button class="btn-ghost" on:click={() => editMode = false} disabled={isSaving}>Cancel</button>
              <button class="btn-primary" on:click={handleSaveProfile} disabled={isSaving}>
                {#if isSaving}
                  <span class="spinner"></span> Saving…
                {:else}
                  Save Changes
                {/if}
              </button>
            </div>
          </div>
        </div>

      {:else}
        <!-- Profile view -->
        <div class="card profile-view">
          <div class="profile-avatar-lg">
            {#if formData.imagePreview}
              <img src={formData.imagePreview} alt="vendor" />
            {:else}
              <span>{(data.vendor?.name || 'V')[0].toUpperCase()}</span>
            {/if}
          </div>

          <div class="profile-details">
            <div class="detail-row">
              <div class="detail">
                <span class="detail-label">Business Name</span>
                <span class="detail-value">{data.vendor?.name || '—'}</span>
              </div>
              <div class="detail">
                <span class="detail-label">Phone Number</span>
                <span class="detail-value">{data.vendor?.contact || '—'}</span>
              </div>
              <div class="detail">
                <span class="detail-label">Email</span>
                <span class="detail-value">{data.vendor?.email || '—'}</span>
              </div>
              <div class="detail">
                <span class="detail-label">Market</span>
                <span class="detail-value">{getMarketName()}</span>
              </div>
              <div class="detail">
                <span class="detail-label">Member Since</span>
                <span class="detail-value">
                  {data.vendor?.createdAt ? new Date(data.vendor.createdAt).toLocaleDateString('en-UG', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}
                </span>
              </div>
              <div class="detail">
                <span class="detail-label">Status</span>
                <span class="status-badge">● Active</span>
              </div>
            </div>
          </div>
        </div>
      {/if}
    {/if}

  </main>
</div>

<!-- ── Product Modal ── -->
{#if showModal}
  <div class="overlay" on:click|self={closeModal}>
    <div class="modal">
      <div class="modal-head">
        <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
        <button class="close-btn" on:click={closeModal}>✕</button>
      </div>

      <div class="modal-body">
        {#if productMessage}
          <div class="toast toast-success" style="position:relative;margin-bottom:16px">{productMessage}</div>
        {/if}
        {#if productError}
          <div class="toast toast-error" style="position:relative;margin-bottom:16px">{productError}</div>
        {/if}

        <div class="form-row">
          <div class="field">
            <label>Product Name *</label>
            <input type="text" bind:value={productForm.name} placeholder="e.g. Fresh Tomatoes" disabled={isSavingProduct} />
          </div>
          <div class="field">
            <label>Price (UGX) *</label>
            <input type="number" bind:value={productForm.price} placeholder="0" min="0" disabled={isSavingProduct} />
          </div>
        </div>

        <div class="form-row">
          <div class="field">
            <label>Unit *</label>
            <input type="text" bind:value={productForm.unit} placeholder="kg, piece, litre, bunch…" disabled={isSavingProduct} />
          </div>
          <div class="field">
            <label>Category *</label>
            <select bind:value={productForm.category} disabled={isSavingProduct}>
              <option value="">Select category</option>
              {#each categories as cat}
                <option value={cat.id}>{cat.name || `Category ${cat.id}`}</option>
              {/each}
            </select>
          </div>
        </div>

        <div class="field">
          <label>Description</label>
          <textarea bind:value={productForm.description} rows="3"
            placeholder="Describe the product, quality, origin…" disabled={isSavingProduct}></textarea>
        </div>

        <!-- Product image -->
        <div class="field">
          <label>Product Photo</label>
          <div class="img-upload">
            {#if productForm.imagePreview}
              <img src={productForm.imagePreview} alt="preview" class="img-preview" />
            {:else}
              <div class="img-placeholder-lg">📷</div>
            {/if}
            <label class="upload-label">
              {productForm.imagePreview ? 'Change photo' : 'Upload photo'}
              <input type="file" accept="image/*" on:change={handleProductImage} hidden disabled={isSavingProduct} />
            </label>
          </div>
        </div>

        <!-- Market note -->
        <div class="market-note">
          <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
              d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          This product will be listed under <strong>{getMarketName()}</strong>.
          {#if !data.vendor?.market}
            <a href="#profile" on:click|preventDefault={() => activeTab = 'profile'}>Set your market →</a>
          {/if}
        </div>

        <div class="modal-footer">
          <button class="btn-ghost" on:click={closeModal} disabled={isSavingProduct}>Cancel</button>
          <button
            class="btn-primary"
            on:click={handleSaveProduct}
            disabled={isSavingProduct || !productForm.name || !productForm.price || !productForm.unit || !productForm.category}
          >
            {#if isSavingProduct}
              <span class="spinner"></span> Saving…
            {:else}
              {editingProduct ? 'Update Product' : 'Add Product'}
            {/if}
          </button>
        </div>
      </div>
    </div>
  </div>
{/if}

<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

  :global(body) { margin: 0; padding: 0; font-family: 'DM Sans', sans-serif; background: #f5f5f0; }

  /* ── Shell ────────────────────────────────── */
  .shell { display: flex; min-height: 100vh; }

  /* ── Sidebar ──────────────────────────────── */
  .sidebar {
    width: 260px;
    flex-shrink: 0;
    background: #1a5c2e;
    color: #fff;
    display: flex;
    flex-direction: column;
    padding: 32px 24px;
    box-sizing: border-box;
    position: sticky;
    top: 0;
    height: 100vh;
  }

  .sidebar-logo {
    font-family: 'Snell Roundhand', 'Bradley Hand', cursive;
    font-size: 1.8rem;
    font-weight: 700;
    color: #fff;
    text-decoration: none;
    margin-bottom: 32px;
    display: block;
  }

  .vendor-card {
    background: rgba(255,255,255,0.1);
    border-radius: 14px;
    padding: 16px;
    text-align: center;
    margin-bottom: 32px;
  }

  .avatar {
    position: relative;
    width: 64px;
    height: 64px;
    border-radius: 50%;
    background: rgba(255,255,255,0.2);
    margin: 0 auto 10px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
  }

  .avatar img { width: 100%; height: 100%; object-fit: cover; }

  .online-dot {
    position: absolute;
    bottom: 2px;
    right: 2px;
    width: 12px;
    height: 12px;
    background: #4ade80;
    border-radius: 50%;
    border: 2px solid #1a5c2e;
  }

  .vendor-name { font-weight: 600; font-size: 0.95rem; margin: 0 0 4px; }
  .vendor-market { font-size: 0.78rem; color: #a8d5b5; margin: 0; }

  .sidebar-nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }

  .nav-item {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 11px 14px;
    border-radius: 10px;
    color: #c8e6cf;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    border: none;
    background: none;
    text-align: left;
    text-decoration: none;
    transition: background 0.15s, color 0.15s;
    font-family: 'DM Sans', sans-serif;
  }

  .nav-item:hover { background: rgba(255,255,255,0.1); color: #fff; }
  .nav-item.active { background: rgba(255,255,255,0.18); color: #fff; font-weight: 600; }

  .badge {
    margin-left: auto;
    background: #4ade80;
    color: #14532d;
    border-radius: 20px;
    padding: 1px 8px;
    font-size: 0.72rem;
    font-weight: 700;
  }

  .logout-btn {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    color: #fca5a5;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    border: 1px solid rgba(252,165,165,0.3);
    background: none;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
    margin-top: 8px;
  }

  .logout-btn:hover { background: rgba(252,165,165,0.1); }

  /* ── Main ─────────────────────────────────── */
  .main {
    flex: 1;
    padding: 40px 48px;
    overflow-y: auto;
    background: #f5f5f0;
    min-width: 0;
  }

  /* ── Toast ────────────────────────────────── */
  .toast {
    padding: 12px 18px;
    border-radius: 10px;
    font-size: 0.875rem;
    font-weight: 500;
    margin-bottom: 24px;
  }

  .toast-success { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
  .toast-error   { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }

  /* ── Page header ──────────────────────────── */
  .page-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 32px;
  }

  .page-title {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    font-weight: 400;
    color: #111;
    margin: 0 0 4px;
    letter-spacing: -0.02em;
  }

  .page-sub { color: #777; font-size: 0.9rem; margin: 0; }

  /* ── Buttons ──────────────────────────────── */
  .btn-primary {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 11px 22px;
    background: #1a5c2e;
    color: #fff;
    border: none;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
  }

  .btn-primary:hover:not(:disabled) { background: #154a25; transform: translateY(-1px); }
  .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }

  .btn-ghost {
    padding: 11px 22px;
    background: #fff;
    color: #444;
    border: 1.5px solid #ddd;
    border-radius: 10px;
    font-family: 'DM Sans', sans-serif;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: border-color 0.15s;
  }

  .btn-ghost:hover { border-color: #aaa; }
  .btn-ghost:disabled { opacity: 0.5; cursor: not-allowed; }

  .text-btn {
    background: none;
    border: none;
    color: #666;
    font-size: 0.875rem;
    font-family: 'DM Sans', sans-serif;
    cursor: pointer;
  }

  .text-btn:hover { color: #111; }

  /* ── Empty state ──────────────────────────── */
  .empty-state {
    text-align: center;
    padding: 80px 40px;
    background: #fff;
    border-radius: 16px;
    border: 1.5px dashed #d1d5db;
  }

  .empty-icon { font-size: 3rem; margin-bottom: 16px; }
  .empty-state h3 { font-family: 'DM Serif Display', serif; font-size: 1.5rem; font-weight: 400; margin: 0 0 8px; color: #111; }
  .empty-state p { color: #777; margin: 0 0 24px; }

  /* ── Products grid ────────────────────────── */
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
    gap: 20px;
  }

  .product-card {
    background: #fff;
    border-radius: 14px;
    overflow: hidden;
    border: 1.5px solid #eee;
    transition: box-shadow 0.2s, transform 0.2s;
  }

  .product-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); transform: translateY(-2px); }

  .product-img {
    height: 180px;
    background: #f0f7f2;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .product-img img { width: 100%; height: 100%; object-fit: cover; }

  .img-placeholder {
    font-size: 3rem;
    font-weight: 700;
    color: #1a5c2e;
    opacity: 0.3;
  }

  .product-body { padding: 16px; }

  .product-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    margin-bottom: 8px;
    gap: 8px;
  }

  .product-name { font-weight: 600; font-size: 1rem; color: #111; margin: 0; flex: 1; }
  .product-price { font-weight: 700; font-size: 0.9rem; color: #1a5c2e; white-space: nowrap; }
  .product-desc { font-size: 0.82rem; color: #777; margin: 0 0 10px; line-height: 1.5;
    display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

  .product-meta { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 14px; }

  .tag {
    padding: 2px 10px;
    border-radius: 20px;
    font-size: 0.75rem;
    font-weight: 500;
    background: #f3f4f6;
    color: #555;
  }

  .tag-green { background: #dcfce7; color: #166534; }

  .product-actions { display: flex; gap: 8px; }

  .action-btn {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 6px 12px;
    border-radius: 8px;
    font-size: 0.8rem;
    font-weight: 500;
    cursor: pointer;
    border: 1.5px solid;
    font-family: 'DM Sans', sans-serif;
    transition: background 0.15s;
  }

  .action-btn.edit   { color: #1a5c2e; border-color: #bbf7d0; background: #f0fdf4; }
  .action-btn.edit:hover { background: #dcfce7; }
  .action-btn.delete { color: #991b1b; border-color: #fecaca; background: #fff5f5; }
  .action-btn.delete:hover { background: #fee2e2; }

  /* ── Card ─────────────────────────────────── */
  .card { background: #fff; border-radius: 16px; border: 1.5px solid #eee; overflow: hidden; }

  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #f3f4f6;
  }

  .card-header h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.25rem;
    font-weight: 400;
    margin: 0;
    color: #111;
  }

  /* ── Profile view ─────────────────────────── */
  .profile-view { display: flex; gap: 32px; align-items: flex-start; padding: 32px; }

  .profile-avatar-lg {
    width: 100px;
    height: 100px;
    border-radius: 50%;
    background: #dcfce7;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 2.5rem;
    font-weight: 700;
    color: #1a5c2e;
    flex-shrink: 0;
    overflow: hidden;
    border: 3px solid #bbf7d0;
  }

  .profile-avatar-lg img { width: 100%; height: 100%; object-fit: cover; }

  .profile-details { flex: 1; }

  .detail-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
  }

  .detail { display: flex; flex-direction: column; gap: 4px; }
  .detail-label { font-size: 0.75rem; font-weight: 600; text-transform: uppercase; letter-spacing: 0.06em; color: #999; }
  .detail-value { font-size: 0.95rem; color: #111; font-weight: 500; }

  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    font-size: 0.85rem;
    font-weight: 600;
    color: #16a34a;
  }

  /* ── Forms ────────────────────────────────── */
  .profile-form { padding: 24px; }

  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }

  .field { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; }

  label {
    font-size: 0.78rem;
    font-weight: 600;
    color: #444;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  input, select, textarea {
    padding: 11px 14px;
    border: 1.5px solid #ddd;
    border-radius: 10px;
    font-size: 0.9rem;
    font-family: 'DM Sans', sans-serif;
    background: #fff;
    color: #111;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
    width: 100%;
    -webkit-appearance: none;
  }

  input:focus, select:focus, textarea:focus {
    outline: none;
    border-color: #1a5c2e;
    box-shadow: 0 0 0 3px rgba(26,92,46,0.1);
  }

  input::placeholder, textarea::placeholder { color: #aaa; }
  input:disabled, select:disabled, textarea:disabled { opacity: 0.6; }

  textarea { resize: vertical; min-height: 80px; }

  .form-footer { display: flex; justify-content: flex-end; gap: 12px; padding-top: 16px; border-top: 1px solid #f3f4f6; }

  /* ── Image upload ─────────────────────────── */
  .img-upload { display: flex; align-items: center; gap: 20px; }

  .img-preview {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    object-fit: cover;
    border: 2px solid #ddd;
  }

  .img-placeholder-lg {
    width: 80px;
    height: 80px;
    border-radius: 50%;
    background: #f0f7f2;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 1.5rem;
    color: #1a5c2e;
    border: 2px dashed #c6e8cf;
  }

  .upload-label {
    padding: 8px 18px;
    border: 1.5px solid #1a5c2e;
    color: #1a5c2e;
    border-radius: 8px;
    font-size: 0.85rem;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    font-family: 'DM Sans', sans-serif;
    text-transform: none;
    letter-spacing: 0;
  }

  .upload-label:hover { background: #f0f7f2; }

  /* ── Modal ────────────────────────────────── */
  .overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.45);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 20px;
    backdrop-filter: blur(2px);
  }

  .modal {
    background: #fff;
    border-radius: 16px;
    width: 100%;
    max-width: 560px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 24px 48px rgba(0,0,0,0.15);
  }

  .modal-head {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 20px 24px;
    border-bottom: 1px solid #f3f4f6;
    position: sticky;
    top: 0;
    background: #fff;
    z-index: 1;
  }

  .modal-head h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 1.25rem;
    font-weight: 400;
    margin: 0;
    color: #111;
  }

  .close-btn {
    background: #f3f4f6;
    border: none;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 0.85rem;
    color: #555;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s;
  }

  .close-btn:hover { background: #e5e7eb; }

  .modal-body { padding: 24px; }

  .market-note {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    background: #f0f7f2;
    border-radius: 8px;
    font-size: 0.82rem;
    color: #555;
    margin-bottom: 16px;
    border: 1px solid #c6e8cf;
  }

  .market-note a { color: #1a5c2e; font-weight: 600; text-decoration: none; }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
    padding-top: 16px;
    border-top: 1px solid #f3f4f6;
  }

  /* ── Spinner ──────────────────────────────── */
  .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Responsive ───────────────────────────── */
  @media (max-width: 768px) {
    .shell { flex-direction: column; }

    .sidebar {
      width: 100%;
      height: auto;
      position: static;
      padding: 20px;
      flex-direction: row;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .vendor-card { display: none; }
    .sidebar-nav { flex-direction: row; flex: none; }
    .logout-btn { margin-top: 0; }
    .sidebar-logo { margin-bottom: 0; }

    .main { padding: 20px; }
    .form-row { grid-template-columns: 1fr; }
    .detail-row { grid-template-columns: 1fr; }
    .profile-view { flex-direction: column; }
  }
</style>