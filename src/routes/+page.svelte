<script>
	import { user, isSubscribed } from '$lib/stores/auth.js';
</script>

<svelte:head>
	<title>Gigglr - Advertising Network Platform</title>
	<meta name="description" content="Create and manage your advertising campaigns with video content and advertising channels" />
</svelte:head>

<div class="home-page">
	<div class="hero-section">
		<div class="hero-content">
			<h1>Gigglr</h1>
			<p class="hero-subtitle">
				Create and manage your advertising network with professional video content and advertising channels
			</p>

			{#if $user}
				{#if $isSubscribed}
					<div class="hero-actions">
						<a href="/dashboard" class="btn primary large">
							Go to Dashboard
						</a>
					</div>
				{:else}
					<div class="hero-actions">
						<a href="/dashboard" class="btn primary large">
							Get Subscription
						</a>
					</div>
					<p class="subscription-note">
						You need an active subscription to use all features
					</p>
				{/if}
			{:else}
				<div class="hero-actions">
					<a href="/register" class="btn primary large">
						Get Started
					</a>
					<a href="/login" class="btn secondary large">
						Sign In
					</a>
				</div>
			{/if}
		</div>
	</div>

	<div class="features-section">
		<div class="container">
			<h2>Features</h2>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">📹</div>
					<h3>Video Management</h3>
					<p>Upload, organize, and tag your video content with our comprehensive management system.</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">📺</div>
					<h3>TV Channels</h3>
					<p>Create custom TV channels with unique URLs for your physical arcade locations.</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🏷️</div>
					<h3>Smart Tagging</h3>
					<p>Organize content with comprehensive adult content tags and smart filtering options.</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🔒</div>
					<h3>Secure Access</h3>
					<p>Private, owner-only access to your TV channels with subscription-based features.</p>
				</div>
			</div>
		</div>
	</div>

	<div class="how-it-works-section">
		<div class="container">
			<h2>How It Works</h2>
			<div class="steps-grid">
				<div class="step">
					<div class="step-number">1</div>
					<h3>Upload Videos</h3>
					<p>Upload your video content with tags and descriptions</p>
				</div>
				<div class="step">
					<div class="step-number">2</div>
					<h3>Create TVs</h3>
					<p>Set up TV channels with unique URLs for your arcade</p>
				</div>
				<div class="step">
					<div class="step-number">3</div>
					<h3>Select Content</h3>
					<p>Choose videos by tags or manually curate your TV content</p>
				</div>
				<div class="step">
					<div class="step-number">4</div>
					<h3>Deploy</h3>
					<p>Access your TV channels from any device in your arcade</p>
				</div>
			</div>
		</div>
	</div>
</div>

<style>
	.home-page {
		min-height: calc(100vh - 4rem);
	}

	.hero-section {
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		padding: 4rem 2rem;
		text-align: center;
	}

	.hero-content {
		max-width: 800px;
		margin: 0 auto;
	}

	.hero-content h1 {
		font-size: 3.5rem;
		font-weight: 700;
		margin-bottom: 1rem;
		text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
	}

	.hero-subtitle {
		font-size: 1.25rem;
		margin-bottom: 2rem;
		opacity: 0.9;
		line-height: 1.6;
	}

	.hero-actions {
		display: flex;
		gap: 1rem;
		justify-content: center;
		flex-wrap: wrap;
	}

	.subscription-note {
		margin-top: 1rem;
		font-size: 0.875rem;
		opacity: 0.8;
	}

	.features-section,
	.how-it-works-section {
		padding: 4rem 2rem;
	}

	.features-section {
		background: white;
	}

	.how-it-works-section {
		background: #f9fafb;
	}

	.container {
		max-width: 1200px;
		margin: 0 auto;
	}

	.features-section h2,
	.how-it-works-section h2 {
		text-align: center;
		font-size: 2.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 3rem;
	}

	.features-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
	}

	.feature-card {
		text-align: center;
		padding: 2rem;
		border-radius: 12px;
		border: 1px solid #e5e7eb;
		transition: all 0.3s;
	}

	.feature-card:hover {
		box-shadow: 0 10px 25px rgba(0, 0, 0, 0.1);
		transform: translateY(-2px);
	}

	.feature-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.feature-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 1rem;
	}

	.feature-card p {
		color: #6b7280;
		line-height: 1.6;
	}

	.steps-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 2rem;
	}

	.step {
		text-align: center;
		padding: 1.5rem;
	}

	.step-number {
		width: 3rem;
		height: 3rem;
		background: #3b82f6;
		color: white;
		border-radius: 50%;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0 auto 1rem auto;
	}

	.step h3 {
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.step p {
		color: #6b7280;
		font-size: 0.875rem;
	}

	.btn {
		display: inline-block;
		padding: 0.75rem 2rem;
		border-radius: 8px;
		font-weight: 600;
		text-decoration: none;
		transition: all 0.2s;
		cursor: pointer;
		border: 2px solid;
		text-align: center;
	}

	.btn.large {
		padding: 1rem 2.5rem;
		font-size: 1.125rem;
	}

	.btn.primary {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.btn.primary:hover {
		background: #2563eb;
		border-color: #2563eb;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(59, 130, 246, 0.4);
	}

	.btn.secondary {
		background: transparent;
		color: white;
		border-color: white;
	}

	.btn.secondary:hover {
		background: white;
		color: #3b82f6;
		transform: translateY(-1px);
		box-shadow: 0 4px 12px rgba(255, 255, 255, 0.3);
	}

	@media (max-width: 768px) {
		.hero-content h1 {
			font-size: 2.5rem;
		}

		.hero-subtitle {
			font-size: 1.125rem;
		}

		.hero-actions {
			flex-direction: column;
			align-items: center;
		}

		.btn {
			width: 100%;
			max-width: 300px;
		}

		.features-section,
		.how-it-works-section {
			padding: 3rem 1rem;
		}

		.features-section h2,
		.how-it-works-section h2 {
			font-size: 2rem;
		}

		.features-grid {
			grid-template-columns: 1fr;
		}

		.steps-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
