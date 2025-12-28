<script>
  import { getStrapiImageUrl, formatPrice, uploadFile, createProduct, deleteProduct, updateVendor, capitalize } from '$lib/strapi';
  import { browser } from '$app/environment';
  
  export let data;
  
  let showAddProductModal = false;
  let showEditProfileModal = false;
  let loading = false;
  let logoutLoading = false;
  let formError = '';
  let successMessage = '';
  let logoutError = '';
  
  // Forms
  let newProduct = {
    name: '',
    description: '',
    price: '',
    unit: '',
    image: null
  };
  
  let editProfile = {
    name: '',
    contact: '',
    email: '',
    market: '',
    image: null
  };
  
  // Initialize profile form
  $: if (data?.vendor && !showEditProfileModal) {
    editProfile = {
      name: data.vendor.name || '',
      contact: data.vendor.contact || '',
      email: data.vendor.email || '',
      market: data.vendor.market?.id || '',
      image: null
    };
  }
  
  // Handle logout - UPDATED TO REDIRECT TO LANDING PAGE
  async function handleLogout() {
    logoutLoading = true;
    logoutError = '';
    
    try {
      // Call the logout API endpoint
      const response = await fetch('/auth/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      if (!response.ok) {
        throw new Error('Logout failed');
      }
      
      // Clear all client-side storage
      if (browser) {
        // Clear localStorage
        localStorage.removeItem('user');
        localStorage.removeItem('vendor');
        localStorage.removeItem('jwt');
        localStorage.removeItem('vendorData');
        
        // Clear sessionStorage
        sessionStorage.clear();
        
        // Clear cookies client-side as fallback
        document.cookie = 'jwt=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'vendorId=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
      
      // Redirect to LANDING PAGE (root '/')
      window.location.href = '/';
      
    } catch (error) {
      console.error('Logout error:', error);
      logoutError = 'Logout failed. Please try again.';
      
      // Fallback: still try to redirect even if API call failed
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    } finally {
      logoutLoading = false;
    }
  }
  
  // Handle product image upload
  function handleProductImage(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      newProduct.image = file;
    }
  }
  
  // Handle profile image upload
  function handleProfileImage(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      editProfile.image = file;
    }
  }
  
  // Add product
  async function addProduct() {
    if (!data?.vendor || !data?.jwt) {
      formError = 'Authentication required';
      return;
    }
    
    // Basic validation
    if (!newProduct.name.trim()) {
      formError = 'Product name is required';
      return;
    }
    
    if (!newProduct.price || isNaN(parseFloat(newProduct.price))) {
      formError = 'Valid price is required';
      return;
    }
    
    if (!newProduct.unit.trim()) {
      formError = 'Unit is required';
      return;
    }
    
    loading = true;
    formError = '';
    successMessage = '';
    
    try {
      let imageId = null;
      
      // Upload image if provided
      if (newProduct.image) {
        try {
          const uploadResult = await uploadFile(newProduct.image, data.jwt);
          if (uploadResult && uploadResult[0]?.id) {
            imageId = uploadResult[0].id;
          }
        } catch (uploadError) {
          formError = 'Failed to upload image: ' + uploadError.message;
          loading = false;
          return;
        }
      }
      
      // Prepare product data for Strapi v5
      const productData = {
        data: {
          name: newProduct.name,
          description: newProduct.description || '',
          price: parseFloat(newProduct.price),
          unit: newProduct.unit,
          vendor: data.vendor.id
        }
      };
      
      // Add image if uploaded
      if (imageId) {
        productData.data.image = imageId;
      }
      
      console.log('Creating product with data:', productData);
      
      // Create product
      await createProduct(productData, data.jwt);
      
      // Show success message
      successMessage = 'Product added successfully!';
      
      // Reset form
      newProduct = {
        name: '',
        description: '',
        price: '',
        unit: '',
        image: null
      };
      
      // Close modal after delay
      setTimeout(() => {
        showAddProductModal = false;
        successMessage = '';
        // Reload page to show new product
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Add product error:', error);
      formError = 'Failed to add product: ' + error.message;
    } finally {
      loading = false;
    }
  }
  
  // Delete product
  async function deleteProductHandler(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) {
      return;
    }
    
    if (!data?.jwt) {
      alert('Authentication required');
      return;
    }
    
    try {
      console.log('Attempting to delete product:', productId);
      await deleteProduct(productId, data.jwt);
      
      // Show success message
      alert('Product deleted successfully!');
      
      // Reload the page to refresh the list
      window.location.reload();
      
    } catch (error) {
      console.error('Delete product error:', error);
      alert('Failed to delete product: ' + error.message);
    }
  }
  
  // Update profile
  async function updateProfileHandler() {
    if (!data?.vendor || !data?.jwt) {
      formError = 'Authentication required';
      return;
    }
    
    // Validation
    if (!editProfile.name.trim()) {
      formError = 'Business name is required';
      return;
    }
    
    if (!editProfile.contact.trim()) {
      formError = 'Contact is required';
      return;
    }
    
    loading = true;
    formError = '';
    successMessage = '';
    
    try {
      let imageId = null;
      
      // Upload new image if provided
      if (editProfile.image) {
        try {
          const uploadResult = await uploadFile(editProfile.image, data.jwt);
          if (uploadResult && uploadResult[0]?.id) {
            imageId = uploadResult[0].id;
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
          // Continue without image
        }
      }
      
      // Prepare vendor data for Strapi v5
      const vendorData = {
        data: {
          name: editProfile.name,
          contact: editProfile.contact,
          email: editProfile.email || ''
        }
      };
      
      // Add market if selected
      if (editProfile.market) {
        vendorData.data.market = editProfile.market;
      }
      
      // Add image if uploaded
      if (imageId) {
        vendorData.data.image = imageId;
      }
      
      console.log('Updating vendor with data:', vendorData);
      
      // Update vendor
      await updateVendor(data.vendor.id, vendorData, data.jwt);
      
      // Show success
      successMessage = 'Profile updated successfully!';
      
      // Close modal after delay and reload
      setTimeout(() => {
        showEditProfileModal = false;
        successMessage = '';
        window.location.reload();
      }, 1500);
      
    } catch (error) {
      console.error('Update profile error:', error);
      formError = 'Failed to update profile: ' + error.message;
    } finally {
      loading = false;
    }
  }
  
  // Close modal with escape key
  function handleKeydown(e) {
    if (e.key === 'Escape') {
      if (showAddProductModal) showAddProductModal = false;
      if (showEditProfileModal) showEditProfileModal = false;
      formError = '';
    }
  }
</script>

<svelte:window on:keydown={handleKeydown} />

{#if !data?.vendor}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Loading vendor profile...</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b">
      <div class="max-w-7xl mx-auto px-4 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-3">
            {#if data.vendor.image}
              <img
                src={getStrapiImageUrl(data.vendor.image)}
                alt={data.vendor.name}
                class="w-10 h-10 rounded-full object-cover"
              />
            {:else}
              <div class="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span class="text-blue-600 font-bold text-sm">{data.vendor.name?.[0] || 'V'}</span>
              </div>
            {/if}
            <div>
              <h1 class="font-bold text-gray-900">{capitalize(data.vendor.name)}</h1>
              <p class="text-sm text-gray-600">Vendor Dashboard</p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <button
              on:click={() => showEditProfileModal = true}
              class="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Edit Profile
            </button>
            <button
              on:click={handleLogout}
              disabled={logoutLoading}
              class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {#if logoutLoading}
                <svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Logging out...</span>
              {:else}
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Logout</span>
              {/if}
            </button>
          </div>
        </div>
      </div>
    </header>

    <!-- Logout Error Alert -->
    {#if logoutError}
      <div class="fixed top-4 right-4 z-50 max-w-sm">
        <div class="bg-red-50 border-l-4 border-red-400 p-4 shadow-lg">
          <div class="flex">
            <div class="flex-shrink-0">
              <svg class="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
              </svg>
            </div>
            <div class="ml-3">
              <p class="text-sm text-red-700">{logoutError}</p>
            </div>
            <div class="ml-auto pl-3">
              <button on:click={() => logoutError = ''} class="text-red-700 hover:text-red-900">
                <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    {/if}

    <main class="max-w-7xl mx-auto p-4">
      <!-- Vendor Profile Section -->
      <div class="mb-8 bg-white border rounded-lg p-6 shadow-sm">
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Vendor Profile</h2>
        
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <!-- Left Column: Basic Info -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Business Information</h3>
            
            <div class="space-y-4">
              <div class="flex items-center space-x-4">
                <div class="flex-shrink-0">
                  {#if data.vendor.image}
                    <img
                      src={getStrapiImageUrl(data.vendor.image)}
                      alt={data.vendor.name}
                      class="w-24 h-24 rounded-full object-cover border-4 border-gray-100"
                    />
                  {:else}
                    <div class="w-24 h-24 bg-blue-100 rounded-full border-4 border-gray-100 flex items-center justify-center">
                      <span class="text-2xl font-bold text-blue-600">{data.vendor.name?.[0] || 'V'}</span>
                    </div>
                  {/if}
                </div>
                <div>
                  <h4 class="text-xl font-bold text-gray-900">{capitalize(data.vendor.name)}</h4>
                  <p class="text-sm text-gray-500">Business Name</p>
                </div>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Contact</label>
                <p class="text-gray-900">{data.vendor.contact || 'Not provided'}</p>
              </div>
              
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Email</label>
                <p class="text-gray-900">{data.vendor.email || 'Not provided'}</p>
              </div>
            </div>
          </div>
          
          <!-- Right Column: Relations -->
          <div>
            <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-2 border-b">Market & Account</h3>
            
            <div class="space-y-6">
              <!-- Market Relation -->
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-2">Market</label>
                {#if data.vendor.market}
                  <div class="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                    <div class="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                      <svg class="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div>
                      <p class="font-medium text-gray-900">{capitalize(data.vendor.market.name)}</p>
                      {#if data.vendor.market.location}
                        <p class="text-sm text-gray-600">{data.vendor.market.location}</p>
                      {/if}
                    </div>
                  </div>
                {:else}
                  <div class="p-3 bg-gray-50 rounded-lg">
                    <p class="text-gray-600">No market assigned</p>
                  </div>
                {/if}
              </div>
              
              <!-- User Account Relation -->
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-2">User Account</label>
                <div class="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                  <div class="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                    <span class="text-gray-700 font-medium">{data.user?.username?.[0] || data.user?.email?.[0] || 'U'}</span>
                  </div>
                  <div>
                    <p class="font-medium text-gray-900">{data.user?.username || data.user?.email || 'User Account'}</p>
                    <p class="text-sm text-gray-600">{data.user?.email}</p>
                  </div>
                </div>
              </div>
              
              <!-- Account Created Date -->
              <div>
                <label class="block text-sm font-medium text-gray-500 mb-1">Account Created</label>
                <p class="text-gray-900">
                  {new Date(data.vendor.createdAt).toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Products Section -->
      <div class="mb-8">
        <div class="flex justify-between items-center">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">My Products</h2>
            <p class="text-gray-600 mt-1">Manage your product listings</p>
          </div>
          <button
            on:click={() => showAddProductModal = true}
            class="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Add Product
          </button>
        </div>
      </div>

      <!-- Products Grid -->
      {#if data.products && data.products.length > 0}
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {#each data.products as product (product.id)}
            <div class="bg-white border rounded-lg overflow-hidden hover:shadow-md transition-shadow">
              <!-- Product Image -->
              <div class="h-48 bg-gray-100 relative">
                {#if product.image}
                  <img
                    src={getStrapiImageUrl(product.image)}
                    alt={product.name}
                    class="w-full h-full object-cover"
                  />
                {:else}
                  <div class="w-full h-full bg-gray-200 flex items-center justify-center">
                    <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                {/if}
                
                <!-- Delete Button -->
                <button
                  on:click={() => deleteProductHandler(product.id)}
                  class="absolute top-2 right-2 bg-white text-red-600 p-2 rounded-full hover:bg-red-50 shadow"
                  title="Delete product"
                >
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
              
              <!-- Product Details -->
              <div class="p-4">
                <div class="flex justify-between items-start mb-2">
                  <h3 class="font-bold text-gray-900">{capitalize(product.name)}</h3>
                  <span class="font-bold text-green-600">{formatPrice(product.price)}</span>
                </div>
                
                {#if product.description}
                  <p class="text-gray-600 text-sm mb-3">{product.description}</p>
                {/if}
                
                <div class="flex justify-between items-center text-sm text-gray-500">
                  <span>Unit: {product.unit}</span>
                  <span class="text-xs">
                    Added {new Date(product.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          {/each}
        </div>
      {:else}
        <!-- Empty State -->
        <div class="bg-white border rounded-lg p-12 text-center">
          <svg class="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <h3 class="text-lg font-medium text-gray-700 mb-2">No products yet</h3>
          <p class="text-gray-600 mb-6">Add your first product to start selling</p>
          <button
            on:click={() => showAddProductModal = true}
            class="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Add Your First Product
          </button>
        </div>
      {/if}
    </main>
  </div>
{/if}

<!-- Add Product Modal -->
{#if showAddProductModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
       on:click|self={() => showAddProductModal = false}>
    <div class="bg-white rounded-xl shadow-lg max-w-md w-full max-h-[90vh] overflow-y-auto">
      <div class="p-6 border-b">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-900">Add New Product</h3>
          <button
            on:click={() => { showAddProductModal = false; formError = ''; }}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="p-6">
        {#if formError}
          <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {formError}
          </div>
        {/if}
        
        {#if successMessage}
          <div class="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            {successMessage}
          </div>
        {/if}
        
        <form on:submit|preventDefault={addProduct} class="space-y-4">
          <!-- Product Image -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Product Image
            </label>
            <input
              type="file"
              accept="image/*"
              on:change={handleProductImage}
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p class="text-xs text-gray-500 mt-1">Optional but recommended</p>
          </div>
          
          <!-- Product Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Product Name *
            </label>
            <input
              type="text"
              bind:value={newProduct.name}
              required
              placeholder="e.g., Fresh Tomatoes"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <!-- Description -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Description
            </label>
            <textarea
              bind:value={newProduct.description}
              rows="3"
              placeholder="Describe your product..."
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            ></textarea>
          </div>
          
          <!-- Price & Unit -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Price (UGX) *
              </label>
              <input
                type="number"
                bind:value={newProduct.price}
                required
                min="0"
                step="0.01"
                placeholder="0.00"
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Unit *
              </label>
              <input
                type="text"
                bind:value={newProduct.unit}
                required
                placeholder="per kg, per piece, etc."
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <!-- Actions -->
          <div class="pt-4 flex space-x-3">
            <button
              type="button"
              on:click={() => { showAddProductModal = false; formError = ''; }}
              class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Adding Product...' : 'Add Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<!-- Edit Profile Modal -->
{#if showEditProfileModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
       on:click|self={() => showEditProfileModal = false}>
    <div class="bg-white rounded-xl shadow-lg max-w-md w-full">
      <div class="p-6 border-b">
        <div class="flex justify-between items-center">
          <h3 class="text-xl font-bold text-gray-900">Edit Profile</h3>
          <button
            on:click={() => { showEditProfileModal = false; formError = ''; }}
            class="text-gray-400 hover:text-gray-600"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="p-6">
        {#if formError}
          <div class="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {formError}
          </div>
        {/if}
        
        {#if successMessage}
          <div class="mb-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm">
            {successMessage}
          </div>
        {/if}
        
        <form on:submit|preventDefault={updateProfileHandler} class="space-y-4">
          <!-- Profile Image -->
          <div class="text-center">
            <div class="relative inline-block">
              {#if data.vendor.image}
                <img
                  src={getStrapiImageUrl(data.vendor.image)}
                  alt="Current"
                  class="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                />
              {:else}
                <div class="w-24 h-24 bg-blue-100 rounded-full border-4 border-white shadow-lg flex items-center justify-center">
                  <span class="text-2xl font-bold text-blue-600">{data.vendor.name?.[0] || 'V'}</span>
                </div>
              {/if}
              
              <label class="absolute bottom-0 right-0 bg-blue-600 text-white rounded-full p-2 cursor-pointer hover:bg-blue-700">
                <input
                  type="file"
                  accept="image/*"
                  on:change={handleProfileImage}
                  class="hidden"
                />
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
            </div>
            <p class="text-sm text-gray-600 mt-2">Click camera icon to change photo</p>
          </div>
          
          <!-- Business Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Business Name *
            </label>
            <input
              type="text"
              bind:value={editProfile.name}
              required
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <!-- Contact -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Contact Number *
            </label>
            <input
              type="text"
              bind:value={editProfile.contact}
              required
              placeholder="+256 XXX XXX XXX"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              bind:value={editProfile.email}
              placeholder="business@example.com"
              class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <!-- Market Relation -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Market
            </label>
            {#if data.markets && data.markets.length > 0}
              <select
                bind:value={editProfile.market}
                class="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select a market</option>
                {#each data.markets as market}
                  <option value={market.id}>
                    {market.name} {#if market.location}({market.location}){/if}
                  </option>
                {/each}
              </select>
            {:else}
              <div class="p-3 bg-gray-50 rounded-lg">
                <p class="text-gray-600 text-sm">No markets available</p>
              </div>
            {/if}
          </div>
          
          <!-- Actions -->
          <div class="pt-4 flex space-x-3">
            <button
              type="button"
              on:click={() => { showEditProfileModal = false; formError = ''; }}
              class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              class="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving Changes...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  .transition-colors {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }
  
  .transition-shadow {
    transition: box-shadow 0.2s ease;
  }
</style>