import { 
    ref, 
    uploadBytesResumable, 
    getDownloadURL, 
    deleteObject,
    getMetadata
} from 'firebase/storage';
import { STORAGE } from '../firebase/config.client.js';

export class StorageService {
    static FOLDER_NAME = 'Videos';
    static THUMBNAILS_FOLDER = 'Thumbnails';
    
    static async uploadVideo(file, userId, onProgress = null) {
        try {
            // Generate unique filename
            const timestamp = Date.now();
            const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
            const fileName = `${timestamp}_${sanitizedFileName}`;
            const filePath = `${this.FOLDER_NAME}/${userId}/${fileName}`;

            console.log('🔧 StorageService.uploadVideo called');
            console.log('🔧 FOLDER_NAME:', this.FOLDER_NAME);
            console.log('🔧 Generated filePath:', filePath);
            console.log('🔧 Full upload path will be:', filePath);

            // Create storage reference
            const storageRef = ref(STORAGE, filePath);
            
            // Start upload
            const uploadTask = uploadBytesResumable(storageRef, file);
            
            return new Promise((resolve, reject) => {
                uploadTask.on(
                    'state_changed',
                    (snapshot) => {
                        // Progress callback
                        const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                        if (onProgress) {
                            onProgress({
                                progress,
                                bytesTransferred: snapshot.bytesTransferred,
                                totalBytes: snapshot.totalBytes,
                                state: snapshot.state
                            });
                        }
                    },
                    (error) => {
                        // Error callback
                        console.error('Upload error:', error);
                        reject({ success: false, error: error.message });
                    },
                    async () => {
                        // Success callback
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            const metadata = await getMetadata(uploadTask.snapshot.ref);
                            
                            resolve({
                                success: true,
                                downloadURL,
                                filePath,
                                fileName,
                                size: metadata.size,
                                contentType: metadata.contentType,
                                timeCreated: metadata.timeCreated
                            });
                        } catch (error) {
                            reject({ success: false, error: error.message });
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Upload initialization error:', error);
            return { success: false, error: error.message };
        }
    }

    static async uploadThumbnail(thumbnailBlob, userId, videoFileName) {
        try {
            // Generate thumbnail filename based on video filename
            const timestamp = Date.now();
            const baseName = videoFileName.replace(/\.[^/.]+$/, ''); // Remove extension
            const thumbnailFileName = `${baseName}_thumb.jpg`;
            const thumbnailPath = `${this.THUMBNAILS_FOLDER}/${userId}/${thumbnailFileName}`;

            console.log('🔧 Uploading thumbnail to:', thumbnailPath);

            // Create storage reference
            const storageRef = ref(STORAGE, thumbnailPath);

            // Upload thumbnail
            const uploadTask = uploadBytesResumable(storageRef, thumbnailBlob);

            return new Promise((resolve, reject) => {
                uploadTask.on('state_changed',
                    null, // No progress tracking for thumbnails
                    (error) => {
                        console.error('Thumbnail upload error:', error);
                        reject(error);
                    },
                    async () => {
                        try {
                            const downloadURL = await getDownloadURL(uploadTask.snapshot.ref);
                            console.log('✅ Thumbnail uploaded successfully:', downloadURL);
                            resolve({
                                success: true,
                                downloadURL,
                                filePath: thumbnailPath,
                                fileName: thumbnailFileName
                            });
                        } catch (error) {
                            console.error('Error getting thumbnail download URL:', error);
                            reject(error);
                        }
                    }
                );
            });
        } catch (error) {
            console.error('Thumbnail upload error:', error);
            return { success: false, error: error.message };
        }
    }

    static async deleteVideo(filePath) {
        try {
            const storageRef = ref(STORAGE, filePath);
            await deleteObject(storageRef);
            return { success: true };
        } catch (error) {
            console.error('Delete error:', error);
            return { success: false, error: error.message };
        }
    }

    static async deleteThumbnail(thumbnailURL) {
        try {
            if (!thumbnailURL) return { success: true }; // Nothing to delete

            // Extract the path from the URL
            const url = new URL(thumbnailURL);
            const pathMatch = url.pathname.match(/\/o\/(.+)\?/);
            if (!pathMatch) {
                console.warn('Could not extract path from thumbnail URL:', thumbnailURL);
                return { success: false, error: 'Invalid thumbnail URL format' };
            }

            const filePath = decodeURIComponent(pathMatch[1]);
            const storageRef = ref(STORAGE, filePath);
            await deleteObject(storageRef);
            return { success: true };
        } catch (error) {
            console.error('Thumbnail delete error:', error);
            return { success: false, error: error.message };
        }
    }

    static async deleteVideoWithThumbnail(videoFilePath, thumbnailURL) {
        const results = {
            video: { success: false },
            thumbnail: { success: false }
        };

        // Delete video file
        if (videoFilePath) {
            results.video = await this.deleteVideo(videoFilePath);
        }

        // Delete thumbnail file
        if (thumbnailURL) {
            results.thumbnail = await this.deleteThumbnail(thumbnailURL);
        }

        return {
            success: results.video.success && (results.thumbnail.success || !thumbnailURL),
            results
        };
    }

    static async getVideoMetadata(filePath) {
        try {
            const storageRef = ref(STORAGE, filePath);
            const metadata = await getMetadata(storageRef);
            return { success: true, metadata };
        } catch (error) {
            console.error('Metadata error:', error);
            return { success: false, error: error.message };
        }
    }

    static validateVideoFile(file) {
        const errors = [];
        
        // Check file type
        const allowedTypes = [
            'video/mp4',
            'video/webm',
            'video/ogg',
            'video/avi',
            'video/mov',
            'video/wmv',
            'video/flv'
        ];
        
        if (!allowedTypes.includes(file.type)) {
            errors.push('Invalid file type. Please upload a video file.');
        }
        
        // Check file size (3000MB limit)
        const maxSize = 3000 * 1024 * 1024; // 3000MB in bytes
        if (file.size > maxSize) {
            errors.push('File size too large. Maximum size is 3000MB.');
        }
        
        // Check minimum file size (1MB)
        const minSize = 1 * 1024 * 1024; // 1MB in bytes
        if (file.size < minSize) {
            errors.push('File size too small. Minimum size is 1MB.');
        }
        
        return {
            isValid: errors.length === 0,
            errors
        };
    }

    static formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    static getVideoDuration(file) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            video.preload = 'metadata';
            
            video.onloadedmetadata = () => {
                window.URL.revokeObjectURL(video.src);
                resolve(video.duration);
            };
            
            video.onerror = () => {
                resolve(null);
            };
            
            video.src = URL.createObjectURL(file);
        });
    }

    static async generateVideoThumbnail(file, timeInSeconds = 1) {
        return new Promise((resolve) => {
            const video = document.createElement('video');
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            video.onloadedmetadata = () => {
                video.currentTime = timeInSeconds;
            };
            
            video.onseeked = () => {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);
                
                canvas.toBlob((blob) => {
                    window.URL.revokeObjectURL(video.src);
                    resolve(blob);
                }, 'image/jpeg', 0.8);
            };
            
            video.onerror = () => {
                resolve(null);
            };
            
            video.src = URL.createObjectURL(file);
        });
    }
}
