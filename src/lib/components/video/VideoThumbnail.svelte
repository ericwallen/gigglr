<script>
	let { video, size = 'medium', showDuration = true } = $props();

	// Size variants
	const sizeClasses = {
		small: 'w-16 h-12',
		medium: 'w-32 h-24', 
		large: 'w-48 h-36'
	};

	function formatDuration(seconds) {
		if (!seconds) return '';
		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = Math.floor(seconds % 60);
		return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
	}
</script>

<div class="video-thumbnail {sizeClasses[size]}">
	{#if video.thumbnailURL}
		<img 
			src={video.thumbnailURL} 
			alt={video.title}
			class="thumbnail-image"
		/>
	{:else}
		<!-- Fallback placeholder -->
		<div class="thumbnail-placeholder">
			<svg class="play-icon" viewBox="0 0 24 24" fill="currentColor">
				<path d="M8 5v14l11-7z"/>
			</svg>
		</div>
	{/if}
	
	{#if showDuration && video.duration}
		<div class="duration-badge">
			{formatDuration(video.duration)}
		</div>
	{/if}
</div>

<style>
	.video-thumbnail {
		position: relative;
		background: #000;
		border-radius: 6px;
		overflow: hidden;
		flex-shrink: 0;
	}

	.thumbnail-image {
		width: 100%;
		height: 100%;
		object-fit: cover;
		display: block;
	}

	.thumbnail-placeholder {
		width: 100%;
		height: 100%;
		background: linear-gradient(135deg, #374151 0%, #1f2937 100%);
		display: flex;
		align-items: center;
		justify-content: center;
		color: #9ca3af;
	}

	.play-icon {
		width: 40%;
		height: 40%;
		opacity: 0.7;
	}

	.duration-badge {
		position: absolute;
		bottom: 4px;
		right: 4px;
		background: rgba(0, 0, 0, 0.8);
		color: white;
		padding: 2px 6px;
		border-radius: 3px;
		font-size: 0.75rem;
		font-weight: 500;
		line-height: 1;
	}

	/* Size-specific adjustments */
	.w-16.h-12 .play-icon {
		width: 50%;
		height: 50%;
	}

	.w-16.h-12 .duration-badge {
		font-size: 0.6rem;
		padding: 1px 3px;
		bottom: 2px;
		right: 2px;
	}

	.w-48.h-36 .play-icon {
		width: 35%;
		height: 35%;
	}

	.w-48.h-36 .duration-badge {
		font-size: 0.8rem;
		padding: 3px 8px;
		bottom: 6px;
		right: 6px;
	}
</style>
