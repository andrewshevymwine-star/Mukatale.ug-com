<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { browser } from '$app/environment';
  import { onMount } from 'svelte';

  // Form state
  let form = {
    name: '',
    contact: '',
    email: '',
    password: '',
    confirmPassword: '',
    market: '',
    description: '',
    image: null
  };

  // UI state
  let markets = [];
  let loading = false;
  let error = '';
  let success = '';
  let imagePreview = null;
  let showPassword = false;

  // Export server data
  export let data;

  // Fetch available markets on component mount
  onMount(async () => {
    try {
      console.log('Component mounted, checking for server markets...');
      
      // Use markets from server-side data if available
      if (data?.markets && Array.isArray(data.markets)) {
        markets = data.markets;
        console.log(`Using ${markets.length} markets from server`);
      } else {
        console.log('No server markets, fetching client-side...');
        // Fallback to client fetch if server data not available
        const response = await fetch('http://localhost:1337/api/markets?fields=name,location&sort=name:asc');
        if (response.ok) {
          const marketsData = await response.json();
          markets = marketsData.data || [];
          console.log(`Fetched ${markets.length} markets client-side`);
        }
      }
    } catch (err) {
      console.error('Failed to fetch markets:', err);
    }
  });

  // Handle image upload
  function handleImageUpload(event) {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        error = 'Please upload an image file (JPG, PNG, GIF)';
        return;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        error = 'Image size should be less than 5MB';
        return;
      }

      form.image = file;
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview = e.target.result;
      };
      reader.readAsDataURL(file);
    }
  }

  // Remove image
  function removeImage() {
    form.image = null;
    imagePreview = null;
    const fileInput = document.getElementById('imageUpload');
    if (fileInput) fileInput.value = '';
  }

  // Validate form
  function validateForm() {
    // Clear previous errors
    error = '';

    // Required fields
    if (!form.name.trim()) {
      error = 'Vendor name is required';
      return false;
    }

    if (!form.contact.trim()) {
      error = 'Contact information is required';
      return false;
    }

    if (!form.email.trim()) {
      error = 'Email is required';
      return false;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      error = 'Please enter a valid email address';
      return false;
    }

    if (!form.password) {
      error = 'Password is required';
      return false;
    }

    if (form.password.length < 6) {
      error = 'Password must be at least 6 characters long';
      return false;
    }

    if (form.password !== form.confirmPassword) {
      error = 'Passwords do not match';
      return false;
    }

    if (!form.market) {
      error = 'Please select a market';
      return false;
    }

    return true;
  }

  // Handle form submission
  async function handleSubmit(event) {
    event.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    loading = true;
    error = '';
    success = '';

    try {
      console.log('Starting vendor registration...');

      // Step 1: Register user in Strapi
      const { user, jwt } = await auth.register({
        username: form.email, // Using email as username
        email: form.email,
        password: form.password
      });

      console.log('User registered successfully:', user.id);

      // Step 2: Upload image if exists
      let imageId = null;
      if (form.image) {
        try {
          const formData = new FormData();
          formData.append('files', form.image);
          
          const uploadResponse = await fetch('http://localhost:1337/api/upload', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${jwt}`
            },
            body: formData
          });
          
          if (uploadResponse.ok) {
            const uploadedFile = await uploadResponse.json();
            imageId = uploadedFile[0]?.id;
            console.log('Image uploaded successfully:', imageId);
          }
        } catch (uploadError) {
          console.error('Image upload failed:', uploadError);
        }
      }

      // Step 3: Create vendor profile
      const vendorData = {
        data: {
          name: form.name,
          contact: form.contact,
          email: form.email,
          description: form.description || null,
          market: parseInt(form.market),
          users_permissions_user: user.id,
          ...(imageId && { image: imageId })
        }
      };

      console.log('Creating vendor with data:', vendorData.data.name);

      const vendorResponse = await fetch('http://localhost:1337/api/vendors', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(vendorData)
      });
      
      if (!vendorResponse.ok) {
        const errorData = await vendorResponse.json();
        throw new Error(errorData.error?.message || 'Vendor creation failed');
      }

      const vendorResult = await vendorResponse.json();
      console.log('Vendor created successfully:', vendorResult.data?.id);

      // Step 4: Update user with vendor reference
      try {
        await fetch(`http://localhost:1337/api/users/${user.id}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${jwt}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            vendor: vendorResult.data?.id
          })
        });
      } catch (userUpdateError) {
        console.warn('Failed to update user with vendor reference:', userUpdateError);
      }

      // Update auth store with vendor data
      const vendor = vendorResult.data;
      auth.updateVendor(vendor);

      success = 'Registration successful! Redirecting to dashboard...';

      // Set cookies for SSR compatibility
      if (browser) {
        const maxAge = 60 * 60 * 24 * 30; // 30 days
        document.cookie = `jwt=${jwt}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `userId=${user.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `vendorId=${vendor.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        window.location.href = '/vendor-dashboard';
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      error = err.message || 'Registration failed. Please try again.';
      
      // Specific error messages
      if (err.message.includes('already taken') || err.message.includes('Email') && err.message.includes('taken')) {
        error = 'Email is already registered. Please use a different email or login.';
      } else if (err.message.includes('Email')) {
        error = 'Invalid email format. Please check your email address.';
      }
    } finally {
      loading = false;
    }
  }

  // Navigate to login
  function navigateToLogin() {
    goto('/vendor-login');
  }

  // Navigate to home
  function navigateToHome() {
    goto('/');
  }
</script>

<svelte:head>
  <title>Register as Vendor - Market Price Hub</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8">
  <!-- HEADER -->
  <header class="bg-white shadow-sm sticky top-0 z-10 mb-8">
    <div class="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
      <div class="flex items-center space-x-3 cursor-pointer" on:click={navigateToHome}>
        <div class="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
          <span class="text-white font-bold text-lg">MP</span>
        </div>
        <h1 class="text-2xl font-bold text-gray-900">Market Price Hub</h1>
      </div>
      <div class="flex items-center space-x-4">
        <button 
          on:click={navigateToLogin}
          class="text-blue-600 px-4 py-2 rounded text-sm hover:bg-blue-50 transition-colors"
        >
          Already have an account? Login
        </button>
      </div>
    </div>
  </header>

  <!-- REGISTRATION FORM -->
  <div class="max-w-2xl mx-auto px-4">
    <div class="bg-white rounded-2xl shadow-xl overflow-hidden">
      <!-- Form Header -->
      <div class="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
        <div class="text-center">
          <h1 class="text-3xl font-bold mb-2">Join as a Vendor</h1>
          <p class="text-blue-100">Start selling your products across Uganda's markets</p>
        </div>
      </div>

      <!-- Debug Info -->
      <div class="m-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 class="font-bold text-blue-800 mb-2">Debug Info:</h4>
        <p class="text-sm text-blue-700">
          Server markets: {data?.markets?.length || 0} markets
        </p>
        <p class="text-sm text-blue-700">
          Client markets: {markets.length} markets
        </p>
      </div>

      <!-- Success Message -->
      {#if success}
        <div class="m-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
            </svg>
            <p class="text-green-700 font-medium">{success}</p>
          </div>
        </div>
      {/if}

      <!-- Error Message -->
      {#if error}
        <div class="m-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div class="flex items-center">
            <svg class="w-5 h-5 text-red-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
            <p class="text-red-700 font-medium">{error}</p>
          </div>
        </div>
      {/if}

      <!-- Registration Form -->
      <form on:submit={handleSubmit} class="p-8">
        <div class="space-y-6">
          <!-- Basic Information Section -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Basic Information</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Vendor Name -->
              <div class="space-y-2">
                <label for="name" class="block text-sm font-medium text-gray-700">
                  Vendor/Business Name *
                </label>
                <input
                  type="text"
                  id="name"
                  bind:value={form.name}
                  required
                  placeholder="Enter your business name"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <p class="text-xs text-gray-500">This will be displayed to customers</p>
              </div>

              <!-- Contact Number -->
              <div class="space-y-2">
                <label for="contact" class="block text-sm font-medium text-gray-700">
                  Contact Number *
                </label>
                <input
                  type="tel"
                  id="contact"
                  bind:value={form.contact}
                  required
                  placeholder="e.g., +256 700 123456"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <p class="text-xs text-gray-500">Customers will use this to contact you</p>
              </div>
            </div>

            <!-- Description -->
            <div class="mt-6 space-y-2">
              <label for="description" class="block text-sm font-medium text-gray-700">
                Business Description (Optional)
              </label>
              <textarea
                id="description"
                bind:value={form.description}
                rows="3"
                placeholder="Tell customers about your business, products, and services..."
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
              ></textarea>
            </div>
          </div>

          <!-- Account Information Section -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Account Information</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <!-- Email -->
              <div class="space-y-2">
                <label for="email" class="block text-sm font-medium text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  id="email"
                  bind:value={form.email}
                  required
                  placeholder="you@example.com"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
                <p class="text-xs text-gray-500">Used for login and notifications</p>
              </div>

              <!-- Password -->
              <div class="space-y-2">
                <label for="password" class="block text-sm font-medium text-gray-700">
                  Password *
                </label>
                <div class="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    bind:value={form.password}
                    required
                    placeholder="Minimum 6 characters"
                    class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition pr-12"
                  />
                  <button
                    type="button"
                    on:click={() => showPassword = !showPassword}
                    class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  >
                    {#if showPassword}
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    {:else}
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    {/if}
                  </button>
                </div>
              </div>

              <!-- Confirm Password -->
              <div class="space-y-2">
                <label for="confirmPassword" class="block text-sm font-medium text-gray-700">
                  Confirm Password *
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="confirmPassword"
                  bind:value={form.confirmPassword}
                  required
                  placeholder="Re-enter your password"
                  class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                />
              </div>
            </div>
          </div>

          <!-- Business Location Section -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Business Location</h3>
            
            <!-- Market Selection -->
            <div class="space-y-2">
              <label for="market" class="block text-sm font-medium text-gray-700">
                Select Your Market *
              </label>
              <select
                id="market"
                bind:value={form.market}
                required
                class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition appearance-none bg-white"
              >
                <option value="">Choose a market</option>
                {#each markets as market}
                  <option value={market.id}>
                    {market.name} {market.location ? `(${market.location})` : ''}
                  </option>
                {/each}
              </select>
              {#if markets.length === 0}
                <div class="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded">
                  <p class="text-yellow-700 text-sm">
                    No markets available. Please check if markets are published in the system.
                  </p>
                  <p class="text-yellow-600 text-xs mt-1">
                    If you're an admin, make sure markets are published in Strapi.
                  </p>
                </div>
              {/if}
            </div>
          </div>

          <!-- Profile Image Section -->
          <div>
            <h3 class="text-lg font-semibold text-gray-900 mb-4 pb-2 border-b">Profile Image (Optional)</h3>
            
            <div class="space-y-4">
              {#if imagePreview}
                <div class="flex flex-col items-center space-y-4">
                  <div class="relative">
                    <img
                      src={imagePreview}
                      alt="Profile preview"
                      class="w-40 h-40 rounded-full object-cover border-4 border-white shadow-lg"
                    />
                    <button
                      type="button"
                      on:click={removeImage}
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition"
                      title="Remove image"
                    >
                      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                  <p class="text-sm text-gray-600">Image preview</p>
                </div>
              {:else}
                <div class="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors cursor-pointer"
                     on:click={() => document.getElementById('imageUpload').click()}>
                  <input
                    type="file"
                    id="imageUpload"
                    accept="image/*"
                    on:change={handleImageUpload}
                    class="hidden"
                  />
                  <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p class="text-gray-700 font-medium">Upload Profile Photo</p>
                  <p class="text-sm text-gray-500 mt-1">JPG, PNG or GIF • Max 5MB</p>
                  <p class="text-xs text-gray-400 mt-2">Click or drag and drop</p>
                </div>
              {/if}
            </div>
          </div>

          <!-- Terms and Submit -->
          <div class="pt-6 border-t">
            <div class="flex items-start mb-6">
              <input
                type="checkbox"
                id="terms"
                required
                class="mt-1 mr-3 h-5 w-5 text-blue-600 rounded focus:ring-blue-500"
              />
              <label for="terms" class="text-sm text-gray-700">
                I agree to the <a href="/terms" class="text-blue-600 hover:underline">Terms of Service</a> and 
                <a href="/privacy" class="text-blue-600 hover:underline">Privacy Policy</a>. I confirm that all 
                information provided is accurate and I have the right to sell products in the selected market.
              </label>
            </div>

            <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
              <button
                type="button"
                on:click={navigateToHome}
                disabled={loading}
                class="text-gray-700 hover:text-gray-900 font-medium flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Home
              </button>

              <button
                type="submit"
                disabled={loading}
                class="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[180px]"
              >
                {#if loading}
                  <svg class="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating Account...
                {:else}
                  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  Register as Vendor
                {/if}
              </button>
            </div>
          </div>
        </div>
      </form>

      <!-- Login Prompt -->
      <div class="bg-gray-50 p-6 border-t text-center">
        <p class="text-gray-700">
          Already have a vendor account? 
          <button on:click={navigateToLogin} class="text-blue-600 font-medium hover:underline ml-1">
            Login here
          </button>
        </p>
      </div>
    </div>

    <!-- Additional Information -->
    <div class="mt-8 text-center text-gray-600 text-sm">
      <p>Your vendor profile will be reviewed within 24-48 hours.</p>
      <p class="mt-1">For immediate assistance, contact support: <span class="text-blue-600">support@marketpricehub.ug</span></p>
    </div>
  </div>
</div>

<style>
  /* Custom styles for better form UX */
  select {
    background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
    background-position: right 0.5rem center;
    background-repeat: no-repeat;
    background-size: 1.5em 1.5em;
    padding-right: 2.5rem;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .transition {
    transition: all 0.2s ease-in-out;
  }

  .transition-all {
    transition: all 0.2s ease-in-out;
  }

  .transition-colors {
    transition: background-color 0.2s ease, border-color 0.2s ease, color 0.2s ease;
  }

  input:focus, textarea:focus, select:focus {
    outline: none;
    ring-width: 2px;
  }

  .hover\:border-blue-400:hover {
    border-color: #60a5fa;
  }
</style>