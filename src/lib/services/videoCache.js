/**
 * Video Cache Service
 * Handles preloading and caching of videos for offline playback
 */

export class VideoCacheService {
    constructor() {
        this.cache = new Map();
        this.loadingPromises = new Map();
        this.totalSize = 0;
        this.maxCacheSize = 2 * 1024 * 1024 * 1024; // 2GB default
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
    }

    /**
     * Set cache size limit
     * @param {number} sizeInBytes - Maximum cache size in bytes
     */
    setMaxCacheSize(sizeInBytes) {
        this.maxCacheSize = sizeInBytes;
    }

    /**
     * Set progress callback
     * @param {Function} callback - Called with (loaded, total, url)
     */
    setProgressCallback(callback) {
        this.onProgress = callback;
    }

    /**
     * Set completion callback
     * @param {Function} callback - Called when all videos are cached
     */
    setCompleteCallback(callback) {
        this.onComplete = callback;
    }

    /**
     * Set error callback
     * @param {Function} callback - Called with (error, url)
     */
    setErrorCallback(callback) {
        this.onError = callback;
    }

    /**
     * Preload and cache multiple videos
     * @param {Array<string>} videoUrls - Array of video URLs to cache
     * @returns {Promise<void>}
     */
    async preloadVideos(videoUrls) {
        console.log('🎬 Starting video preload for', videoUrls.length, 'videos');
        
        const promises = videoUrls.map((url, index) => 
            this.preloadVideo(url, index, videoUrls.length)
        );

        try {
            await Promise.all(promises);
            console.log('✅ All videos preloaded successfully');
            this.onComplete?.();
        } catch (error) {
            console.error('❌ Error preloading videos:', error);
            this.onError?.(error, 'batch');
        }
    }

    /**
     * Preload a single video
     * @param {string} url - Video URL to cache
     * @param {number} index - Video index (for progress tracking)
     * @param {number} total - Total number of videos
     * @returns {Promise<string>}
     */
    async preloadVideo(url, index = 0, total = 1) {
        // Return cached version if available
        if (this.cache.has(url)) {
            console.log('📦 Video already cached:', url);
            return this.cache.get(url);
        }

        // Return existing loading promise if already loading
        if (this.loadingPromises.has(url)) {
            console.log('⏳ Video already loading:', url);
            return this.loadingPromises.get(url);
        }

        console.log(`🔄 Preloading video ${index + 1}/${total}:`, url);

        const loadingPromise = this.downloadVideo(url, index, total);
        this.loadingPromises.set(url, loadingPromise);

        try {
            const cachedUrl = await loadingPromise;
            this.cache.set(url, cachedUrl);
            this.loadingPromises.delete(url);

            console.log(`✅ Video ${index + 1}/${total} preloaded successfully`);
            return cachedUrl;
        } catch (error) {
            this.loadingPromises.delete(url);
            console.error(`❌ Failed to cache video ${index + 1}/${total}:`, error);
            this.onError?.(error, url);
            throw error;
        }
    }

    /**
     * Download video using video element (bypasses CORS)
     * @param {string} url - Video URL
     * @param {number} index - Video index
     * @param {number} total - Total videos
     * @returns {Promise<string>} - Returns the original URL (cached in browser)
     */
    async downloadVideo(url, index, total) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.preload = 'auto';

            let progressReported = false;

            // Track loading progress
            const updateProgress = () => {
                if (video.buffered.length > 0 && !progressReported) {
                    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                    const duration = video.duration || 1;
                    const progress = (bufferedEnd / duration) * 100;

                    this.onProgress?.(bufferedEnd, duration, url, index, total, Math.min(progress, 100));

                    if (progress >= 95) { // Consider 95% as fully loaded
                        progressReported = true;
                    }
                }
            };

            video.addEventListener('loadstart', () => {
                console.log(`📥 Started loading video ${index + 1}/${total}`);
            });

            video.addEventListener('progress', updateProgress);
            video.addEventListener('canplaythrough', updateProgress);

            video.addEventListener('canplaythrough', () => {
                console.log(`✅ Video ${index + 1}/${total} ready for playback`);

                // Estimate file size (rough approximation)
                const estimatedSize = (video.duration || 60) * 1024 * 1024; // ~1MB per second
                this.totalSize += estimatedSize;

                // Store the URL as "cached" (browser handles actual caching)
                resolve(url);
            });

            video.addEventListener('error', (e) => {
                console.error(`❌ Error loading video ${index + 1}/${total}:`, e);
                reject(new Error(`Failed to load video: ${e.message || 'Unknown error'}`));
            });

            video.addEventListener('abort', () => {
                reject(new Error('Video loading was aborted'));
            });

            // Start loading
            video.src = url;
            video.load();

            // Cleanup after a timeout to prevent memory leaks
            setTimeout(() => {
                if (video.parentNode) {
                    video.parentNode.removeChild(video);
                }
            }, 30000); // 30 second timeout
        });
    }

    /**
     * Get cached video URL
     * @param {string} url - Original video URL
     * @returns {string|null} - Cached URL or null if not cached
     */
    getCachedVideoUrl(url) {
        return this.cache.get(url) || null;
    }

    /**
     * Check if video is cached
     * @param {string} url - Video URL
     * @returns {boolean}
     */
    isVideoCached(url) {
        return this.cache.has(url);
    }

    /**
     * Get cache statistics
     * @returns {Object}
     */
    getCacheStats() {
        return {
            cachedVideos: this.cache.size,
            totalSize: this.totalSize,
            maxSize: this.maxCacheSize,
            usagePercent: (this.totalSize / this.maxCacheSize) * 100,
            formattedSize: this.formatFileSize(this.totalSize),
            formattedMaxSize: this.formatFileSize(this.maxCacheSize)
        };
    }

    /**
     * Clear oldest cache entries to make room
     * @param {number} requiredSpace - Space needed in bytes
     */
    clearOldestEntries(requiredSpace) {
        const entries = Array.from(this.cache.entries());
        let freedSpace = 0;
        const estimatedSizePerVideo = 60 * 1024 * 1024; // ~60MB per video estimate

        // Simple FIFO eviction (could be improved with LRU)
        while (freedSpace < requiredSpace && entries.length > 0) {
            const [url] = entries.shift();
            this.cache.delete(url);
            this.totalSize -= estimatedSizePerVideo;
            freedSpace += estimatedSizePerVideo;
            console.log('🗑️ Evicted cached video:', url);
        }
    }

    /**
     * Clear all cached videos
     */
    clearCache() {
        console.log('🗑️ Clearing video cache');
        this.cache.clear();
        this.totalSize = 0;
    }

    /**
     * Format file size for display
     * @param {number} bytes - Size in bytes
     * @returns {string}
     */
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';
        
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    /**
     * Cleanup when service is destroyed
     */
    destroy() {
        this.clearCache();
        this.loadingPromises.clear();
        console.log('🗑️ Video cache service destroyed');
    }
}

// Create singleton instance
export const videoCache = new VideoCacheService();
