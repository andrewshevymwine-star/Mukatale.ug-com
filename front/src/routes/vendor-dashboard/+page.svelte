<!-- src/routes/vendor-dashboard/+page.svelte -->
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
  
  // Initialize profile form when data is available
  $: if (data?.vendor && !showEditProfileModal) {
    editProfile = {
      name: data.vendor.name || '',
      contact: data.vendor.contact || '',
      email: data.vendor.email || '',
      market: data.vendor.market?.id || '',
      image: null
    };
  }
  
  // Handle logout
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
        document.cookie = 'user=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
        document.cookie = 'vendor=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
      }
      
      // Redirect to home page
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

<svelte:head>
  <title>Vendor Dashboard</title>
</svelte:head>

<!-- Loading State -->
{#if !data?.vendor}
  <div class="min-h-screen bg-gray-50 flex items-center justify-center">
    <div class="text-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      <p class="mt-4 text-gray-600">Loading vendor profile...</p>
      <p class="mt-2 text-sm text-gray-500">If this takes too long, try refreshing the page</p>
    </div>
  </div>
{:else}
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="bg-white border-b shadow-sm">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div class="flex items-center space-x-4">
            {#if data.vendor.image}
              <img
                src={getStrapiImageUrl(data.vendor.image)}
                alt={data.vendor.name}
                class="w-10 h-10 rounded-full object-cover border-2 border-white shadow"
              />
            {:else}
              <div class="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow">
                <span class="text-white font-bold text-sm">{data.vendor.name?.[0]?.toUpperCase() || 'V'}</span>
              </div>
            {/if}
            <div>
              <h1 class="font-bold text-gray-900 text-lg">{capitalize(data.vendor.name)}</h1>
              <p class="text-sm text-gray-600 flex items-center">
                <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Vendor Dashboard
              </p>
            </div>
          </div>
          <div class="flex items-center space-x-4">
            <button
              on:click={() => showEditProfileModal = true}
              class="px-4 py-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Edit Profile
            </button>
            <button
              on:click={handleLogout}
              disabled={logoutLoading}
              class="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed shadow"
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
        <div class="bg-red-50 border-l-4 border-red-400 p-4 shadow-lg rounded-lg">
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

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Dashboard Stats -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Total Products</p>
              <p class="text-2xl font-bold text-gray-900">{data.products?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Market</p>
              <p class="text-lg font-bold text-gray-900">
                {data.vendor.market ? capitalize(data.vendor.market.name) : 'Not Assigned'}
              </p>
            </div>
          </div>
        </div>
        
        <div class="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div class="flex items-center">
            <div class="flex-shrink-0">
              <div class="w-12 h-12 bg-purple-50 rounded-lg flex items-center justify-center">
                <svg class="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
            </div>
            <div class="ml-4">
              <p class="text-sm font-medium text-gray-600">Member Since</p>
              <p class="text-lg font-bold text-gray-900">
                {new Date(data.vendor.createdAt).toLocaleDateString('en-US', {
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          </div>
        </div>
      </div>

      <!-- Vendor Profile Section -->
      <div class="mb-8 bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">
        <div class="px-6 py-5 border-b border-gray-100">
          <h2 class="text-xl font-bold text-gray-900">Business Profile</h2>
          <p class="text-gray-600 mt-1">Your vendor information and settings</p>
        </div>
        
        <div class="p-6">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
            <!-- Business Information -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">Business Information</h3>
              
              <div class="space-y-5">
                <div class="flex items-start space-x-4">
                  <div class="flex-shrink-0">
                    {#if data.vendor.image}
                      <img
                        src={getStrapiImageUrl(data.vendor.image)}
                        alt={data.vendor.name}
                        class="w-20 h-20 rounded-full object-cover border-4 border-gray-50 shadow"
                      />
                    {:else}
                      <div class="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full border-4 border-gray-50 shadow flex items-center justify-center">
                        <span class="text-2xl font-bold text-white">{data.vendor.name?.[0]?.toUpperCase() || 'V'}</span>
                      </div>
                    {/if}
                  </div>
                  <div>
                    <h4 class="text-xl font-bold text-gray-900">{capitalize(data.vendor.name)}</h4>
                    <p class="text-sm text-gray-500">Business Name</p>
                    <div class="mt-2">
                      <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                          <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
                        </svg>
                        Active Vendor
                      </span>
                    </div>
                  </div>
                </div>
                
                <div class="space-y-4">
                  <div>
                    <label class="block text-sm font-medium text-gray-500 mb-1">Contact Number</label>
                    <div class="flex items-center">
                      <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <p class="text-gray-900 font-medium">{data.vendor.contact || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-500 mb-1">Email Address</label>
                    <div class="flex items-center">
                      <svg class="w-5 h-5 text-gray-400 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <p class="text-gray-900">{data.vendor.email || 'Not provided'}</p>
                    </div>
                  </div>
                  
                  <div>
                    <label class="block text-sm font-medium text-gray-500 mb-1">Account ID</label>
                    <p class="text-gray-900 font-mono text-sm">{data.vendor.id}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <!-- Market & Account -->
            <div>
              <h3 class="text-lg font-semibold text-gray-800 mb-4 pb-3 border-b border-gray-100">Market & Account</h3>
              
              <div class="space-y-6">
                <!-- Market Relation -->
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-3">Assigned Market</label>
                  {#if data.vendor.market}
                    <div class="flex items-center space-x-4 p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
                      <div class="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center shadow">
                        <svg class="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div class="flex-1">
                        <p class="font-bold text-gray-900 text-lg">{capitalize(data.vendor.market.name)}</p>
                        {#if data.vendor.market.location}
                          <p class="text-sm text-gray-600 flex items-center mt-1">
                            <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            {data.vendor.market.location}
                          </p>
                        {/if}
                      </div>
                    </div>
                  {:else}
                    <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div class="flex items-center">
                        <svg class="w-6 h-6 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                        <div>
                          <p class="text-gray-700">No market assigned</p>
                          <p class="text-sm text-gray-500 mt-1">Edit your profile to select a market</p>
                        </div>
                      </div>
                    </div>
                  {/if}
                </div>
                
                <!-- User Account -->
                <div>
                  <label class="block text-sm font-medium text-gray-500 mb-3">Linked User Account</label>
                  <div class="flex items-center space-x-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div class="w-12 h-12 bg-gradient-to-r from-gray-600 to-gray-800 rounded-full flex items-center justify-center shadow">
                      <span class="text-white font-bold">{data.user?.username?.[0]?.toUpperCase() || data.user?.email?.[0]?.toUpperCase() || 'U'}</span>
                    </div>
                    <div class="flex-1">
                      <p class="font-bold text-gray-900">{data.user?.username || data.user?.email}</p>
                      <p class="text-sm text-gray-600">{data.user?.email}</p>
                      <div class="mt-2">
                        <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          <svg class="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd" />
                          </svg>
                          Verified Account
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Products Section -->
      <div class="mb-8">
        <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
          <div>
            <h2 class="text-2xl font-bold text-gray-900">My Products</h2>
            <p class="text-gray-600 mt-1">Manage your product listings and inventory</p>
          </div>
          <div class="mt-4 sm:mt-0">
            <button
              on:click={() => showAddProductModal = true}
              class="px-5 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 flex items-center shadow hover:shadow-lg"
            >
              <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add New Product
            </button>
          </div>
        </div>

        <!-- Products Grid -->
        {#if data.products && data.products.length > 0}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each data.products as product (product.id)}
              <div class="bg-white border border-gray-100 rounded-xl overflow-hidden hover:shadow-lg transition-shadow duration-300 group">
                <!-- Product Image -->
                <div class="h-48 bg-gray-100 relative overflow-hidden">
                  {#if product.image}
                    <img
                      src={getStrapiImageUrl(product.image)}
                      alt={product.name}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  {:else}
                    <div class="w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center">
                      <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  {/if}
                  
                  <!-- Price Badge -->
                  <div class="absolute top-3 left-3">
                    <span class="px-3 py-1 bg-green-600 text-white text-sm font-bold rounded-full shadow">
                      {formatPrice(product.price)}
                    </span>
                  </div>
                  
                  <!-- Delete Button -->
                  <button
                    on:click={() => deleteProductHandler(product.id)}
                    class="absolute top-3 right-3 bg-white text-red-600 p-2 rounded-full hover:bg-red-50 shadow opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                    title="Delete product"
                  >
                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
                
                <!-- Product Details -->
                <div class="p-5">
                  <div class="flex justify-between items-start mb-3">
                    <h3 class="font-bold text-gray-900 text-lg line-clamp-1">{capitalize(product.name)}</h3>
                  </div>
                  
                  {#if product.description}
                    <p class="text-gray-600 text-sm mb-4 line-clamp-2">{product.description}</p>
                  {:else}
                    <p class="text-gray-400 text-sm mb-4 italic">No description provided</p>
                  {/if}
                  
                  <div class="flex justify-between items-center pt-4 border-t border-gray-100">
                    <div class="flex items-center text-sm text-gray-500">
                      <svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                      <span>Unit: {product.unit}</span>
                    </div>
                    <span class="text-xs text-gray-400">
                      {new Date(product.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <!-- Empty State -->
          <div class="bg-white border border-gray-100 rounded-xl p-12 text-center">
            <div class="max-w-md mx-auto">
              <div class="w-24 h-24 bg-gradient-to-r from-blue-100 to-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg class="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <h3 class="text-2xl font-bold text-gray-900 mb-3">No products yet</h3>
              <p class="text-gray-600 mb-8">Start by adding your first product to showcase to customers</p>
              <button
                on:click={() => showAddProductModal = true}
                class="px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 text-lg font-medium shadow-lg hover:shadow-xl"
              >
                Add Your First Product
              </button>
            </div>
          </div>
        {/if}
      </div>
    </main>
  </div>
{/if}

<!-- Add Product Modal -->
{#if showAddProductModal}
  <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50" 
       on:click|self={() => { showAddProductModal = false; formError = ''; }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto transform transition-all duration-300 scale-100">
      <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-2xl font-bold text-gray-900">Add New Product</h3>
            <p class="text-gray-600 text-sm mt-1">Create a new product listing</p>
          </div>
          <button
            on:click={() => { showAddProductModal = false; formError = ''; }}
            class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="p-6">
        {#if formError}
          <div class="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start">
            <svg class="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            {formError}
          </div>
        {/if}
        
        {#if successMessage}
          <div class="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-start">
            <svg class="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            {successMessage}
          </div>
        {/if}
        
        <form on:submit|preventDefault={addProduct} class="space-y-5">
          <!-- Product Image -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-3">
              Product Image
              <span class="text-gray-500 font-normal"> (Optional)</span>
            </label>
            <div class="flex items-center justify-center w-full">
              <label class="flex flex-col items-center justify-center w-full h-40 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer bg-gray-50 hover:bg-gray-100 transition-colors">
                <div class="flex flex-col items-center justify-center pt-5 pb-6">
                  {#if newProduct.image}
                    <div class="mb-3">
                      <svg class="w-10 h-10 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <p class="text-sm text-gray-700">{newProduct.image.name}</p>
                    <p class="text-xs text-gray-500 mt-1">Click to change</p>
                  {:else}
                    <svg class="w-12 h-12 text-gray-400 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p class="text-sm text-gray-700">Upload product image</p>
                    <p class="text-xs text-gray-500 mt-1">PNG, JPG up to 5MB</p>
                  {/if}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  on:change={handleProductImage}
                  class="hidden"
                />
              </label>
            </div>
          </div>
          
          <!-- Product Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Product Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              bind:value={newProduct.name}
              required
              placeholder="e.g., Fresh Organic Tomatoes"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={loading}
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
              placeholder="Describe your product features, quality, origin, etc..."
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={loading}
            ></textarea>
          </div>
          
          <!-- Price & Unit -->
          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Price (UGX) <span class="text-red-500">*</span>
              </label>
              <div class="relative">
                <span class="absolute left-3 top-3 text-gray-500">UGX</span>
                <input
                  type="number"
                  bind:value={newProduct.price}
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  class="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                  disabled={loading}
                />
              </div>
            </div>
            
            <div>
              <label class="block text-sm font-medium text-gray-700 mb-2">
                Unit <span class="text-red-500">*</span>
              </label>
              <input
                type="text"
                bind:value={newProduct.unit}
                required
                placeholder="per kg, per piece, per bunch"
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                disabled={loading}
              />
            </div>
          </div>
          
          <!-- Actions -->
          <div class="pt-6 flex space-x-3">
            <button
              type="button"
              on:click={() => { showAddProductModal = false; formError = ''; }}
              class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {#if loading}
                <div class="flex items-center justify-center">
                  <svg class="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Adding...
                </div>
              {:else}
                Add Product
              {/if}
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
       on:click|self={() => { showEditProfileModal = false; formError = ''; }}>
    <div class="bg-white rounded-2xl shadow-2xl max-w-md w-full transform transition-all duration-300 scale-100">
      <div class="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-white">
        <div class="flex justify-between items-center">
          <div>
            <h3 class="text-2xl font-bold text-gray-900">Edit Profile</h3>
            <p class="text-gray-600 text-sm mt-1">Update your business information</p>
          </div>
          <button
            on:click={() => { showEditProfileModal = false; formError = ''; }}
            class="text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full p-2 transition-colors"
          >
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
      
      <div class="p-6">
        {#if formError}
          <div class="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl text-sm flex items-start">
            <svg class="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            {formError}
          </div>
        {/if}
        
        {#if successMessage}
          <div class="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-xl text-sm flex items-start">
            <svg class="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            {successMessage}
          </div>
        {/if}
        
        <form on:submit|preventDefault={updateProfileHandler} class="space-y-5">
          <!-- Profile Image -->
          <div class="text-center">
            <div class="relative inline-block">
              {#if data.vendor.image && !editProfile.image}
                <img
                  src={getStrapiImageUrl(data.vendor.image)}
                  alt="Current profile"
                  class="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
                />
              {:else if editProfile.image}
                <!-- Preview new image -->
                <img
                  src={URL.createObjectURL(editProfile.image)}
                  alt="New profile"
                  class="w-32 h-32 rounded-full object-cover border-4 border-white shadow-xl"
                />
              {:else}
                <div class="w-32 h-32 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full border-4 border-white shadow-xl flex items-center justify-center">
                  <span class="text-3xl font-bold text-white">{data.vendor.name?.[0]?.toUpperCase() || 'V'}</span>
                </div>
              {/if}
              
              <label class="absolute bottom-2 right-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-full p-3 cursor-pointer hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-xl">
                <input
                  type="file"
                  accept="image/*"
                  on:change={handleProfileImage}
                  class="hidden"
                />
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </label>
            </div>
            <p class="text-sm text-gray-500 mt-3">Click camera icon to change profile photo</p>
          </div>
          
          <!-- Business Name -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Business Name <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              bind:value={editProfile.name}
              required
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={loading}
            />
          </div>
          
          <!-- Contact -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Contact Number <span class="text-red-500">*</span>
            </label>
            <input
              type="text"
              bind:value={editProfile.contact}
              required
              placeholder="+256 XXX XXX XXX"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={loading}
            />
          </div>
          
          <!-- Email -->
          <div>
            <label class="block text-sm font-medium text-gray-700 mb-2">
              Business Email
            </label>
            <input
              type="email"
              bind:value={editProfile.email}
              placeholder="business@example.com"
              class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={loading}
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
                class="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors bg-white"
                disabled={loading}
              >
                <option value="">Select a market</option>
                {#each data.markets as market}
                  <option value={market.id}>
                    {market.name} {#if market.location}({market.location}){/if}
                  </option>
                {/each}
              </select>
              <p class="text-xs text-gray-500 mt-2">Select the market where you operate</p>
            {:else}
              <div class="p-4 bg-gray-50 rounded-xl border border-gray-200">
                <div class="flex items-center">
                  <svg class="w-5 h-5 text-gray-400 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.998-.833-2.732 0L4.346 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div>
                    <p class="text-gray-700">No markets available</p>
                    <p class="text-sm text-gray-500 mt-1">Contact administrator to add markets</p>
                  </div>
                </div>
              </div>
            {/if}
          </div>
          
          <!-- Actions -->
          <div class="pt-6 flex space-x-3">
            <button
              type="button"
              on:click={() => { showEditProfileModal = false; formError = ''; }}
              class="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              class="flex-1 px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed shadow"
            >
              {#if loading}
                <div class="flex items-center justify-center">
                  <svg class="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
              {:else}
                Save Changes
              {/if}
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
{/if}

<style>
  /* Custom styles for better UI */
  .line-clamp-1 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 1;
  }
  
  .line-clamp-2 {
    overflow: hidden;
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
  }
  
  .transition-colors {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }
  
  .transition-all {
    transition: all 0.2s ease;
  }
  
  .transition-shadow {
    transition: box-shadow 0.2s ease;
  }
  
  .transform {
    transform: translateZ(0);
  }
  
  /* Modal animations */
  @keyframes modalFadeIn {
    from {
      opacity: 0;
      transform: translateY(-20px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }
  
  div[class*="fixed inset-0 bg-black bg-opacity-50"] > div {
    animation: modalFadeIn 0.3s ease-out;
  }
</style>