<script>
	import { onMount } from 'svelte';
	import { TVService, VideoService } from '../../services/database.js';
	import Player from '../Player.svelte';

	let { tvId } = $props();

	let loading = $state(true);
	let error = $state('');
	let tvData = $state(null);
	let videoURLs = $state([]);
	let videos = $state([]);

	onMount(async () => {
		await loadTVData();
	});

	async function loadTVData() {
		if (!tvId) {
			error = 'No TV ID provided';
			loading = false;
			return;
		}

		try {
			console.log('🔧 Loading TV data for ID:', tvId);
			
			// Get TV data directly by ID
			const tvResult = await TVService.getTV(tvId);
			
			if (!tvResult.success) {
				console.error('❌ TV not found:', tvResult.error);
				error = 'TV not found';
				loading = false;
				return;
			}

			const tv = tvResult.tv;
			console.log('✅ TV data loaded:', tv.name);

			// Check if TV is active
			if (tv.isActive === false) {
				console.error('❌ TV is not active');
				error = 'This TV is not currently available';
				loading = false;
				return;
			}

			tvData = tv;

			// Load videos for the TV
			await loadVideosForTV(tv);

		} catch (err) {
			console.error('❌ Error loading TV:', err);
			error = 'Failed to load TV content';
		} finally {
			loading = false;
		}
	}

	async function loadVideosForTV(tv) {
		if (!tv.videoIds || tv.videoIds.length === 0) {
			videos = [];
			videoURLs = [];
			return;
		}

		try {
			console.log('🔧 Loading videos for TV:', tv.videoIds.length);
			
			const videoPromises = tv.videoIds.map(id => VideoService.getVideo(id));
			const videoResults = await Promise.all(videoPromises);

			const loadedVideos = videoResults
				.filter(result => result.success && result.video.status === 'active')
				.map(result => result.video);

			videos = loadedVideos;
			videoURLs = videos.map(video => video.downloadURL).filter(Boolean);

			console.log('✅ Videos loaded for TV:', videos.length);
		} catch (err) {
			console.error('❌ Error loading videos for TV:', err);
			videos = [];
			videoURLs = [];
		}
	}
</script>

{#if loading}
	<div class="embedded-loading">
		<div class="loading-spinner"></div>
		<p>Loading channel...</p>
	</div>
{:else if error}
	<div class="embedded-error">
		<div class="error-icon">⚠️</div>
		<p>{error}</p>
	</div>
{:else if tvData && videoURLs.length === 0}
	<div class="embedded-no-content">
		<div class="no-content-icon">📺</div>
		<h3>{tvData.name}</h3>
		<p>No content available</p>
	</div>
{:else if tvData && videoURLs.length > 0}
	<div class="embedded-player">
		<div class="embedded-player-header">
			<h3>{tvData.name}</h3>
			<span class="live-indicator">🔴 LIVE</span>
		</div>
		<div class="embedded-player-container">
			<Player videoURLs={videoURLs} />
		</div>
	</div>
{/if}

<style>
	.embedded-loading,
	.embedded-error,
	.embedded-no-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		padding: 3rem 2rem;
		text-align: center;
		background: #f8fafc;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		min-height: 300px;
	}

	.loading-spinner {
		width: 3rem;
		height: 3rem;
		border: 3px solid #e5e7eb;
		border-top: 3px solid #3b82f6;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.error-icon,
	.no-content-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.embedded-loading p,
	.embedded-error p,
	.embedded-no-content p {
		color: #6b7280;
		margin: 0;
	}

	.embedded-no-content h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.embedded-player {
		background: transparent;
		border-radius: 0;
		overflow: visible;
		position: relative;
		z-index: 1;
	}

	.embedded-player-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem 1.5rem;
		background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
		color: white;
		position: relative;
		z-index: 10;
	}

	.embedded-player-header h3 {
		font-size: 1.125rem;
		font-weight: 600;
		margin: 0;
	}

	.live-indicator {
		background: #ef4444;
		color: white;
		padding: 0.25rem 0.75rem;
		border-radius: 20px;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.embedded-player-container {
		position: relative;
		width: 100%;
		aspect-ratio: 16 / 9; /* Maintain 16:9 aspect ratio without fixed height */
		background: transparent;
		margin: 0;
		display: flex;
		align-items: stretch;
		justify-content: stretch;
		z-index: 1;
	}

	.embedded-player-container :global(.tv-wrapper) {
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		flex: 1;
		background: transparent !important;
		min-height: auto !important;
		padding: 0 !important;
	}

	.embedded-player-container :global(.tv-container) {
		width: 100%;
		height: 100%;
		border-radius: 0;
		max-width: 100%;
		max-height: 100%;
		flex: 1;
		padding-bottom: 0 !important;
		position: static !important;
	}

	.embedded-player-container :global(.tv-video) {
		border-radius: 0;
		width: 100%;
		height: 100%;
		max-width: 100%;
		max-height: 100%;
		object-fit: cover; /* Fill the available space */
	}

	
</style>
