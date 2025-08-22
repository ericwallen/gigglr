<script>
	import { user, isSubscribed } from '$lib/stores/auth.js';
	import EmbeddedTVPlayer from '$lib/components/tv/EmbeddedTVPlayer.svelte';
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
				Reach customers where they wait - TVs in laundromats, takeout menus, and local businesses
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
			<h2>Advertising Network Features</h2>
			<div class="features-grid">
				<div class="feature-card">
					<div class="feature-icon">👥</div>
					<h3>Professional Management</h3>
					<p>Our team of advertising professionals handles all campaign setup, content management, and optimization for you.</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">😂</div>
					<h3>Engaging Content Mix</h3>
					<p>We blend your advertisements with funny memes and entertaining content to keep viewers engaged and create positive associations.</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">🏪</div>
					<h3>Prime Locations</h3>
					<p>Your ads appear on TVs in high-traffic locations like laundromats, waiting areas, and restaurant takeout counters.</p>
				</div>
				<div class="feature-card">
					<div class="feature-icon">📈</div>
					<h3>Proven Results</h3>
					<p>Benefit from our experience and proven strategies to maximize your advertising return on investment.</p>
				</div>
			</div>
		</div>
	</div>

	<div class="how-it-works-section">
		<div class="container">
			<h2>How We Get Your Business Noticed</h2>
			<div class="steps-grid">
				<div class="step">
					<div class="step-number">1</div>
					<h3>Share Your Vision</h3>
					<p>Tell us about your business, target audience, and advertising goals</p>
				</div>
				<div class="step">
					<div class="step-number">2</div>
					<h3>We Create & Manage</h3>
					<p>Our professionals design your campaign, mix in entertaining memes, and handle all technical setup and content management</p>
				</div>
				<div class="step">
					<div class="step-number">3</div>
					<h3>Strategic Placement</h3>
					<p>We deploy your ads to optimal locations where your target customers spend time waiting</p>
				</div>
				<div class="step">
					<div class="step-number">4</div>
					<h3>You See Results</h3>
					<p>Enjoy increased brand awareness and customer engagement while we handle everything</p>
				</div>
			</div>
		</div>

		<div class="placements-section">
			<div class="container">
				<h2>Where Your Ads Appear</h2>
				<p class="section-subtitle">Reach customers in high-traffic, high-engagement locations</p>
				<div class="placements-grid">
					<div class="placement-card">
						<div class="placement-icon">🧺</div>
						<h3>Laundromats</h3>
						<p>Captive audience with 30-60 minutes of wait time. Perfect for local services, restaurants, and retail promotions.</p>
					</div>
					<div class="placement-card">
						<div class="placement-icon">🍕</div>
						<h3>Restaurant Takeout Menus</h3>
						<p>Digital menu displays and takeout counter screens. Ideal for complementary businesses and local partnerships.</p>
					</div>
					<div class="placement-card">
						<div class="placement-icon">⏰</div>
						<h3>Waiting Areas</h3>
						<p>Doctor offices, auto shops, and service businesses. Engaged viewers with time to consider your message.</p>
					</div>
					<div class="placement-card">
						<div class="placement-icon">🏪</div>
						<h3>Local Businesses</h3>
						<p>Coffee shops, retail stores, and community centers. Build brand awareness in your neighborhood.</p>
					</div>
				</div>
			</div>
		</div>

		<div class="example-section">
			<div class="container">
				<h2>See Our Work in Action</h2>
				<p class="section-subtitle">Watch how we mix advertisements with entertaining memes to keep viewers engaged</p>

				<div class="example-container">
					<div class="example-content">
						<p class="example-description">
							This is a real advertising channel currently running in local businesses. Notice how we seamlessly blend promotional content with entertaining memes to create an engaging viewing experience.
						</p>

						<div class="embedded-tv-wrapper">
							<EmbeddedTVPlayer tvId="jZ4uCK8Kdf1vPkk04T1Z" />
						</div>

						<p class="example-note">
							<strong>What you're seeing:</strong> A live mix of local business advertisements, entertaining memes, and engaging content designed to capture attention while customers wait in laundromats, restaurants, and other local businesses.
						</p>
					</div>
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

	.placements-section {
		background: #f8fafc;
		padding: 4rem 2rem;
	}

	.section-subtitle {
		text-align: center;
		font-size: 1.125rem;
		color: #6b7280;
		margin: 0 0 3rem 0;
		max-width: 600px;
		margin-left: auto;
		margin-right: auto;
	}

	.placements-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 2rem;
		max-width: 1200px;
		margin: 0 auto;
	}

	.placement-card {
		background: white;
		padding: 2rem;
		border-radius: 12px;
		text-align: center;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
		border: 1px solid #e5e7eb;
		transition: all 0.3s ease;
	}

	.placement-card:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 25px rgba(0, 0, 0, 0.1);
	}

	.placement-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.placement-card h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 1rem 0;
	}

	.placement-card p {
		color: #6b7280;
		line-height: 1.6;
		margin: 0;
	}

	.example-section {
		background: #1f2937;
		color: white;
		padding: 4rem 2rem;
	}

	.example-section h2 {
		color: white;
		text-align: center;
		margin-bottom: 1rem;
	}

	.example-section .section-subtitle {
		color: #d1d5db;
	}

	.example-container {
		max-width: 800px;
		margin: 0 auto;
	}

	.example-content {
		text-align: center;
	}

	.example-description {
		color: #d1d5db;
		line-height: 1.6;
		margin-bottom: 2rem;
		text-align: center;
	}

	.embedded-tv-wrapper {
		margin: 2rem 0;
		max-width: 1000px; /* Slightly larger container for 1080p content */
		margin-left: auto;
		margin-right: auto;
		padding: 0 1rem; /* Add some padding for mobile */
	}

	.example-note {
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.3);
		border-radius: 8px;
		padding: 1rem;
		color: #d1d5db;
		font-size: 0.9rem;
		line-height: 1.5;
		margin: 0;
	}

	.example-note strong {
		color: #60a5fa;
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
		.how-it-works-section,
		.placements-section,
		.example-section {
			padding: 3rem 1rem;
		}

		.features-section h2,
		.how-it-works-section h2,
		.placements-section h2,
		.example-section h2 {
			font-size: 2rem;
		}

		.features-grid,
		.placements-grid {
			grid-template-columns: 1fr;
		}

		.steps-grid {
			grid-template-columns: 1fr;
		}

		.embedded-tv-wrapper {
			margin: 1.5rem 0;
			padding: 0 0.5rem; /* Tighter padding on mobile */
			max-width: 100%; /* Ensure it doesn't overflow */
		}
	}
</style>
