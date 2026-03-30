<script>
  import { goto } from '$app/navigation';
  import { auth } from '$lib/stores/auth';
  import { browser } from '$app/environment';

  export let data;

  let form = {
    name: '',
    contact: '',
    email: '',
    password: '',
    confirmPassword: ''
  };

  let loading = false;
  let error = '';
  let success = '';
  let showPassword = false;
  let showConfirm = false;
  let step = 1; // 1 = account info, 2 = success

  function validateForm() {
    error = '';

    if (!form.name.trim()) {
      error = 'Please enter your name or business name';
      return false;
    }

    if (!form.contact.trim()) {
      error = 'Please enter your contact / phone number';
      return false;
    }

    // Simple phone validation: allow + and digits
    const phoneRegex = /^[+\d][\d\s\-]{6,}$/;
    if (!phoneRegex.test(form.contact.trim())) {
      error = 'Enter a valid phone number e.g. +256 700 123456';
      return false;
    }

    if (!form.email.trim()) {
      error = 'Please enter your email address';
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(form.email)) {
      error = 'Enter a valid email address';
      return false;
    }

    if (!form.password) {
      error = 'Please create a password';
      return false;
    }

    if (form.password.length < 6) {
      error = 'Password must be at least 6 characters';
      return false;
    }

    if (form.password !== form.confirmPassword) {
      error = 'Passwords do not match';
      return false;
    }

    return true;
  }

  async function handleSubmit() {
    if (!validateForm()) return;

    loading = true;
    error = '';

    try {
      // Step 1: Register user account in Strapi
      const { user, jwt } = await auth.register({
        username: form.email,
        email: form.email,
        password: form.password
      });

      console.log('✅ User registered:', user.id);

      // Step 2: Create vendor profile linked to the new user
      const vendorResponse = await fetch('http://localhost:1337/api/vendors', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${jwt}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: {
            name: form.name.trim(),
            contact: form.contact.trim(),
            email: form.email.trim(),
            users_permissions_user: user.id
          }
        })
      });

      if (!vendorResponse.ok) {
        const errorData = await vendorResponse.json();
        throw new Error(errorData.error?.message || 'Failed to create vendor profile');
      }

      const vendorResult = await vendorResponse.json();
      const vendor = vendorResult.data;

      console.log('✅ Vendor profile created:', vendor.id);

      // Step 3: Set cookies for SSR
      if (browser) {
        const maxAge = 60 * 60 * 24 * 7;
        document.cookie = `jwt=${jwt}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `user=${JSON.stringify(user)}; path=/; max-age=${maxAge}; SameSite=Lax`;
        document.cookie = `vendorId=${vendor.id}; path=/; max-age=${maxAge}; SameSite=Lax`;
      }

      // Update auth store
      auth.updateVendor(vendor);

      step = 2; // Show success state

      setTimeout(() => {
        window.location.href = '/vendor-dashboard';
      }, 2000);

    } catch (err) {
      console.error('Registration error:', err);
      if (err.message?.toLowerCase().includes('already taken') || err.message?.toLowerCase().includes('email')) {
        error = 'This email is already registered. Try logging in instead.';
      } else {
        error = err.message || 'Something went wrong. Please try again.';
      }
    } finally {
      loading = false;
    }
  }
</script>

<svelte:head>
  <title>Vendor Sign Up – Mukatale.ug</title>
  <link href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet" />
</svelte:head>

<div class="page-shell">

  <!-- Left panel: brand -->
  <aside class="brand-panel">
    <a href="/" class="brand-logo">Mukatale.ug</a>

    <div class="brand-body">
      <h2 class="brand-headline">Sell smarter.<br/>Reach more<br/>buyers.</h2>
      <p class="brand-sub">Join hundreds of vendors listing fresh produce, cereals, meat, and more across Uganda's markets.</p>

      <ul class="brand-perks">
        <li>
          <span class="perk-icon">📍</span>
          <span>List products in your local market</span>
        </li>
        <li>
          <span class="perk-icon">📦</span>
          <span>Manage your inventory easily</span>
        </li>
        <li>
          <span class="perk-icon">📈</span>
          <span>Reach buyers across the country</span>
        </li>
      </ul>
    </div>

    <p class="brand-footer">Already a vendor? <a href="/vendor-login">Sign in</a></p>
  </aside>

  <!-- Right panel: form -->
  <main class="form-panel">

    <div class="form-card">

      {#if step === 2}
        <!-- Success state -->
        <div class="success-state">
          <div class="success-icon">✓</div>
          <h2>You're in!</h2>
          <p>Your vendor account has been created. Taking you to your dashboard…</p>
          <div class="progress-bar">
            <div class="progress-fill"></div>
          </div>
        </div>

      {:else}
        <div class="form-header">
          <h1>Create your vendor account</h1>
          <p>Fill in your details below — it takes less than a minute.</p>
        </div>

        {#if error}
          <div class="alert alert-error">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.5"/>
              <path d="M8 5v4M8 11v.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
            {error}
          </div>
        {/if}

        <div class="form-fields">

          <!-- Name -->
          <div class="field">
            <label for="name">Name / Business name</label>
            <input
              id="name"
              type="text"
              bind:value={form.name}
              placeholder="e.g. Nakato Fresh Produce"
              autocomplete="name"
            />
          </div>

          <!-- Contact -->
          <div class="field">
            <label for="contact">Phone number</label>
            <div class="input-with-prefix">
              <span class="prefix">📞</span>
              <input
                id="contact"
                type="tel"
                bind:value={form.contact}
                placeholder="+256 700 123 456"
                autocomplete="tel"
              />
            </div>
            <span class="field-hint">Customers will use this to reach you</span>
          </div>

          <!-- Email -->
          <div class="field">
            <label for="email">Email address</label>
            <input
              id="email"
              type="email"
              bind:value={form.email}
              placeholder="you@example.com"
              autocomplete="email"
            />
            <span class="field-hint">Used for login and account notifications</span>
          </div>

          <!-- Password row -->
          <div class="field-row">
            <div class="field">
              <label for="password">Password</label>
              <div class="input-with-toggle">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  bind:value={form.password}
                  placeholder="Min. 6 characters"
                  autocomplete="new-password"
                />
                <button type="button" class="toggle-btn" on:click={() => showPassword = !showPassword}
                  aria-label="Toggle password visibility">
                  {showPassword ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            <div class="field">
              <label for="confirm">Confirm password</label>
              <div class="input-with-toggle">
                <input
                  id="confirm"
                  type={showConfirm ? 'text' : 'password'}
                  bind:value={form.confirmPassword}
                  placeholder="Re-enter password"
                  autocomplete="new-password"
                />
                <button type="button" class="toggle-btn" on:click={() => showConfirm = !showConfirm}
                  aria-label="Toggle confirm password visibility">
                  {showConfirm ? '🙈' : '👁'}
                </button>
              </div>
            </div>
          </div>

          <!-- Password strength bar -->
          {#if form.password}
            {@const strength = form.password.length >= 10 ? 3 : form.password.length >= 6 ? 2 : 1}
            <div class="strength-row">
              <div class="strength-bars">
                <div class="bar {strength >= 1 ? 'weak' : ''}"></div>
                <div class="bar {strength >= 2 ? 'ok' : ''}"></div>
                <div class="bar {strength >= 3 ? 'strong' : ''}"></div>
              </div>
              <span class="strength-label">
                {strength === 1 ? 'Weak' : strength === 2 ? 'Good' : 'Strong'}
              </span>
            </div>
          {/if}

        </div>

        <!-- What happens next -->
        <div class="next-steps">
          <p class="next-title">After sign up you'll be able to:</p>
          <ul>
            <li>Choose the market where you sell</li>
            <li>Add and manage your products</li>
            <li>Upload photos and set prices</li>
          </ul>
        </div>

        <button
          class="submit-btn"
          on:click={handleSubmit}
          disabled={loading}
        >
          {#if loading}
            <span class="spinner"></span> Creating account…
          {:else}
            Create vendor account →
          {/if}
        </button>

        <p class="login-nudge">
          Already registered? <a href="/vendor-login">Sign in instead</a>
        </p>
      {/if}

    </div>

  </main>
</div>

<style>
  @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500;600&display=swap');

  :global(body) {
    margin: 0;
    padding: 0;
    font-family: 'DM Sans', sans-serif;
    background: #f5f5f0;
  }

  /* ── Layout ────────────────────────────────── */
  .page-shell {
    display: flex;
    min-height: 100vh;
  }

  /* ── Brand panel ───────────────────────────── */
  .brand-panel {
    width: 380px;
    flex-shrink: 0;
    background: #1a5c2e;
    color: #fff;
    display: flex;
    flex-direction: column;
    padding: 40px 44px;
    position: sticky;
    top: 0;
    height: 100vh;
    box-sizing: border-box;
  }

  .brand-logo {
    font-family: 'Snell Roundhand', 'Bradley Hand', cursive;
    font-size: 1.5rem;
    font-weight: 700;
    color: #fff;
    text-decoration: none;
  }

  .brand-body {
    margin-top: auto;
    margin-bottom: auto;
  }

  .brand-headline {
    font-family: 'DM Serif Display', serif;
    font-size: 2.6rem;
    line-height: 1.15;
    margin: 0 0 20px;
    font-weight: 400;
  }

  .brand-sub {
    font-size: 0.95rem;
    line-height: 1.6;
    color: #a8d5b5;
    margin: 0 0 36px;
  }

  .brand-perks {
    list-style: none;
    margin: 0;
    padding: 0;
    display: flex;
    flex-direction: column;
    gap: 14px;
  }

  .brand-perks li {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 0.9rem;
    color: #d4edd9;
  }

  .perk-icon {
    font-size: 1.1rem;
    width: 30px;
    text-align: center;
  }

  .brand-footer {
    font-size: 0.85rem;
    color: #a8d5b5;
    margin: 0;
  }

  .brand-footer a {
    color: #fff;
    font-weight: 600;
    text-decoration: none;
  }

  .brand-footer a:hover { text-decoration: underline; }

  /* ── Form panel ────────────────────────────── */
  .form-panel {
    flex: 1;
    display: flex;
    align-items: flex-start;
    justify-content: center;
    padding: 60px 32px;
    overflow-y: auto;
    background: #f5f5f0;
  }

  .form-card {
    width: 100%;
    max-width: 520px;
  }

  .form-header {
    margin-bottom: 32px;
  }

  .form-header h1 {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    font-weight: 400;
    color: #111;
    margin: 0 0 8px;
    letter-spacing: -0.02em;
  }

  .form-header p {
    color: #666;
    margin: 0;
    font-size: 0.95rem;
  }

  /* ── Alert ─────────────────────────────────── */
  .alert {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    padding: 12px 16px;
    border-radius: 10px;
    font-size: 0.875rem;
    margin-bottom: 24px;
  }

  .alert-error {
    background: #fef2f2;
    color: #b91c1c;
    border: 1px solid #fecaca;
  }

  /* ── Fields ────────────────────────────────── */
  .form-fields {
    display: flex;
    flex-direction: column;
    gap: 20px;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 6px;
    flex: 1;
  }

  .field-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  label {
    font-size: 0.8rem;
    font-weight: 600;
    color: #333;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  input {
    width: 100%;
    padding: 12px 14px;
    border: 1.5px solid #ddd;
    border-radius: 10px;
    font-size: 0.95rem;
    font-family: 'DM Sans', sans-serif;
    background: #fff;
    color: #111;
    box-sizing: border-box;
    transition: border-color 0.15s, box-shadow 0.15s;
    -webkit-appearance: none;
  }

  input:focus {
    outline: none;
    border-color: #1a5c2e;
    box-shadow: 0 0 0 3px rgba(26,92,46,0.1);
  }

  input::placeholder { color: #aaa; }

  .field-hint {
    font-size: 0.78rem;
    color: #999;
  }

  .input-with-prefix {
    display: flex;
    align-items: center;
    border: 1.5px solid #ddd;
    border-radius: 10px;
    background: #fff;
    overflow: hidden;
    transition: border-color 0.15s, box-shadow 0.15s;
  }

  .input-with-prefix:focus-within {
    border-color: #1a5c2e;
    box-shadow: 0 0 0 3px rgba(26,92,46,0.1);
  }

  .prefix {
    padding: 0 12px;
    font-size: 1rem;
    border-right: 1.5px solid #eee;
    line-height: 1;
  }

  .input-with-prefix input {
    border: none;
    border-radius: 0;
    box-shadow: none;
    flex: 1;
  }

  .input-with-prefix input:focus {
    box-shadow: none;
  }

  .input-with-toggle {
    position: relative;
  }

  .input-with-toggle input {
    padding-right: 44px;
  }

  .toggle-btn {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    background: none;
    border: none;
    cursor: pointer;
    font-size: 1rem;
    padding: 0;
    line-height: 1;
    opacity: 0.6;
  }

  .toggle-btn:hover { opacity: 1; }

  /* ── Password strength ─────────────────────── */
  .strength-row {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-top: -8px;
  }

  .strength-bars {
    display: flex;
    gap: 4px;
    flex: 1;
  }

  .bar {
    height: 4px;
    flex: 1;
    border-radius: 4px;
    background: #e5e7eb;
    transition: background 0.3s;
  }

  .bar.weak   { background: #ef4444; }
  .bar.ok     { background: #f59e0b; }
  .bar.strong { background: #22c55e; }

  .strength-label {
    font-size: 0.75rem;
    color: #777;
    min-width: 40px;
  }

  /* ── Next steps hint ───────────────────────── */
  .next-steps {
    margin: 28px 0 24px;
    padding: 16px 20px;
    background: #f0f7f2;
    border-radius: 12px;
    border-left: 3px solid #1a5c2e;
  }

  .next-title {
    font-size: 0.8rem;
    font-weight: 600;
    color: #1a5c2e;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    margin: 0 0 10px;
  }

  .next-steps ul {
    margin: 0;
    padding: 0 0 0 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .next-steps li {
    font-size: 0.88rem;
    color: #444;
  }

  /* ── Submit button ─────────────────────────── */
  .submit-btn {
    width: 100%;
    padding: 15px 24px;
    background: #1a5c2e;
    color: #fff;
    font-family: 'DM Sans', sans-serif;
    font-size: 1rem;
    font-weight: 600;
    border: none;
    border-radius: 12px;
    cursor: pointer;
    transition: background 0.15s, transform 0.1s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
  }

  .submit-btn:hover:not(:disabled) {
    background: #154a25;
    transform: translateY(-1px);
  }

  .submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
    transform: none;
  }

  .spinner {
    width: 16px;
    height: 16px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
  }

  @keyframes spin { to { transform: rotate(360deg); } }

  .login-nudge {
    text-align: center;
    font-size: 0.875rem;
    color: #777;
    margin: 16px 0 0;
  }

  .login-nudge a {
    color: #1a5c2e;
    font-weight: 600;
    text-decoration: none;
  }

  .login-nudge a:hover { text-decoration: underline; }

  /* ── Success state ─────────────────────────── */
  .success-state {
    text-align: center;
    padding: 60px 0;
  }

  .success-icon {
    width: 72px;
    height: 72px;
    background: #dcfce7;
    color: #16a34a;
    border-radius: 50%;
    font-size: 2rem;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0 auto 24px;
  }

  .success-state h2 {
    font-family: 'DM Serif Display', serif;
    font-size: 2rem;
    font-weight: 400;
    margin: 0 0 10px;
    color: #111;
  }

  .success-state p {
    color: #666;
    margin: 0 0 28px;
  }

  .progress-bar {
    height: 4px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
    max-width: 260px;
    margin: 0 auto;
  }

  .progress-fill {
    height: 100%;
    background: #1a5c2e;
    border-radius: 4px;
    animation: fill 2s linear forwards;
  }

  @keyframes fill { from { width: 0 } to { width: 100% } }

  /* ── Responsive ────────────────────────────── */
  @media (max-width: 768px) {
    .page-shell { flex-direction: column; }

    .brand-panel {
      width: 100%;
      height: auto;
      position: static;
      padding: 28px 24px;
    }

    .brand-headline { font-size: 1.8rem; }
    .brand-body { margin: 20px 0; }
    .brand-perks { display: none; }

    .form-panel { padding: 32px 20px; }

    .field-row {
      grid-template-columns: 1fr;
    }
  }
</style>
