import { 
    collection, 
    doc, 
    addDoc, 
    updateDoc, 
    deleteDoc, 
    getDoc, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    startAfter,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { DB, AUTH } from '../firebase/config.client.js';

// Collections
export const COLLECTIONS = {
    USERS: 'users',
    VIDEOS: 'Videos', // Keep same collection name for compatibility
    TVS: 'TVs' // Keep same collection name for compatibility
};

// Ad Content Service (formerly Video Service)
export class VideoService {
    static async createVideo(videoData) {
        try {
            const docRef = await addDoc(collection(DB, COLLECTIONS.VIDEOS), {
                ...videoData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error creating ad content:', error);
            return { success: false, error: error.message };
        }
    }

    static async updateVideo(videoId, updates) {
        try {
            const videoRef = doc(DB, COLLECTIONS.VIDEOS, videoId);
            await updateDoc(videoRef, {
                ...updates,
                updatedAt: new Date()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating ad content:', error);
            return { success: false, error: error.message };
        }
    }

    static async deleteVideo(videoId) {
        try {
            await deleteDoc(doc(DB, COLLECTIONS.VIDEOS, videoId));
            return { success: true };
        } catch (error) {
            console.error('Error deleting video:', error);
            return { success: false, error: error.message };
        }
    }

    static async deleteVideoWithCleanup(videoId) {
        try {
            // First get the video document to get file paths
            const videoRef = doc(DB, COLLECTIONS.VIDEOS, videoId);
            const videoDoc = await getDoc(videoRef);

            if (!videoDoc.exists()) {
                return { success: false, error: 'Video not found' };
            }

            const videoData = videoDoc.data();

            // Delete the Firestore document first
            await deleteDoc(videoRef);

            // Return file paths for cleanup (to be handled by storage service)
            return {
                success: true,
                filePath: videoData.filePath,
                thumbnailURL: videoData.thumbnailURL
            };
        } catch (error) {
            console.error('Error deleting video with cleanup:', error);
            return { success: false, error: error.message };
        }
    }

    static async getVideo(videoId) {
        try {
            const videoDoc = await getDoc(doc(DB, COLLECTIONS.VIDEOS, videoId));
            if (videoDoc.exists()) {
                return { success: true, video: { id: videoDoc.id, ...videoDoc.data() } };
            } else {
                return { success: false, error: 'Video not found' };
            }
        } catch (error) {
            console.error('Error getting video:', error);
            return { success: false, error: error.message };
        }
    }

    static async getUserVideos(userId, pageSize = 20, lastDoc = null) {
        try {
            let q = query(
                collection(DB, COLLECTIONS.VIDEOS),
                where('ownerId', '==', userId),
                orderBy('createdAt', 'desc'),
                limit(pageSize)
            );

            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const querySnapshot = await getDocs(q);
            const videos = [];
            querySnapshot.forEach((doc) => {
                videos.push({ id: doc.id, ...doc.data() });
            });

            return { 
                success: true, 
                videos,
                lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null
            };
        } catch (error) {
            console.error('Error getting user videos:', error);
            return { success: false, error: error.message };
        }
    }

    static async getVideosByTags(tags, pageSize = 20, lastDoc = null) {
        try {
            let q = query(
                collection(DB, COLLECTIONS.VIDEOS),
                where('tags', 'array-contains-any', tags),
                orderBy('createdAt', 'desc'),
                limit(pageSize)
            );

            if (lastDoc) {
                q = query(q, startAfter(lastDoc));
            }

            const querySnapshot = await getDocs(q);
            const videos = [];
            querySnapshot.forEach((doc) => {
                videos.push({ id: doc.id, ...doc.data() });
            });

            return { 
                success: true, 
                videos,
                lastDoc: querySnapshot.docs[querySnapshot.docs.length - 1] || null
            };
        } catch (error) {
            console.error('Error getting videos by tags:', error);
            return { success: false, error: error.message };
        }
    }

    static async searchVideos(searchTerm, userId, pageSize = 20) {
        try {
            // Note: This is a basic search. For production, consider using Algolia or similar
            const q = query(
                collection(DB, COLLECTIONS.VIDEOS),
                where('ownerId', '==', userId),
                orderBy('title'),
                limit(pageSize)
            );

            const querySnapshot = await getDocs(q);
            const videos = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                if (data.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    data.description?.toLowerCase().includes(searchTerm.toLowerCase())) {
                    videos.push({ id: doc.id, ...data });
                }
            });

            return { success: true, videos };
        } catch (error) {
            console.error('Error searching videos:', error);
            return { success: false, error: error.message };
        }
    }
}

// TV Service
export class TVService {
    static async createTV(tvData) {
        try {
            // Check if slug is unique
            const existingTV = await this.getTVBySlug(tvData.slug);
            if (existingTV.success) {
                return { success: false, error: 'Slug already exists' };
            }

            const docRef = await addDoc(collection(DB, COLLECTIONS.TVS), {
                ...tvData,
                createdAt: new Date(),
                updatedAt: new Date()
            });
            return { success: true, id: docRef.id };
        } catch (error) {
            console.error('Error creating TV:', error);
            return { success: false, error: error.message };
        }
    }

    static async updateTV(tvId, updates) {
        try {
            const tvRef = doc(DB, COLLECTIONS.TVS, tvId);
            await updateDoc(tvRef, {
                ...updates,
                updatedAt: new Date()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating TV:', error);
            return { success: false, error: error.message };
        }
    }

    static async deleteTV(tvId) {
        try {
            await deleteDoc(doc(DB, COLLECTIONS.TVS, tvId));
            return { success: true };
        } catch (error) {
            console.error('Error deleting TV:', error);
            return { success: false, error: error.message };
        }
    }

    static async getTV(tvId) {
        try {
            const tvDoc = await getDoc(doc(DB, COLLECTIONS.TVS, tvId));
            if (tvDoc.exists()) {
                return { success: true, tv: { id: tvDoc.id, ...tvDoc.data() } };
            } else {
                return { success: false, error: 'TV not found' };
            }
        } catch (error) {
            console.error('Error getting TV:', error);
            return { success: false, error: error.message };
        }
    }

    static async getTVBySlug(slug) {
        try {
            console.log('🔧 getTVBySlug called with slug:', slug);
            console.log('🔧 Current auth state:', AUTH.currentUser ? 'Authenticated' : 'Not authenticated');
            console.log('🔧 User ID:', AUTH.currentUser?.uid);
            console.log('🔧 COLLECTIONS.TVS value:', COLLECTIONS.TVS);
            console.log('🔧 Will query collection:', COLLECTIONS.TVS);

            const q = query(
                collection(DB, COLLECTIONS.TVS),
                where('slug', '==', slug),
                limit(1)
            );

            console.log('🔧 Executing Firestore query...');
            const querySnapshot = await getDocs(q);
            console.log('🔧 Query completed. Empty:', querySnapshot.empty, 'Size:', querySnapshot.size);

            if (!querySnapshot.empty) {
                const doc = querySnapshot.docs[0];
                const tvData = doc.data();
                console.log('✅ TV found:', {
                    id: doc.id,
                    name: tvData.name,
                    slug: tvData.slug,
                    ownerId: tvData.ownerId,
                    isActive: tvData.isActive,
                    hasPin: !!tvData.pin
                });
                return { success: true, tv: { id: doc.id, ...tvData } };
            } else {
                console.log('❌ No TV found with slug:', slug);
                return { success: false, error: 'TV not found' };
            }
        } catch (error) {
            console.error('❌ Error getting TV by slug:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            return { success: false, error: error.message };
        }
    }

    static async getUserTVs(userId) {
        try {
            const q = query(
                collection(DB, COLLECTIONS.TVS),
                where('ownerId', '==', userId),
                orderBy('createdAt', 'desc')
            );

            const querySnapshot = await getDocs(q);
            const tvs = [];
            querySnapshot.forEach((doc) => {
                tvs.push({ id: doc.id, ...doc.data() });
            });

            return { success: true, tvs };
        } catch (error) {
            console.error('Error getting user TVs:', error);
            return { success: false, error: error.message };
        }
    }

    static async addVideoToTV(tvId, videoId) {
        try {
            const tvRef = doc(DB, COLLECTIONS.TVS, tvId);

            // Get current TV data to append to videoIds array
            const tvDoc = await getDoc(tvRef);
            if (!tvDoc.exists()) {
                return { success: false, error: 'TV not found' };
            }

            const currentVideoIds = tvDoc.data().videoIds || [];
            const updatedVideoIds = [...currentVideoIds, videoId]; // Allow duplicates

            await updateDoc(tvRef, {
                videoIds: updatedVideoIds,
                updatedAt: new Date()
            });
            return { success: true };
        } catch (error) {
            console.error('Error adding video to TV:', error);
            return { success: false, error: error.message };
        }
    }

    static async removeVideoFromTV(tvId, videoId, removeAll = false) {
        try {
            const tvRef = doc(DB, COLLECTIONS.TVS, tvId);

            if (removeAll) {
                // Remove all instances of this video
                await updateDoc(tvRef, {
                    videoIds: arrayRemove(videoId),
                    updatedAt: new Date()
                });
            } else {
                // Remove only the first instance of this video
                const tvDoc = await getDoc(tvRef);
                if (!tvDoc.exists()) {
                    return { success: false, error: 'TV not found' };
                }

                const currentVideoIds = tvDoc.data().videoIds || [];
                const indexToRemove = currentVideoIds.indexOf(videoId);

                if (indexToRemove !== -1) {
                    const updatedVideoIds = [...currentVideoIds];
                    updatedVideoIds.splice(indexToRemove, 1); // Remove first occurrence

                    await updateDoc(tvRef, {
                        videoIds: updatedVideoIds,
                        updatedAt: new Date()
                    });
                }
            }

            return { success: true };
        } catch (error) {
            console.error('Error removing video from TV:', error);
            return { success: false, error: error.message };
        }
    }

    static async updateVideoOrder(tvId, newVideoIds) {
        try {
            const tvRef = doc(DB, COLLECTIONS.TVS, tvId);
            await updateDoc(tvRef, {
                videoIds: newVideoIds,
                updatedAt: new Date()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating video order:', error);
            return { success: false, error: error.message };
        }
    }

    static async cleanupTVVideoReferences(tvId, videoIds) {
        try {
            console.log('🧹 Cleaning up TV video references for TV:', tvId);

            // Check which videos still exist
            const validVideoIds = [];
            const invalidVideoIds = [];

            for (const videoId of videoIds) {
                const videoRef = doc(DB, COLLECTIONS.VIDEOS, videoId);
                const videoDoc = await getDoc(videoRef);

                if (videoDoc.exists()) {
                    validVideoIds.push(videoId);
                } else {
                    invalidVideoIds.push(videoId);
                    console.log('❌ Found invalid video reference:', videoId);
                }
            }

            // Update TV with only valid video IDs if any were removed
            if (invalidVideoIds.length > 0) {
                console.log(`🔧 Removing ${invalidVideoIds.length} invalid video references`);
                const tvRef = doc(DB, COLLECTIONS.TVS, tvId);
                await updateDoc(tvRef, {
                    videoIds: validVideoIds,
                    updatedAt: new Date()
                });

                return {
                    success: true,
                    cleaned: true,
                    removedCount: invalidVideoIds.length,
                    validVideoIds,
                    invalidVideoIds
                };
            }

            return {
                success: true,
                cleaned: false,
                validVideoIds
            };

        } catch (error) {
            console.error('Error cleaning up TV video references:', error);
            return { success: false, error: error.message };
        }
    }

    static generateSlug(name) {
        return name
            .toLowerCase()
            .replace(/[^a-z0-9\s-]/g, '')
            .replace(/\s+/g, '-')
            .replace(/-+/g, '-')
            .trim('-');
    }
}

// User Service
export class UserService {
    static async getAllUsers(pageSize = 50) {
        try {
            const q = query(
                collection(DB, COLLECTIONS.USERS),
                orderBy('createdAt', 'desc'),
                limit(pageSize)
            );

            const querySnapshot = await getDocs(q);
            const users = [];
            querySnapshot.forEach((doc) => {
                users.push({ id: doc.id, ...doc.data() });
            });

            return { success: true, users };
        } catch (error) {
            console.error('Error getting all users:', error);
            return { success: false, error: error.message };
        }
    }

    static async updateUserSubscription(userId, subscribed) {
        try {
            const userRef = doc(DB, COLLECTIONS.USERS, userId);
            await updateDoc(userRef, { 
                subscribed,
                updatedAt: new Date()
            });
            return { success: true };
        } catch (error) {
            console.error('Error updating user subscription:', error);
            return { success: false, error: error.message };
        }
    }
}
