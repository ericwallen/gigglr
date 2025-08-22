<script>
	import {
		ADVERTISING_TAGS,
		ALL_TAGS,
		getCategories,
		searchTags,
		formatTag,
		getSuggestedTags,
		POPULAR_TAGS
	} from '../../data/tags.js';

	let { selectedTags = [], onTagsChange, maxTags = 20, showCategories = true } = $props();

	let searchTerm = $state('');
	let activeCategory = $state('popular');
	let filteredTags = $state(POPULAR_TAGS);

	// Update filtered tags when search term or category changes
	$effect(() => {
		if (searchTerm) {
			filteredTags = searchTags(searchTerm);
		} else if (activeCategory === 'popular') {
			filteredTags = POPULAR_TAGS;
		} else if (activeCategory === 'suggested') {
			filteredTags = getSuggestedTags(selectedTags, 20);
		} else if (activeCategory === 'all') {
			filteredTags = ALL_TAGS;
		} else {
			filteredTags = ADVERTISING_TAGS[activeCategory] || [];
		}
	});

	function toggleTag(tag) {
		const isSelected = selectedTags.includes(tag);
		let newTags;

		if (isSelected) {
			newTags = selectedTags.filter(t => t !== tag);
		} else {
			if (selectedTags.length >= maxTags) {
				return; // Don't add if at max limit
			}
			newTags = [...selectedTags, tag];
		}

		onTagsChange?.(newTags);
	}

	function removeTag(tag) {
		const newTags = selectedTags.filter(t => t !== tag);
		onTagsChange?.(newTags);
	}

	function clearAllTags() {
		onTagsChange?.([]);
	}

	function setCategory(category) {
		activeCategory = category;
		searchTerm = '';
	}

	function handleSearchInput(event) {
		searchTerm = event.target.value;
		activeCategory = 'search';
	}
</script>

<div class="tag-selector">
	<div class="tag-selector-header">
		<h3>Select Tags ({selectedTags.length}/{maxTags})</h3>
		{#if selectedTags.length > 0}
			<button class="clear-all-btn" onclick={clearAllTags}>
				Clear All
			</button>
		{/if}
	</div>

	<!-- Selected Tags -->
	{#if selectedTags.length > 0}
		<div class="selected-tags">
			<h4>Selected Tags:</h4>
			<div class="tag-list">
				{#each selectedTags as tag}
					<button class="tag selected" onclick={() => removeTag(tag)}>
						{formatTag(tag)}
						<span class="remove-icon">×</span>
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Search -->
	<div class="search-section">
		<input
			type="text"
			placeholder="Search tags..."
			value={searchTerm}
			oninput={handleSearchInput}
			class="search-input"
		/>
	</div>

	<!-- Categories -->
	{#if showCategories && !searchTerm}
		<div class="categories">
			<button
				class="category-btn"
				class:active={activeCategory === 'popular'}
				onclick={() => setCategory('popular')}
			>
				Popular
			</button>
			<button
				class="category-btn"
				class:active={activeCategory === 'suggested'}
				onclick={() => setCategory('suggested')}
			>
				Suggested
			</button>
			<button
				class="category-btn"
				class:active={activeCategory === 'all'}
				onclick={() => setCategory('all')}
			>
				All Tags
			</button>
			{#each getCategories() as category}
				<button
					class="category-btn"
					class:active={activeCategory === category}
					onclick={() => setCategory(category)}
				>
					{formatTag(category)}
				</button>
			{/each}
		</div>
	{/if}

	<!-- Available Tags -->
	<div class="available-tags">
		{#if searchTerm}
			<h4>Search Results ({filteredTags.length}):</h4>
		{:else if activeCategory === 'popular'}
			<h4>Popular Tags:</h4>
		{:else if activeCategory === 'suggested'}
			<h4>Suggested Tags:</h4>
		{:else if activeCategory === 'all'}
			<h4>All Tags ({filteredTags.length}):</h4>
		{:else}
			<h4>{formatTag(activeCategory)} Tags:</h4>
		{/if}

		<div class="tag-list">
			{#each filteredTags as tag}
				{@const isSelected = selectedTags.includes(tag)}
				{@const isDisabled = !isSelected && selectedTags.length >= maxTags}
				<button
					class="tag"
					class:selected={isSelected}
					class:disabled={isDisabled}
					onclick={() => toggleTag(tag)}
					disabled={isDisabled}
				>
					{formatTag(tag)}
					{#if isSelected}
						<span class="check-icon">✓</span>
					{/if}
				</button>
			{/each}
		</div>

		{#if filteredTags.length === 0}
			<p class="no-results">No tags found matching "{searchTerm}"</p>
		{/if}
	</div>
</div>

<style>
	.tag-selector {
		background: white;
		border-radius: 8px;
		padding: 1.5rem;
		border: 1px solid #e5e7eb;
	}

	.tag-selector-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.tag-selector-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: #1f2937;
	}

	.clear-all-btn {
		background: #ef4444;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.clear-all-btn:hover {
		background: #dc2626;
	}

	.selected-tags {
		margin-bottom: 1.5rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 6px;
	}

	.selected-tags h4 {
		margin: 0 0 0.75rem 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.search-section {
		margin-bottom: 1.5rem;
	}

	.search-input {
		width: 100%;
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

	.categories {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-bottom: 1.5rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.category-btn {
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		color: #374151;
		padding: 0.5rem 1rem;
		border-radius: 20px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
	}

	.category-btn:hover {
		background: #e5e7eb;
	}

	.category-btn.active {
		background: #3b82f6;
		color: white;
		border-color: #3b82f6;
	}

	.available-tags h4 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		font-weight: 500;
		color: #374151;
	}

	.tag-list {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.tag {
		background: #f9fafb;
		border: 1px solid #d1d5db;
		color: #374151;
		padding: 0.5rem 0.75rem;
		border-radius: 20px;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		gap: 0.25rem;
	}

	.tag:hover:not(:disabled) {
		background: #e5e7eb;
		border-color: #9ca3af;
	}

	.tag.selected {
		background: #dbeafe;
		border-color: #3b82f6;
		color: #1e40af;
	}

	.tag.disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.check-icon {
		font-size: 0.75rem;
		font-weight: bold;
	}

	.remove-icon {
		font-size: 1rem;
		font-weight: bold;
		margin-left: 0.25rem;
	}

	.no-results {
		color: #6b7280;
		font-style: italic;
		text-align: center;
		padding: 2rem;
	}

	@media (max-width: 768px) {
		.tag-selector {
			padding: 1rem;
		}

		.tag-selector-header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.5rem;
		}

		.categories {
			gap: 0.25rem;
		}

		.category-btn {
			font-size: 0.75rem;
			padding: 0.375rem 0.75rem;
		}

		.tag {
			font-size: 0.75rem;
			padding: 0.375rem 0.5rem;
		}
	}
</style>
