<script>
	import { onMount, onDestroy } from 'svelte';
	import { videoPreloader } from '$lib/services/videoPreloader.js';

	const { videoURLs: videoUrls } = $props();

	let currentVideoIndex = $state(0);
	let videoElement;
	let containerElement;
	let isPlaying = $state(false);
	let showControls = $state(false);
	let controlsTimeout;
	let isFullscreen = $state(false);
	let isRaspberryPi = $state(false);
	let reducedMotion = $state(false);
	let isMuted = $state(true);
	let volume = $state(0.7);

	// Preloading state
	let isPreloading = $state(false);
	let preloadProgress = $state(0);
	let cacheStats = $state({ cachedVideos: 0, formattedSize: '0 videos preloaded' });
	let currentVideoUrl = $state('');
	let isOffline = $state(false);
	let preloadedVideoElements = $state([]);
	let preloadInitialized = $state(false);

	// Detect Raspberry Pi environment
	function detectRaspberryPi() {
		const userAgent = navigator.userAgent.toLowerCase();
		const platform = navigator.platform.toLowerCase();

		// Check for common Raspberry Pi indicators
		return (
			userAgent.includes('raspberry') ||
			userAgent.includes('armv') ||
			platform.includes('arm') ||
			// Check for low-end hardware indicators
			navigator.hardwareConcurrency <= 4 ||
			// Check for specific Chromium on Pi patterns
			(userAgent.includes('chromium') && userAgent.includes('linux')) ||
			// Check for reduced motion preference
			window.matchMedia('(prefers-reduced-motion: reduce)').matches
		);
	}

	// Video preloading functions
	async function initializeVideoPreloader() {
		// Prevent multiple initialization
		if (preloadInitialized) {
			console.log('🎬 Video preloader already initialized');
			return;
		}

		preloadInitialized = true;
		console.log('🎬 Initializing video preloader for', videoUrls.length, 'videos');

		// Set up preloader callbacks
		videoPreloader.setProgressCallback((index, total, progress) => {
			preloadProgress = ((index / total) + (progress / 100 / total)) * 100;
			console.log(`📥 Preloading video ${index + 1}/${total}: ${progress.toFixed(1)}%`);
		});

		videoPreloader.setCompleteCallback(() => {
			console.log('✅ All videos preloaded successfully');
			isPreloading = false;
			updatePreloadStats();

			// Store preloaded video elements for offline use
			preloadedVideoElements = videoUrls.map(url =>
				videoPreloader.getPreloadedVideo(url)
			).filter(Boolean);

			console.log('📦 Stored', preloadedVideoElements.length, 'preloaded videos for offline use');
		});

		videoPreloader.setErrorCallback((error, url) => {
			console.error('❌ Video preload error:', error, url);
		});

		// Start preloading
		isPreloading = true;
		preloadProgress = 0;

		try {
			await videoPreloader.preloadVideos(videoUrls);
		} catch (error) {
			console.error('❌ Failed to preload videos:', error);
			isPreloading = false;
		}
	}

	function updatePreloadStats() {
		const stats = videoPreloader.getPreloadStats();
		cacheStats = {
			cachedVideos: stats.preloadedVideos,
			formattedSize: `${stats.preloadedVideos} videos preloaded`
		};
	}

	// Offline detection with debouncing
	let offlineTimeout;
	function detectOfflineStatus() {
		clearTimeout(offlineTimeout);
		offlineTimeout = setTimeout(() => {
			const newOfflineStatus = !navigator.onLine;
			if (newOfflineStatus !== isOffline) {
				isOffline = newOfflineStatus;
				console.log('🌐 Network status changed:', isOffline ? 'Offline' : 'Online');
			}
		}, 1000); // 1 second delay to prevent rapid switching
	}

	// Enhanced video switching with offline support
	function switchToVideo(index) {
		const targetIndex = index % videoUrls.length;
		currentVideoIndex = targetIndex;

		console.log(`🔄 Switching to video ${targetIndex + 1}/${videoUrls.length}`);
		console.log(`🌐 Offline mode: ${isOffline}`);
		console.log(`📦 Preloaded videos available: ${preloadedVideoElements.length}`);

		// Check if we have a preloaded video
		const preloadedVideo = preloadedVideoElements[targetIndex];
		console.log(`📦 Preloaded video for index ${targetIndex}:`, preloadedVideo ? 'Available' : 'Not found');

		// Prefer preloaded videos when available (better performance and reliability)
		if (preloadedVideo) {
			console.log('📦 Using preloaded video for optimal playback');

			// Hide all other preloaded videos first
			preloadedVideoElements.forEach((vid, idx) => {
				if (vid && idx !== targetIndex) {
					vid.style.opacity = '0';
					vid.style.zIndex = '-1';
					vid.style.pointerEvents = 'none';
					vid.pause();
				}
			});

			// Hide the main video element
			if (videoElement) {
				videoElement.style.display = 'none';
				videoElement.pause();
			}

			// Position the preloaded video to replace the main video
			preloadedVideo.style.position = 'absolute';
			preloadedVideo.style.top = '0';
			preloadedVideo.style.left = '0';
			preloadedVideo.style.width = '100%';
			preloadedVideo.style.height = '100%';
			preloadedVideo.style.objectFit = 'contain';
			preloadedVideo.style.opacity = '1';
			preloadedVideo.style.visibility = 'visible';
			preloadedVideo.style.pointerEvents = 'none'; // Allow mouse events to pass through
			preloadedVideo.style.zIndex = '1'; // Lower z-index so controls can be on top
			preloadedVideo.style.display = 'block';

			// Add to the TV container if not already there
			if (containerElement && !containerElement.contains(preloadedVideo)) {
				containerElement.appendChild(preloadedVideo);
				console.log('📦 Added preloaded video to container');
			}

			// Copy settings from main video
			preloadedVideo.muted = videoElement?.muted || isMuted;
			preloadedVideo.volume = videoElement?.volume || volume;
			preloadedVideo.loop = false;

			// Set up event handlers for the preloaded video
			preloadedVideo.onended = () => {
				console.log('📦 Offline video ended, playing next');
				playNextVideo();
			};

			// Debug video properties
			console.log('📦 Video element properties:', {
				src: preloadedVideo.src,
				duration: preloadedVideo.duration,
				readyState: preloadedVideo.readyState,
				videoWidth: preloadedVideo.videoWidth,
				videoHeight: preloadedVideo.videoHeight,
				paused: preloadedVideo.paused
			});

			// Start playing the preloaded video
			preloadedVideo.currentTime = 0;
			console.log('📦 Starting preloaded video playback');
			preloadedVideo.play().then(() => {
				console.log('✅ Preloaded video playing successfully');
				console.log('📦 Video playing state:', {
					currentTime: preloadedVideo.currentTime,
					paused: preloadedVideo.paused,
					ended: preloadedVideo.ended
				});
			}).catch(error => {
				console.error('❌ Offline video play error:', error);
				console.log('⚠️ Video not fully cached, trying next...');
				setTimeout(() => switchToVideo(targetIndex + 1), 1000);
			});

		} else {
			// Online mode or fallback - use main video element
			console.log('🌐 Using main video element (no preloaded video available)');

			// Hide any visible preloaded videos
			preloadedVideoElements.forEach(vid => {
				if (vid) {
					vid.style.opacity = '0';
					vid.style.zIndex = '-1';
					vid.style.pointerEvents = 'none';
					vid.pause();
				}
			});

			// Show main video element
			if (videoElement) {
				videoElement.style.display = 'block';
				currentVideoUrl = videoUrls[targetIndex];
				videoElement.load();
				videoElement.play().catch(error => {
					console.error('❌ Video play error:', error);
					if (isOffline && !preloadedVideo) {
						console.log('⚠️ Video not available offline, trying next...');
						setTimeout(() => switchToVideo(targetIndex + 1), 1000);
					}
				});
			}
		}
	}

	// Play next video in sequence
	function playNextVideo() {
		const nextIndex = (currentVideoIndex + 1) % videoUrls.length;

		// For Raspberry Pi, add a small delay to prevent overload
		if (isRaspberryPi) {
			setTimeout(() => {
				switchToVideo(nextIndex);
			}, 500);
		} else {
			switchToVideo(nextIndex);
		}
	}

	// Handle video end - automatically play next
	function handleVideoEnd() {
		playNextVideo();
	}

	// Handle video error - skip to next
	function handleVideoError() {
		console.error('Video failed to load, skipping to next');
		playNextVideo();
	}

	// Toggle play/pause
	function togglePlayPause() {
		if (videoElement) {
			if (videoElement.paused) {
				videoElement.play().catch(console.error);
			} else {
				videoElement.pause();
			}
		}
	}

	// Toggle mute/unmute
	function toggleMute() {
		if (videoElement) {
			isMuted = !isMuted;
			videoElement.muted = isMuted;
			if (!isMuted) {
				videoElement.volume = volume;
			}
		}
	}

	// Set volume
	function setVolume(newVolume) {
		volume = newVolume;
		if (videoElement && !isMuted) {
			videoElement.volume = volume;
		}
	}

	// Show controls temporarily
	function showControlsTemporarily() {
		showControls = true;
		clearTimeout(controlsTimeout);
		controlsTimeout = setTimeout(() => {
			showControls = false;
		}, 3000);
	}

	// Handle mouse movement to show controls
	function handleMouseMove() {
		showControlsTemporarily();
	}

	// Toggle fullscreen
	function toggleFullscreen() {
		if (!document.fullscreenElement) {
			containerElement.requestFullscreen().then(() => {
				isFullscreen = true;
			}).catch(console.error);
		} else {
			document.exitFullscreen().then(() => {
				isFullscreen = false;
			}).catch(console.error);
		}
	}

	// Handle fullscreen change events
	function handleFullscreenChange() {
		isFullscreen = !!document.fullscreenElement;
	}

	// Handle video click - just show controls, no fullscreen
	function handleVideoClick() {
		showControlsTemporarily();
	}

	// Handle keyboard controls
	function handleKeydown(event) {
		switch(event.key) {
			case ' ':
			case 'k':
				event.preventDefault();
				togglePlayPause();
				break;
			case 'ArrowRight':
				event.preventDefault();
				playNextVideo();
				break;
			case 'ArrowLeft':
				event.preventDefault();
				currentVideoIndex = currentVideoIndex === 0 ? videoUrls.length - 1 : currentVideoIndex - 1;
				if (videoElement) {
					videoElement.load();
					videoElement.play().catch(console.error);
				}
				break;
			case 'f':
			case 'F11':
				event.preventDefault();
				toggleFullscreen();
				break;
			case 'Escape':
				if (isFullscreen) {
					event.preventDefault();
					toggleFullscreen();
				}
				break;
			case 'm':
			case 'M':
				event.preventDefault();
				toggleMute();
				break;
			case 'ArrowUp':
				event.preventDefault();
				setVolume(Math.min(1, volume + 0.1));
				break;
			case 'ArrowDown':
				event.preventDefault();
				setVolume(Math.max(0, volume - 0.1));
				break;
		}
		showControlsTemporarily();
	}

	onMount(() => {
		// Detect Raspberry Pi environment
		isRaspberryPi = detectRaspberryPi();
		reducedMotion = isRaspberryPi || window.matchMedia('(prefers-reduced-motion: reduce)').matches;

		// Initialize video preloading
		if (videoUrls && videoUrls.length > 0) {
			console.log('🎬 Starting video preloader initialization...');
			initializeVideoPreloader();

			// Set initial video URL
			currentVideoUrl = videoUrls[currentVideoIndex];
		}

		// Apply Raspberry Pi optimizations
		if (isRaspberryPi && videoElement) {
			// Reduce video quality for better performance
			videoElement.setAttribute('playsinline', 'true');
			videoElement.setAttribute('webkit-playsinline', 'true');
			// Disable hardware acceleration issues
			videoElement.style.transform = 'translateZ(0)';
		}

		// Auto-play first video when component mounts with delay for Pi
		if (videoElement) {
			if (isRaspberryPi) {
				setTimeout(() => {
					videoElement.play().catch(console.error);
				}, 1000);
			} else {
				videoElement.play().catch(console.error);
			}
		}

		// Add event listeners
		window.addEventListener('keydown', handleKeydown);
		document.addEventListener('fullscreenchange', handleFullscreenChange);
		window.addEventListener('online', detectOfflineStatus);
		window.addEventListener('offline', detectOfflineStatus);

		// Initial offline detection
		detectOfflineStatus();

		// Raspberry Pi specific optimizations
		if (isRaspberryPi) {
			// Reduce control timeout for better performance
			controlsTimeout = 5000;
			// Disable some animations
			document.documentElement.style.setProperty('--animation-duration', '0s');
		}

		return () => {
			window.removeEventListener('keydown', handleKeydown);
			document.removeEventListener('fullscreenchange', handleFullscreenChange);
			window.removeEventListener('online', detectOfflineStatus);
			window.removeEventListener('offline', detectOfflineStatus);
			clearTimeout(controlsTimeout);
			// Clean up video preloader
			videoPreloader.destroy();
		};
	});
</script>

<svelte:head>
	<title>Gigglr</title>
	<meta name="description" content="Gigglr advertising network streaming channel featuring premium content." />
</svelte:head>

<div class="tv-wrapper">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={containerElement}
		class="tv-container"
		class:fullscreen={isFullscreen}
		onmousemove={handleMouseMove}
		onclick={handleVideoClick}
		onkeydown={handleKeydown}
		role="application"
		aria-label="Video player - move mouse to show controls"
	>
	<video
		bind:this={videoElement}
		bind:muted={isMuted}
		bind:volume
		src={currentVideoUrl || videoUrls[currentVideoIndex]}
		onended={handleVideoEnd}
		onerror={handleVideoError}
		onplay={() => isPlaying = true}
		onpause={() => isPlaying = false}
		class="tv-video"
		class:pi-optimized={isRaspberryPi}
		preload={isRaspberryPi ? "metadata" : "auto"}
		autoplay
		playsinline
		webkit-playsinline
		disablepictureinpicture
		controlslist="nodownload nofullscreen noremoteplayback"
	>
		<track kind="captions" />
		Your browser does not support the video tag.
	</video>

	<!-- Video Preloading Indicator -->
	{#if isPreloading}
		<div class="preload-overlay">
			<div class="preload-container">
				<div class="preload-icon">📥</div>
				<h3>Caching Videos for Offline Playback</h3>
				<div class="preload-progress">
					<div class="progress-bar">
						<div class="progress-fill" style="width: {preloadProgress}%"></div>
					</div>
					<p>{Math.round(preloadProgress)}% Complete</p>
				</div>
				<div class="cache-info">
					<p>Cached: {cacheStats.cachedVideos} videos ({cacheStats.formattedSize})</p>
					<p class="cache-note">Videos will play seamlessly once cached</p>
				</div>
			</div>
		</div>
	{/if}

	<!-- Video Controls Overlay -->
	<div class="controls-overlay" class:visible={showControls}>
		<div class="controls-container">
			<div class="top-controls">
				<h1 class="channel-title">Gigglr</h1>
				<div class="video-info">
					Video {currentVideoIndex + 1} of {videoUrls.length}
					{#if isOffline}
						<span class="offline-indicator">📡 Offline Mode</span>
					{/if}
				</div>
			</div>

			<div class="center-controls">
				<button class="control-btn" onclick={togglePlayPause} aria-label={isPlaying ? 'Pause' : 'Play'}>
					{#if isPlaying}
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
						</svg>
					{:else}
						<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
							<path d="M8 5v14l11-7z"/>
						</svg>
					{/if}
				</button>
			</div>

			<div class="bottom-controls">
				<div class="playback-controls">
					<button class="control-btn small" onclick={() => {
						currentVideoIndex = currentVideoIndex === 0 ? videoUrls.length - 1 : currentVideoIndex - 1;
						if (videoElement) {
							videoElement.load();
							videoElement.play().catch(console.error);
						}
					}} aria-label="Previous video">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
						</svg>
					</button>

					<button class="control-btn small" onclick={playNextVideo} aria-label="Next video">
						<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
							<path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
						</svg>
					</button>

					<button class="control-btn small" onclick={toggleMute} aria-label={isMuted ? 'Unmute' : 'Mute'}>
						{#if isMuted}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
							</svg>
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
							</svg>
						{/if}
					</button>

					<button class="control-btn small" onclick={toggleFullscreen} aria-label={isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}>
						{#if isFullscreen}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>
							</svg>
						{:else}
							<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
								<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
							</svg>
						{/if}
					</button>
				</div>

				<div class="status-info">
					<div class="volume-control">
						<span class="volume-label">🔊</span>
						<input
							type="range"
							min="0"
							max="1"
							step="0.1"
							bind:value={volume}
							oninput={(e) => setVolume(parseFloat(e.target.value))}
							class="volume-slider"
							aria-label="Volume control"
						/>
						<span class="volume-value">{Math.round(volume * 100)}%</span>
					</div>
					<span class="auto-play-indicator">🔄 Auto-playing sequence</span>
					{#if isMuted}
						<span class="mute-indicator">🔇 Muted</span>
					{/if}
					{#if isRaspberryPi}
						<span class="pi-indicator">🥧 Pi Mode</span>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Keyboard shortcuts help -->
	<div class="help-overlay" class:visible={showControls}>
		<div class="help-text">
			<span>Space/K: Play/Pause</span>
			<span>←/→: Previous/Next</span>
			<span>↑/↓: Volume Up/Down</span>
			<span>M: Mute/Unmute</span>
			<span>F/F11: Fullscreen</span>
			<span>Move mouse to show controls</span>
		</div>
	</div>
</div>
</div>

<style>
	:global(:root) {
		--animation-duration: 0.3s;
	}

	.tv-wrapper {
		min-height: 100vh;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, #264653 0%, #2a9d8f 50%, #e9c46a 100%);
		padding: 1rem;
	}

	/* Raspberry Pi optimizations */
	@media (max-width: 1024px), (prefers-reduced-motion: reduce) {
		.tv-wrapper {
			background: #264653; /* Solid color instead of gradient */
		}
	}
	.tv-container {
		position: relative;
		width: 100%;
		max-width: 100vw;
		height: 0;
		padding-bottom: 56.25%; /* 16:9 aspect ratio */
		background: #000;
		overflow: hidden;
		cursor: default;
		border-radius: 0.5rem;
		box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	}

	.tv-container.fullscreen {
		position: fixed;
		top: 0;
		left: 0;
		width: 100vw;
		height: 100vh;
		padding-bottom: 0;
		border-radius: 0;
		z-index: 9999;
	}

	.tv-container:hover {
		cursor: default;
	}

	.tv-video {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		object-fit: cover;
		/* Hardware acceleration for better performance */
		transform: translateZ(0);
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	/* Raspberry Pi specific optimizations */
	.tv-video.pi-optimized {
		/* Disable expensive CSS properties on Pi */
		filter: none;
		box-shadow: none;
		border-radius: 0;
		/* Force hardware decoding */
		will-change: auto;
		/* Reduce quality for performance */
		image-rendering: optimizeSpeed;
		image-rendering: -webkit-optimize-contrast;
	}

	/* Responsive breakpoints */
	@media (min-width: 768px) {
		.tv-container:not(.fullscreen) {
			max-width: 90vw;
			margin: 2rem auto;
		}
	}

	@media (min-width: 1024px) {
		.tv-container:not(.fullscreen) {
			max-width: 80vw;
		}
	}

	@media (min-width: 1440px) {
		.tv-container:not(.fullscreen) {
			max-width: 70vw;
		}
	}

	.controls-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: linear-gradient(
			to bottom,
			rgba(0, 0, 0, 0.7) 0%,
			transparent 20%,
			transparent 80%,
			rgba(0, 0, 0, 0.7) 100%
		);
		opacity: 0;
		transition: opacity var(--animation-duration, 0.3s) ease;
		pointer-events: none;
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		padding: 1rem;
		border-radius: inherit;
		z-index: 100; /* Ensure controls are above preloaded videos */
		/* Optimize for low-end hardware */
		will-change: opacity;
		transform: translateZ(0);
	}

	/* Simplified overlay for Raspberry Pi */
	@media (max-width: 1024px), (prefers-reduced-motion: reduce) {
		.controls-overlay {
			background: rgba(0, 0, 0, 0.7); /* Solid background instead of gradient */
			transition: opacity 0.1s ease; /* Faster transition */
		}
	}

	.tv-container.fullscreen .controls-overlay {
		padding: 2rem;
		border-radius: 0;
	}

	.controls-overlay.visible {
		opacity: 1;
		pointer-events: auto;
	}

	.controls-container {
		display: flex;
		flex-direction: column;
		justify-content: space-between;
		height: 100%;
		color: white;
	}

	.top-controls {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.channel-title {
		font-size: 1.5rem;
		font-weight: 300;
		margin: 0;
		color: #f4a261;
	}

	.video-info {
		font-size: 1rem;
		color: #e9c46a;
		background: rgba(0, 0, 0, 0.5);
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
	}

	.center-controls {
		display: flex;
		justify-content: center;
		align-items: center;
	}

	.control-btn {
		background: rgba(0, 0, 0, 0.7);
		border: 2px solid #f4a261;
		color: #f4a261;
		border-radius: 50%;
		width: 4rem;
		height: 4rem;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all var(--animation-duration, 0.3s) ease;
		/* Optimize for performance */
		will-change: background-color, color, transform;
		transform: translateZ(0);
	}

	.control-btn:hover {
		background: #f4a261;
		color: #000;
	}

	/* Reduced motion for Raspberry Pi */
	@media (prefers-reduced-motion: reduce), (max-width: 1024px) {
		.control-btn {
			transition: background-color 0.1s ease, color 0.1s ease;
		}

		.control-btn:hover {
			transform: none; /* Disable scale animation */
		}
	}

	/* Enhanced hover for desktop only */
	@media (min-width: 1025px) and (prefers-reduced-motion: no-preference) {
		.control-btn:hover {
			transform: scale(1.1);
		}
	}

	.control-btn.small {
		width: 2.5rem;
		height: 2.5rem;
	}

	.bottom-controls {
		display: flex;
		justify-content: space-between;
		align-items: flex-end;
	}

	.playback-controls {
		display: flex;
		gap: 1rem;
	}

	.status-info {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.auto-play-indicator {
		background: rgba(244, 162, 97, 0.2);
		color: #f4a261;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
	}

	.pi-indicator {
		background: rgba(46, 125, 50, 0.3);
		color: #4caf50;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		margin-left: 0.5rem;
	}

	.mute-indicator {
		background: rgba(244, 67, 54, 0.3);
		color: #f44336;
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		margin-left: 0.5rem;
	}

	.volume-control {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		background: rgba(0, 0, 0, 0.5);
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		margin-right: 1rem;
	}

	.volume-slider {
		width: 80px;
		height: 4px;
		background: rgba(255, 255, 255, 0.3);
		border-radius: 2px;
		outline: none;
		-webkit-appearance: none;
		appearance: none;
	}

	.volume-slider::-webkit-slider-thumb {
		-webkit-appearance: none;
		appearance: none;
		width: 16px;
		height: 16px;
		background: #f4a261;
		border-radius: 50%;
		cursor: pointer;
	}

	.volume-slider::-moz-range-thumb {
		width: 16px;
		height: 16px;
		background: #f4a261;
		border-radius: 50%;
		cursor: pointer;
		border: none;
	}

	.volume-label, .volume-value {
		color: #e9c46a;
		font-size: 0.8rem;
		white-space: nowrap;
	}

	.help-overlay {
		position: absolute;
		bottom: 1rem;
		left: 50%;
		transform: translateX(-50%);
		opacity: 0;
		transition: opacity 0.3s ease;
		pointer-events: none;
	}

	.help-overlay.visible {
		opacity: 1;
	}

	.help-text {
		display: flex;
		gap: 2rem;
		background: rgba(0, 0, 0, 0.8);
		padding: 0.5rem 1rem;
		border-radius: 0.5rem;
		color: #e9c46a;
		font-size: 0.8rem;
	}

	@media (max-width: 768px) {
		.controls-overlay {
			padding: 1rem;
		}

		.channel-title {
			font-size: 1.2rem;
		}

		.help-text {
			flex-direction: column;
			gap: 0.5rem;
			text-align: center;
		}

		.bottom-controls {
			flex-direction: column;
			gap: 1rem;
			align-items: center;
		}
	}

	/* Preloading Overlay Styles */
	.preload-overlay {
		position: absolute;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.9);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		backdrop-filter: blur(10px);
	}

	.preload-container {
		text-align: center;
		color: white;
		max-width: 400px;
		padding: 2rem;
		background: rgba(255, 255, 255, 0.1);
		border-radius: 1rem;
		border: 1px solid rgba(255, 255, 255, 0.2);
	}

	.preload-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
		animation: pulse 2s infinite;
	}

	.preload-container h3 {
		margin: 0 0 1.5rem 0;
		font-size: 1.2rem;
		font-weight: 600;
	}

	.preload-progress {
		margin-bottom: 1.5rem;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: rgba(255, 255, 255, 0.2);
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: linear-gradient(90deg, #4f46e5, #7c3aed);
		border-radius: 4px;
		transition: width 0.3s ease;
	}

	.preload-progress p {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 500;
	}

	.cache-info {
		font-size: 0.8rem;
		opacity: 0.8;
	}

	.cache-info p {
		margin: 0.25rem 0;
	}

	.cache-note {
		font-style: italic;
		opacity: 0.7;
	}

	@keyframes pulse {
		0%, 100% { transform: scale(1); }
		50% { transform: scale(1.1); }
	}

	/* Offline Indicator */
	.offline-indicator {
		display: inline-block;
		margin-left: 1rem;
		padding: 0.25rem 0.5rem;
		background: rgba(255, 165, 0, 0.2);
		border: 1px solid rgba(255, 165, 0, 0.5);
		border-radius: 0.25rem;
		font-size: 0.8rem;
		color: orange;
		animation: pulse 2s infinite;
	}
</style>