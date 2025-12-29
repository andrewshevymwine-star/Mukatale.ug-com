<script>
	import { goto } from '$app/navigation';
	import { enhance } from '$app/forms';
	
	let email = '';
	let password = '';
	let loading = false;
	let error = '';
	let successMessage = '';
	
	// Handle form submission
	function handleFormAction({ form, data, action, cancel }) {
	  loading = true;
	  error = '';
	  successMessage = '';
	  
	  return async ({ result, update }) => {
		if (result.type === 'success') {
		  const resultData = result.data;
		  
		  console.log('📦 Form result:', resultData);
		  
		  if (resultData.success) {
			successMessage = resultData.message || 'Login successful! Redirecting...';
			console.log('✅ Login success, redirecting to:', resultData.redirectTo);
			
			// Use server-provided redirect path
			setTimeout(() => {
			  goto(resultData.redirectTo);
			}, 1500);
		  } else {
			error = resultData.error || 'Login failed';
			console.error('❌ Login error:', error);
		  }
		} else if (result.type === 'error') {
		  error = 'Network error. Please try again.';
		  console.error('❌ Form submission error');
		}
		
		loading = false;
		await update();
	  };
	}
	
	function navigateToRegistration() {
	  goto('/vendor-registration');
	}
	
	function navigateToLanding() {
	  goto('/');
	}
</script>

<svelte:head>
	<title>Vendor Login</title>
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
			<h1 class="text-3xl font-bold text-gray-900 mb-2">Vendor Login</h1>
			<p class="text-gray-600">Access your vendor dashboard</p>
			</div>

			<!-- Error/Success Messages -->
			{#if error}
			<div class="mb-6 p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded-lg">
				{error}
			</div>
			{/if}
			
			{#if successMessage}
			<div class="mb-6 p-4 bg-green-50 border-l-4 border-green-500 text-green-700 rounded-lg">
				{successMessage}
			</div>
			{/if}

			<!-- Login Form -->
			<form method="POST" action="?/login" use:enhance={handleFormAction}>
			<div class="space-y-6">
				<!-- Email -->
				<div>
				<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
					Email Address
				</label>
				<input
					id="email"
					type="email"
					name="identifier"
					bind:value={email}
					required
					placeholder="vendor@example.com"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={loading}
				/>
				</div>

				<!-- Password -->
				<div>
				<label for="password" class="block text-sm font-medium text-gray-700 mb-2">
					Password
				</label>
				<input
					id="password"
					type="password"
					name="password"
					bind:value={password}
					required
					placeholder="••••••••"
					minlength="6"
					class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
					disabled={loading}
				/>
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
						<svg class="animate-spin h-5 w-5 mr-3 text-white"  fill="none" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						Logging in...
					</div>
					{:else}
					Login
					{/if}
				</button>
				</div>
			</div>
			</form>

			<!-- Registration Link -->
			<div class="mt-8 pt-6 border-t border-gray-200 text-center">
			<p class="text-gray-600 text-sm mb-4">Don't have a vendor account?</p>
			<button
				on:click={navigateToRegistration}
				class="inline-flex items-center justify-center px-4 py-2 border border-blue-600 text-blue-600 rounded-lg font-medium hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
			>
				Register as Vendor
			</button>
			</div>
		</div>
	</div>
</div>