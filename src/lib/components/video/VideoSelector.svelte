<script>
	import { VideoService, TVService } from '../../services/database.js';
	import { user } from '../../stores/auth.js';
	import { ALL_TAGS, formatTag, searchTags } from '../../data/tags.js';
	import TagSelector from '../tags/TagSelector.svelte';

	let { tv, onVideosUpdated } = $props();

	let activeTab = $state('playlist'); // 'playlist', 'search', 'tags', or 'all'
	let loading = $state(false);
	let error = $state('');
	let syncing = $state(false);
	let syncMessage = $state('');

	// Search state
	let searchTerm = $state('');
	let searchResults = $state([]);
	let searchLoading = $state(false);

	// Tag selection state
	let selectedTags = $state([]);
	let tagResults = $state([]);
	let tagLoading = $state(false);
	let excludedVideoIds = $state(new Set());

	// All videos state
	let allVideos = $state([]);
	let allVideosLoading = $state(false);

	// Current TV videos - now track counts instead of just presence
	let currentVideoIds = $state(new Set(tv?.videoIds || []));
	let currentVideos = $state([]);
	let videoIdCounts = $state(new Map()); // Track how many times each video is added

	// Playlist management
	let playlistItems = $state([]); // Array of {id, video, index} for ordered display
	let draggedIndex = $state(null);
	let dragOverIndex = $state(null);

	// Load current videos and calculate counts
	async function loadCurrentVideos(videoIds = null) {
		const videosToLoad = videoIds || tv?.videoIds || [];

		if (!videosToLoad.length) {
			currentVideos = [];
			currentVideoIds = new Set();
			videoIdCounts = new Map();
			playlistItems = [];
			return;
		}

		loading = true;
		try {
			// Calculate counts of each video ID
			const counts = new Map();
			videosToLoad.forEach(id => {
				counts.set(id, (counts.get(id) || 0) + 1);
			});
			videoIdCounts = counts;
			currentVideoIds = new Set(videosToLoad);

			// Load unique videos
			const uniqueVideoIds = [...new Set(videosToLoad)];
			const videoPromises = uniqueVideoIds.map(id => VideoService.getVideo(id));
			const results = await Promise.all(videoPromises);

			const videoMap = new Map();
			results
				.filter(result => result.success)
				.forEach(result => {
					videoMap.set(result.video.id, result.video);
				});

			currentVideos = Array.from(videoMap.values());

			// Build playlist items with order
			playlistItems = videosToLoad.map((videoId, index) => ({
				id: `${videoId}-${index}`, // Unique ID for each playlist item
				videoId,
				video: videoMap.get(videoId),
				index
			})).filter(item => item.video); // Filter out videos that failed to load
		} catch (err) {
			console.error('Error loading current videos:', err);
		} finally {
			loading = false;
		}
	}

	// Drag and drop functions
	function handleDragStart(event, index) {
		draggedIndex = index;
		event.dataTransfer.effectAllowed = 'move';
		event.dataTransfer.setData('text/html', event.target.outerHTML);
		event.target.style.opacity = '0.5';
	}

	function handleDragEnd(event) {
		event.target.style.opacity = '1';
		draggedIndex = null;
		dragOverIndex = null;
	}

	function handleDragOver(event, index) {
		event.preventDefault();
		event.dataTransfer.dropEffect = 'move';
		dragOverIndex = index;
	}

	function handleDragLeave() {
		dragOverIndex = null;
	}

	async function handleDrop(event, dropIndex) {
		event.preventDefault();

		if (draggedIndex === null || draggedIndex === dropIndex) {
			draggedIndex = null;
			dragOverIndex = null;
			return;
		}

		// Reorder the playlist
		const newPlaylistItems = [...playlistItems];
		const draggedItem = newPlaylistItems[draggedIndex];

		// Remove the dragged item
		newPlaylistItems.splice(draggedIndex, 1);

		// Insert at new position
		const insertIndex = draggedIndex < dropIndex ? dropIndex - 1 : dropIndex;
		newPlaylistItems.splice(insertIndex, 0, draggedItem);

		// Update indices
		newPlaylistItems.forEach((item, index) => {
			item.index = index;
		});

		playlistItems = newPlaylistItems;

		// Update the database
		const newVideoIds = newPlaylistItems.map(item => item.videoId);

		loading = true;
		try {
			const result = await TVService.updateVideoOrder(tv.id, newVideoIds);
			if (result.success) {
				onVideosUpdated?.(newVideoIds);
				console.log('✅ Playlist order updated');
			} else {
				error = result.error;
				// Revert on error
				await loadCurrentVideos();
			}
		} catch (err) {
			error = err.message || 'Failed to update playlist order';
			// Revert on error
			await loadCurrentVideos();
		} finally {
			loading = false;
			draggedIndex = null;
			dragOverIndex = null;
		}
	}

	// Remove specific playlist item
	async function removePlaylistItem(index) {
		const item = playlistItems[index];
		if (!item) return;

		loading = true;
		error = '';

		try {
			// Get current video IDs and remove the specific index
			const currentVideoIds = tv.videoIds || [];
			const newVideoIds = [...currentVideoIds];
			newVideoIds.splice(index, 1);

			const result = await TVService.updateVideoOrder(tv.id, newVideoIds);
			if (result.success) {
				onVideosUpdated?.(newVideoIds);
				await loadCurrentVideos(newVideoIds); // Reload with updated video IDs
				console.log('✅ Video removed from playlist');
			} else {
				error = result.error;
			}
		} catch (err) {
			error = err.message || 'Failed to remove video';
		} finally {
			loading = false;
		}
	}

	// Search videos
	async function handleSearch() {
		if (!searchTerm.trim() || !$user) return;

		searchLoading = true;
		error = '';

		try {
			const result = await VideoService.searchVideos(searchTerm, $user.uid);
			if (result.success) {
				searchResults = result.videos;
			} else {
				error = result.error;
			}
		} catch (err) {
			error = err.message || 'Search failed';
		} finally {
			searchLoading = false;
		}
	}

	// Load videos by tags
	async function loadVideosByTags() {
		if (!selectedTags.length || !$user) {
			tagResults = [];
			return;
		}

		tagLoading = true;
		error = '';

		try {
			const result = await VideoService.getVideosByTags(selectedTags);
			if (result.success) {
				// Filter out videos not owned by current user
				tagResults = result.videos.filter(video => video.ownerId === $user.uid);
			} else {
				error = result.error;
			}
		} catch (err) {
			error = err.message || 'Failed to load videos';
		} finally {
			tagLoading = false;
		}
	}

	// Add video to TV (allows multiple instances)
	async function addVideoToTV(video) {
		if (!tv) return;

		loading = true;
		error = '';

		try {
			const result = await TVService.addVideoToTV(tv.id, video.id);
			if (result.success) {
				// Get updated TV data to get the new video list
				const tvResult = await TVService.getTV(tv.id);
				if (tvResult.success) {
					const updatedVideoIds = tvResult.tv.videoIds || [];
					onVideosUpdated?.(updatedVideoIds);

					// Reload current videos with the updated video IDs
					await loadCurrentVideos(updatedVideoIds);
				}

				console.log('✅ Video added to TV:', video.title);
			} else {
				error = result.error;
			}
		} catch (err) {
			error = err.message || 'Failed to add video';
		} finally {
			loading = false;
		}
	}

	// Remove one instance of video from TV
	async function removeVideoFromTV(video, removeAll = false) {
		if (!tv || !currentVideoIds.has(video.id)) return;

		loading = true;
		error = '';

		try {
			const result = await TVService.removeVideoFromTV(tv.id, video.id, removeAll);
			if (result.success) {
				// Get updated TV data to get the new video list
				const tvResult = await TVService.getTV(tv.id);
				if (tvResult.success) {
					const updatedVideoIds = tvResult.tv.videoIds || [];
					onVideosUpdated?.(updatedVideoIds);

					// Reload current videos with the updated video IDs
					await loadCurrentVideos(updatedVideoIds);
				}

				console.log('✅ Video removed from TV:', video.title, removeAll ? '(all instances)' : '(one instance)');
			} else {
				error = result.error;
			}
		} catch (err) {
			error = err.message || 'Failed to remove video';
		} finally {
			loading = false;
		}
	}

	// Toggle video exclusion for tag results
	function toggleVideoExclusion(videoId) {
		if (excludedVideoIds.has(videoId)) {
			excludedVideoIds.delete(videoId);
		} else {
			excludedVideoIds.add(videoId);
		}
		excludedVideoIds = new Set(excludedVideoIds); // Trigger reactivity
	}

	// Add all non-excluded tag results to TV
	async function addTagResultsToTV() {
		const videosToAdd = tagResults.filter(video => 
			!currentVideoIds.has(video.id) && !excludedVideoIds.has(video.id)
		);

		if (!videosToAdd.length) return;

		loading = true;
		error = '';

		try {
			const newVideoIds = new Set(currentVideoIds);
			const newCurrentVideos = [...currentVideos];

			for (const video of videosToAdd) {
				const result = await TVService.addVideoToTV(tv.id, video.id);
				if (result.success) {
					newVideoIds.add(video.id);
					newCurrentVideos.push(video);
				}
			}

			// Update state to trigger reactivity
			currentVideoIds = newVideoIds;
			currentVideos = newCurrentVideos;
			onVideosUpdated?.([...currentVideoIds]);
		} catch (err) {
			error = err.message || 'Failed to add videos';
		} finally {
			loading = false;
		}
	}

	// Handle tag selection change
	function handleTagsChange(newTags) {
		selectedTags = newTags;
		excludedVideoIds.clear();
		loadVideosByTags();
	}

	// Load all user videos
	async function loadAllVideos() {
		if (!$user) return;

		allVideosLoading = true;
		error = '';

		try {
			const result = await VideoService.getUserVideos($user.uid, 100); // Load up to 100 videos
			if (result.success) {
				allVideos = result.videos.filter(video => video.status === 'active');
				console.log('✅ All videos loaded:', allVideos.length);
			} else {
				throw new Error(result.error || 'Failed to load videos');
			}
		} catch (err) {
			console.error('❌ Error loading all videos:', err);
			error = err.message || 'Failed to load videos';
			allVideos = [];
		} finally {
			allVideosLoading = false;
		}
	}

	// Format duration
	function formatDuration(seconds) {
		if (!seconds) return 'Unknown';
		
		const hours = Math.floor(seconds / 3600);
		const minutes = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);
		
		if (hours > 0) {
			return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
		} else {
			return `${minutes}:${secs.toString().padStart(2, '0')}`;
		}
	}

	// Sync TV playlist (useful after making changes)
	async function syncTVPlaylist() {
		if (syncing) return;

		syncing = true;
		syncMessage = 'Syncing TV playlist...';
		console.log('🔄 Syncing TV playlist for:', tv.name);

		try {
			// Re-fetch the TV data to get latest video list
			const result = await TVService.getTV(tv.id);
			if (result.success) {
				const updatedTV = result.tv;
				console.log('✅ TV playlist synced successfully');

				// Update local state
				currentVideoIds = new Set(updatedTV.videoIds || []);
				loadCurrentVideos();

				syncMessage = `✅ Synced! TV now has ${updatedTV.videoIds?.length || 0} videos`;
			} else {
				throw new Error(result.error || 'Failed to sync TV');
			}
		} catch (err) {
			console.error('❌ Error syncing TV playlist:', err);
			syncMessage = '❌ Sync failed. Please try again.';
		} finally {
			syncing = false;

			// Clear message after 3 seconds
			setTimeout(() => {
				syncMessage = '';
			}, 3000);
		}
	}

	// Initialize
	loadCurrentVideos();

	// Auto-load all videos when tab becomes active
	$effect(() => {
		if (activeTab === 'all' && allVideos.length === 0 && !allVideosLoading) {
			loadAllVideos();
		}
	});
</script>

<div class="video-selector">
	<div class="selector-header">
		<div class="header-content">
			<div class="header-info">
				<h3>Manage Videos for "{tv?.name}"</h3>
				<p>Current videos: {currentVideos.length}</p>
			</div>
			<button
				class="sync-btn"
				class:syncing
				onclick={syncTVPlaylist}
				disabled={syncing}
				title="Sync TV with latest playlist"
			>
				{#if syncing}
					🔄 Syncing...
				{:else}
					🔄 Sync TV
				{/if}
			</button>
		</div>

		{#if syncMessage}
			<div class="sync-message" class:success={syncMessage.includes('✅')} class:error={syncMessage.includes('❌')}>
				{syncMessage}
			</div>
		{/if}
	</div>

	{#if error}
		<div class="error-message">
			{error}
		</div>
	{/if}

	<!-- Current Videos -->
	{#if currentVideos.length > 0}
		<div class="current-videos">
			<h4>Current Videos ({currentVideos.length})</h4>
			<div class="video-grid">
				{#each currentVideos as video}
					<div class="video-card current">
						<div class="video-info">
							<h5>{video.title}</h5>
							<p class="video-meta">
								{formatDuration(video.duration)} • 
								{video.tags?.slice(0, 3).map(formatTag).join(', ')}
								{#if video.tags?.length > 3}
									+{video.tags.length - 3} more
								{/if}
							</p>
						</div>
						<button
							class="remove-btn"
							onclick={() => removeVideoFromTV(video)}
							disabled={loading}
						>
							Remove
						</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Tab Navigation -->
	<div class="tab-nav">
		<button
			class="tab-btn"
			class:active={activeTab === 'playlist'}
			onclick={() => activeTab = 'playlist'}
		>
			📋 Playlist Order
		</button>
		<button
			class="tab-btn"
			class:active={activeTab === 'search'}
			onclick={() => activeTab = 'search'}
		>
			Search Videos
		</button>
		<button
			class="tab-btn"
			class:active={activeTab === 'tags'}
			onclick={() => activeTab = 'tags'}
		>
			Select by Tags
		</button>
		<button
			class="tab-btn"
			class:active={activeTab === 'all'}
			onclick={() => { activeTab = 'all'; loadAllVideos(); }}
		>
			All Videos
		</button>
	</div>

	<!-- Playlist Tab -->
	{#if activeTab === 'playlist'}
		<div class="playlist-section">
			{#if playlistItems.length > 0}
				<div class="playlist-header">
					<h4>Current Playlist ({playlistItems.length} items)</h4>
					<p>Drag and drop to reorder videos in your channel</p>
				</div>

				<div class="playlist-container">
					{#each playlistItems as item, index (item.id)}
						<div
							class="playlist-item"
							class:dragging={draggedIndex === index}
							class:drag-over={dragOverIndex === index}
							draggable="true"
							role="button"
							tabindex="0"
							aria-label="Drag to reorder video: {item.video?.title || 'Unknown Video'}"
							ondragstart={(e) => handleDragStart(e, index)}
							ondragend={handleDragEnd}
							ondragover={(e) => handleDragOver(e, index)}
							ondragleave={handleDragLeave}
							ondrop={(e) => handleDrop(e, index)}
						>
							<div class="playlist-number">
								{index + 1}
							</div>
							<div class="playlist-video-info">
								<h5>{item.video?.title || 'Unknown Video'}</h5>
								<p class="playlist-meta">
									{item.video ? formatDuration(item.video.duration) : 'N/A'} •
									{item.video?.tags?.slice(0, 2).map(formatTag).join(', ') || 'No tags'}
									{#if item.video?.tags?.length > 2}
										+{item.video.tags.length - 2} more
									{/if}
								</p>
							</div>
							<div class="playlist-actions">
								<button
									class="drag-handle"
									title="Drag to reorder"
									disabled={loading}
								>
									⋮⋮
								</button>
								<button
									class="remove-btn"
									onclick={() => removePlaylistItem(index)}
									disabled={loading}
									title="Remove this item"
								>
									Remove
								</button>
							</div>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-playlist">
					<div class="empty-icon">📋</div>
					<h3>No Videos in Playlist</h3>
					<p>Add videos using the other tabs to build your channel playlist.</p>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Search Tab -->
	{#if activeTab === 'search'}
		<div class="search-section">
			<div class="search-form">
				<input
					type="text"
					bind:value={searchTerm}
					placeholder="Search your videos by title or description..."
					class="search-input"
					onkeydown={(e) => e.key === 'Enter' && handleSearch()}
				/>
				<button
					class="search-btn"
					onclick={handleSearch}
					disabled={searchLoading || !searchTerm.trim()}
				>
					{searchLoading ? 'Searching...' : 'Search'}
				</button>
			</div>

			{#if searchResults.length > 0}
				<div class="search-results">
					<h4>Search Results ({searchResults.length})</h4>
					<div class="video-grid">
						{#each searchResults as video}
							{@const isAdded = currentVideoIds.has(video.id)}
							{@const count = videoIdCounts.get(video.id) || 0}
							<div class="video-card" class:added={isAdded}>
								<div class="video-info">
									<h5>{video.title}</h5>
									<p class="video-meta">
										{formatDuration(video.duration)} •
										{video.tags?.slice(0, 3).map(formatTag).join(', ')}
										{#if video.tags?.length > 3}
											+{video.tags.length - 3} more
										{/if}
										{#if count > 0}
											<span class="count-badge">×{count}</span>
										{/if}
									</p>
								</div>
								<div class="video-actions">
									<button
										class="add-btn"
										onclick={() => addVideoToTV(video)}
										disabled={loading}
									>
										{isAdded ? 'Add Another' : 'Add'}
									</button>
									{#if isAdded}
										<button
											class="remove-btn"
											onclick={() => removeVideoFromTV(video)}
											disabled={loading}
											title="Remove one instance"
										>
											Remove One
										</button>
										{#if count > 1}
											<button
												class="remove-all-btn"
												onclick={() => removeVideoFromTV(video, true)}
												disabled={loading}
												title="Remove all instances"
											>
												Remove All
											</button>
										{/if}
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else if searchTerm && !searchLoading}
				<p class="no-results">No videos found matching "{searchTerm}"</p>
			{/if}
		</div>
	{/if}

	<!-- Tags Tab -->
	{#if activeTab === 'tags'}
		<div class="tags-section">
			<TagSelector 
				{selectedTags}
				onTagsChange={handleTagsChange}
				maxTags={10}
			/>

			{#if tagResults.length > 0}
				<div class="tag-results">
					<div class="results-header">
						<h4>Videos with Selected Tags ({tagResults.length})</h4>
						{#if tagResults.length > 0}
							{@const availableCount = tagResults.filter(v => !currentVideoIds.has(v.id) && !excludedVideoIds.has(v.id)).length}
							{#if availableCount > 0}
								<button
									class="add-all-btn"
									onclick={addTagResultsToTV}
									disabled={loading}
								>
									Add All Available ({availableCount})
								</button>
							{/if}
						{/if}
					</div>
					
					<div class="video-grid">
						{#each tagResults as video}
							{@const isAdded = currentVideoIds.has(video.id)}
							{@const isExcluded = excludedVideoIds.has(video.id)}
							{@const count = videoIdCounts.get(video.id) || 0}
							<div class="video-card" class:added={isAdded} class:excluded={isExcluded}>
								<div class="video-info">
									<h5>{video.title}</h5>
									<p class="video-meta">
										{formatDuration(video.duration)} •
										{video.tags?.slice(0, 3).map(formatTag).join(', ')}
										{#if video.tags?.length > 3}
											+{video.tags.length - 3} more
										{/if}
										{#if count > 0}
											<span class="count-badge">×{count}</span>
										{/if}
									</p>
								</div>
								<div class="video-actions">
									{#if !isAdded}
										<button
											class="exclude-btn"
											class:excluded={isExcluded}
											onclick={() => toggleVideoExclusion(video.id)}
										>
											{isExcluded ? 'Include' : 'Exclude'}
										</button>
									{/if}
									<button
										class="add-btn"
										onclick={() => addVideoToTV(video)}
										disabled={loading}
									>
										{isAdded ? 'Add Another' : 'Add'}
									</button>
									{#if isAdded}
										<button
											class="remove-btn"
											onclick={() => removeVideoFromTV(video)}
											disabled={loading}
											title="Remove one instance"
										>
											Remove One
										</button>
										{#if count > 1}
											<button
												class="remove-all-btn"
												onclick={() => removeVideoFromTV(video, true)}
												disabled={loading}
												title="Remove all instances"
											>
												Remove All
											</button>
										{/if}
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else if selectedTags.length > 0 && !tagLoading}
				<p class="no-results">No videos found with the selected tags</p>
			{/if}
		</div>
	{/if}

	<!-- All Videos Tab -->
	{#if activeTab === 'all'}
		<div class="all-videos-section">
			{#if allVideosLoading}
				<p>Loading all videos...</p>
			{:else if allVideos.length > 0}
				<div class="all-videos-results">
					<div class="results-header">
						<h4>All Your Videos ({allVideos.length})</h4>
						<p>Select videos to add to this TV</p>
					</div>

					<div class="video-grid">
						{#each allVideos as video}
							{@const isAdded = currentVideoIds.has(video.id)}
							{@const count = videoIdCounts.get(video.id) || 0}
							<div class="video-card" class:added={isAdded}>
								<div class="video-info">
									<h5>{video.title}</h5>
									<p class="video-meta">
										{formatDuration(video.duration)} •
										{video.tags?.slice(0, 3).map(formatTag).join(', ')}
										{#if video.tags?.length > 3}
											+{video.tags.length - 3} more
										{/if}
										{#if count > 0}
											<span class="count-badge">×{count}</span>
										{/if}
									</p>
									<p class="video-stats">
										{video.views || 0} views •
										{new Date(video.createdAt.toDate()).toLocaleDateString()}
									</p>
								</div>
								<div class="video-actions">
									<button
										class="add-btn"
										onclick={() => addVideoToTV(video)}
										disabled={loading}
									>
										{isAdded ? 'Add Another' : 'Add'}
									</button>
									{#if isAdded}
										<button
											class="remove-btn"
											onclick={() => removeVideoFromTV(video)}
											disabled={loading}
											title="Remove one instance"
										>
											Remove One
										</button>
										{#if count > 1}
											<button
												class="remove-all-btn"
												onclick={() => removeVideoFromTV(video, true)}
												disabled={loading}
												title="Remove all instances"
											>
												Remove All
											</button>
										{/if}
									{/if}
								</div>
							</div>
						{/each}
					</div>
				</div>
			{:else}
				<div class="no-results">
					<p>No videos found in your library.</p>
					<p>Upload some videos first to add them to this TV.</p>
				</div>
			{/if}
		</div>
	{/if}
</div>

<style>
	.video-selector {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.selector-header {
		margin-bottom: 2rem;
	}

	.header-content {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.header-info {
		flex: 1;
	}

	.selector-header h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.selector-header p {
		color: #6b7280;
		margin: 0;
	}

	.sync-btn {
		background: #3b82f6;
		color: white;
		border: 1px solid #3b82f6;
		border-radius: 0.5rem;
		padding: 0.5rem 1rem;
		font-size: 0.9rem;
		cursor: pointer;
		transition: all 0.2s ease;
		white-space: nowrap;
		flex-shrink: 0;
	}

	.sync-btn:hover:not(:disabled) {
		background: #2563eb;
		border-color: #2563eb;
	}

	.sync-btn:disabled {
		opacity: 0.7;
		cursor: not-allowed;
	}

	.sync-btn.syncing {
		animation: pulse 1.5s infinite;
	}

	.sync-message {
		background: #f3f4f6;
		color: #374151;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		font-size: 0.9rem;
		border: 1px solid #d1d5db;
	}

	.sync-message.success {
		background: #dcfce7;
		color: #166534;
		border-color: #bbf7d0;
	}

	.sync-message.error {
		background: #fee2e2;
		color: #991b1b;
		border-color: #fecaca;
	}

	@keyframes pulse {
		0%, 100% { opacity: 1; }
		50% { opacity: 0.7; }
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.current-videos {
		margin-bottom: 2rem;
		padding: 1.5rem;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 8px;
	}

	.current-videos h4 {
		margin: 0 0 1rem 0;
		color: #166534;
		font-weight: 600;
	}

	.tab-nav {
		display: flex;
		border-bottom: 1px solid #e5e7eb;
		margin-bottom: 2rem;
	}

	.tab-btn {
		background: none;
		border: none;
		padding: 1rem 1.5rem;
		cursor: pointer;
		font-weight: 500;
		color: #6b7280;
		border-bottom: 2px solid transparent;
		transition: all 0.2s;
	}

	.tab-btn:hover {
		color: #374151;
	}

	.tab-btn.active {
		color: #3b82f6;
		border-bottom-color: #3b82f6;
	}

	.search-form {
		display: flex;
		gap: 1rem;
		margin-bottom: 2rem;
	}

	.search-input {
		flex: 1;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
	}

	.search-input:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.search-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.search-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.search-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.search-results,
	.tag-results {
		margin-top: 2rem;
	}

	.search-results h4,
	.tag-results h4 {
		margin: 0 0 1rem 0;
		font-weight: 600;
		color: #1f2937;
	}

	.results-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.add-all-btn {
		background: #059669;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.add-all-btn:hover:not(:disabled) {
		background: #047857;
	}

	.add-all-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.video-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
		gap: 1rem;
	}

	.video-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		transition: all 0.2s;
	}

	.video-card:hover {
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
	}

	.video-card.current {
		border-color: #10b981;
		background: #f0fdf4;
	}

	.video-card.added {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.video-card.excluded {
		opacity: 0.5;
		background: #f9fafb;
	}

	.video-info {
		flex: 1;
		margin-right: 1rem;
	}

	.video-info h5 {
		margin: 0 0 0.5rem 0;
		font-weight: 600;
		color: #1f2937;
		font-size: 0.875rem;
		line-height: 1.4;
	}

	.video-meta {
		margin: 0;
		font-size: 0.75rem;
		color: #6b7280;
		line-height: 1.4;
	}

	.video-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.add-btn,
	.remove-btn,
	.exclude-btn {
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid;
		white-space: nowrap;
	}

	.add-btn {
		background: #059669;
		color: white;
		border-color: #059669;
	}

	.add-btn:hover:not(:disabled) {
		background: #047857;
		border-color: #047857;
	}

	.remove-btn {
		background: #ef4444;
		color: white;
		border-color: #ef4444;
	}

	.remove-btn:hover:not(:disabled) {
		background: #dc2626;
		border-color: #dc2626;
	}

	.exclude-btn {
		background: #f3f4f6;
		color: #374151;
		border-color: #d1d5db;
	}

	.exclude-btn:hover:not(:disabled) {
		background: #e5e7eb;
	}

	.exclude-btn.excluded {
		background: #fef2f2;
		color: #dc2626;
		border-color: #fecaca;
	}

	.add-btn:disabled,
	.remove-btn:disabled,
	.exclude-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.remove-all-btn {
		background: #dc2626;
		color: white;
		border-color: #dc2626;
		padding: 0.5rem 0.75rem;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid;
		white-space: nowrap;
	}

	.remove-all-btn:hover:not(:disabled) {
		background: #b91c1c;
		border-color: #b91c1c;
	}

	.remove-all-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.count-badge {
		background: #3b82f6;
		color: white;
		padding: 0.2rem 0.5rem;
		border-radius: 12px;
		font-size: 0.8rem;
		font-weight: 600;
		margin-left: 0.5rem;
		display: inline-block;
	}

	.no-results {
		text-align: center;
		color: #6b7280;
		font-style: italic;
		padding: 2rem;
	}

	/* Playlist Styles */
	.playlist-section {
		margin-top: 1rem;
	}

	.playlist-header {
		margin-bottom: 1.5rem;
	}

	.playlist-header h4 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.playlist-header p {
		color: #6b7280;
		margin: 0;
	}

	.playlist-container {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.playlist-item {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: white;
		border: 2px solid #e5e7eb;
		border-radius: 8px;
		transition: all 0.2s ease;
		cursor: grab;
	}

	.playlist-item:hover {
		border-color: #d1d5db;
		box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
	}

	.playlist-item.dragging {
		opacity: 0.5;
		cursor: grabbing;
		transform: rotate(2deg);
	}

	.playlist-item.drag-over {
		border-color: #3b82f6;
		background: #eff6ff;
	}

	.playlist-number {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 2rem;
		height: 2rem;
		background: #f3f4f6;
		border-radius: 50%;
		font-weight: 600;
		color: #374151;
		flex-shrink: 0;
	}

	.playlist-video-info {
		flex: 1;
		min-width: 0;
	}

	.playlist-video-info h5 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.25rem 0;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.playlist-meta {
		font-size: 0.875rem;
		color: #6b7280;
		margin: 0;
	}

	.playlist-actions {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.drag-handle {
		background: #f3f4f6;
		color: #6b7280;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		padding: 0.5rem;
		font-size: 1rem;
		cursor: grab;
		transition: all 0.2s;
		line-height: 1;
	}

	.drag-handle:hover:not(:disabled) {
		background: #e5e7eb;
		color: #374151;
	}

	.drag-handle:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.empty-playlist {
		text-align: center;
		padding: 3rem 2rem;
		color: #6b7280;
	}

	.empty-playlist .empty-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.empty-playlist h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #374151;
		margin: 0 0 0.5rem 0;
	}

	.empty-playlist p {
		margin: 0;
	}

	.tags-section {
		margin-top: 1rem;
	}

	.all-videos-section {
		margin-top: 1rem;
	}

	.all-videos-results .results-header {
		margin-bottom: 1.5rem;
	}

	.all-videos-results .results-header h4 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.all-videos-results .results-header p {
		color: #6b7280;
		margin: 0;
	}

	.video-stats {
		font-size: 0.75rem;
		color: #9ca3af;
		margin-top: 0.25rem;
	}

	@media (max-width: 768px) {
		.video-selector {
			padding: 1rem;
		}

		.header-content {
			flex-direction: column;
			align-items: stretch;
			gap: 1rem;
		}

		.sync-btn {
			align-self: flex-start;
		}

		.video-grid {
			grid-template-columns: 1fr;
		}

		.search-form {
			flex-direction: column;
		}

		.results-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.video-card {
			flex-direction: column;
			gap: 1rem;
		}

		.video-info {
			margin-right: 0;
		}

		.video-actions {
			flex-direction: row;
			align-self: stretch;
		}

		.add-btn,
		.remove-btn,
		.exclude-btn {
			flex: 1;
		}
	}
</style>
