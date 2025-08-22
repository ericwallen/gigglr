<script>
	import { TVService } from '../../services/database.js';
	import { user } from '../../stores/auth.js';

	let { tvs = [], onTVCreated, onTVUpdated, onTVDeleted } = $props();

	let showCreateForm = $state(false);
	let editingTV = $state(null);
	let loading = $state(false);
	let error = $state('');
	let syncingTVs = $state(new Set()); // Track which channels are syncing
	let syncMessages = $state(new Map()); // Store sync messages per channel

	// Form data
	let name = $state('');
	let description = $state('');
	let slug = $state('');
	let pin = $state('');
	let isActive = $state(true);
	let autoGenerateSlug = $state(true);

	function openCreateForm() {
		console.log('🔧 Opening create channel form...');
		resetForm();
		showCreateForm = true;
	}

	function openEditForm(tv) {
		resetForm();
		editingTV = tv;
		name = tv.name;
		description = tv.description || '';
		slug = tv.slug;
		pin = tv.pin || '';
		isActive = tv.isActive !== false;
		autoGenerateSlug = false;
		showCreateForm = true;
	}

	function closeForm() {
		showCreateForm = false;
		editingTV = null;
		resetForm();
	}

	function resetForm() {
		name = '';
		description = '';
		slug = '';
		pin = '';
		isActive = true;
		autoGenerateSlug = true;
		error = '';
	}

	function generateSlug() {
		if (name && autoGenerateSlug) {
			slug = TVService.generateSlug(name);
		}
	}

	function handleNameInput() {
		generateSlug();
	}

	function handleSlugInput() {
		autoGenerateSlug = false;
	}

	function handlePinInput(event) {
		// Only allow digits and limit to 4 characters
		const value = event.target.value.replace(/\D/g, '').slice(0, 4);
		pin = value;
		console.log('🔧 PIN input:', { original: event.target.value, cleaned: value });
	}

	async function handleSubmit() {
		console.log('🔧 TV form submitted');
		console.log('🔧 Form data:', { name: name.trim(), slug: slug.trim(), description: description.trim(), isActive });

		if (!name.trim() || !slug.trim() || !pin.trim()) {
			error = 'Name, slug, and PIN are required';
			console.error('❌ Validation failed: Name, slug, and PIN are required');
			return;
		}

		const trimmedPin = pin.trim();
		console.log('🔧 PIN validation:', {
			original: pin,
			trimmed: trimmedPin,
			length: trimmedPin.length,
			isDigits: /^\d{4}$/.test(trimmedPin),
			charCodes: Array.from(trimmedPin).map(c => c.charCodeAt(0))
		});

		if (trimmedPin.length !== 4 || !/^\d{4}$/.test(trimmedPin)) {
			error = `PIN must be exactly 4 digits (current: "${trimmedPin}", length: ${trimmedPin.length})`;
			console.error('❌ Validation failed: PIN must be 4 digits');
			return;
		}

		if (!$user) {
			error = 'You must be logged in';
			console.error('❌ No user found');
			return;
		}

		console.log('🔧 User:', $user.uid);
		loading = true;
		error = '';

		try {
			const tvData = {
				name: name.trim(),
				description: description.trim(),
				slug: slug.trim().toLowerCase(),
				pin: pin.trim(),
				isActive,
				ownerId: $user.uid,
				ownerEmail: $user.email,
				videoIds: editingTV?.videoIds || []
			};

			console.log('🔧 Channel data to save:', tvData);

			let result;
			if (editingTV) {
				console.log('🔧 Updating existing channel:', editingTV.id);
				result = await TVService.updateTV(editingTV.id, tvData);
				if (result.success) {
					console.log('✅ Channel updated successfully');
					onTVUpdated?.({ id: editingTV.id, ...tvData });
				}
			} else {
				console.log('🔧 Creating new channel...');
				result = await TVService.createTV(tvData);
				if (result.success) {
					console.log('✅ Channel created successfully:', result.id);
					onTVCreated?.({ id: result.id, ...tvData });
				}
			}

			if (result.success) {
				closeForm();
			} else {
				console.error('❌ TV operation failed:', result.error);
				error = result.error;
			}
		} catch (err) {
			console.error('❌ TV operation error:', err);
			error = err.message || 'An error occurred';
		} finally {
			loading = false;
		}
	}

	async function handleDelete(tv) {
		if (!confirm(`Are you sure you want to delete "${tv.name}"? This action cannot be undone.`)) {
			return;
		}

		loading = true;
		error = '';

		try {
			const result = await TVService.deleteTV(tv.id);
			if (result.success) {
				onTVDeleted?.(tv.id);
			} else {
				error = result.error;
			}
		} catch (err) {
			error = err.message || 'An error occurred';
		} finally {
			loading = false;
		}
	}

	function formatDate(date) {
		if (!date) return 'Unknown';
		const d = date.toDate ? date.toDate() : new Date(date);
		return d.toLocaleDateString();
	}

	function getVideoCount(tv) {
		return tv.videoIds?.length || 0;
	}

	// Sync TV with latest data (useful after adding videos)
	async function syncTV(tv) {
		if (syncingTVs.has(tv.id)) return;

		syncingTVs.add(tv.id);
		syncMessages.set(tv.id, 'Syncing...');
		console.log('🔄 Syncing TV:', tv.name);

		try {
			// Re-fetch the channel data to get latest video list
			const result = await TVService.getTV(tv.id);
			if (result.success) {
				const updatedTV = result.tv;
				console.log('✅ Channel synced successfully:', updatedTV.name);

				// Update the channel in the parent component
				onTVUpdated?.(updatedTV);

				syncMessages.set(tv.id, `✅ Synced! ${updatedTV.videoIds?.length || 0} ads`);
			} else {
				throw new Error(result.error || 'Failed to sync channel');
			}
		} catch (err) {
			console.error('❌ Error syncing channel:', err);
			syncMessages.set(tv.id, '❌ Sync failed');
		} finally {
			syncingTVs.delete(tv.id);

			// Clear message after 3 seconds
			setTimeout(() => {
				syncMessages.delete(tv.id);
				syncMessages = new Map(syncMessages); // Trigger reactivity
			}, 3000);
		}
	}
</script>

<div class="tv-manager">
	<div class="manager-header">
		<h2>TV Management</h2>
		<button class="create-btn" onclick={openCreateForm} disabled={loading}>
			+ Create New TV
		</button>
	</div>

	{#if error}
		<div class="error-message">
			{error}
		</div>
	{/if}

	<!-- Channel List -->
	<div class="tv-list">
		{#if tvs.length === 0}
			<div class="empty-state">
				<div class="empty-icon">📺</div>
				<h3>No Channels Created Yet</h3>
				<p>Create your first advertising channel to start organizing your content.</p>
				<button class="create-btn" onclick={openCreateForm}>
					Create Your First Channel
				</button>
			</div>
		{:else}
			{#each tvs as tv}
				<div class="tv-card" class:inactive={tv.isActive === false}>
					<div class="tv-info">
						<h3>{tv.name}</h3>
						{#if tv.description}
							<p class="description">{tv.description}</p>
						{/if}
						<div class="tv-meta">
							<span class="slug">/tv/{tv.slug}</span>
							<span class="pin">PIN: {tv.pin || '****'}</span>
							<span class="video-count">{getVideoCount(tv)} ads</span>
							<span class="created-date">Created {formatDate(tv.createdAt)}</span>
							{#if tv.isActive === false}
								<span class="status inactive">Inactive</span>
							{:else}
								<span class="status active">Active</span>
							{/if}
						</div>
					</div>
					<div class="tv-actions">
						<a 
							href="/tv/{tv.slug}" 
							class="action-btn view-btn"
							target="_blank"
							rel="noopener noreferrer"
						>
							View
						</a>
						<button
							class="action-btn edit-btn"
							onclick={() => openEditForm(tv)}
							disabled={loading}
						>
							Edit
						</button>
						<button
							class="action-btn sync-btn"
							onclick={() => syncTV(tv)}
							disabled={loading || syncingTVs.has(tv.id)}
							title="Sync channel with latest ad playlist"
						>
							{syncingTVs.has(tv.id) ? '🔄' : '🔄'} Sync
						</button>
						<button
							class="action-btn delete-btn"
							onclick={() => handleDelete(tv)}
							disabled={loading}
						>
							Delete
						</button>
					</div>

					<!-- Sync Message -->
					{#if syncMessages.has(tv.id)}
						<div class="sync-message" class:success={syncMessages.get(tv.id).includes('✅')} class:error={syncMessages.get(tv.id).includes('❌')}>
							{syncMessages.get(tv.id)}
						</div>
					{/if}
				</div>
			{/each}
		{/if}
	</div>

	<!-- Create/Edit Form Modal -->
	{#if showCreateForm}
		<div class="modal-overlay" onclick={closeForm} role="button" tabindex="0" onkeydown={(e) => e.key === 'Escape' && closeForm()}>
			<div class="modal" onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.key === 'Escape' && closeForm()} role="dialog" aria-modal="true" tabindex="-1">
				<div class="modal-header">
					<h3>{editingTV ? 'Edit TV' : 'Create New TV'}</h3>
					<button class="close-btn" onclick={closeForm}>×</button>
				</div>

				<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
					<div class="form-group">
						<label for="name">TV Name *</label>
						<input
							id="name"
							type="text"
							bind:value={name}
							oninput={handleNameInput}
							placeholder="Enter TV name"
							required
							disabled={loading}
						/>
					</div>

					<div class="form-group">
						<label for="slug">URL Slug *</label>
						<div class="slug-input">
							<span class="slug-prefix">/tv/</span>
							<input
								id="slug"
								type="text"
								bind:value={slug}
								oninput={handleSlugInput}
								placeholder="url-slug"
								required
								disabled={loading}
								pattern="[a-z0-9-]+"
								title="Only lowercase letters, numbers, and hyphens allowed"
							/>
						</div>
						<p class="help-text">
							{autoGenerateSlug ? 'Auto-generated from name' : 'Custom slug'}
						</p>
					</div>

					<div class="form-group">
						<label for="pin">Access PIN *</label>
						<input
							id="pin"
							type="text"
							bind:value={pin}
							oninput={handlePinInput}
							placeholder="Enter 4-digit PIN"
							disabled={loading}
							maxlength="4"
							inputmode="numeric"
							autocomplete="off"
						/>
						<p class="help-text" class:success={pin.length === 4 && /^\d{4}$/.test(pin)}>
							{#if pin.length === 4 && /^\d{4}$/.test(pin)}
								✅ PIN is valid
							{:else if pin.length > 0}
								⚠️ PIN must be exactly 4 digits ({pin.length}/4)
							{:else}
								Users will need this PIN to access the TV
							{/if}
						</p>
					</div>

					<div class="form-group">
						<label for="description">Description</label>
						<textarea
							id="description"
							bind:value={description}
							placeholder="Enter TV description (optional)"
							rows="3"
							disabled={loading}
						></textarea>
					</div>

					<div class="form-group">
						<label class="checkbox-label">
							<input
								type="checkbox"
								bind:checked={isActive}
								disabled={loading}
							/>
							Active (Channel is accessible to viewers)
						</label>
					</div>

					<div class="form-actions">
						<button type="button" class="cancel-btn" onclick={closeForm} disabled={loading}>
							Cancel
						</button>
						<button type="submit" class="submit-btn" disabled={loading || !name.trim() || !slug.trim() || !pin.trim() || pin.trim().length !== 4 || !/^\d{4}$/.test(pin.trim())}>
							{loading ? 'Saving...' : editingTV ? 'Update Channel' : 'Create Channel'}
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
</div>

<style>
	.tv-manager {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
	}

	.manager-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 2rem;
	}

	.manager-header h2 {
		font-size: 1.875rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.create-btn {
		background: #059669;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.create-btn:hover:not(:disabled) {
		background: #047857;
	}

	.create-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.tv-list {
		display: grid;
		gap: 1rem;
	}

	.empty-state {
		text-align: center;
		padding: 4rem 2rem;
		background: #f9fafb;
		border-radius: 12px;
		border: 2px dashed #d1d5db;
	}

	.empty-icon {
		font-size: 4rem;
		margin-bottom: 1rem;
	}

	.empty-state h3 {
		font-size: 1.5rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		color: #6b7280;
		margin-bottom: 2rem;
	}

	.tv-card {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		transition: all 0.2s;
	}

	.tv-card:hover {
		box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
	}

	.tv-card.inactive {
		opacity: 0.6;
		background: #f9fafb;
	}

	.tv-info {
		flex: 1;
	}

	.tv-info h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0 0 0.5rem 0;
	}

	.description {
		color: #6b7280;
		margin: 0 0 1rem 0;
		line-height: 1.5;
	}

	.tv-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 1rem;
		font-size: 0.875rem;
	}

	.slug {
		font-family: monospace;
		background: #f3f4f6;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		color: #374151;
	}

	.pin {
		font-family: monospace;
		background: #fef3c7;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		color: #92400e;
		font-weight: 600;
	}

	.video-count {
		color: #6b7280;
	}

	.created-date {
		color: #6b7280;
	}

	.status {
		padding: 0.25rem 0.5rem;
		border-radius: 12px;
		font-size: 0.75rem;
		font-weight: 500;
	}

	.status.active {
		background: #d1fae5;
		color: #065f46;
	}

	.status.inactive {
		background: #fee2e2;
		color: #991b1b;
	}

	.tv-actions {
		display: flex;
		gap: 0.5rem;
		flex-shrink: 0;
	}

	.action-btn {
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		text-decoration: none;
		display: inline-block;
		text-align: center;
	}

	.view-btn {
		background: #3b82f6;
		color: white;
		border: 1px solid #3b82f6;
	}

	.view-btn:hover {
		background: #2563eb;
		border-color: #2563eb;
	}

	.edit-btn {
		background: #f59e0b;
		color: white;
		border: 1px solid #f59e0b;
	}

	.edit-btn:hover:not(:disabled) {
		background: #d97706;
		border-color: #d97706;
	}

	.delete-btn {
		background: #ef4444;
		color: white;
		border: 1px solid #ef4444;
	}

	.delete-btn:hover:not(:disabled) {
		background: #dc2626;
		border-color: #dc2626;
	}

	.sync-btn {
		background: #3b82f6;
		border-color: #3b82f6;
		color: white;
	}

	.sync-btn:hover:not(:disabled) {
		background: #2563eb;
		border-color: #2563eb;
	}

	.sync-btn:disabled {
		animation: pulse 1.5s infinite;
	}

	.action-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	/* Sync Message */
	.sync-message {
		margin-top: 0.5rem;
		padding: 0.5rem;
		border-radius: 4px;
		font-size: 0.8rem;
		text-align: center;
		background: #f3f4f6;
		color: #374151;
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

	/* Modal Styles */
	.modal-overlay {
		position: fixed;
		top: 0;
		left: 0;
		right: 0;
		bottom: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal {
		background: white;
		border-radius: 12px;
		width: 100%;
		max-width: 500px;
		max-height: 90vh;
		overflow-y: auto;
	}

	.modal-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 1.5rem 1.5rem 0 1.5rem;
		border-bottom: 1px solid #e5e7eb;
		margin-bottom: 1.5rem;
	}

	.modal-header h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin: 0;
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 1.5rem;
		cursor: pointer;
		color: #6b7280;
		padding: 0.25rem;
	}

	.close-btn:hover {
		color: #374151;
	}

	.modal form {
		padding: 0 1.5rem 1.5rem 1.5rem;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		font-weight: 500;
		color: #374151;
		margin-bottom: 0.5rem;
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		font-size: 1rem;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: #3b82f6;
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
	}

	.slug-input {
		display: flex;
		align-items: center;
		border: 1px solid #d1d5db;
		border-radius: 6px;
		overflow: hidden;
	}

	.slug-prefix {
		background: #f3f4f6;
		padding: 0.75rem;
		color: #6b7280;
		font-family: monospace;
		border-right: 1px solid #d1d5db;
	}

	.slug-input input {
		border: none;
		flex: 1;
		margin: 0;
	}

	.slug-input input:focus {
		box-shadow: none;
	}

	.help-text {
		font-size: 0.875rem;
		color: #6b7280;
		margin-top: 0.25rem;
		transition: color 0.2s;
	}

	.help-text.success {
		color: #059669;
		font-weight: 500;
	}

	.checkbox-label {
		display: flex !important;
		align-items: center;
		gap: 0.5rem;
		cursor: pointer;
	}

	.checkbox-label input {
		width: auto !important;
		margin: 0;
	}

	.form-actions {
		display: flex;
		gap: 1rem;
		justify-content: flex-end;
		margin-top: 2rem;
	}

	.cancel-btn {
		background: #f3f4f6;
		color: #374151;
		border: 1px solid #d1d5db;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.cancel-btn:hover:not(:disabled) {
		background: #e5e7eb;
	}

	.submit-btn {
		background: #059669;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		cursor: pointer;
		font-weight: 500;
	}

	.submit-btn:hover:not(:disabled) {
		background: #047857;
	}

	.submit-btn:disabled,
	.cancel-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.tv-manager {
			padding: 1rem;
		}

		.manager-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 1rem;
		}

		.tv-card {
			flex-direction: column;
			gap: 1rem;
		}

		.tv-actions {
			align-self: stretch;
		}

		.action-btn {
			flex: 1;
		}

		.tv-meta {
			flex-direction: column;
			gap: 0.5rem;
		}

		.modal {
			margin: 1rem;
		}

		.form-actions {
			flex-direction: column;
		}
	}
</style>
