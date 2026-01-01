<!-- src/routes/vendor-dashboard/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { getStrapiImageUrl, formatPrice } from '$lib/strapi';
  
  export let data;
  
  // Vendor form data
  let formData = {
    name: data.vendor?.name || '',
    Contact: data.vendor?.Contact || '',
    Email: data.vendor?.Email || '',
    market: data.vendor?.market?.id || null,
    image: data.vendor?.Image || data.vendor?.image || null,
    imageFile: null,
    imagePreview: null
  };
  
  // Initialize image preview
  onMount(() => {
    if (formData.image) {
      formData.imagePreview = getStrapiImageUrl(formData.image);
    }
    
    // Initialize auth store
    auth.set({
      user: data.user,
      vendor: data.vendor,
      vendorId: data.vendorId,
      hasVendorProfile: !!data.vendor,
      loading: false
    });
    
    console.log('📊 Dashboard data loaded:', {
      vendorName: data.vendor?.name,
      productCount: data.products?.length,
      vendorId: data.vendorId // Make sure this is available
    });
  });
  
  let markets = data.markets || [];
  let products = data.products || [];
  let isSaving = false;
  let isLoadingProducts = false;
  let saveMessage = '';
  let saveError = '';
  let vendorDetails = data.vendor;
  
  // Product modal variables
  let showProductModal = false;
  let editingProduct = null;
  let productForm = {
    name: '',
    description: '',
    price: '',
    unit: '',
    category: null,
    image: null,
    imageFile: null,
    imagePreview: null
  };
  let isSavingProduct = false;
  let productMessage = '';
  let productError = '';
  
  // Image upload handler
  function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      saveError = 'Please select an image file (JPG, PNG, GIF)';
      return;
    }
    
    formData.imageFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      formData.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  // Save vendor profile
  async function handleSave() {
    isSaving = true;
    saveMessage = '';
    saveError = '';
    
    try {
      // Validate
      if (!formData.name.trim()) throw new Error('Vendor name is required');
      if (!formData.Contact.trim()) throw new Error('Contact information is required');
      if (!formData.Email.trim()) throw new Error('Email is required');
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.Email.trim())) {
        throw new Error('Please enter a valid email address');
      }
      
      // Send update
      const response = await fetch('/api/vendor/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vendorId: data.vendorId,
          formData: {
            name: formData.name.trim(),
            Contact: formData.Contact.trim(),
            Email: formData.Email.trim(),
            market: formData.market,
            imageFile: formData.imageFile ? await fileToBase64(formData.imageFile) : null
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update profile');
      }
      
      const result = await response.json();
      saveMessage = 'Vendor profile updated successfully!';
      
      // Update local data
      if (result.vendor) {
        vendorDetails = result.vendor;
        formData.name = result.vendor.name || '';
        formData.Contact = result.vendor.Contact || '';
        formData.Email = result.vendor.Email || '';
        formData.market = result.vendor.market?.id || null;
        
        if (result.vendor.Image || result.vendor.image) {
          const image = result.vendor.Image || result.vendor.image;
          formData.imagePreview = getStrapiImageUrl(image);
          formData.image = image;
        }
        
        formData.imageFile = null;
      }
      
      setTimeout(() => saveMessage = '', 3000);
      
    } catch (error) {
      console.error('Update error:', error);
      saveError = error.message || 'Failed to update profile. Please try again.';
    } finally {
      isSaving = false;
    }
  }
  
  // Product modal functions
  function openProductModal(product = null) {
    editingProduct = product;
    
    if (product) {
      productForm = {
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        unit: product.unit || '',
        category: product.category || null,
        image: product.image || null,
        imageFile: null,
        imagePreview: product.image ? getStrapiImageUrl(product.image) : null
      };
    } else {
      productForm = {
        name: '',
        description: '',
        price: '',
        unit: '',
        category: null,
        image: null,
        imageFile: null,
        imagePreview: null
      };
    }
    
    showProductModal = true;
  }
  
  function closeProductModal() {
    showProductModal = false;
    editingProduct = null;
  }
  
  async function handleSaveProduct() {
    isSavingProduct = true;
    productMessage = '';
    productError = '';
    
    try {
      // Validate
      if (!productForm.name.trim()) throw new Error('Product name is required');
      if (!productForm.price || parseFloat(productForm.price) <= 0) {
        throw new Error('Valid price is required');
      }
      if (!productForm.unit.trim()) throw new Error('Unit is required (e.g., kg, piece, liter)');
      
      // Send to API
      const response = await fetch('/api/product/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editingProduct?.id,
          vendorId: data.vendorId,
          productData: {
            name: productForm.name.trim(),
            description: productForm.description.trim(),
            price: parseFloat(productForm.price),
            unit: productForm.unit.trim(),
            category: productForm.category,
            imageFile: productForm.imageFile ? await fileToBase64(productForm.imageFile) : null
          }
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save product');
      }
      
      const result = await response.json();
      productMessage = editingProduct ? 'Product updated!' : 'Product added!';
      
      // Refresh products
      await loadProducts();
      
      setTimeout(() => {
        if (productMessage) closeProductModal();
      }, 1500);
      
    } catch (error) {
      console.error('Product save error:', error);
      productError = error.message;
    } finally {
      isSavingProduct = false;
    }
  }
  
  async function loadProducts() {
    isLoadingProducts = true;
    
    try {
      const response = await fetch('/api/vendor/products');
      if (response.ok) {
        const result = await response.json();
        products = result.products || [];
      }
    } catch (error) {
      console.error('Failed to load products:', error);
    } finally {
      isLoadingProducts = false;
    }
  }
  
  // UPDATED DELETE FUNCTION
  async function handleDeleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    
    console.log('🗑️ Attempting to delete product:', {
      productId,
      vendorId: data.vendorId,
      currentProductCount: products.length
    });
    
    try {
      const response = await fetch('/api/product/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId: productId,
          vendorId: data.vendorId  // Make sure to send vendorId
        })
      });
      
      const result = await response.json();
      console.log('Delete response:', result);
      
      if (result.success) {
        // Filter out the deleted product from local state
        products = products.filter(p => p.id !== productId);
        saveMessage = result.message || 'Product deleted successfully!';
        setTimeout(() => { saveMessage = ''; }, 3000);
      } else {
        throw new Error(result.error || 'Failed to delete product');
      }
    } catch (error) {
      console.error('Delete error:', error);
      saveError = error.message || 'Failed to delete product. Please try again.';
      setTimeout(() => { saveError = ''; }, 5000);
    }
  }
  
  // Helper functions
  async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result);
      reader.onerror = error => reject(error);
    });
  }
  
  function handleProductImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      productError = 'Please select an image file';
      return;
    }
    
    productForm.imageFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      productForm.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
  }
  
  async function handleLogout() {
    await auth.logout();
    goto('/vendor-login');
  }
  
  function handleCreateProfile() {
    goto('/vendor-registration');
  }
</script>

<main class="vendor-dashboard">
  <!-- Header -->
  <div class="dashboard-header">
    <h1>Vendor Dashboard</h1>
    <div class="user-info">
      {#if data.user}
        <span class="welcome-text">
          Welcome, {data.user.username || data.user.email}!
        </span>
        <button on:click={handleLogout} class="logout-btn">Logout</button>
      {/if}
    </div>
  </div>
  
  {#if !data.vendor}
    <!-- No vendor profile -->
    <div class="no-profile">
      <h2>No Vendor Profile Found</h2>
      <p>You need to create a vendor profile to manage your products.</p>
      <button on:click={handleCreateProfile} class="create-profile-btn">
        Create Vendor Profile
      </button>
    </div>
  {:else}
    <!-- Main Dashboard Content -->
    <div class="dashboard-content">
      <!-- Left Column: Vendor Profile -->
      <div class="left-column">
        <div class="profile-section">
          <h2>Vendor Profile</h2>
          
          {#if saveMessage}
            <div class="alert success">{saveMessage}</div>
          {/if}
          
          {#if saveError}
            <div class="alert error">{saveError}</div>
          {/if}
          
          <form on:submit|preventDefault={handleSave} class="profile-form">
            <div class="form-row">
              <div class="form-group">
                <label for="name">Vendor Name *</label>
                <input
                  id="name"
                  type="text"
                  bind:value={formData.name}
                  placeholder="Your vendor/business name"
                  required
                  disabled={isSaving}
                />
              </div>
              
              <div class="form-group">
                <label for="Contact">Contact Information *</label>
                <input
                  id="Contact"
                  type="text"
                  bind:value={formData.Contact}
                  placeholder="Phone number or contact details"
                  required
                  disabled={isSaving}
                />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="Email">Email *</label>
                <input
                  id="Email"
                  type="email"
                  bind:value={formData.Email}
                  placeholder="vendor@example.com"
                  required
                  disabled={isSaving}
                />
              </div>
              
              <div class="form-group">
                <label for="market">Market</label>
                <select 
                  id="market" 
                  bind:value={formData.market}
                  disabled={isSaving}
                >
                  <option value="">Select a market</option>
                  {#each markets as market}
                    <option value={market.id}>
                      {market.name || `Market ${market.id}`}
                    </option>
                  {/each}
                </select>
              </div>
            </div>
            
            <div class="form-group">
              <label for="image">Vendor Image</label>
              <div class="image-upload-area">
                <div class="image-preview">
                  {#if formData.imagePreview}
                    <img src={formData.imagePreview} alt="Vendor image" />
                  {:else}
                    <div class="no-image">No image uploaded</div>
                  {/if}
                </div>
                <div class="upload-controls">
                  <label for="imageUpload" class="upload-btn">
                    {formData.imagePreview ? 'Change Image' : 'Upload Image'}
                  </label>
                  <input
                    id="imageUpload"
                    type="file"
                    accept="image/*"
                    on:change={handleImageUpload}
                    disabled={isSaving}
                    hidden
                  />
                </div>
                <p class="upload-hint">Max file size: 5MB. Supported formats: JPG, PNG, GIF</p>
              </div>
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                class="save-btn" 
                disabled={isSaving || !formData.name || !formData.Contact || !formData.Email}
              >
                {#if isSaving}
                  <span class="spinner-small"></span>
                  Saving...
                {:else}
                  Save Changes
                {/if}
              </button>
            </div>
          </form>
        </div>
      </div>
      
      <!-- Right Column: Products -->
      <div class="right-column">
        <div class="products-section">
          <div class="section-header">
            <h2>Products ({products.length})</h2>
            <button on:click={() => openProductModal()} class="add-product-btn">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
              </svg>
              Add Product
            </button>
          </div>
          
          {#if isLoadingProducts}
            <div class="loading-products">
              <div class="spinner-small"></div>
              Loading products...
            </div>
          {:else if products.length === 0}
            <div class="no-products">
              <p>No products yet. Add your first product!</p>
              <button on:click={() => openProductModal()} class="add-first-product-btn">
                Add First Product
              </button>
            </div>
          {:else}
            <div class="products-grid">
              {#each products as product (product.id)}
                <div class="product-card">
                  <div class="product-image">
                    {#if product.image}
                      <img src={getStrapiImageUrl(product.image)} alt={product.name} />
                    {:else}
                      <div class="no-product-image">No Image</div>
                    {/if}
                  </div>
                  <div class="product-info">
                    <h3>{product.name}</h3>
                    <p class="product-description">{product.description || 'No description'}</p>
                    <div class="product-details">
                      <span class="product-price">{formatPrice(product.price)}</span>
                      <span class="product-unit">per {product.unit || 'unit'}</span>
                    </div>
                    {#if product.category}
                      <span class="product-category">{product.category.name || product.category}</span>
                    {/if}
                  </div>
                  <div class="product-actions">
                    <button on:click={() => openProductModal(product)} class="edit-btn">
                      Edit
                    </button>
                    <button on:click={() => handleDeleteProduct(product.id)} class="delete-btn">
                      Delete
                    </button>
                  </div>
                </div>
              {/each}
            </div>
          {/if}
        </div>
      </div>
    </div>
  {/if}
  
  <!-- Product Modal -->
  {#if showProductModal}
    <div class="modal-overlay" on:click|self={closeProductModal}>
      <div class="modal-content">
        <div class="modal-header">
          <h2>{editingProduct ? 'Edit Product' : 'Add New Product'}</h2>
          <button on:click={closeProductModal} class="close-btn">&times;</button>
        </div>
        
        <div class="modal-body">
          {#if productMessage}
            <div class="alert success">{productMessage}</div>
          {/if}
          
          {#if productError}
            <div class="alert error">{productError}</div>
          {/if}
          
          <form on:submit|preventDefault={handleSaveProduct} class="product-form">
            <div class="form-row">
              <div class="form-group">
                <label for="productName">Product Name *</label>
                <input
                  id="productName"
                  type="text"
                  bind:value={productForm.name}
                  placeholder="Product name"
                  required
                  disabled={isSavingProduct}
                />
              </div>
              
              <div class="form-group">
                <label for="productPrice">Price (UGX) *</label>
                <input
                  id="productPrice"
                  type="number"
                  bind:value={productForm.price}
                  placeholder="0.00"
                  step="0.01"
                  min="0"
                  required
                  disabled={isSavingProduct}
                />
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label for="productUnit">Unit *</label>
                <input
                  id="productUnit"
                  type="text"
                  bind:value={productForm.unit}
                  placeholder="kg, piece, liter, etc."
                  required
                  disabled={isSavingProduct}
                />
              </div>
              
              <div class="form-group">
                <label for="productCategory">Category</label>
                <input
                  id="productCategory"
                  type="text"
                  bind:value={productForm.category}
                  placeholder="Category"
                  disabled={isSavingProduct}
                />
              </div>
            </div>
            
            <div class="form-group">
              <label for="productDescription">Description</label>
              <textarea
                id="productDescription"
                bind:value={productForm.description}
                placeholder="Product description..."
                rows="3"
                disabled={isSavingProduct}
              />
            </div>
            
            <div class="form-group">
              <label for="productImage">Product Image</label>
              <div class="image-upload-area">
                <div class="image-preview">
                  {#if productForm.imagePreview}
                    <img src={productForm.imagePreview} alt="Product preview" />
                  {:else}
                    <div class="no-image">No image</div>
                  {/if}
                </div>
                <div class="upload-controls">
                  <label for="productImageUpload" class="upload-btn">
                    {productForm.imagePreview ? 'Change Image' : 'Upload Image'}
                  </label>
                  <input
                    id="productImageUpload"
                    type="file"
                    accept="image/*"
                    on:change={handleProductImageUpload}
                    disabled={isSavingProduct}
                    hidden
                  />
                </div>
              </div>
            </div>
            
            <div class="form-actions">
              <button 
                type="submit" 
                class="save-btn" 
                disabled={isSavingProduct || !productForm.name || !productForm.price || !productForm.unit}
              >
                {#if isSavingProduct}
                  <span class="spinner-small"></span>
                  Saving...
                {:else}
                  {editingProduct ? 'Update Product' : 'Add Product'}
                {/if}
              </button>
              <button 
                type="button" 
                class="cancel-btn"
                on:click={closeProductModal}
                disabled={isSavingProduct}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  {/if}
</main>

<style>
  /* Main Layout */
  .vendor-dashboard {
    min-height: 100vh;
    background: #f8fafc;
  }
  
  .dashboard-header {
    background: white;
    padding: 1rem 2rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 2rem;
  }
  
  .dashboard-header h1 {
    margin: 0;
    color: #1e293b;
    font-size: 1.5rem;
    font-weight: 700;
  }
  
  .user-info {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
  
  .welcome-text {
    color: #64748b;
    font-weight: 500;
  }
  
  .logout-btn {
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
    transition: background 0.2s;
  }
  
  .logout-btn:hover {
    background: #dc2626;
  }
  
  /* Dashboard Content Layout */
  .dashboard-content {
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 1rem 2rem;
    display: grid;
    grid-template-columns: 1fr 2fr;
    gap: 2rem;
  }
  
  @media (max-width: 1024px) {
    .dashboard-content {
      grid-template-columns: 1fr;
    }
  }
  
  /* Profile Section */
  .profile-section {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    margin-bottom: 1.5rem;
  }
  
  .profile-section h2 {
    margin: 0 0 1.5rem 0;
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  /* Products Section */
  .products-section {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    height: fit-content;
  }
  
  .section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
  }
  
  .section-header h2 {
    margin: 0;
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .add-product-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 0.875rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    transition: background 0.2s;
  }
  
  .add-product-btn:hover {
    background: #2563eb;
  }
  
  /* Products Grid */
  .products-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1.5rem;
  }
  
  .product-card {
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    transition: transform 0.2s, box-shadow 0.2s;
  }
  
  .product-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }
  
  .product-image {
    height: 180px;
    background: #f3f4f6;
    overflow: hidden;
  }
  
  .product-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .no-product-image {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #9ca3af;
    font-size: 0.875rem;
  }
  
  .product-info {
    padding: 1rem;
  }
  
  .product-info h3 {
    margin: 0 0 0.5rem 0;
    color: #1e293b;
    font-size: 1rem;
    font-weight: 600;
  }
  
  .product-description {
    color: #6b7280;
    font-size: 0.875rem;
    margin: 0 0 1rem 0;
    line-height: 1.4;
  }
  
  .product-details {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }
  
  .product-price {
    font-weight: 700;
    color: #059669;
    font-size: 1rem;
  }
  
  .product-unit {
    color: #6b7280;
    font-size: 0.875rem;
  }
  
  .product-category {
    display: inline-block;
    background: #e0e7ff;
    color: #3730a3;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
  }
  
  .product-actions {
    padding: 1rem;
    border-top: 1px solid #e5e7eb;
    display: flex;
    gap: 0.5rem;
  }
  
  .edit-btn {
    flex: 1;
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }
  
  .edit-btn:hover {
    background: #2563eb;
  }
  
  .delete-btn {
    flex: 1;
    background: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.875rem;
    transition: background 0.2s;
  }
  
  .delete-btn:hover {
    background: #dc2626;
  }
  
  /* No Products State */
  .no-products {
    text-align: center;
    padding: 3rem 1rem;
    color: #6b7280;
  }
  
  .add-first-product-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    margin-top: 1rem;
    transition: background 0.2s;
  }
  
  .add-first-product-btn:hover {
    background: #2563eb;
  }
  
  /* Loading States */
  .loading-products {
    text-align: center;
    padding: 2rem;
    color: #6b7280;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
  }
  
  /* No Profile State */
  .no-profile {
    background: white;
    padding: 4rem 2rem;
    text-align: center;
    max-width: 500px;
    margin: 2rem auto;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  }
  
  .no-profile h2 {
    color: #1e293b;
    margin-bottom: 1rem;
  }
  
  .no-profile p {
    color: #64748b;
    margin-bottom: 2rem;
  }
  
  .create-profile-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.75rem 1.5rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: 500;
    font-size: 1rem;
    transition: background 0.2s;
  }
  
  .create-profile-btn:hover {
    background: #2563eb;
  }
  
  /* Form Styles */
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
  }
  
  @media (max-width: 640px) {
    .form-row {
      grid-template-columns: 1fr;
    }
  }
  
  .form-group {
    margin-bottom: 1.5rem;
  }
  
  .form-group label {
    display: block;
    margin-bottom: 0.5rem;
    font-weight: 500;
    color: #334155;
    font-size: 0.875rem;
  }
  
  .required {
    color: #ef4444;
  }
  
  .form-group input,
  .form-group select,
  .form-group textarea {
    width: 100%;
    padding: 0.625rem 0.75rem;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    font-size: 0.875rem;
    transition: all 0.2s;
    background: white;
  }
  
  .form-group input:focus,
  .form-group select:focus,
  .form-group textarea:focus {
    outline: none;
    border-color: #3b82f6;
    box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
  }
  
  .form-group input:disabled,
  .form-group select:disabled,
  .form-group textarea:disabled {
    background: #f3f4f6;
    cursor: not-allowed;
    opacity: 0.7;
  }
  
  .image-upload-area {
    border: 2px dashed #d1d5db;
    border-radius: 8px;
    padding: 1.5rem;
    background: #f9fafb;
  }
  
  .image-preview {
    width: 150px;
    height: 150px;
    margin: 0 auto 1rem;
    border-radius: 8px;
    overflow: hidden;
    background: #e5e7eb;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .image-preview img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .no-image {
    color: #9ca3af;
    font-size: 0.875rem;
  }
  
  .upload-controls {
    display: flex;
    gap: 0.75rem;
    justify-content: center;
    margin-bottom: 0.5rem;
  }
  
  .upload-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.625rem 1.25rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    text-align: center;
  }
  
  .upload-btn:hover {
    background: #2563eb;
  }
  
  .upload-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
  
  .upload-hint {
    text-align: center;
    color: #6b7280;
    font-size: 0.75rem;
    margin: 0;
  }
  
  .form-actions {
    display: flex;
    gap: 0.75rem;
    justify-content: flex-end;
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid #e5e7eb;
  }
  
  .save-btn {
    background: #3b82f6;
    color: white;
    border: none;
    padding: 0.625rem 1.5rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: background 0.2s;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  .save-btn:hover:not(:disabled) {
    background: #2563eb;
  }
  
  .save-btn:disabled {
    background: #9ca3af;
    cursor: not-allowed;
  }
  
  .cancel-btn {
    background: white;
    color: #4b5563;
    border: 1px solid #d1d5db;
    padding: 0.625rem 1.5rem;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
  }
  
  .cancel-btn:hover:not(:disabled) {
    background: #f9fafb;
    border-color: #9ca3af;
  }
  
  .cancel-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
  
  .alert {
    padding: 0.75rem 1rem;
    border-radius: 6px;
    margin-bottom: 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
  }
  
  .alert.success {
    background: #dcfce7;
    color: #166534;
    border: 1px solid #bbf7d0;
  }
  
  .alert.success svg {
    color: #16a34a;
  }
  
  .alert.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
  }
  
  .alert.error svg {
    color: #ef4444;
  }
  
  .spinner-small {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: spin 1s linear infinite;
  }
  
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }
  
  /* Modal Styles */
  .modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 1rem;
  }
  
  .modal-content {
    background: white;
    border-radius: 8px;
    width: 100%;
    max-width: 600px;
    max-height: 90vh;
    overflow-y: auto;
    box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  }
  
  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem 1.5rem 1rem;
    border-bottom: 1px solid #e5e7eb;
  }
  
  .modal-header h2 {
    margin: 0;
    color: #1e293b;
    font-size: 1.25rem;
    font-weight: 600;
  }
  
  .close-btn {
    background: none;
    border: none;
    font-size: 1.5rem;
    color: #6b7280;
    cursor: pointer;
    padding: 0.25rem;
    line-height: 1;
  }
  
  .close-btn:hover {
    color: #374151;
  }
  
  .modal-body {
    padding: 1.5rem;
  }
  
  .product-form {
    margin-top: 1rem;
  }
</style>