<!-- src/routes/admin/link-vendors/+page.svelte -->
<script>
    import { enhance } from '$app/forms';
    
    let formData = {
      adminEmail: '',
      adminPassword: ''
    };
    
    export let data;
  </script>
  
  <div class="min-h-screen bg-gray-100 py-8">
    <div class="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
      <h1 class="text-2xl font-bold mb-6">Link Vendors to Users</h1>
      
      <p class="text-gray-600 mb-6">
        This will link existing vendors to users by matching email addresses.
        Run this only once.
      </p>
      
      {#if data?.success}
        <div class="mb-6 p-4 bg-green-50 border border-green-200 rounded">
          <p class="text-green-700 font-medium">{data.message}</p>
          {#if data.results}
            <ul class="mt-3 text-sm text-green-600">
              {#each data.results as result}
                <li>✓ {result.user} → {result.vendor}</li>
              {/each}
            </ul>
          {/if}
        </div>
      {/if}
      
      {#if data?.error}
        <div class="mb-6 p-4 bg-red-50 border border-red-200 rounded">
          <p class="text-red-700 font-medium">Error: {data.error}</p>
        </div>
      {/if}
      
      <form method="POST" action="?/linkAll" use:enhance class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Admin Email
          </label>
          <input
            type="email"
            name="adminEmail"
            bind:value={formData.adminEmail}
            required
            class="w-full px-3 py-2 border rounded"
            placeholder="admin@example.com"
          />
        </div>
        
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-2">
            Admin Password
          </label>
          <input
            type="password"
            name="adminPassword"
            bind:value={formData.adminPassword}
            required
            class="w-full px-3 py-2 border rounded"
          />
        </div>
        
        <button
          type="submit"
          class="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Link Vendors to Users
        </button>
      </form>
      
      <div class="mt-8 text-sm text-gray-500">
        <p class="font-medium">Note:</p>
        <ul class="mt-2 space-y-1">
          <li>• This links vendors to users by matching email addresses</li>
          <li>• Only run this once</li>
          <li>• New registrations will auto-link via the registration page</li>
        </ul>
      </div>
    </div>
  </div>