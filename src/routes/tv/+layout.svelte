<script>
	import '../../app.css';
	import { onMount } from 'svelte';
	import { initAuth } from '$lib/stores/auth.js';

	let { children } = $props();

	onMount(() => {
		// Initialize authentication for TV routes
		console.log('🔧 TV layout mounted, initializing auth...');
		initAuth();
	});
</script>

<!-- TV routes get full-screen layout without navigation -->
<div class="tv-app">
	{@render children()}
</div>

<style>
	/* Aggressive CSS reset for full-screen TV experience */
	:global(html) {
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
		margin: 0 !important;
		padding: 0 !important;
		width: 100% !important;
		height: 100% !important;
		overflow: hidden !important;
	}

	:global(body) {
		margin: 0 !important;
		padding: 0 !important;
		background: #000 !important;
		color: white;
		line-height: 1.6;
	}

	:global(*) {
		box-sizing: border-box !important;
	}

	.tv-app {
		width: 100% !important;
		min-height: 100vh !important;
		margin: 0 !important;
		padding: 0 !important;
		background: #000 !important;
		position: relative !important;
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
</style>
