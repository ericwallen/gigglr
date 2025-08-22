<script>
	import { onMount } from 'svelte';
	import { user, isAdmin, initAuth } from '$lib/stores/auth.js';
	import { UserService } from '$lib/services/database.js';
	import { updateUserSubscription } from '$lib/stores/auth.js';

	let loading = true;
	let error = '';
	let users = [];
	let stats = {
		totalUsers: 0,
		subscribedUsers: 0,
		unsubscribedUsers: 0
	};

	async function loadUsers() {
		if (!$user || !$isAdmin) return;

		loading = true;
		error = '';

		try {
			const result = await UserService.getAllUsers(100);
			if (result.success) {
				users = result.users;
				calculateStats();
			} else {
				error = result.error;
			}
		} catch (err) {
			console.error('Error loading users:', err);
			error = 'Failed to load users';
		} finally {
			loading = false;
		}
	}

	function calculateStats() {
		stats = {
			totalUsers: users.length,
			subscribedUsers: users.filter(user => user.subscribed).length,
			unsubscribedUsers: users.filter(user => !user.subscribed).length
		};
	}

	async function toggleUserSubscription(userId, currentStatus) {
		const newStatus = !currentStatus;
		
		try {
			const result = await updateUserSubscription(userId, newStatus);
			if (result.success) {
				// Update local user list
				users = users.map(user => 
					user.id === userId 
						? { ...user, subscribed: newStatus }
						: user
				);
				calculateStats();
			} else {
				error = result.error;
			}
		} catch (err) {
			console.error('Error updating subscription:', err);
			error = 'Failed to update subscription';
		}
	}

	function formatDate(date) {
		if (!date) return 'Unknown';
		const d = date.toDate ? date.toDate() : new Date(date);
		return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
	}

	onMount(() => {
		initAuth();
		
		// Wait for auth state to load
		const unsubscribe = user.subscribe(($user) => {
			if ($user !== null) { // null means still loading
				loadUsers();
			}
		});

		return unsubscribe;
	});
</script>

<svelte:head>
	<title>Admin Panel - Gigglr</title>
	<meta name="description" content="Admin panel for managing Gigglr users and subscriptions" />
</svelte:head>

<div class="admin-panel">
	{#if !$user}
		<div class="access-denied">
			<h1>Authentication Required</h1>
			<p>Please sign in to access the admin panel.</p>
			<a href="/login" class="btn primary">Sign In</a>
		</div>
	{:else if !$isAdmin}
		<div class="access-denied">
			<h1>Access Denied</h1>
			<p>You don't have permission to access the admin panel.</p>
			<a href="/dashboard" class="btn primary">Go to Dashboard</a>
		</div>
	{:else}
		<!-- Admin Panel Content -->
		<div class="admin-header">
			<h1>Gigglr Admin Panel</h1>
			<p>Manage users and system settings</p>
		</div>

		{#if error}
			<div class="error-message">
				{error}
			</div>
		{/if}

		<!-- Stats Overview -->
		<div class="stats-grid">
			<div class="stat-card">
				<div class="stat-icon">👥</div>
				<div class="stat-info">
					<h3>{stats.totalUsers}</h3>
					<p>Total Users</p>
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-icon">✅</div>
				<div class="stat-info">
					<h3>{stats.subscribedUsers}</h3>
					<p>Subscribed Users</p>
				</div>
			</div>
			<div class="stat-card">
				<div class="stat-icon">❌</div>
				<div class="stat-info">
					<h3>{stats.unsubscribedUsers}</h3>
					<p>Unsubscribed Users</p>
				</div>
			</div>
		</div>

		<!-- User Management -->
		<div class="user-management">
			<div class="section-header">
				<h2>User Management</h2>
				<button class="btn secondary" on:click={loadUsers} disabled={loading}>
					{loading ? 'Loading...' : 'Refresh'}
				</button>
			</div>

			{#if loading}
				<div class="loading-state">
					<p>Loading users...</p>
				</div>
			{:else if users.length === 0}
				<div class="empty-state">
					<p>No users found.</p>
				</div>
			{:else}
				<div class="users-table">
					<div class="table-header">
						<div class="header-cell">User</div>
						<div class="header-cell">Email</div>
						<div class="header-cell">Subscription</div>
						<div class="header-cell">Created</div>
						<div class="header-cell">Actions</div>
					</div>
					
					{#each users as user}
						<div class="table-row" class:subscribed={user.subscribed}>
							<div class="cell user-cell">
								<div class="user-info">
									<div class="user-name">
										{user.displayName || 'No name'}
									</div>
									<div class="user-id">
										{user.id}
									</div>
								</div>
							</div>
							<div class="cell email-cell">
								{user.email}
							</div>
							<div class="cell subscription-cell">
								<span class="subscription-status" class:subscribed={user.subscribed}>
									{user.subscribed ? 'Subscribed' : 'Not Subscribed'}
								</span>
							</div>
							<div class="cell date-cell">
								{formatDate(user.createdAt)}
							</div>
							<div class="cell actions-cell">
								<button 
									class="action-btn"
									class:subscribe={!user.subscribed}
									class:unsubscribe={user.subscribed}
									on:click={() => toggleUserSubscription(user.id, user.subscribed)}
								>
									{user.subscribed ? 'Unsubscribe' : 'Subscribe'}
								</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>

		<!-- System Information -->
		<div class="system-info">
			<h2>System Information</h2>
			<div class="info-grid">
				<div class="info-card">
					<h3>Database Collections</h3>
					<ul>
						<li>users - User accounts and subscriptions</li>
						<li>Videos - Advertising content</li>
						<li>TVs - Advertising channels</li>
					</ul>
				</div>
				<div class="info-card">
					<h3>Storage</h3>
					<ul>
						<li>Ads stored in: /Videos/</li>
						<li>Organized by user ID</li>
						<li>Max file size: 3000MB</li>
					</ul>
				</div>
				<div class="info-card">
					<h3>Access Control</h3>
					<ul>
						<li>Admin access via custom claims</li>
						<li>Subscription required for features</li>
						<li>Owner-only channel access</li>
					</ul>
				</div>
			</div>
		</div>
	{/if}
</div>

<style>
	.admin-panel {
		min-height: 100vh;
		background: #f9fafb;
		padding: 2rem;
	}

	.access-denied {
		max-width: 600px;
		margin: 4rem auto;
		text-align: center;
		background: white;
		padding: 3rem 2rem;
		border-radius: 12px;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.access-denied h1 {
		font-size: 2rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.access-denied p {
		color: #6b7280;
		margin-bottom: 2rem;
	}

	.admin-header {
		max-width: 1200px;
		margin: 0 auto 2rem auto;
	}

	.admin-header h1 {
		font-size: 2.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.admin-header p {
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
		margin: 0 auto 3rem auto;
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

	.user-management {
		max-width: 1200px;
		margin: 0 auto 3rem auto;
		background: white;
		border-radius: 8px;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
		overflow: hidden;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.section-header h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.loading-state,
	.empty-state {
		padding: 3rem;
		text-align: center;
		color: #6b7280;
	}

	.users-table {
		display: flex;
		flex-direction: column;
	}

	.table-header {
		display: grid;
		grid-template-columns: 2fr 2fr 1fr 1.5fr 1fr;
		gap: 1rem;
		padding: 1rem 1.5rem;
		background: #f9fafb;
		border-bottom: 1px solid #e5e7eb;
		font-weight: 600;
		color: #374151;
		font-size: 0.875rem;
	}

	.table-row {
		display: grid;
		grid-template-columns: 2fr 2fr 1fr 1.5fr 1fr;
		gap: 1rem;
		padding: 1rem 1.5rem;
		border-bottom: 1px solid #f3f4f6;
		transition: background-color 0.2s;
	}

	.table-row:hover {
		background: #f9fafb;
	}

	.table-row.subscribed {
		background: #f0fdf4;
	}

	.table-row.subscribed:hover {
		background: #dcfce7;
	}

	.cell {
		display: flex;
		align-items: center;
		font-size: 0.875rem;
	}

	.user-info {
		display: flex;
		flex-direction: column;
	}

	.user-name {
		font-weight: 500;
		color: #1f2937;
	}

	.user-id {
		font-size: 0.75rem;
		color: #6b7280;
		font-family: monospace;
	}

	.email-cell {
		color: #374151;
	}

	.subscription-status {
		padding: 0.25rem 0.75rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.subscription-status:not(.subscribed) {
		background: #fee2e2;
		color: #991b1b;
	}

	.subscription-status.subscribed {
		background: #d1fae5;
		color: #065f46;
	}

	.date-cell {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.action-btn {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: 1px solid;
	}

	.action-btn.subscribe {
		background: #059669;
		color: white;
		border-color: #059669;
	}

	.action-btn.subscribe:hover {
		background: #047857;
		border-color: #047857;
	}

	.action-btn.unsubscribe {
		background: #ef4444;
		color: white;
		border-color: #ef4444;
	}

	.action-btn.unsubscribe:hover {
		background: #dc2626;
		border-color: #dc2626;
	}

	.system-info {
		max-width: 1200px;
		margin: 0 auto;
	}

	.system-info h2 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
	}

	.info-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
	}

	.info-card h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.info-card ul {
		margin: 0;
		padding-left: 1.5rem;
		color: #6b7280;
	}

	.info-card li {
		margin-bottom: 0.5rem;
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

	.btn.secondary:hover:not(:disabled) {
		background: #f9fafb;
		border-color: #9ca3af;
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.admin-panel {
			padding: 1rem;
		}

		.admin-header h1 {
			font-size: 2rem;
		}

		.stats-grid {
			grid-template-columns: 1fr;
		}

		.section-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.table-header,
		.table-row {
			grid-template-columns: 1fr;
			gap: 0.5rem;
		}

		.table-header {
			display: none; /* Hide header on mobile */
		}

		.table-row {
			padding: 1rem;
			border: 1px solid #e5e7eb;
			border-radius: 8px;
			margin-bottom: 0.5rem;
		}

		.cell {
			justify-content: space-between;
			padding: 0.25rem 0;
		}

		.cell::before {
			content: attr(data-label);
			font-weight: 600;
			color: #374151;
		}

		.info-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
