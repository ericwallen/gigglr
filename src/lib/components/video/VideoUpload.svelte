<script>
	import { StorageService } from '../../services/storage.js';
	import { VideoService } from '../../services/database.js';
	import { user } from '../../stores/auth.js';
	import TagSelector from '../tags/TagSelector.svelte';

	let { onUploadComplete } = $props();

	let dragActive = $state(false);
	let uploading = $state(false);
	let uploadProgress = $state(0);
	let uploadError = $state('');
	let uploadSuccess = $state(false);

	// Form data
	let selectedFile = $state(null);
	let title = $state('');
	let description = $state('');
	let selectedTags = $state([]);
	let isPrivate = $state(false);

	// File preview data
	let filePreview = $state(null);
	let fileDuration = $state(null);
	let thumbnail = $state(null);
	let thumbnailBlob = $state(null);

	function handleDragOver(event) {
		event.preventDefault();
		dragActive = true;
	}

	function handleDragLeave(event) {
		event.preventDefault();
		dragActive = false;
	}

	function handleDrop(event) {
		event.preventDefault();
		dragActive = false;
		
		const files = event.dataTransfer.files;
		if (files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	function handleFileInput(event) {
		const files = event.target.files;
		if (files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	async function handleFileSelect(file) {
		// Validate file
		const validation = StorageService.validateVideoFile(file);
		if (!validation.isValid) {
			uploadError = validation.errors.join(' ');
			return;
		}

		selectedFile = file;
		uploadError = '';
		
		// Create preview URL
		filePreview = {
			name: file.name,
			size: StorageService.formatFileSize(file.size),
			type: file.type,
			url: URL.createObjectURL(file)
		};

		// Get video duration
		try {
			fileDuration = await StorageService.getVideoDuration(file);
		} catch (error) {
			console.error('Error getting video duration:', error);
		}

		// Generate thumbnail
		try {
			thumbnailBlob = await StorageService.generateVideoThumbnail(file);
			if (thumbnailBlob) {
				thumbnail = URL.createObjectURL(thumbnailBlob);
			}
		} catch (error) {
			console.error('Error generating thumbnail:', error);
		}

		// Auto-generate title from filename if empty
		if (!title) {
			title = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
		}
	}

	function removeFile() {
		selectedFile = null;
		title = '';
		description = '';
		selectedTags = [];
		
		if (filePreview?.url) {
			URL.revokeObjectURL(filePreview.url);
		}
		if (thumbnail) {
			URL.revokeObjectURL(thumbnail);
		}
		
		filePreview = null;
		fileDuration = null;
		thumbnail = null;
		thumbnailBlob = null;
		uploadError = '';
		uploadSuccess = false;
	}

	async function handleUpload() {
		if (!selectedFile || !title.trim() || !$user) {
			uploadError = 'Please fill in all required fields';
			return;
		}

		console.log('🔧 Starting ad content upload process...');
		console.log('🔧 User:', $user.uid);
		console.log('🔧 File:', selectedFile.name, selectedFile.size, selectedFile.type);

		uploading = true;
		uploadProgress = 0;
		uploadError = '';

		try {
			// Upload file to Firebase Storage
			console.log('🔧 Step 1: Uploading to Firebase Storage...');
			const uploadResult = await StorageService.uploadVideo(
				selectedFile,
				$user.uid,
				(progress) => {
					uploadProgress = progress.progress;
					console.log('🔧 Upload progress:', Math.round(progress.progress) + '%');
				}
			);

			if (!uploadResult.success) {
				throw new Error(uploadResult.error);
			}

			console.log('✅ Storage upload successful:', uploadResult.downloadURL);

			// Upload thumbnail if available
			let thumbnailURL = null;
			if (thumbnailBlob) {
				console.log('🔧 Step 2: Uploading thumbnail...');
				try {
					const thumbnailResult = await StorageService.uploadThumbnail(
						thumbnailBlob,
						$user.uid,
						uploadResult.fileName
					);
					if (thumbnailResult.success) {
						thumbnailURL = thumbnailResult.downloadURL;
						console.log('✅ Thumbnail upload successful:', thumbnailURL);
					} else {
						console.warn('⚠️ Thumbnail upload failed:', thumbnailResult.error);
					}
				} catch (error) {
					console.warn('⚠️ Thumbnail upload error:', error);
				}
			}

			// Create ad content document in Firestore
			console.log('🔧 Step 3: Creating Firestore document...');
			const videoData = {
				title: title.trim(),
				description: description.trim(),
				tags: selectedTags,
				ownerId: $user.uid,
				ownerEmail: $user.email,
				downloadURL: uploadResult.downloadURL,
				thumbnailURL: thumbnailURL,
				filePath: uploadResult.filePath,
				fileName: uploadResult.fileName,
				fileSize: uploadResult.size,
				contentType: uploadResult.contentType,
				duration: fileDuration,
				isPrivate,
				views: 0,
				likes: 0,
				status: 'active'
			};

			console.log('🔧 Video data to save:', videoData);

			const dbResult = await VideoService.createVideo(videoData);

			if (!dbResult.success) {
				console.error('❌ Firestore creation failed:', dbResult.error);
				// If database creation fails, try to delete the uploaded file
				console.log('🔧 Attempting to clean up uploaded file...');
				await StorageService.deleteVideo(uploadResult.filePath);
				throw new Error(dbResult.error);
			}

			console.log('✅ Firestore document created:', dbResult.id);

			uploadSuccess = true;
			onUploadComplete?.({
				id: dbResult.id,
				...videoData
			});

			// Reset form after successful upload
			setTimeout(() => {
				removeFile();
				uploadSuccess = false;
			}, 3000);

		} catch (error) {
			console.error('❌ Upload error:', error);
			console.error('❌ Error details:', {
				name: error.name,
				message: error.message,
				code: error.code,
				stack: error.stack
			});
			uploadError = error.message || 'Upload failed. Please try again.';
		} finally {
			uploading = false;
			uploadProgress = 0;
		}
	}

	function handleTagsChange(newTags) {
		selectedTags = newTags;
	}

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
</script>

<div class="video-upload">
	<div class="upload-header">
		<h2>Upload Video</h2>
		<p>Upload your video content to AdultArcadeMaker</p>
	</div>

	{#if uploadError}
		<div class="error-message">
			{uploadError}
		</div>
	{/if}

	{#if uploadSuccess}
		<div class="success-message">
			Video uploaded successfully! It will be available in your library shortly.
		</div>
	{/if}

	{#if !selectedFile}
		<!-- File Drop Zone -->
		<div
			class="drop-zone"
			class:active={dragActive}
			ondragover={handleDragOver}
			ondragleave={handleDragLeave}
			ondrop={handleDrop}
			role="button"
			tabindex="0"
		>
			<div class="drop-zone-content">
				<div class="upload-icon">📹</div>
				<h3>Drop your advertising content here</h3>
				<p>or click to browse files</p>
				<input
					type="file"
					accept="video/*"
					onchange={handleFileInput}
					class="file-input"
				/>
				<div class="file-requirements">
					<p><strong>Requirements:</strong></p>
					<ul>
						<li>Video files only (MP4, WebM, AVI, MOV, etc.)</li>
						<li>Maximum size: 3000MB</li>
						<li>Minimum size: 1MB</li>
						<li>Content must be appropriate for advertising</li>
					</ul>
				</div>
			</div>
		</div>
	{:else}
		<!-- File Preview and Form -->
		<div class="upload-form">
			<!-- File Preview -->
			<div class="file-preview">
				<div class="preview-header">
					<h3>Selected File</h3>
					<button class="remove-file-btn" onclick={removeFile}>
						Remove File
					</button>
				</div>
				
				<div class="preview-content">
					{#if thumbnail}
						<img src={thumbnail} alt="Video thumbnail" class="thumbnail" />
					{/if}
					<div class="file-info">
						<p><strong>Name:</strong> {filePreview.name}</p>
						<p><strong>Size:</strong> {filePreview.size}</p>
						<p><strong>Type:</strong> {filePreview.type}</p>
						{#if fileDuration}
							<p><strong>Duration:</strong> {formatDuration(fileDuration)}</p>
						{/if}
					</div>
				</div>
			</div>

			<!-- Upload Form -->
			<form onsubmit={(e) => { e.preventDefault(); handleUpload(); }}>
				<div class="form-group">
					<label for="title">Title *</label>
					<input
						id="title"
						type="text"
						bind:value={title}
						placeholder="Enter video title"
						required
						disabled={uploading}
					/>
				</div>

				<div class="form-group">
					<label for="description">Description</label>
					<textarea
						id="description"
						bind:value={description}
						placeholder="Enter video description (optional)"
						rows="4"
						disabled={uploading}
					></textarea>
				</div>

				<div class="form-group">
					<label>
						<input
							type="checkbox"
							bind:checked={isPrivate}
							disabled={uploading}
						/>
						Private video (only visible to you)
					</label>
				</div>

				<!-- Tags -->
				<div class="form-group">
					<TagSelector 
						{selectedTags}
						onTagsChange={handleTagsChange}
						maxTags={15}
					/>
				</div>

				<!-- Upload Progress -->
				{#if uploading}
					<div class="upload-progress">
						<div class="progress-bar">
							<div 
								class="progress-fill" 
								style="width: {uploadProgress}%"
							></div>
						</div>
						<p>Uploading... {Math.round(uploadProgress)}%</p>
					</div>
				{/if}

				<button 
					type="submit" 
					class="upload-btn"
					disabled={uploading || !title.trim()}
				>
					{uploading ? 'Uploading...' : 'Upload Video'}
				</button>
			</form>
		</div>
	{/if}
</div>

<style>
	.video-upload {
		max-width: 800px;
		margin: 0 auto;
		padding: 2rem;
	}

	.upload-header {
		text-align: center;
		margin-bottom: 2rem;
	}

	.upload-header h2 {
		font-size: 1.875rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.upload-header p {
		color: #6b7280;
	}

	.error-message {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.success-message {
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		color: #166534;
		padding: 1rem;
		border-radius: 6px;
		margin-bottom: 1rem;
	}

	.drop-zone {
		border: 2px dashed #d1d5db;
		border-radius: 12px;
		padding: 3rem 2rem;
		text-align: center;
		cursor: pointer;
		transition: all 0.2s;
		position: relative;
	}

	.drop-zone:hover,
	.drop-zone.active {
		border-color: #3b82f6;
		background: #f8fafc;
	}

	.drop-zone-content {
		pointer-events: none;
	}

	.upload-icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.drop-zone h3 {
		font-size: 1.25rem;
		font-weight: 600;
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.drop-zone p {
		color: #6b7280;
		margin-bottom: 1rem;
	}

	.file-input {
		position: absolute;
		top: 0;
		left: 0;
		width: 100%;
		height: 100%;
		opacity: 0;
		cursor: pointer;
		pointer-events: auto;
	}

	.file-requirements {
		text-align: left;
		background: #f9fafb;
		padding: 1rem;
		border-radius: 6px;
		margin-top: 1rem;
		pointer-events: auto;
	}

	.file-requirements ul {
		margin: 0.5rem 0 0 1rem;
		color: #6b7280;
		font-size: 0.875rem;
	}

	.upload-form {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 12px;
		padding: 2rem;
	}

	.file-preview {
		margin-bottom: 2rem;
		padding: 1rem;
		background: #f9fafb;
		border-radius: 8px;
	}

	.preview-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.preview-header h3 {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
	}

	.remove-file-btn {
		background: #ef4444;
		color: white;
		border: none;
		padding: 0.5rem 1rem;
		border-radius: 4px;
		cursor: pointer;
		font-size: 0.875rem;
	}

	.remove-file-btn:hover {
		background: #dc2626;
	}

	.preview-content {
		display: flex;
		gap: 1rem;
		align-items: flex-start;
	}

	.thumbnail {
		width: 120px;
		height: 68px;
		object-fit: cover;
		border-radius: 4px;
		border: 1px solid #e5e7eb;
	}

	.file-info {
		flex: 1;
	}

	.file-info p {
		margin: 0.25rem 0;
		font-size: 0.875rem;
		color: #374151;
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

	.upload-progress {
		margin-bottom: 1rem;
	}

	.progress-bar {
		width: 100%;
		height: 8px;
		background: #e5e7eb;
		border-radius: 4px;
		overflow: hidden;
		margin-bottom: 0.5rem;
	}

	.progress-fill {
		height: 100%;
		background: #3b82f6;
		transition: width 0.3s ease;
	}

	.upload-btn {
		width: 100%;
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem;
		border-radius: 6px;
		font-size: 1rem;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
	}

	.upload-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.upload-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	@media (max-width: 768px) {
		.video-upload {
			padding: 1rem;
		}

		.drop-zone {
			padding: 2rem 1rem;
		}

		.upload-form {
			padding: 1rem;
		}

		.preview-content {
			flex-direction: column;
		}

		.thumbnail {
			width: 100%;
			height: auto;
			max-width: 200px;
		}
	}
</style>
