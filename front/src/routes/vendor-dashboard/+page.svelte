<!-- src/routes/vendor-dashboard/+page.svelte -->
<script>
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { getStrapiImageUrl, formatPrice } from '$lib/strapi';
  
  export let data;
  
  // Vendor form data
  let formData = {
    name: '',
    contact: '',
    email: '',
    market: null,
    image: null,
    imageFile: null,
    imagePreview: null
  };
  
  // UI State
  let editMode = false;
  let markets = data.markets || [];
  let categories = data.categories || [];
  let products = data.products || [];
  let isSaving = false;
  let isLoadingProducts = false;
  let saveMessage = '';
  let saveError = '';
  
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
  
  // Initialize on mount
  onMount(() => {
    // Initialize form data with server data
    if (data.vendor) {
      formData = {
        name: data.vendor?.name || '',
        contact: data.vendor?.contact || '',
        email: data.vendor?.email || '',
        market: data.vendor?.market?.id || null,
        image: data.vendor?.image || null,
        imageFile: null,
        imagePreview: null
      };
      
      // Initialize image preview
      if (formData.image) {
        formData.imagePreview = getStrapiImageUrl(formData.image);
      }
    }
    
    // Initialize auth store
    auth.set({
      user: data.user,
      vendor: data.vendor,
      vendorId: data.vendorId,
      hasVendorProfile: !!data.vendor,
      loading: false
    });
  });
  
  // Toggle edit mode
  function toggleEditMode() {
    editMode = !editMode;
    if (!editMode) {
      // Reset form when exiting edit mode
      if (data.vendor) {
        formData = {
          name: data.vendor?.name || '',
          contact: data.vendor?.contact || '',
          email: data.vendor?.email || '',
          market: data.vendor?.market?.id || null,
          image: data.vendor?.image || null,
          imageFile: null,
          imagePreview: formData.imagePreview
        };
      }
    }
  }
  
  // Image upload handler
  function handleImageUpload(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
      saveError = 'Please select an image file (JPG, PNG, GIF)';
      return;
    }
    
    if (file.size > 5 * 1024 * 1024) {
      saveError = 'Image size should be less than 5MB';
      return;
    }
    
    formData.imageFile = file;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      formData.imagePreview = e.target.result;
    };
    reader.readAsDataURL(file);
    saveError = '';
  }
  
  // Save vendor profile
  async function handleSaveProfile() {
    isSaving = true;
    saveMessage = '';
    saveError = '';
    
    try {
      // Validate
      if (!formData.name.trim()) throw new Error('Vendor name is required');
      if (!formData.contact.trim()) throw new Error('Contact information is required');
      if (!formData.email.trim()) throw new Error('Email is required');
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
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
            contact: formData.contact.trim(),
            email: formData.email.trim(),
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
      saveMessage = 'Profile updated successfully!';
      
      // Update auth store
      if (result.vendor) {
        auth.updateVendorProfile(result.vendor);
        data.vendor = result.vendor; // Update the data prop
      }
      
      editMode = false;
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
        category: product.category?.id || null,
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
      if (!productForm.category) throw new Error('Category is required');
      
      // Send to API
      const response = await fetch('/api/product/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: editingProduct?.id,
          vendorId: data.vendorId,
          formData: {
            name: productForm.name.trim(),
            description: productForm.description.trim(),
            price: parseFloat(productForm.price),
            unit: productForm.unit.trim(),
            category: productForm.category,
            imageFile: productForm.imageFile ? await fileToBase64(productForm.imageFile) : null
          }
        })
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save product');
      }
      
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
  
  async function handleDeleteProduct(productId) {
    if (!confirm('Are you sure you want to delete this product? This action cannot be undone.')) return;
    
    try {
      const response = await fetch('/api/product/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          productId: productId,
          vendorId: data.vendorId
        })
      });
      
      const result = await response.json();
      
      if (result.success) {
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
  
  // Navigation functions
  function goToHome() {
    goto('/');
  }
  
  async function handleLogout() {
    await auth.logout();
    goto('/vendor-login');
  }
  
  function handleCreateProfile() {
    goto('/vendor-registration');
  }
  
  // Get market name
  function getMarketName() {
    if (data.vendor?.market?.name) return data.vendor.market.name;
    if (formData.market) {
      const market = markets.find(m => m.id == formData.market);
      return market?.name || 'Not selected';
    }
    return 'Not selected';
  }
</script>

<svelte:head>
  <title>Vendor Dashboard - {data.vendor?.name || 'Market Price Hub'}</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
  <!-- Colorful Header -->
  <header class="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-lg">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between items-center py-4">
        <!-- Left: Back to Home and Logo -->
        <div class="flex items-center space-x-4">
          <button 
            on:click={goToHome}
            class="flex items-center space-x-2 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white px-4 py-2 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95"
            aria-label="Back to home"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span class="font-semibold">Back to Home</span>
          </button>
          
          <div class="hidden md:flex items-center space-x-2">
            <div class="w-8 h-8 bg-white rounded-lg flex items-center justify-center shadow-lg">
              <span class="text-blue-600 font-bold">MP</span>
            </div>
            <span class="text-white/80 font-medium">Market Price Hub</span>
          </div>
        </div>
        
        <!-- Right: Welcome and Actions -->
        <div class="flex items-center space-x-6">
          <!-- Vendor Info with Badge -->
          <div class="hidden md:flex items-center space-x-4 bg-white/15 backdrop-blur-sm px-4 py-2 rounded-xl">
            <div class="relative">
              {#if formData.imagePreview}
                <img 
                  src={formData.imagePreview} 
                  alt="Vendor" 
                  class="w-10 h-10 rounded-full border-2 border-white shadow-md"
                />
              {:else}
                <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center border-2 border-white shadow-md">
                  <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              {/if}
              <div class="absolute -bottom-1 -right-1 w-4 h-4 bg-green-400 rounded-full border-2 border-white"></div>
            </div>
            
            <div>
              <p class="text-xs text-white/80">Welcome back</p>
              <p class="font-bold text-white text-sm">{data.vendor?.name || 'Vendor'}</p>
            </div>
          </div>
          
          <!-- Mobile Vendor Info -->
          <div class="md:hidden">
            {#if formData.imagePreview}
              <img 
                src={formData.imagePreview} 
                alt="Vendor" 
                class="w-10 h-10 rounded-full border-2 border-white shadow-md"
              />
            {:else}
              <div class="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center border-2 border-white shadow-md">
                <svg class="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            {/if}
          </div>
          
          <!-- Logout Button -->
          <button 
            on:click={handleLogout}
            class="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-4 py-2 rounded-xl font-medium shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 active:scale-95 flex items-center space-x-2"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            <span class="hidden md:inline">Logout</span>
          </button>
        </div>
      </div>
      
      <!-- Dashboard Title Section -->
      <div class="pb-6 pt-4">
        <div class="flex flex-col md:flex-row md:items-center justify-between">
          <div>
            <h1 class="text-3xl md:text-4xl font-bold text-white mb-2">
              Vendor Dashboard
            </h1>
            <p class="text-blue-100 text-lg">
              Manage your products and profile in one place
            </p>
          </div>
          
          <!-- Stats Overview -->
          <div class="mt-4 md:mt-0 flex space-x-4">
            <div class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-center">
              <p class="text-white text-sm opacity-90">Products</p>
              <p class="text-white text-2xl font-bold">{products.length}</p>
            </div>
            <div class="bg-white/20 backdrop-blur-sm px-4 py-2 rounded-xl text-center">
              <p class="text-white text-sm opacity-90">Status</p>
              <p class="text-green-300 text-lg font-bold">Active</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <!-- Decorative Wave -->
    <div class="h-4 bg-gradient-to-b from-transparent to-blue-50"></div>
  </header>

  <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 -mt-4">
    {#if !data.vendor}
      <!-- No vendor profile -->
      <div class="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div class="w-24 h-24 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <h2 class="text-2xl font-bold text-gray-900 mb-3">No Vendor Profile Found</h2>
        <p class="text-gray-600 mb-6 max-w-md mx-auto">You need to create a vendor profile to access the dashboard and manage your products.</p>
        <button 
          on:click={handleCreateProfile}
          class="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
        >
          Create Vendor Profile
        </button>
      </div>
    {:else}
      <!-- Success/Error Messages -->
      {#if saveMessage}
        <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <p class="text-green-700 font-medium">{saveMessage}</p>
          </div>
        </div>
      {/if}
      
      {#if saveError}
        <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <p class="text-red-700 font-medium">{saveError}</p>
          </div>
        </div>
      {/if}
      
      <!-- Vendor Profile Section -->
      <div class="mb-8">
        <div class="flex justify-between items-center mb-6">
          <h1 class="text-3xl font-bold text-gray-900">Vendor Profile</h1>
          {#if !editMode}
            <button 
              on:click={toggleEditMode}
              class="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              <span class="font-medium">Edit Profile</span>
            </button>
          {/if}
        </div>
        
        {#if editMode}
          <!-- Edit Profile Form -->
          <div class="bg-white rounded-2xl shadow-xl p-8 mb-8">
            <div class="flex justify-between items-center mb-6">
              <h2 class="text-xl font-bold text-gray-900">Edit Your Profile</h2>
              <button 
                on:click={toggleEditMode}
                class="text-gray-600 hover:text-gray-900 font-medium"
              >
                Cancel Edit
              </button>
            </div>
            
            <form on:submit|preventDefault={handleSaveProfile} class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Vendor Name *
                  </label>
                  <input
                    type="text"
                    bind:value={formData.name}
                    required
                    placeholder="Your business name"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={isSaving}
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Contact Number *
                  </label>
                  <input
                    type="text"
                    bind:value={formData.contact}
                    required
                    placeholder="Phone number"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={isSaving}
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    bind:value={formData.email}
                    required
                    placeholder="you@example.com"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                    disabled={isSaving}
                  />
                </div>
                
                <div>
                  <label class="block text-sm font-medium text-gray-700 mb-2">
                    Market
                  </label>
                  <select
                    bind:value={formData.market}
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none bg-white"
                    disabled={isSaving}
                  >
                    <option value="">Select a market</option>
                    {#each markets as market}
                      <option value={market.id}>
                        {market.name} {market.location ? `(${market.location})` : ''}
                      </option>
                    {/each}
                  </select>
                </div>
              </div>
              
              <!-- Image Upload -->
              <div>
                <label class="block text-sm font-medium text-gray-700 mb-2">
                  Profile Image
                </label>
                <div class="flex flex-col items-center space-y-4">
                  {#if formData.imagePreview}
                    <div class="relative">
                      <img 
                        src={formData.imagePreview} 
                        alt="Profile preview" 
                        class="w-32 h-32 rounded-full object-cover border-4 border-white shadow-lg"
                      />
                      <button
                        type="button"
                        on:click={() => {
                          formData.imagePreview = null;
                          formData.imageFile = null;
                        }}
                        class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                      >
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  {:else}
                    <div class="w-32 h-32 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center">
                      <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  {/if}
                  
                  <label class="cursor-pointer">
                    <span class="px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl inline-block font-medium">
                      {formData.imagePreview ? 'Change Image' : 'Upload Image'}
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      on:change={handleImageUpload}
                      class="hidden"
                      disabled={isSaving}
                    />
                  </label>
                  <p class="text-xs text-gray-500">JPG, PNG or GIF • Max 5MB</p>
                </div>
              </div>
              
              <div class="flex justify-end space-x-4 pt-6 border-t">
                <button
                  type="button"
                  on:click={toggleEditMode}
                  class="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  class="px-8 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl flex items-center font-medium"
                  disabled={isSaving || !formData.name || !formData.contact || !formData.email}
                >
                  {#if isSaving}
                    <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  {:else}
                    Save Changes
                  {/if}
                </button>
              </div>
            </form>
          </div>
        {:else}
          <!-- Profile Display View -->
          <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div class="p-8">
              <div class="flex flex-col md:flex-row items-center md:items-start space-y-6 md:space-y-0 md:space-x-8">
                <!-- Profile Image -->
                <div class="flex-shrink-0">
                  {#if formData.imagePreview}
                    <img 
                      src={formData.imagePreview} 
                      alt="Vendor profile" 
                      class="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                  {:else}
                    <div class="w-40 h-40 rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center border-4 border-white shadow-lg">
                      <svg class="w-20 h-20 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                  {/if}
                </div>
                
                <!-- Profile Details -->
                <div class="flex-grow">
                  <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <p class="text-sm text-gray-500 mb-1">Business Name</p>
                      <p class="text-lg font-semibold text-gray-900">{data.vendor?.name}</p>
                    </div>
                    
                    <div>
                      <p class="text-sm text-gray-500 mb-1">Contact Number</p>
                      <p class="text-lg font-semibold text-gray-900">{data.vendor?.contact}</p>
                    </div>
                    
                    <div>
                      <p class="text-sm text-gray-500 mb-1">Email Address</p>
                      <p class="text-lg font-semibold text-gray-900">{data.vendor?.email}</p>
                    </div>
                    
                    <div>
                      <p class="text-sm text-gray-500 mb-1">Market Location</p>
                      <p class="text-lg font-semibold text-gray-900">{getMarketName()}</p>
                    </div>
                    
                    <div class="md:col-span-2">
                      <p class="text-sm text-gray-500 mb-1">Account Information</p>
                      <div class="flex items-center space-x-4">
                        <span class="px-4 py-1 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-medium rounded-full shadow">
                          Active Vendor
                        </span>
                        <span class="text-gray-600 text-sm">
                          Member since {data.vendor?.createdAt ? new Date(data.vendor.createdAt).toLocaleDateString() : 'Recently'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        {/if}
      </div>
      
      <!-- Products Section -->
      <div>
        <div class="flex justify-between items-center mb-6">
          <h2 class="text-3xl font-bold text-gray-900">Your Products</h2>
          <button 
            on:click={() => openProductModal()}
            class="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl font-medium"
          >
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add New Product</span>
          </button>
        </div>
        
        {#if isLoadingProducts}
          <div class="text-center py-12">
            <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <p class="mt-4 text-gray-600">Loading products...</p>
          </div>
        {:else if products.length === 0}
          <div class="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div class="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <svg class="w-12 h-12 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 class="text-xl font-bold text-gray-900 mb-3">No Products Yet</h3>
            <p class="text-gray-600 mb-6 max-w-md mx-auto">Start by adding your first product to showcase to customers</p>
            <button 
              on:click={() => openProductModal()}
              class="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-3 rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl"
            >
              Add Your First Product
            </button>
          </div>
        {:else}
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each products as product (product.id)}
              <div class="bg-white rounded-xl shadow-lg hover:shadow-xl transition-shadow overflow-hidden group border border-gray-100">
                <div class="h-48 overflow-hidden bg-gradient-to-br from-gray-50 to-gray-100">
                  {#if product.image}
                    <img 
                      src={getStrapiImageUrl(product.image)} 
                      alt={product.name}
                      class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  {:else}
                    <div class="w-full h-full flex items-center justify-center">
                      <svg class="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  {/if}
                </div>
                
                <div class="p-6">
                  <div class="flex justify-between items-start mb-4">
                    <h3 class="text-lg font-bold text-gray-900 truncate">{product.name}</h3>
                    <span class="px-3 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-emerald-800 text-sm font-medium rounded-full shadow-sm">
                      UGX {formatPrice(product.price)}
                    </span>
                  </div>
                  
                  <p class="text-gray-600 text-sm mb-4 line-clamp-2">{product.description || 'No description available'}</p>
                  
                  <div class="flex items-center justify-between">
                    <div class="flex items-center space-x-2">
                      <span class="text-gray-500 text-sm">{product.unit || 'unit'}</span>
                      {#if product.category}
                        <span class="px-2 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 text-xs font-medium rounded">
                          {product.category.name || product.category}
                        </span>
                      {/if}
                    </div>
                    
                    <div class="flex space-x-2">
                      <button 
                        on:click={() => openProductModal(product)}
                        class="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit product"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button 
                        on:click={() => handleDeleteProduct(product.id)}
                        class="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete product"
                      >
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            {/each}
          </div>
          
          <div class="mt-8 text-center">
            <p class="text-gray-600">
              Showing {products.length} product{products.length !== 1 ? 's' : ''}
            </p>
          </div>
        {/if}
      </div>
    {/if}
  </main>
  
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
                <label for="productCategory">Category *</label>
                <select
                  id="productCategory"
                  bind:value={productForm.category}
                  required
                  disabled={isSavingProduct}
                >
                  <option value="">Select a category</option>
                  {#each categories as cat}
                    <option value={cat.id}>{cat.name || cat.attributes?.name || `Category ${cat.id}`}</option>
                  {/each}
                </select>
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
                disabled={isSavingProduct || !productForm.name || !productForm.price || !productForm.unit || !productForm.category}
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
</div>

<style>
  /* Custom styles */
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
  
  .form-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
    margin-bottom: 1rem;
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
  
  .alert.error {
    background: #fee2e2;
    color: #991b1b;
    border: 1px solid #fecaca;
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
  
  /* Line clamp utility */
  .line-clamp-2 {
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }
  
  /* Header glass effect */
  .backdrop-blur-sm {
    backdrop-filter: blur(8px);
  }
  
  /* Smooth transitions */
  .transition-transform {
    transition: transform 0.2s ease-in-out;
  }
  
  .transition-all {
    transition: all 0.2s ease-in-out;
  }
</style>