<script>
	import { page } from '$app/stores';
	import { user, isSubscribed, isAdmin, logout } from '../../stores/auth.js';

	let mobileMenuOpen = false;

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}

	async function handleLogout() {
		await logout();
		closeMobileMenu();
	}

	// Close mobile menu when route changes
	$: if ($page.url.pathname) {
		mobileMenuOpen = false;
	}
</script>

<nav class="navigation">
	<div class="nav-container">
		<!-- Logo/Brand -->
		<div class="nav-brand">
			<a href="/" class="brand-link">
				<div class="brand-icon">📺</div>
				<span class="brand-text">Gigglr</span>
			</a>
		</div>

		<!-- Desktop Navigation -->
		<div class="nav-links desktop-only">
			{#if $user}
				<a 
					href="/dashboard" 
					class="nav-link"
					class:active={$page.url.pathname === '/dashboard'}
				>
					Dashboard
				</a>
				
				{#if $isAdmin}
					<a 
						href="/admin" 
						class="nav-link admin-link"
						class:active={$page.url.pathname === '/admin'}
					>
						Admin Panel
					</a>
				{/if}
			{:else}
				<a 
					href="/login" 
					class="nav-link"
					class:active={$page.url.pathname === '/login'}
				>
					Sign In
				</a>
				<a 
					href="/register" 
					class="nav-link"
					class:active={$page.url.pathname === '/register'}
				>
					Register
				</a>
			{/if}
		</div>

		<!-- User Menu -->
		{#if $user}
			<div class="user-menu desktop-only">
				<div class="user-info">
					<div class="user-avatar">
						{($user.displayName || $user.email || 'U').charAt(0).toUpperCase()}
					</div>
					<div class="user-details">
						<div class="user-name">
							{$user.displayName || 'User'}
						</div>
						<div class="user-status">
							{#if $isSubscribed}
								<span class="status-badge subscribed">Subscribed</span>
							{:else}
								<span class="status-badge unsubscribed">Not Subscribed</span>
							{/if}
							{#if $isAdmin}
								<span class="status-badge admin">Admin</span>
							{/if}
						</div>
					</div>
				</div>
				<button class="logout-btn" on:click={handleLogout}>
					Sign Out
				</button>
			</div>
		{/if}

		<!-- Mobile Menu Button -->
		<button 
			class="mobile-menu-btn mobile-only"
			on:click={toggleMobileMenu}
			aria-label="Toggle menu"
		>
			<div class="hamburger" class:open={mobileMenuOpen}>
				<span></span>
				<span></span>
				<span></span>
			</div>
		</button>
	</div>

	<!-- Mobile Menu -->
	{#if mobileMenuOpen}
		<div class="mobile-menu">
			<div class="mobile-menu-content">
				{#if $user}
					<!-- User Info -->
					<div class="mobile-user-info">
						<div class="user-avatar large">
							{($user.displayName || $user.email || 'U').charAt(0).toUpperCase()}
						</div>
						<div class="user-details">
							<div class="user-name">{$user.displayName || 'User'}</div>
							<div class="user-email">{$user.email}</div>
							<div class="user-status">
								{#if $isSubscribed}
									<span class="status-badge subscribed">Subscribed</span>
								{:else}
									<span class="status-badge unsubscribed">Not Subscribed</span>
								{/if}
								{#if $isAdmin}
									<span class="status-badge admin">Admin</span>
								{/if}
							</div>
						</div>
					</div>

					<!-- Navigation Links -->
					<div class="mobile-nav-links">
						<a 
							href="/dashboard" 
							class="mobile-nav-link"
							class:active={$page.url.pathname === '/dashboard'}
							on:click={closeMobileMenu}
						>
							📊 Dashboard
						</a>
						
						{#if $isAdmin}
							<a 
								href="/admin" 
								class="mobile-nav-link admin-link"
								class:active={$page.url.pathname === '/admin'}
								on:click={closeMobileMenu}
							>
								⚙️ Admin Panel
							</a>
						{/if}
					</div>

					<!-- Logout -->
					<button class="mobile-logout-btn" on:click={handleLogout}>
						🚪 Sign Out
					</button>
				{:else}
					<!-- Auth Links -->
					<div class="mobile-auth-links">
						<a 
							href="/login" 
							class="mobile-auth-link"
							class:active={$page.url.pathname === '/login'}
							on:click={closeMobileMenu}
						>
							🔑 Sign In
						</a>
						<a 
							href="/register" 
							class="mobile-auth-link register"
							class:active={$page.url.pathname === '/register'}
							on:click={closeMobileMenu}
						>
							📝 Create Account
						</a>
					</div>
				{/if}
			</div>
		</div>
	{/if}
</nav>

<style>
	.navigation {
		background: white;
		border-bottom: 1px solid #e5e7eb;
		position: sticky;
		top: 0;
		z-index: 50;
	}

	.nav-container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 0 1rem;
		display: flex;
		align-items: center;
		justify-content: space-between;
		height: 4rem;
	}

	.nav-brand {
		flex-shrink: 0;
	}

	.brand-link {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		text-decoration: none;
		color: #1f2937;
		font-weight: 600;
		font-size: 1.25rem;
	}

	.brand-icon {
		font-size: 1.5rem;
	}

	.brand-text {
		color: #3b82f6;
	}

	.nav-links {
		display: flex;
		align-items: center;
		gap: 2rem;
	}

	.nav-link {
		text-decoration: none;
		color: #6b7280;
		font-weight: 500;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.nav-link:hover {
		color: #3b82f6;
		background: #f3f4f6;
	}

	.nav-link.active {
		color: #3b82f6;
		background: #eff6ff;
	}

	.nav-link.admin-link {
		color: #dc2626;
	}

	.nav-link.admin-link:hover {
		color: #b91c1c;
		background: #fef2f2;
	}

	.nav-link.admin-link.active {
		color: #dc2626;
		background: #fef2f2;
	}

	.user-menu {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.user-info {
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.user-avatar {
		width: 2rem;
		height: 2rem;
		background: #3b82f6;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-weight: 600;
		font-size: 0.875rem;
	}

	.user-avatar.large {
		width: 3rem;
		height: 3rem;
		font-size: 1.25rem;
	}

	.user-details {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.user-name {
		font-weight: 500;
		color: #1f2937;
		font-size: 0.875rem;
	}

	.user-email {
		color: #6b7280;
		font-size: 0.75rem;
	}

	.user-status {
		display: flex;
		gap: 0.5rem;
		flex-wrap: wrap;
	}

	.status-badge {
		padding: 0.125rem 0.5rem;
		border-radius: 12px;
		font-size: 0.625rem;
		font-weight: 500;
	}

	.status-badge.subscribed {
		background: #d1fae5;
		color: #065f46;
	}

	.status-badge.unsubscribed {
		background: #fee2e2;
		color: #991b1b;
	}

	.status-badge.admin {
		background: #fef3c7;
		color: #92400e;
	}

	.logout-btn {
		background: #ef4444;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 6px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.logout-btn:hover {
		background: #dc2626;
	}

	.mobile-menu-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 0.5rem;
	}

	.hamburger {
		width: 1.5rem;
		height: 1.5rem;
		position: relative;
		display: flex;
		flex-direction: column;
		justify-content: space-around;
	}

	.hamburger span {
		width: 100%;
		height: 2px;
		background: #374151;
		border-radius: 1px;
		transition: all 0.3s;
	}

	.hamburger.open span:nth-child(1) {
		transform: rotate(45deg) translate(5px, 5px);
	}

	.hamburger.open span:nth-child(2) {
		opacity: 0;
	}

	.hamburger.open span:nth-child(3) {
		transform: rotate(-45deg) translate(7px, -6px);
	}

	.mobile-menu {
		position: absolute;
		top: 100%;
		left: 0;
		right: 0;
		background: white;
		border-bottom: 1px solid #e5e7eb;
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.mobile-menu-content {
		padding: 1rem;
	}

	.mobile-user-info {
		display: flex;
		align-items: center;
		gap: 1rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
		margin-bottom: 1rem;
	}

	.mobile-nav-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.mobile-nav-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		text-decoration: none;
		color: #374151;
		border-radius: 6px;
		transition: all 0.2s;
	}

	.mobile-nav-link:hover {
		background: #f3f4f6;
		color: #3b82f6;
	}

	.mobile-nav-link.active {
		background: #eff6ff;
		color: #3b82f6;
	}

	.mobile-nav-link.admin-link {
		color: #dc2626;
	}

	.mobile-nav-link.admin-link:hover {
		background: #fef2f2;
		color: #b91c1c;
	}

	.mobile-nav-link.admin-link.active {
		background: #fef2f2;
		color: #dc2626;
	}

	.mobile-logout-btn {
		width: 100%;
		background: #ef4444;
		color: white;
		border: none;
		padding: 0.75rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
	}

	.mobile-logout-btn:hover {
		background: #dc2626;
	}

	.mobile-auth-links {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mobile-auth-link {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem 1rem;
		text-decoration: none;
		color: #374151;
		border-radius: 6px;
		transition: all 0.2s;
		border: 1px solid #e5e7eb;
	}

	.mobile-auth-link:hover {
		background: #f3f4f6;
		border-color: #3b82f6;
		color: #3b82f6;
	}

	.mobile-auth-link.register {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.mobile-auth-link.register:hover {
		background: #2563eb;
		border-color: #2563eb;
		color: white;
	}

	.desktop-only {
		display: flex;
	}

	.mobile-only {
		display: none;
	}

	@media (max-width: 768px) {
		.desktop-only {
			display: none;
		}

		.mobile-only {
			display: block;
		}

		.nav-container {
			padding: 0 1rem;
		}

		.brand-text {
			display: none;
		}

		.mobile-user-info {
			flex-direction: column;
			align-items: flex-start;
			text-align: left;
		}

		.mobile-user-info .user-details {
			width: 100%;
		}
	}

	@media (max-width: 480px) {
		.mobile-user-info {
			padding: 0.75rem;
		}

		.mobile-nav-link,
		.mobile-auth-link {
			padding: 0.5rem 0.75rem;
			font-size: 0.875rem;
		}

		.mobile-logout-btn {
			padding: 0.5rem;
		}
	}
</style>
