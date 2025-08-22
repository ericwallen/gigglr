<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { user } from '$lib/stores/auth.js';
	import RegisterForm from '$lib/components/auth/RegisterForm.svelte';

	// Redirect if already logged in
	$: if ($user) {
		goto('/dashboard');
	}
</script>

<svelte:head>
	<title>Create Account - Gigglr</title>
	<meta name="description" content="Create your Gigglr advertising network account" />
</svelte:head>

<div class="register-page">
	<div class="register-container">
		<RegisterForm />

		<div class="auth-footer">
			<p>Already have an account? <a href="/login">Sign in here</a></p>
		</div>
	</div>
</div>

<style>
	.register-page {
		min-height: calc(100vh - 4rem);
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 2rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.register-container {
		width: 100%;
		max-width: 400px;
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
		.register-page {
			padding: 1rem;
		}
	}
</style>
