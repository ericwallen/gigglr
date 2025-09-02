<script>
	import { onMount } from 'svelte';

	// const videoUrls = [
	// 	'https://firebasestorage.googleapis.com/v0/b/video-directory-67299.appspot.com/o/videos%2F2020-05-21-377080603?alt=media&token=aab4bad6-4cc9-40ae-a59e-c3cf2d0c7a18',
	// 	'https://firebasestorage.googleapis.com/v0/b/video-directory-67299.appspot.com/o/videos%2F373070459?alt=media&token=841f298c-6e41-4c31-8fc9-8832a6b1aba1',
	// 	'https://firebasestorage.googleapis.com/v0/b/video-directory-67299.appspot.com/o/videos%2F2020-05-01-213067054?alt=media&token=bcf5d530-a1e5-4ece-8596-ef24099f2e3f',
    //     'https://firebasestorage.googleapis.com/v0/b/video-directory-67299.appspot.com/o/videos%2F2020-10-26-348519501?alt=media&token=14308c59-03a3-473d-b0dd-534fc1a6bb5d'
	// ];

	const { videoURLs: videoUrls, fullWidth = false } = $props();

	let currentVideoIndex = $state(0);
	let videoElement;
	let preloadVideoElement;
	let containerElement;
	let isPlaying = $state(false);
	let showControls = $state(false);
	let controlsTimeout;
	let isFullscreen = $state(false);
	let isRaspberryPi = $state(false);
	let reducedMotion = $state(false);
	let isMuted = $state(true);
	let volume = $state(0.7);
	let nextVideoIndex = $state(1);
	let isPortraitVideo = $state(false);

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

	// Update next video index when current video changes
	function updateNextVideoIndex() {
		nextVideoIndex = (currentVideoIndex + 1) % videoUrls.length;
	}

	// Check if current video is portrait (taller than wide)
	function checkVideoAspectRatio() {
		if (videoElement && videoElement.videoWidth && videoElement.videoHeight) {
			const aspectRatio = videoElement.videoWidth / videoElement.videoHeight;
			isPortraitVideo = aspectRatio < 1; // Portrait if width < height
			console.log(`📐 Video aspect ratio: ${aspectRatio.toFixed(2)} (${isPortraitVideo ? 'Portrait' : 'Landscape'})`);
		}
	}

	// Preload the next video
	function preloadNextVideo() {
		if (preloadVideoElement && videoUrls[nextVideoIndex]) {
			preloadVideoElement.src = videoUrls[nextVideoIndex];
			preloadVideoElement.load();
			console.log('🔄 Preloading next video:', nextVideoIndex + 1);
		}
	}

	// Play next video in sequence with seamless transition
	function playNextVideo() {
		currentVideoIndex = (currentVideoIndex + 1) % videoUrls.length;
		updateNextVideoIndex();

		// Reset aspect ratio state when changing videos
		isPortraitVideo = false;

		if (videoElement) {
			// For Raspberry Pi, add a small delay to prevent overload
			if (isRaspberryPi) {
				setTimeout(() => {
					videoElement.load();
					videoElement.play().catch(console.error);
					// Preload the next video after current starts playing
					setTimeout(preloadNextVideo, 1000);
				}, 500);
			} else {
				videoElement.load();
				videoElement.play().catch(console.error);
				// Preload the next video after current starts playing
				setTimeout(preloadNextVideo, 500);
			}
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
				updateNextVideoIndex();
				// Reset aspect ratio state when changing videos
				isPortraitVideo = false;
				if (videoElement) {
					videoElement.load();
					videoElement.play().catch(console.error);
					// Preload the next video after current starts playing
					setTimeout(preloadNextVideo, 500);
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

		// Initialize next video index
		updateNextVideoIndex();

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
					// Start preloading after first video starts
					setTimeout(preloadNextVideo, 2000);
				}, 1000);
			} else {
				videoElement.play().catch(console.error);
				// Start preloading after first video starts
				setTimeout(preloadNextVideo, 1000);
			}
		}

		// Add event listeners
		window.addEventListener('keydown', handleKeydown);
		document.addEventListener('fullscreenchange', handleFullscreenChange);

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
			clearTimeout(controlsTimeout);
		};
	});
</script>

<svelte:head>
	<title>Gigglr Advertising Channel</title>
	<meta name="description" content="Gigglr advertising network streaming channel featuring premium content." />
</svelte:head>

<div class="tv-wrapper {fullWidth ? 'full-width' : ''}">
	<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
	<div
		bind:this={containerElement}
		class="tv-container {isFullscreen ? 'fullscreen' : ''} {fullWidth ? 'full-width' : ''}"
		onmousemove={handleMouseMove}
		onclick={handleVideoClick}
		onkeydown={handleKeydown}
		role="application"
		aria-label="Ad player - move mouse to show controls"
	>
	<video
		bind:this={videoElement}
		bind:muted={isMuted}
		bind:volume
		src={videoUrls[currentVideoIndex]}
		onended={handleVideoEnd}
		onerror={handleVideoError}
		onplay={() => {
			isPlaying = true;
			// Fallback aspect ratio check when video starts playing
			setTimeout(checkVideoAspectRatio, 100);
		}}
		onpause={() => isPlaying = false}
		onloadedmetadata={checkVideoAspectRatio}
		class="tv-video"
		class:pi-optimized={isRaspberryPi}
		class:portrait={isPortraitVideo}
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

	<!-- Hidden video element for preloading next video -->
	<video
		bind:this={preloadVideoElement}
		class="preload-video"
		preload="auto"
		muted
		style="display: none;"
	></video>

	<!-- Video Controls Overlay -->
	<div class="controls-overlay" class:visible={showControls}>
		<div class="controls-container">
			<div class="top-controls">
				<h1 class="channel-title">Gigglr</h1>
				<div class="video-info">
					Video {currentVideoIndex + 1} of {videoUrls.length}
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
						updateNextVideoIndex();
						// Reset aspect ratio state when changing videos
						isPortraitVideo = false;
						if (videoElement) {
							videoElement.load();
							videoElement.play().catch(console.error);
							// Preload the next video after current starts playing
							setTimeout(preloadNextVideo, 500);
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
		object-fit: cover; /* Default for landscape videos - fills screen */
		/* Hardware acceleration for better performance */
		transform: translateZ(0);
		backface-visibility: hidden;
		-webkit-backface-visibility: hidden;
	}

	/* Portrait video handling - center with black bars */
	.tv-video.portrait {
		object-fit: contain; /* Maintain aspect ratio, don't crop */
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

	/* Full-width mode overrides - extremely aggressive */
	.tv-wrapper.full-width {
		padding: 0 !important;
		margin: 0 !important;
		margin-left: 0 !important;
		margin-right: 0 !important;
		margin-top: 0 !important;
		margin-bottom: 0 !important;
		display: block !important;
		align-items: unset !important;
		justify-content: unset !important;
		min-height: 100vh !important;
		width: 100vw !important;
		max-width: 100vw !important;
		position: fixed !important;
		top: 0 !important;
		left: 0 !important;
		right: 0 !important;
		bottom: 0 !important;
		z-index: 1000 !important;
	}

	.tv-container.full-width {
		max-width: 100vw !important;
		margin: 0 !important;
		margin-left: 0 !important;
		margin-right: 0 !important;
		margin-top: 0 !important;
		margin-bottom: 0 !important;
		padding: 0 !important;
		padding-left: 0 !important;
		padding-right: 0 !important;
		padding-top: 0 !important;
		padding-bottom: 0 !important;
		width: 100vw !important;
		height: 100vh !important;
		border-radius: 0 !important;
		box-shadow: none !important;
		position: absolute !important;
		top: 0 !important;
		left: 0 !important;
		right: 0 !important;
		bottom: 0 !important;
	}

	/* Responsive breakpoints (only apply when not full-width) */
	@media (min-width: 768px) {
		.tv-container:not(.full-width) {
			max-width: 90vw;
			margin: 2rem auto;
		}
	}

	@media (min-width: 1024px) {
		.tv-container:not(.full-width) {
			max-width: 80vw;
		}
	}

	@media (min-width: 1440px) {
		.tv-container:not(.full-width) {
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
		top: 1rem;
		right: 1rem;
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

		.help-overlay {
			top: 0.5rem;
			right: 0.5rem;
		}

		.help-text {
			flex-direction: column;
			gap: 0.5rem;
			text-align: left;
			font-size: 0.7rem;
			padding: 0.4rem 0.8rem;
		}

		.bottom-controls {
			flex-direction: column;
			gap: 1rem;
			align-items: center;
		}
	}
</style>