<script>
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { onMount } from 'svelte';
  
	let email = '';
	let password = '';
	let loading = false;
	let error = '';
	let successMessage = '';
  
	onMount(() => {
	  // Initialize auth store
	  auth.init();
	});
  
	// Check for existing auth on mount
	if (browser) {
	  // Check if user is already logged in on component initialization
	  const checkAuth = () => {
		const jwt = localStorage.getItem('jwt');
		if (jwt) {
		  // User is logged in, check if they have vendor profile
		  const vendor = localStorage.getItem('vendor');
		  if (vendor) {
			// Has vendor profile, go to dashboard
			goto('/vendor-dashboard');
		  } else {
			// No vendor profile, stay on login page
			// Don't auto-redirect - let user decide
			console.log('User logged in but no vendor profile');
		  }
		}
	  };
	  
	  // Run check on mount
	  setTimeout(checkAuth, 100);
	}
  
	async function handleLogin(e) {
	  e.preventDefault();
	  
	  // Validation
	  if (!email || !email.includes('@')) {
		error = 'Please enter a valid email address';
		return;
	  }
	  
	  if (!password || password.length < 6) {
		error = 'Password must be at least 6 characters';
		return;
	  }
  
	  loading = true;
	  error = '';
	  successMessage = '';
  
	  try {
		console.log('Attempting login...');
		
		// Use your auth store's login method
		const result = await auth.login(email, password);
		
		console.log('Login result:', result);
		
		if (result.success) {
		  successMessage = 'Login successful! Redirecting...';
		  
		  // Check if user has a vendor profile
		  if (result.hasVendorProfile) {
			// Has vendor profile, go to dashboard
			setTimeout(() => {
			  goto('/vendor-dashboard');
			}, 1000);
		  } else {
			// No vendor profile, go to registration
			setTimeout(() => {
			  goto('/vendor-registration?completeProfile=true');
			}, 1000);
		  }
		} else {
		  // Show specific error message
		  error = result.error || 'Login failed. Please check your credentials.';
		  console.error('Login failed:', result.error);
		}
	  } catch (err) {
		console.error('Login error:', err);
		error = err.message || 'An error occurred during login. Please try again.';
	  } finally {
		loading = false;
	  }
	}
  
	function navigateToRegistration() {
	  goto('/vendor-registration');
	}
  
	function navigateToLanding() {
	  goto('/');
	}
  </script>
  
  <svelte:head>
	<title>Vendor Login - Market Price Hub</title>
  </svelte:head>
  
  <div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center py-12 px-4">
	<div class="max-w-md w-full">
	  <!-- Back to Home Button -->
	  <button
		on:click={navigateToLanding}
		class="mb-8 text-blue-600 hover:text-blue-800 transition-colors flex items-center"
	  >
		<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
		  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
		</svg>
		Back to Home
	  </button>
  
	  <!-- Login Card -->
	  <div class="bg-white rounded-2xl shadow-xl p-8">
		<div class="text-center mb-8">
		  <div class="w-16 h-16 bg-blue-600 rounded-lg flex items-center justify-center mx-auto mb-4">
			<span class="text-white font-bold text-2xl">MP</span>
		  </div>
		  <h1 class="text-3xl font-bold text-gray-900 mb-2">Vendor Login</h1>
		  <p class="text-gray-600">Access your vendor dashboard</p>
		</div>
  
		<!-- Error Message -->
		{#if error}
		  <div class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
			<div class="flex items-start">
			  <div class="flex-shrink-0 pt-0.5">
				<svg class="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
				  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
				</svg>
			  </div>
			  <div class="ml-3 flex-1">
				<p class="text-sm font-medium">{error}</p>
				<p class="mt-1 text-sm text-red-600">
				  Make sure your email and password are correct.
				</p>
			  </div>
			</div>
		  </div>
		{/if}
  
		<!-- Success Message -->
		{#if successMessage}
		  <div class="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg">
			<div class="flex items-start">
			  <div class="flex-shrink-0 pt-0.5">
				<svg class="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
				  <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />
				</svg>
			  </div>
			  <div class="ml-3 flex-1">
				<p class="text-sm font-medium">{successMessage}</p>
			  </div>
			</div>
		  </div>
		{/if}
  
		<!-- Login Form -->
		<form on:submit|preventDefault={handleLogin}>
		  <div class="space-y-6">
			<!-- Email -->
			<div>
			  <label for="email" class="block text-sm font-medium text-gray-700 mb-2">
				Email Address *
			  </label>
			  <input
				id="email"
				type="email"
				bind:value={email}
				required
				placeholder="vendor@example.com"
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
				autocomplete="email"
				disabled={loading}
			  />
			  <p class="text-xs text-gray-500 mt-1">Use the email you registered with</p>
			</div>
  
			<!-- Password -->
			<div>
			  <label for="password" class="block text-sm font-medium text-gray-700 mb-2">
				Password *
			  </label>
			  <input
				id="password"
				type="password"
				bind:value={password}
				required
				placeholder="••••••••"
				class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors disabled:bg-gray-50 disabled:cursor-not-allowed"
				autocomplete="current-password"
				disabled={loading}
			  />
			  <p class="text-xs text-gray-500 mt-1">Minimum 6 characters</p>
			</div>
  
			<!-- Submit Button -->
			<div class="pt-2">
			  <button
				type="submit"
				disabled={loading}
				class="w-full bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
				  <div class="flex items-center justify-center">
					<svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
					</svg>
					Login
				  </div>
				{/if}
			  </button>
			</div>
		  </div>
		</form>
  
		<!-- Divider -->
		<div class="mt-8 pt-6 border-t border-gray-200">
		  <div class="text-center">
			<p class="text-gray-600 text-sm mb-4">Don't have a vendor account yet?</p>
			<button
			  on:click={navigateToRegistration}
			  disabled={loading}
			  class="inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
			>
			  <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
			  </svg>
			  Register as Vendor
			</button>
		  </div>
		</div>
  
		<!-- Forgot Password Link -->
		<div class="mt-6 text-center">
		  <a 
			href="/" 
			class="text-sm text-blue-600 hover:text-blue-800 hover:underline"
			on:click|preventDefault={() => {
			  error = 'Password reset feature coming soon. Please contact support.';
			}}
		  >
			Forgot your password?
		  </a>
		</div>
	  </div>
  
	  <!-- Support Information -->
	  <div class="mt-8 text-center">
		<p class="text-gray-600 text-sm">
		  Need help? <a href="mailto:support@markethub.com" class="text-blue-600 hover:text-blue-800 hover:underline">Contact support</a>
		</p>
	  </div>
	</div>
  </div>