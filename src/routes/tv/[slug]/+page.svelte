<script>
	import { onMount, onDestroy } from 'svelte';
	import { initAuth } from '$lib/stores/auth.js';
	import { TVService, VideoService } from '$lib/services/database.js';
	import { AUTH, DB } from '$lib/firebase/config.client.js';
	import { doc, onSnapshot } from 'firebase/firestore';
	import Player from '$lib/components/Player.svelte';
	import PinEntry from '$lib/components/tv/PinEntry.svelte';

	let { data } = $props();

	let loading = $state(true);
	let needsPin = $state(false);
	let pinError = $state('');
	let accessDenied = $state(false);
	let errorMessage = $state('');
	let tvData = $state(null);
	let videoURLs = $state([]);
	let videos = $state([]);
	let syncing = $state(false);
	let syncMessage = $state('');
	let tvDocListener = null; // For real-time TV updates

	// Check if user needs to enter PIN
	function needsPinEntry() {
		// Always require PIN for TV access (even for owners)
		return true;
	}

	async function loadTVBasicInfo() {
		console.log('🔧 Loading TV basic info for slug:', data.slug);
		console.log('🔧 Auth state when loading TV:', AUTH?.currentUser ? 'Authenticated' : 'Not authenticated');

		try {
			// Get TV by slug (just basic info, no PIN check yet)
			const tvResult = await TVService.getTVBySlug(data.slug);

			if (!tvResult.success) {
				console.error('❌ TV not found:', tvResult.error);
				accessDenied = true;
				errorMessage = 'TV not found.';
				return;
			}

			const tv = tvResult.tv;
			console.log('✅ TV basic info loaded:', tv.name);

			// Check if TV is active
			if (tv.isActive === false) {
				console.error('❌ TV is not active');
				accessDenied = true;
				errorMessage = 'This TV is not currently available.';
				return;
			}

			tvData = {
				id: tv.id,
				name: tv.name,
				description: tv.description,
				slug: tv.slug,
				pin: tv.pin,
				videoCount: tv.videoIds?.length || 0,
				videoIds: tv.videoIds || []
			};

			// Show PIN entry
			needsPin = true;

		} catch (error) {
			console.error('❌ Error loading TV:', error);
			accessDenied = true;
			errorMessage = 'Failed to load TV. Please try again.';
		}
	}

	async function handlePinSubmit(enteredPin) {
		console.log('🔧 PIN submitted:', enteredPin);
		pinError = '';

		if (!tvData || enteredPin !== tvData.pin) {
			console.error('❌ Invalid PIN');
			pinError = 'Invalid PIN. Please try again.';
			return Promise.reject();
		}

		console.log('✅ PIN correct, loading videos...');
		needsPin = false;

		// Load videos now that PIN is verified
		await loadVideosForTV(tvData);

		// Set up real-time listener for TV updates
		setupTVListener();

		return Promise.resolve();
	}

	// Sync TV with latest playlist without interrupting playback
	async function syncTVPlaylist() {
		if (syncing || !tvData) return;

		syncing = true;
		syncMessage = 'Syncing playlist...';
		console.log('🔄 Syncing TV playlist...');

		try {
			// Re-fetch channel data to get latest ad list
			const tvResult = await TVService.getTVBySlug(data.slug);
			if (!tvResult.success) {
				throw new Error('Failed to fetch channel data');
			}

			const updatedTvData = tvResult.tv;
			console.log('📺 Updated channel data:', updatedTvData);

			// Load ads if there are any
			let updatedVideos = [];
			if (updatedTvData.videoIds && updatedTvData.videoIds.length > 0) {
				const videoPromises = updatedTvData.videoIds.map(id => VideoService.getVideo(id));
				const videoResults = await Promise.all(videoPromises);

				updatedVideos = videoResults
					.filter(result => result.success && result.video.status === 'active')
					.map(result => result.video);

				console.log('✅ Updated ads loaded:', updatedVideos.length);
			}

			// Update state with new data
			tvData = updatedTvData;
			videos = updatedVideos;
			videoURLs = videos.map(video => video.downloadURL).filter(Boolean);

			syncMessage = `✅ Synced! Found ${videos.length} videos`;
			console.log('✅ TV playlist synced successfully');

			// Clear success message after 3 seconds
			setTimeout(() => {
				syncMessage = '';
			}, 3000);

		} catch (error) {
			console.error('❌ Error syncing TV playlist:', error);
			syncMessage = '❌ Sync failed. Please try again.';

			// Clear error message after 5 seconds
			setTimeout(() => {
				syncMessage = '';
			}, 5000);
		} finally {
			syncing = false;
		}
	}

	// Set up real-time listener for TV document changes
	function setupTVListener() {
		if (!tvData?.id) return;

		console.log('🔄 Setting up real-time TV listener for:', tvData.name);

		const tvDocRef = doc(DB, 'TVs', tvData.id);
		tvDocListener = onSnapshot(tvDocRef, async (docSnapshot) => {
			if (docSnapshot.exists()) {
				const updatedTvData = { id: docSnapshot.id, ...docSnapshot.data() };
				console.log('📡 Real-time TV update received:', {
					tvName: updatedTvData.name,
					oldVideoCount: tvData.videoIds?.length || 0,
					newVideoCount: updatedTvData.videoIds?.length || 0
				});

				// Check if video list changed
				const oldVideoIds = tvData.videoIds || [];
				const newVideoIds = updatedTvData.videoIds || [];

				if (JSON.stringify(oldVideoIds) !== JSON.stringify(newVideoIds)) {
					console.log('🎬 Video list changed, updating playlist...');
					console.log('Old videos:', oldVideoIds.length);
					console.log('New videos:', newVideoIds.length);

					// Update TV data
					tvData = updatedTvData;

					// Reload videos
					await loadVideosForTV(updatedTvData);

					// Show notification to user with special styling for real-time updates
					syncMessage = `� Playlist updated automatically! Now ${videos.length} videos`;
					setTimeout(() => {
						syncMessage = '';
					}, 5000);
				} else {
					// Just update TV data (other properties might have changed)
					tvData = updatedTvData;
				}
			}
		}, (error) => {
			console.error('❌ Error in TV listener:', error);
		});
	}

	// Load ads for a channel
	async function loadVideosForTV(tv) {
		if (!tv.videoIds || tv.videoIds.length === 0) {
			videos = [];
			videoURLs = [];
			return;
		}

		try {
			const videoPromises = tv.videoIds.map(id => VideoService.getVideo(id));
			const videoResults = await Promise.all(videoPromises);

			const loadedVideos = videoResults
				.filter(result => result.success && result.video.status === 'active')
				.map(result => result.video);

			videos = loadedVideos;
			videoURLs = videos.map(video => video.downloadURL).filter(Boolean);

			console.log('✅ Ads loaded for channel:', videos.length);
		} catch (error) {
			console.error('❌ Error loading ads for channel:', error);
			videos = [];
			videoURLs = [];
		}
	}

	// Handle keyboard shortcuts
	function handleKeydown(event) {
		// Only handle shortcuts when PIN is verified and not in input fields
		if (!tvData || needsPin || event.target.tagName === 'INPUT') return;

		if (event.key === 'r' || event.key === 'R') {
			event.preventDefault();
			syncTVPlaylist();
		}
	}

	onMount(() => {
		// Initialize auth first
		initAuth();

		// Add keyboard event listener
		window.addEventListener('keydown', handleKeydown);

		// Wait a moment for auth to initialize, then load TV
		setTimeout(() => {
			loadTVBasicInfo().finally(() => {
				loading = false;
			});
		}, 1000); // Wait 1 second for auth to initialize

		// Cleanup
		return () => {
			window.removeEventListener('keydown', handleKeydown);
			// Clean up TV listener
			if (tvDocListener) {
				tvDocListener();
				tvDocListener = null;
			}
		};
	});

	// Also clean up on component destroy
	onDestroy(() => {
		if (tvDocListener) {
			tvDocListener();
			tvDocListener = null;
		}
	});
</script>

<svelte:head>
	<title>{tvData?.name || 'Loading...'} - Gigglr Channel</title>
	<meta name="description" content={tvData?.description || 'Gigglr Advertising Channel'} />
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if loading}
	<div class="loading-screen">
		<div class="loading-spinner"></div>
		<p>Loading TV...</p>
	</div>
{:else if accessDenied}
	<div class="access-denied">
		<div class="access-denied-content">
			<div class="access-denied-icon">🔒</div>
			<h1>Access Denied</h1>
			<p>{errorMessage}</p>
			<div class="access-actions">
				<a href="/" class="action-btn primary">Go Home</a>
			</div>
		</div>
	</div>
{:else if needsPin && tvData}
	<PinEntry
		tvName={tvData.name}
		onPinSubmit={handlePinSubmit}
		error={pinError}
	/>
{:else if tvData && videoURLs.length === 0}
	<div class="no-videos">
		<div class="no-videos-content">
			<div class="no-videos-icon">📺</div>
			<h1>{tvData.name}</h1>
			<p>This TV doesn't have any videos yet.</p>
			<a href="/" class="action-btn primary">Go Home</a>
		</div>
	</div>
{:else if tvData && videoURLs.length > 0}
	<div class="tv-player-container">
		<Player videoURLs={videoURLs} />

		<!-- Sync Button - Floating in top-left corner -->
		<div class="sync-controls">
			<button
				class="sync-btn"
				class:syncing
				onclick={syncTVPlaylist}
				disabled={syncing}
				title="Sync channel with latest playlist"
			>
				{#if syncing}
					🔄 Syncing...
				{:else}
					🔄 Sync Playlist
				{/if}
			</button>

			{#if syncMessage}
				<div class="sync-message" class:success={syncMessage.includes('✅')} class:error={syncMessage.includes('❌')}>
					{syncMessage}
				</div>
			{/if}
		</div>
	</div>
{/if}

<style>
	.loading-screen {
		min-height: 100vh;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		background: #1f2937;
		color: white;
	}

	.loading-spinner {
		width: 40px;
		height: 40px;
		border: 4px solid rgba(255, 255, 255, 0.3);
		border-top: 4px solid white;
		border-radius: 50%;
		animation: spin 1s linear infinite;
		margin-bottom: 1rem;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.loading-screen p {
		font-size: 1.125rem;
		margin: 0;
	}

	.access-denied,
	.no-videos {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #1f2937 0%, #374151 100%);
		padding: 2rem;
	}

	.access-denied-content,
	.no-videos-content {
		text-align: center;
		max-width: 500px;
		background: white;
		padding: 3rem 2rem;
		border-radius: 12px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
	}

	.access-denied-icon,
	.no-videos-icon {
		font-size: 4rem;
		margin-bottom: 1.5rem;
	}

	.access-denied-content h1,
	.no-videos-content h1 {
		font-size: 2rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.access-denied-content p,
	.no-videos-content p {
		color: #6b7280;
		font-size: 1.125rem;
		margin: 0 0 2rem 0;
		line-height: 1.6;
	}

	.access-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.action-btn {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		text-decoration: none;
		transition: all 0.2s;
		cursor: pointer;
		border: 1px solid;
	}

	.action-btn.primary {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.action-btn.primary:hover {
		background: #2563eb;
		border-color: #2563eb;
	}



	@media (max-width: 768px) {
		.access-denied,
		.no-videos {
			padding: 1rem;
		}

		.access-denied-content,
		.no-videos-content {
			padding: 2rem 1.5rem;
		}

		.access-denied-content h1,
		.no-videos-content h1 {
			font-size: 1.5rem;
		}

		.access-actions {
			flex-direction: column;
		}

		.action-btn {
			width: 100%;
			text-align: center;
		}
	}

	/* TV Player Container */
	.tv-player-container {
		position: relative;
		width: 100%;
		height: 100vh;
	}

	/* Sync Controls */
	.sync-controls {
		position: absolute;
		top: 1rem;
		left: 1rem;
		z-index: 200; /* Above video controls */
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
	}

	.tv-player-container:hover .sync-controls,
	.sync-controls:hover {
		opacity: 1;
		pointer-events: auto;
	}

	.sync-btn {
		background: rgba(0, 0, 0, 0.8);
		color: white;
		border: 1px solid rgba(255, 255, 255, 0.2);
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		backdrop-filter: blur(10px);
	}

	.sync-btn:hover:not(:disabled) {
		background: rgba(0, 0, 0, 0.9);
		border-color: rgba(255, 255, 255, 0.4);
		transform: translateY(-1px);
	}

	.sync-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.sync-btn.syncing {
		animation: pulse 1.5s infinite;
	}

	.sync-message {
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.8rem;
		backdrop-filter: blur(10px);
		border: 1px solid rgba(255, 255, 255, 0.2);
		max-width: 200px;
		word-wrap: break-word;
	}

	.sync-message.success {
		border-color: rgba(34, 197, 94, 0.5);
		background: rgba(34, 197, 94, 0.1);
		color: #22c55e;
	}

	.sync-message.error {
		border-color: rgba(239, 68, 68, 0.5);
		background: rgba(239, 68, 68, 0.1);
		color: #ef4444;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	/* Mobile adjustments */
	@media (max-width: 768px) {
		.sync-controls {
			top: 0.5rem;
			left: 0.5rem;
		}

		.sync-btn {
			font-size: 0.8rem;
			padding: 0.4rem 0.8rem;
		}

		.sync-message {
			font-size: 0.7rem;
			max-width: 150px;
		}
	}
</style>
