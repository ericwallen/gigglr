import { writable } from 'svelte/store';
import { 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    GoogleAuthProvider,
    signInWithPopup
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { AUTH, DB } from '../firebase/config.client.js';

// Auth store
export const user = writable(null);
export const loading = writable(true);
export const isSubscribed = writable(false);
export const isAdmin = writable(false);

// Initialize auth state listener
let unsubscribe = null;

export function initAuth() {
    if (unsubscribe) return;

    console.log('🔧 Initializing auth...');

    unsubscribe = onAuthStateChanged(AUTH, async (firebaseUser) => {
        console.log('🔧 Auth state changed:', firebaseUser ? 'User signed in' : 'User signed out');
        loading.set(true);

        if (firebaseUser) {
            try {
                console.log('🔧 Firebase user:', {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName
                });

                // Get user document from Firestore
                const userDocRef = doc(DB, 'users', firebaseUser.uid);
                console.log('🔧 Getting user document...');
                const userDoc = await getDoc(userDocRef);

                let userData = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    subscribed: false,
                    createdAt: new Date()
                };

                if (userDoc.exists()) {
                    console.log('🔧 User document exists, merging data...');
                    userData = { ...userData, ...userDoc.data() };
                } else {
                    console.log('🔧 Creating new user document...');
                    // Create user document if it doesn't exist
                    try {
                        await setDoc(userDocRef, userData);
                        console.log('✅ User document created successfully');
                    } catch (docError) {
                        console.error('❌ Error creating user document:', docError);
                        // Continue anyway with the user data we have
                    }
                }

                // Check for admin custom claim
                console.log('🔧 Checking admin claims...');
                const tokenResult = await firebaseUser.getIdTokenResult();
                const adminClaim = tokenResult.claims.admin === true;
                console.log('🔧 Admin claim:', adminClaim);

                console.log('🔧 Setting user data:', userData);
                user.set(userData);
                isSubscribed.set(userData.subscribed || false);
                isAdmin.set(adminClaim);

                console.log('✅ Auth initialization complete');
            } catch (error) {
                console.error('❌ Error in auth initialization:', error);
                // Set basic user data even if Firestore fails
                const basicUserData = {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    displayName: firebaseUser.displayName,
                    subscribed: false,
                    createdAt: new Date()
                };
                user.set(basicUserData);
                isSubscribed.set(false);
                isAdmin.set(false);
            }
        } else {
            console.log('🔧 No user, clearing auth state');
            user.set(null);
            isSubscribed.set(false);
            isAdmin.set(false);
        }

        loading.set(false);
    });
}

export async function loginWithEmail(email, password) {
    try {
        loading.set(true);
        const result = await signInWithEmailAndPassword(AUTH, email, password);
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: error.message };
    } finally {
        loading.set(false);
    }
}

export async function registerWithEmail(email, password, displayName = '') {
    try {
        loading.set(true);
        const result = await createUserWithEmailAndPassword(AUTH, email, password);
        
        // Create user document in Firestore
        const userData = {
            uid: result.user.uid,
            email: result.user.email,
            displayName: displayName || result.user.displayName || '',
            subscribed: false,
            createdAt: new Date()
        };
        
        await setDoc(doc(DB, 'users', result.user.uid), userData);
        
        return { success: true, user: result.user };
    } catch (error) {
        console.error('Registration error:', error);
        return { success: false, error: error.message };
    } finally {
        loading.set(false);
    }
}

export async function loginWithGoogle() {
    try {
        console.log('🔧 Starting Google login...');
        loading.set(true);
        const provider = new GoogleAuthProvider();
        console.log('🔧 Attempting sign in with popup...');
        const result = await signInWithPopup(AUTH, provider);
        console.log('✅ Google login successful:', result.user.email);
        return { success: true, user: result.user };
    } catch (error) {
        console.error('❌ Google login error:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        return { success: false, error: error.message };
    } finally {
        loading.set(false);
    }
}

export async function logout() {
    try {
        await signOut(AUTH);
        return { success: true };
    } catch (error) {
        console.error('Logout error:', error);
        return { success: false, error: error.message };
    }
}

export async function updateUserSubscription(userId, subscribed) {
    try {
        const userDocRef = doc(DB, 'users', userId);
        await updateDoc(userDocRef, { subscribed });
        
        // Update local store if it's the current user
        const currentUser = AUTH.currentUser;
        if (currentUser && currentUser.uid === userId) {
            isSubscribed.set(subscribed);
        }
        
        return { success: true };
    } catch (error) {
        console.error('Error updating subscription:', error);
        return { success: false, error: error.message };
    }
}

// Cleanup function
export function destroyAuth() {
    if (unsubscribe) {
        unsubscribe();
        unsubscribe = null;
    }
}
