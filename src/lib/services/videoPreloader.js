/**
 * Video Preloader Service
 * Uses browser's native video preloading to cache videos
 * Bypasses CORS issues with Firebase Storage
 */

export class VideoPreloaderService {
    constructor() {
        this.preloadedVideos = new Map();
        this.loadingPromises = new Map();
        this.onProgress = null;
        this.onComplete = null;
        this.onError = null;
        this.isPreloading = false;
        this.completedPreload = false;
    }

    /**
     * Set progress callback
     * @param {Function} callback - Called with (index, total, progress)
     */
    setProgressCallback(callback) {
        this.onProgress = callback;
    }

    /**
     * Set completion callback
     * @param {Function} callback - Called when all videos are preloaded
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
     * Preload multiple videos
     * @param {Array<string>} videoUrls - Array of video URLs to preload
     * @returns {Promise<void>}
     */
    async preloadVideos(videoUrls) {
        // Prevent multiple preload attempts
        if (this.isPreloading || this.completedPreload) {
            console.log('🎬 Preload already in progress or completed');
            return;
        }

        this.isPreloading = true;
        console.log('🎬 Starting video preload for', videoUrls.length, 'videos');

        const promises = videoUrls.map((url, index) =>
            this.preloadVideo(url, index, videoUrls.length)
        );

        try {
            await Promise.all(promises);
            console.log('✅ All videos preloaded successfully');
            this.completedPreload = true;
            this.isPreloading = false;
            this.onComplete?.();
        } catch (error) {
            console.error('❌ Error preloading videos:', error);
            this.isPreloading = false;
            this.onError?.(error, 'batch');
        }
    }

    /**
     * Preload a single video
     * @param {string} url - Video URL to preload
     * @param {number} index - Video index (for progress tracking)
     * @param {number} total - Total number of videos
     * @returns {Promise<HTMLVideoElement>}
     */
    async preloadVideo(url, index = 0, total = 1) {
        // Return cached version if available
        if (this.preloadedVideos.has(url)) {
            console.log('📦 Video already preloaded:', url);
            return this.preloadedVideos.get(url);
        }

        // Return existing loading promise if already loading
        if (this.loadingPromises.has(url)) {
            console.log('⏳ Video already loading:', url);
            return this.loadingPromises.get(url);
        }

        console.log(`🔄 Preloading video ${index + 1}/${total}:`, url);

        const loadingPromise = this.createPreloadedVideo(url, index, total);
        this.loadingPromises.set(url, loadingPromise);

        try {
            const video = await loadingPromise;
            this.preloadedVideos.set(url, video);
            this.loadingPromises.delete(url);
            
            console.log(`✅ Video ${index + 1}/${total} preloaded successfully`);
            return video;
        } catch (error) {
            this.loadingPromises.delete(url);
            console.error(`❌ Failed to preload video ${index + 1}/${total}:`, error);
            this.onError?.(error, url);
            throw error;
        }
    }

    /**
     * Create a preloaded video element
     * @param {string} url - Video URL
     * @param {number} index - Video index
     * @param {number} total - Total videos
     * @returns {Promise<HTMLVideoElement>}
     */
    createPreloadedVideo(url, index, total) {
        return new Promise((resolve, reject) => {
            const video = document.createElement('video');
            video.preload = 'auto';
            video.muted = true; // Required for autoplay policies
            video.style.display = 'none'; // Hide the preload video
            
            let progressReported = false;
            
            // Track loading progress
            const updateProgress = () => {
                if (video.buffered.length > 0 && video.duration > 0 && !progressReported) {
                    const bufferedEnd = video.buffered.end(video.buffered.length - 1);
                    const progress = (bufferedEnd / video.duration) * 100;

                    this.onProgress?.(index, total, Math.min(progress, 100));

                    if (progress >= 90) { // Consider 90% as ready
                        progressReported = true;
                        console.log(`📥 Video ${index + 1}/${total}: ${progress.toFixed(1)}% buffered`);
                    }
                }
            };

            video.addEventListener('loadstart', () => {
                console.log(`📥 Started loading video ${index + 1}/${total}`);
                this.onProgress?.(index, total, 0);
            });

            video.addEventListener('progress', updateProgress);
            video.addEventListener('loadeddata', updateProgress);
            video.addEventListener('canplay', updateProgress);

            video.addEventListener('canplaythrough', () => {
                if (!progressReported) {
                    console.log(`✅ Video ${index + 1}/${total} ready for smooth playback`);
                    this.onProgress?.(index, total, 100);
                    progressReported = true;

                    // Keep video in DOM but hidden to maintain cache
                    video.style.position = 'absolute';
                    video.style.top = '-9999px';
                    video.style.left = '-9999px';
                    video.style.width = '640px'; // Keep reasonable size for proper loading
                    video.style.height = '480px';
                    video.style.opacity = '0';
                    video.style.pointerEvents = 'none';
                    video.style.visibility = 'hidden'; // Additional hiding
                    document.body.appendChild(video);

                    // Ensure video is fully loaded
                    video.currentTime = 0;

                    resolve(video);
                }
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
        });
    }

    /**
     * Get preloaded video element
     * @param {string} url - Original video URL
     * @returns {HTMLVideoElement|null} - Preloaded video element or null
     */
    getPreloadedVideo(url) {
        return this.preloadedVideos.get(url) || null;
    }

    /**
     * Check if video is preloaded
     * @param {string} url - Video URL
     * @returns {boolean}
     */
    isVideoPreloaded(url) {
        return this.preloadedVideos.has(url);
    }

    /**
     * Get preload statistics
     * @returns {Object}
     */
    getPreloadStats() {
        return {
            preloadedVideos: this.preloadedVideos.size,
            loadingVideos: this.loadingPromises.size,
            totalProcessed: this.preloadedVideos.size + this.loadingPromises.size
        };
    }

    /**
     * Clear all preloaded videos
     */
    clearPreloadedVideos() {
        console.log('🗑️ Clearing preloaded videos');
        
        // Remove video elements from DOM
        for (const video of this.preloadedVideos.values()) {
            if (video.parentNode) {
                video.parentNode.removeChild(video);
            }
        }
        
        this.preloadedVideos.clear();
    }

    /**
     * Reset the preloader state
     */
    reset() {
        this.isPreloading = false;
        this.completedPreload = false;
        this.clearPreloadedVideos();
        this.loadingPromises.clear();
        console.log('🔄 Video preloader reset');
    }

    /**
     * Cleanup when service is destroyed
     */
    destroy() {
        this.reset();
        console.log('🗑️ Video preloader service destroyed');
    }
}

// Create singleton instance
export const videoPreloader = new VideoPreloaderService();
