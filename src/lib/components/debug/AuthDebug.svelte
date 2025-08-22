<script>
	import { user, loading, isSubscribed, isAdmin } from '../../stores/auth.js';
	import { AUTH } from '../../firebase/config.client.js';
	import FirestoreTest from './FirestoreTest.svelte';

	let showDebug = false;
	let firebaseUser = null;

	// Monitor Firebase auth state directly
	AUTH.onAuthStateChanged((fbUser) => {
		firebaseUser = fbUser;
	});

	function toggleDebug() {
		showDebug = !showDebug;
	}
</script>

<!-- Debug Toggle Button -->
<button
	class="debug-toggle"
	onclick={toggleDebug}
	title="Toggle Auth Debug Info"
>
	🐛
</button>

<!-- Debug Panel -->
{#if showDebug}
	<div class="debug-panel">
		<div class="debug-header">
			<h3>Auth Debug Info</h3>
			<button class="close-btn" onclick={() => showDebug = false}>×</button>
		</div>
		
		<div class="debug-content">
			<div class="debug-section">
				<h4>Store States</h4>
				<div class="debug-item">
					<strong>Loading:</strong> {$loading}
				</div>
				<div class="debug-item">
					<strong>User:</strong> {$user ? 'Set' : 'Null'}
				</div>
				<div class="debug-item">
					<strong>Is Subscribed:</strong> {$isSubscribed}
				</div>
				<div class="debug-item">
					<strong>Is Admin:</strong> {$isAdmin}
				</div>
			</div>

			<div class="debug-section">
				<h4>Firebase User</h4>
				<div class="debug-item">
					<strong>Firebase Auth:</strong> {firebaseUser ? 'Signed In' : 'Signed Out'}
				</div>
				{#if firebaseUser}
					<div class="debug-item">
						<strong>UID:</strong> {firebaseUser.uid}
					</div>
					<div class="debug-item">
						<strong>Email:</strong> {firebaseUser.email}
					</div>
					<div class="debug-item">
						<strong>Display Name:</strong> {firebaseUser.displayName || 'None'}
					</div>
				{/if}
			</div>

			<div class="debug-section">
				<h4>Store User Data</h4>
				{#if $user}
					<div class="debug-item">
						<strong>UID:</strong> {$user.uid}
					</div>
					<div class="debug-item">
						<strong>Email:</strong> {$user.email}
					</div>
					<div class="debug-item">
						<strong>Display Name:</strong> {$user.displayName || 'None'}
					</div>
					<div class="debug-item">
						<strong>Subscribed:</strong> {$user.subscribed}
					</div>
					<div class="debug-item">
						<strong>Created At:</strong> {$user.createdAt}
					</div>
				{:else}
					<div class="debug-item">No user data in store</div>
				{/if}
			</div>

			<div class="debug-section">
				<h4>Actions</h4>
				<button class="debug-btn" onclick={() => console.log('Current user:', $user)}>
					Log User to Console
				</button>
				<button class="debug-btn" onclick={() => console.log('Firebase user:', firebaseUser)}>
					Log Firebase User
				</button>
			</div>

			{#if firebaseUser}
				<FirestoreTest />
			{/if}
		</div>
	</div>
{/if}

<style>
	.debug-toggle {
		position: fixed;
		top: 5rem;
		right: 1rem;
		z-index: 1000;
		background: #ef4444;
		color: white;
		border: none;
		border-radius: 50%;
		width: 3rem;
		height: 3rem;
		font-size: 1.25rem;
		cursor: pointer;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
		transition: all 0.2s;
	}

	.debug-toggle:hover {
		background: #dc2626;
		transform: scale(1.1);
	}

	.debug-panel {
		position: fixed;
		top: 5rem;
		right: 5rem;
		width: 400px;
		max-height: 80vh;
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
		z-index: 999;
		overflow: hidden;
	}

	.debug-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1rem;
		background: #f3f4f6;
		border-bottom: 1px solid #e5e7eb;
	}

	.debug-header h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: #1f2937;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
		padding: 0;
		width: 1.5rem;
		height: 1.5rem;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		color: #374151;
	}

	.debug-content {
		padding: 1rem;
		max-height: calc(80vh - 4rem);
		overflow-y: auto;
	}

	.debug-section {
		margin-bottom: 1.5rem;
	}

	.debug-section:last-child {
		margin-bottom: 0;
	}

	.debug-section h4 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.debug-item {
		padding: 0.5rem;
		background: #f9fafb;
		border-radius: 4px;
		margin-bottom: 0.5rem;
		font-size: 0.75rem;
		font-family: monospace;
		word-break: break-all;
	}

	.debug-item:last-child {
		margin-bottom: 0;
	}

	.debug-item strong {
		color: #1f2937;
	}

	.debug-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.75rem;
		cursor: pointer;
		margin-right: 0.5rem;
		margin-bottom: 0.5rem;
		transition: background-color 0.2s;
	}

	.debug-btn:hover {
		background: #2563eb;
	}

	@media (max-width: 768px) {
		.debug-panel {
			right: 1rem;
			width: calc(100vw - 2rem);
			max-width: 400px;
		}
	}
</style>
