<script>
	import { loginWithEmail, loginWithGoogle } from '../../stores/auth.js';
	
	let email = '';
	let password = '';
	let loading = false;
	let error = '';
	let showPassword = false;

	async function handleEmailLogin() {
		if (!email || !password) {
			error = 'Please fill in all fields';
			return;
		}

		loading = true;
		error = '';
		
		const result = await loginWithEmail(email, password);
		
		if (!result.success) {
			error = result.error;
		}
		
		loading = false;
	}

	async function handleGoogleLogin() {
		loading = true;
		error = '';

		console.log('🔧 LoginForm: Starting Google login...');
		const result = await loginWithGoogle();

		if (result.success) {
			console.log('✅ LoginForm: Google login successful');
			// The auth state change will handle navigation
		} else {
			console.error('❌ LoginForm: Google login failed:', result.error);
			error = result.error;
		}

		loading = false;
	}

	function togglePasswordVisibility() {
		showPassword = !showPassword;
	}
</script>

<div class="login-form">
	<div class="form-header">
		<h2>Sign In to Gigglr</h2>
		<p>Access your advertising network management dashboard</p>
	</div>

	{#if error}
		<div class="error-message">
			{error}
		</div>
	{/if}

	<form on:submit|preventDefault={handleEmailLogin}>
		<div class="form-group">
			<label for="email">Email Address</label>
			<input
				id="email"
				type="email"
				bind:value={email}
				placeholder="Enter your email"
				required
				disabled={loading}
			/>
		</div>

		<div class="form-group">
			<label for="password">Password</label>
			<div class="password-input">
				<input
					id="password"
					type={showPassword ? 'text' : 'password'}
					bind:value={password}
					placeholder="Enter your password"
					required
					disabled={loading}
				/>
				<button
					type="button"
					class="password-toggle"
					on:click={togglePasswordVisibility}
					disabled={loading}
				>
					{showPassword ? '👁️' : '👁️‍🗨️'}
				</button>
			</div>
		</div>

		<button type="submit" class="login-btn" disabled={loading}>
			{loading ? 'Signing In...' : 'Sign In'}
		</button>
	</form>

	<div class="divider">
		<span>or</span>
	</div>

	<button class="google-btn" on:click={handleGoogleLogin} disabled={loading}>
		<svg width="20" height="20" viewBox="0 0 24 24">
			<path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
			<path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
			<path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
			<path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
		</svg>
		Continue with Google
	</button>
</div>

<style>
	.login-form {
		max-width: 400px;
		margin: 0 auto;
		padding: 2rem;
		background: white;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.form-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.form-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.form-header p {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		font-size: 0.875rem;
	}

	.form-group {
		margin-bottom: 1rem;
	}

	.form-group label {
		display: block;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
	}

	.form-group input {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
		transition: border-color 0.2s;
	}

	.form-group input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.password-input {
		position: relative;
	}

	.password-toggle {
		position: absolute;
		right: 0.75rem;
		top: 50%;
		transform: translateY(-50%);
		background: none;
		border: none;
		cursor: pointer;
		font-size: 1rem;
		padding: 0.25rem;
	}

	.login-btn {
		width: 100%;
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		margin-bottom: 1rem;
	}

	.login-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.login-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.divider {
		text-align: center;
		margin: 1.5rem 0;
		position: relative;
	}

	.divider::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 0;
		right: 0;
		height: 1px;
		background: #e5e7eb;
	}

	.divider span {
		background: white;
		padding: 0 1rem;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.google-btn {
		width: 100%;
		background: white;
		border: 1px solid #d1d5db;
		padding: 0.75rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.google-btn:hover:not(:disabled) {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.google-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}
</style>
