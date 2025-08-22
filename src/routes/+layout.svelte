<script>
	import { onMount } from 'svelte';
	import '../app.css';
	import { initAuth } from '$lib/stores/auth.js';
	import Navigation from '$lib/components/layout/Navigation.svelte';
	import AuthDebug from '$lib/components/debug/AuthDebug.svelte';

	let { children } = $props();

	onMount(() => {
		// Initialize authentication on app start
		console.log('🔧 App mounted, initializing auth...');
		initAuth();
	});
</script>

<div class="app">
	<Navigation />
	<main class="main-content">
		{@render children()}
	</main>
	<AuthDebug />
</div>

<style>
	:global(html) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
	}

	:global(body) {
		margin: 0;
		padding: 0;
		background: #f9fafb;
		color: #1f2937;
		line-height: 1.6;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.app {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
	}

	.main-content {
		flex: 1;
	}

	:global(.sr-only) {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}

	:global(.loading) {
		opacity: 0.6;
		pointer-events: none;
	}

	:global(.error) {
		color: #dc2626;
		background: #fef2f2;
		border: 1px solid #fecaca;
		padding: 0.75rem;
		border-radius: 6px;
		margin: 1rem 0;
	}

	:global(.success) {
		color: #065f46;
		background: #d1fae5;
		border: 1px solid #a7f3d0;
		padding: 0.75rem;
		border-radius: 6px;
		margin: 1rem 0;
	}

	:global(.warning) {
		color: #92400e;
		background: #fef3c7;
		border: 1px solid #fde68a;
		padding: 0.75rem;
		border-radius: 6px;
		margin: 1rem 0;
	}
</style>
