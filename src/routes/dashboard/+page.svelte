<script>
	import { onMount } from 'svelte';
	import { user, isSubscribed, initAuth } from '$lib/stores/auth.js';
	import { VideoService, TVService } from '$lib/services/database.js';
	import VideoUpload from '$lib/components/video/VideoUpload.svelte';
	import TVManager from '$lib/components/tv/TVManager.svelte';
	import VideoSelector from '$lib/components/video/VideoSelector.svelte';

	let loading = true;
	let activeTab = 'overview';
	let error = '';

	// Data
	let videos = [];
	let tvs = [];
	let selectedTV = null;

	// Stats
	let stats = {
		totalVideos: 0,
		totalTVs: 0,
		totalViews: 0
	};

	async function loadDashboardData() {
		if (!$user || !$isSubscribed) return;

		loading = true;
		error = '';

		try {
			// Load user's videos
			const videosResult = await VideoService.getUserVideos($user.uid, 50);
			if (videosResult.success) {
				videos = videosResult.videos;
			}

			// Load user's TVs
			const tvsResult = await TVService.getUserTVs($user.uid);
			if (tvsResult.success) {
				tvs = tvsResult.tvs;
			}

			// Calculate stats
			stats = {
				totalVideos: videos.length,
				totalTVs: tvs.length,
				totalViews: videos.reduce((sum, video) => sum + (video.views || 0), 0)
			};

		} catch (err) {
			console.error('Error loading dashboard data:', err);
			error = 'Failed to load dashboard data';
		} finally {
			loading = false;
		}
	}

	function handleVideoUploaded(video) {
		videos = [video, ...videos];
		stats.totalVideos = videos.length;
	}

	function handleTVCreated(tv) {
		tvs = [tv, ...tvs];
		stats.totalTVs = tvs.length;
	}

	function handleTVUpdated(updatedTV) {
		tvs = tvs.map(tv => tv.id === updatedTV.id ? { ...tv, ...updatedTV } : tv);
	}

	function handleTVDeleted(tvId) {
		tvs = tvs.filter(tv => tv.id !== tvId);
		stats.totalTVs = tvs.length;
		if (selectedTV?.id === tvId) {
			selectedTV = null;
			activeTab = 'tvs';
		}
	}

	function handleVideosUpdated(videoIds) {
		if (selectedTV) {
			selectedTV = { ...selectedTV, videoIds };
			// Update the TV in the list as well
			tvs = tvs.map(tv => tv.id === selectedTV.id ? selectedTV : tv);
		}
	}

	function selectTVForVideoManagement(tv) {
		selectedTV = tv;
		activeTab = 'video-selection';
	}

	onMount(() => {
		initAuth();
		
		// Wait for auth state to load
		const unsubscribe = user.subscribe(($user) => {
			if ($user !== null) { // null means still loading
				loadDashboardData();
			}
		});

		return unsubscribe;
	});

	// Reload data when subscription status changes
	$: if ($isSubscribed && $user) {
		loadDashboardData();
	}
</script>

<svelte:head>
	<title>Dashboard - Gigglr</title>
	<meta name="description" content="Manage your advertising content and channels" />
</svelte:head>

<div class="dashboard">
	{#if !$user}
		<div class="auth-required">
			<h1>Sign In Required</h1>
			<p>Please sign in to access your dashboard.</p>
			<div class="auth-actions">
				<a href="/login" class="btn primary">Sign In</a>
				<a href="/register" class="btn secondary">Create Account</a>
			</div>
		</div>
	{:else if !$isSubscribed}
		<div class="subscription-required">
			<h1>Subscription Required</h1>
			<p>You need an active subscription to use Gigglr.</p>
			<p>Please contact support to activate your subscription.</p>
			<div class="subscription-info">
				<div class="info-card">
					<h3>What you get with a subscription:</h3>
					<ul>
						<li>Upload unlimited advertising content</li>
						<li>Create unlimited advertising channels</li>
						<li>Advanced content management</li>
						<li>Category-based organization</li>
						<li>Private content access</li>
					</ul>
				</div>
			</div>
		</div>
	{:else}
		<!-- Main Dashboard -->
		<div class="dashboard-header">
			<h1>Gigglr Dashboard</h1>
			<p>Welcome back, {$user.displayName || $user.email}</p>
		</div>

		{#if error}
			<div class="error-message">
				{error}
			</div>
		{/if}

		<!-- Stats Overview -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon">📹</div>
				<div class="stat-info">
					<h3>{stats.totalVideos}</h3>
					<p>Total Ads</p>
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-icon">📺</div>
				<div class="stat-info">
					<h3>{stats.totalTVs}</h3>
					<p>Total Channels</p>
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-icon">👁️</div>
				<div class="stat-info">
					<h3>{stats.totalViews}</h3>
					<p>Total Views</p>
				</div>
			</div>
		</div>

		<!-- Navigation Tabs -->
		<div class="tab-nav">
			<button 
				class="tab-btn" 
				class:active={activeTab === 'overview'}
				on:click={() => activeTab = 'overview'}
			>
				Overview
			</button>
			<button 
				class="tab-btn" 
				class:active={activeTab === 'upload'}
				on:click={() => activeTab = 'upload'}
			>
				Upload Video
			</button>
			<button 
				class="tab-btn" 
				class:active={activeTab === 'videos'}
				on:click={() => activeTab = 'videos'}
			>
				My Videos
			</button>
			<button 
				class="tab-btn" 
				class:active={activeTab === 'tvs'}
				on:click={() => activeTab = 'tvs'}
			>
				My TVs
			</button>
			{#if selectedTV}
				<button 
					class="tab-btn" 
					class:active={activeTab === 'video-selection'}
					on:click={() => activeTab = 'video-selection'}
				>
					Manage "{selectedTV.name}"
				</button>
			{/if}
		</div>

		<!-- Tab Content -->
		<div class="tab-content">
			{#if activeTab === 'overview'}
				<div class="overview-section">
					<h2>Quick Actions</h2>
					<div class="quick-actions">
						<button class="action-card" on:click={() => activeTab = 'upload'}>
							<div class="action-icon">⬆️</div>
							<h3>Upload Video</h3>
							<p>Add new video content</p>
						</button>
						<button class="action-card" on:click={() => activeTab = 'tvs'}>
							<div class="action-icon">➕</div>
							<h3>Create TV</h3>
							<p>Set up a new TV channel</p>
						</button>
					</div>

					{#if tvs.length > 0}
						<h2>Recent TVs</h2>
						<div class="recent-tvs">
							{#each tvs.slice(0, 3) as tv}
								<div class="tv-preview">
									<h4>{tv.name}</h4>
									<p>{tv.videoIds?.length || 0} videos</p>
									<div class="tv-actions">
										<a href="/tv/{tv.slug}" target="_blank" class="btn small">View</a>
										<button 
											class="btn small secondary"
											on:click={() => selectTVForVideoManagement(tv)}
										>
											Manage Videos
										</button>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTab === 'upload'}
				<VideoUpload onUploadComplete={handleVideoUploaded} />
			{:else if activeTab === 'videos'}
				<div class="videos-section">
					<h2>My Videos ({videos.length})</h2>
					{#if loading}
						<p>Loading videos...</p>
					{:else if videos.length === 0}
						<div class="empty-state">
							<p>No videos uploaded yet.</p>
							<button class="btn primary" on:click={() => activeTab = 'upload'}>
								Upload Your First Video
							</button>
						</div>
					{:else}
						<div class="video-grid">
							{#each videos as video}
								<div class="video-card">
									<h4>{video.title}</h4>
									<p class="video-meta">
										{video.tags?.slice(0, 3).join(', ')}
										{#if video.tags?.length > 3}
											+{video.tags.length - 3} more
										{/if}
									</p>
									<p class="video-stats">
										{video.views || 0} views • 
										{new Date(video.createdAt.toDate()).toLocaleDateString()}
									</p>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{:else if activeTab === 'tvs'}
				<TVManager 
					{tvs}
					onTVCreated={handleTVCreated}
					onTVUpdated={handleTVUpdated}
					onTVDeleted={handleTVDeleted}
				/>
				
				{#if tvs.length > 0}
					<div class="tv-video-management">
						<h3>Manage TV Videos</h3>
						<p>Select a TV to manage its video content:</p>
						<div class="tv-selection-grid">
							{#each tvs as tv}
								<button 
									class="tv-selection-card"
									on:click={() => selectTVForVideoManagement(tv)}
								>
									<h4>{tv.name}</h4>
									<p>{tv.videoIds?.length || 0} videos</p>
								</button>
							{/each}
						</div>
					</div>
				{/if}
			{:else if activeTab === 'video-selection' && selectedTV}
				<VideoSelector 
					tv={selectedTV}
					onVideosUpdated={handleVideosUpdated}
				/>
			{/if}
		</div>
	{/if}
</div>

<style>
	.dashboard {
		min-height: 100vh;
		background: #f9fafb;
		padding: 2rem;
	}

	.auth-required,
	.subscription-required {
		max-width: 600px;
		margin: 4rem auto;
		text-align: center;
		background: white;
		padding: 3rem 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.auth-required h1,
	.subscription-required h1 {
		font-size: 2rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.auth-required p,
	.subscription-required p {
		color: #6b7280;
		margin-bottom: 2rem;
	}

	.auth-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
	}

	.subscription-info {
		margin-top: 2rem;
	}

	.info-card {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 8px;
		padding: 1.5rem;
		text-align: left;
	}

	.info-card h3 {
		color: #166534;
		margin-bottom: 1rem;
	}

	.info-card ul {
		color: #166534;
		margin: 0;
		padding-left: 1.5rem;
	}

	.info-card li {
		margin-bottom: 0.5rem;
	}

	.dashboard-header {
		max-width: 1200px;
		margin: 0 auto 2rem auto;
	}

	.dashboard-header h1 {
		font-size: 2.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.dashboard-header p {
		color: #6b7280;
		font-size: 1.125rem;
	}

	.error-message {
		max-width: 1200px;
		margin: 0 auto 2rem auto;
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 1rem;
		border-radius: 6px;
	}

	.stats-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
		max-width: 1200px;
		margin: 0 auto 2rem auto;
	}

	.stat-card {
		background: white;
		padding: 1.5rem;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.stat-icon {
		font-size: 2rem;
	}

	.stat-info h3 {
		font-size: 1.875rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.stat-info p {
		color: #6b7280;
		margin: 0;
		font-size: 0.875rem;
	}

	.tab-nav {
		display: flex;
		border-bottom: 1px solid #e5e7eb;
		max-width: 1200px;
		margin: 0 auto 2rem auto;
		overflow-x: auto;
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
		white-space: nowrap;
	}

	.tab-btn:hover {
		color: #374151;
	}

	.tab-btn.active {
		color: #3b82f6;
		border-bottom-color: #3b82f6;
	}

	.tab-content {
		max-width: 1200px;
		margin: 0 auto;
	}

	.overview-section h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.quick-actions {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
		margin-bottom: 3rem;
	}

	.action-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 2rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.action-card:hover {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
		border-color: #3b82f6;
	}

	.action-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.action-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.action-card p {
		color: #6b7280;
		margin: 0;
	}

	.recent-tvs {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 1rem;
	}

	.tv-preview {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.tv-preview h4 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.tv-preview p {
		color: #6b7280;
		margin: 0 0 1rem 0;
	}

	.tv-actions {
		display: flex;
		gap: 0.5rem;
	}

	.videos-section h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.empty-state {
		text-align: center;
		padding: 3rem;
		background: white;
		border-radius: 8px;
		border: 2px dashed #d1d5db;
	}

	.empty-state p {
		color: #6b7280;
		margin-bottom: 1rem;
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
		padding: 1.5rem;
	}

	.video-card h4 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.video-meta {
		color: #6b7280;
		font-size: 0.875rem;
		margin: 0 0 0.5rem 0;
	}

	.video-stats {
		color: #9ca3af;
		font-size: 0.75rem;
		margin: 0;
	}

	.tv-video-management {
		margin-top: 3rem;
		padding-top: 2rem;
		border-top: 1px solid #e5e7eb;
	}

	.tv-video-management h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.tv-video-management p {
		color: #6b7280;
		margin-bottom: 1rem;
	}

	.tv-selection-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.tv-selection-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		cursor: pointer;
		transition: all 0.2s;
		text-align: center;
	}

	.tv-selection-card:hover {
		box-shadow: 0 2px 4px -1px rgba(0, 0, 0, 0.1);
		border-color: #3b82f6;
	}

	.tv-selection-card h4 {
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.tv-selection-card p {
		color: #6b7280;
		margin: 0;
		font-size: 0.875rem;
	}

	.btn {
		display: inline-block;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		text-decoration: none;
		transition: all 0.2s;
		cursor: pointer;
		border: 1px solid;
		text-align: center;
	}

	.btn.primary {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.btn.primary:hover {
		background: #2563eb;
		border-color: #2563eb;
	}

	.btn.secondary {
		background: white;
		color: #374151;
		border-color: #d1d5db;
	}

	.btn.secondary:hover {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.btn.small {
		padding: 0.5rem 1rem;
		font-size: 0.875rem;
	}

	@media (max-width: 768px) {
		.dashboard {
			padding: 1rem;
		}

		.dashboard-header h1 {
			font-size: 2rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.quick-actions {
			grid-template-columns: 1fr;
		}

		.recent-tvs {
			grid-template-columns: 1fr;
		}

		.video-grid {
			grid-template-columns: 1fr;
		}

		.tv-selection-grid {
			grid-template-columns: 1fr;
		}

		.auth-actions {
			flex-direction: column;
		}

		.tv-actions {
			flex-direction: column;
		}
	}
</style>
