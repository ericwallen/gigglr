<script>
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { user } from '$lib/stores/auth.js';
	import LoginForm from '$lib/components/auth/LoginForm.svelte';

	// Redirect if already logged in
	$: if ($user) {
		console.log('🔧 Login page: User detected, redirecting to dashboard...');
		goto('/dashboard');
	}

	// Get error message from URL params
	let errorMessage = '';
	$: {
		const error = $page.url.searchParams.get('error');
		if (error) {
			switch (error) {
				case 'subscription_required':
					errorMessage = 'You need an active subscription to access that feature.';
					break;
				case 'admin_required':
					errorMessage = 'You need admin privileges to access that page.';
					break;
				case 'access_denied':
					errorMessage = 'Access denied. Please sign in.';
					break;
				default:
					errorMessage = 'Please sign in to continue.';
			}
		}
	}
</script>

<svelte:head>
	<title>Sign In - Gigglr</title>
	<meta name="description" content="Sign in to your Gigglr advertising network account" />
</svelte:head>

<div class="login-page">
	<div class="login-container">
		{#if errorMessage}
			<div class="error-banner">
				{errorMessage}
			</div>
		{/if}

		<LoginForm />

		<div class="auth-footer">
			<p>Don't have an account? <a href="/register">Create one here</a></p>
		</div>
	</div>
</div>

<style>
	.login-page {
		min-height: calc(100vh - 4rem);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.login-container {
		width: 100%;
		max-width: 400px;
	}

	.error-banner {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		text-align: center;
		font-size: 0.875rem;
	}

	.auth-footer {
		text-align: center;
		margin-top: 1.5rem;
		padding: 1rem;
		background: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.auth-footer p {
		margin: 0;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.auth-footer a {
		color: #3b82f6;
		text-decoration: none;
		font-weight: 500;
	}

	.auth-footer a:hover {
		text-decoration: underline;
	}

	@media (max-width: 480px) {
		.login-page {
			padding: 1rem;
		}
	}
</style>
