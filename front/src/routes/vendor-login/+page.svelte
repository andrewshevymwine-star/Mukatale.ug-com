<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';

	export let data: any;
	export let form: any = $page.form;

	let loading = false;
	let email = '';
	let password = '';
	let showPassword = false;

	function handleSubmit() {
		loading = true;
	}
</script>

<div class="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
	<div class="w-full max-w-md">
		<!-- Main Card -->
		<div class="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
			<!-- Header with Exact Logo Font -->
			<div class="bg-[#2ca02c] pt-8 pb-6 px-8 text-center">
				<h1 
					class="text-white text-5xl font-bold tracking-tighter leading-none"
					style="font-family: 'Snell Roundhand Bold', 'Snell Roundhand', cursive;"
				>
					Mukatale.ug
				</h1>
				<div class="h-0.5 w-52 mx-auto bg-white/30 mt-4"></div>
			</div>

			<div class="p-8">
				<h2 class="text-2xl font-semibold text-gray-800 mb-1">Vendor Login</h2>
				<p class="text-gray-600 mb-8">Access your vendor dashboard</p>

				{#if form?.error}
					<div class="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
						{form.error}
					</div>
				{/if}

				{#if form?.success}
					<div class="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
						{form.success}
					</div>
				{/if}

				<!-- ✅ FIX 1: action="?/login" targets the named login action in +page.server.js -->
				<form method="POST" action="?/login" use:enhance={handleSubmit} class="space-y-6">
					<!-- Email Field -->
					<div>
						<label for="identifier" class="block text-sm font-medium text-gray-700 mb-1.5">
							Email Address
						</label>
						<!-- ✅ FIX 2: name="identifier" matches formData.get('identifier') in the server -->
						<input
							type="email"
							id="identifier"
							name="identifier"
							bind:value={email}
							required
							placeholder="enter your email"
							class="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#2ca02c] focus:ring-1 focus:ring-[#2ca02c] text-base"
						/>
					</div>

					<!-- Password Field -->
					<div>
						<label for="password" class="block text-sm font-medium text-gray-700 mb-1.5">
							Password
						</label>
						<div class="relative">
							<input
								type={showPassword ? 'text' : 'password'}
								id="password"
								name="password"
								bind:value={password}
								required
								placeholder="••••••••"
								class="w-full px-4 py-3.5 border border-gray-300 rounded-2xl focus:outline-none focus:border-[#2ca02c] focus:ring-1 focus:ring-[#2ca02c] text-base pr-12"
							/>
							<button
								type="button"
								on:click={() => (showPassword = !showPassword)}
								class="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
							>
								{showPassword ? '🙈' : '👁️'}
							</button>
						</div>
					</div>

					<!-- Login Button -->
					<button
						type="submit"
						disabled={loading}
						class="w-full bg-[#2ca02c] hover:bg-[#248f24] active:bg-[#1f7f1f] transition-colors text-white font-semibold py-4 rounded-2xl text-lg shadow-md disabled:opacity-70 flex items-center justify-center"
					>
						{#if loading}
							Logging in...
						{:else}
							Log in
						{/if}
					</button>
				</form>

				<!-- Register -->
				<div class="mt-8 text-center">
					<p class="text-sm text-gray-600">
						Don't have an account? 
						<a href="/vendor-registration" class="text-green-600 hover:underline font-medium">
							Register Here
						</a>
					</p>
				</div>

				<!-- Footer -->
				<div class="mt-10 pt-6 border-t border-gray-100 text-center space-y-1">
					<p class="text-xs text-gray-500 leading-relaxed">
						If you're having trouble logging in, please contact support or check your email for verification.
					</p>
					<div class="text-[10px] text-gray-400 pt-4">
						All rights reserved Mukatale.ug © 2025.<br />
						Designed and developed by Andrew Mwine
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	@font-face {
		font-family: 'Snell Roundhand Bold';
		src: url('/fonts/SnellRoundhand-Bold.woff2') format('woff2'),
		     url('/fonts/SnellRoundhand-Bold.ttf') format('truetype');
		font-weight: bold;
		font-style: normal;
		font-display: swap;
	}

	@font-face {
		font-family: 'Snell Roundhand';
		src: url('/fonts/SnellRoundhand-Regular.woff2') format('woff2');
		font-weight: normal;
		font-style: normal;
	}
</style>