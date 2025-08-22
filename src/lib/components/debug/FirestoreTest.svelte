<script>
	import { doc, setDoc, getDoc, collection, getDocs, query, where, limit, updateDoc } from 'firebase/firestore';
	import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
	import { DB, AUTH, STORAGE } from '../../firebase/config.client.js';

	let testResult = '';
	let testing = false;

	async function testFirestoreAccess() {
		testing = true;
		testResult = '';

		try {
			const user = AUTH.currentUser;
			if (!user) {
				testResult = '❌ No authenticated user found';
				return;
			}

			console.log('🔧 Testing Firestore access for user:', user.uid);
			let results = [];

			// Test 1: User document
			try {
				const userDocRef = doc(DB, 'users', user.uid);
				console.log('🔧 Testing user document access...');

				const userDoc = await getDoc(userDocRef);
				if (userDoc.exists()) {
					results.push('✅ User document read: SUCCESS');
				} else {
					// Try to create it
					await setDoc(userDocRef, {
						uid: user.uid,
						email: user.email,
						displayName: user.displayName,
						subscribed: false,
						createdAt: new Date()
					});
					results.push('✅ User document created: SUCCESS');
				}
			} catch (error) {
				results.push(`❌ User document: ${error.message}`);
			}

			// Test 2: TV document
			try {
				const tvDocRef = doc(DB, 'TVs', 'test-tv-' + user.uid);
				console.log('🔧 Testing TV document access...');

				await setDoc(tvDocRef, {
					name: 'Test TV',
					slug: 'test-tv-' + user.uid,
					ownerId: user.uid,
					ownerEmail: user.email,
					isActive: true,
					videoIds: [],
					createdAt: new Date()
				});
				results.push('✅ TV document create: SUCCESS');

				const tvDoc = await getDoc(tvDocRef);
				if (tvDoc.exists()) {
					results.push('✅ TV document read: SUCCESS');
				}
			} catch (error) {
				results.push(`❌ TV document: ${error.message}`);
			}

			// Test 3: Video document
			try {
				const videoDocRef = doc(DB, 'Videos', 'test-video-' + user.uid);
				console.log('🔧 Testing Video document access...');

				await setDoc(videoDocRef, {
					title: 'Test Video',
					ownerId: user.uid,
					ownerEmail: user.email,
					status: 'active',
					tags: ['test'],
					createdAt: new Date()
				});
				results.push('✅ Video document create: SUCCESS');

				const videoDoc = await getDoc(videoDocRef);
				if (videoDoc.exists()) {
					results.push('✅ Video document read: SUCCESS');
				}
			} catch (error) {
				results.push(`❌ Video document: ${error.message}`);
			}

			testResult = results.join('\n');

		} catch (error) {
			console.error('❌ Firestore test error:', error);
			testResult = `❌ General Firestore Error: ${error.message}`;

			if (error.code === 'permission-denied') {
				testResult += '\n\n🔧 This is a Firestore security rules issue. Update your rules with the provided configuration.';
			}
		} finally {
			testing = false;
		}
	}

	async function debugTVDocuments() {
		testing = true;
		testResult = '';

		try {
			const user = AUTH.currentUser;
			if (!user) {
				testResult = '❌ No authenticated user found';
				return;
			}

			console.log('🔧 Debugging TV documents for user:', user.uid);
			let results = [];

			// List all TV documents for this user
			try {
				const tvsCollection = collection(DB, 'TVs');
				const userTVsQuery = query(tvsCollection, where('ownerId', '==', user.uid));
				const querySnapshot = await getDocs(userTVsQuery);

				results.push(`📺 Found ${querySnapshot.size} TV documents for user`);

				querySnapshot.forEach((doc) => {
					const data = doc.data();
					results.push(`TV ID: ${doc.id}`);
					results.push(`  Name: ${data.name}`);
					results.push(`  Slug: ${data.slug}`);
					results.push(`  Owner: ${data.ownerId}`);
					results.push(`  Active: ${data.isActive}`);
					results.push(`  Videos: ${data.videoIds?.length || 0}`);
					results.push('---');
				});

				if (querySnapshot.size === 0) {
					results.push('🔍 No TV documents found. Try creating one first.');
				}

			} catch (error) {
				results.push(`❌ Error querying TVs: ${error.message}`);
				console.error('TV query error:', error);
			}

			// Test reading a specific TV by slug if any exist
			try {
				const tvsCollection = collection(DB, 'TVs');
				const allTVsSnapshot = await getDocs(tvsCollection);

				if (allTVsSnapshot.size > 0) {
					const firstTV = allTVsSnapshot.docs[0];
					const tvData = firstTV.data();
					results.push(`🔍 Testing read access to TV: ${tvData.slug}`);

					// Try to read this specific TV
					const tvDoc = await getDoc(doc(DB, 'TVs', firstTV.id));
					if (tvDoc.exists()) {
						results.push(`✅ Can read TV document: ${firstTV.id}`);
					} else {
						results.push(`❌ Cannot read TV document: ${firstTV.id}`);
					}
				}
			} catch (error) {
				results.push(`❌ Error testing TV read: ${error.message}`);
			}

			testResult = results.join('\n');

		} catch (error) {
			console.error('❌ TV debug error:', error);
			testResult = `❌ TV Debug Error: ${error.message}`;
		} finally {
			testing = false;
		}
	}

	async function testTVBySlug() {
		testing = true;
		testResult = '';

		try {
			const user = AUTH.currentUser;
			console.log('🔧 Testing TV by slug. Auth state:', user ? 'Authenticated' : 'Not authenticated');

			let results = [];

			// Test direct document access
			try {
				const tvDoc = await getDoc(doc(DB, 'TVs', 'jFkNf2ArknG7NUlF36Wg'));
				if (tvDoc.exists()) {
					const data = tvDoc.data();
					results.push(`✅ Direct document read: SUCCESS`);
					results.push(`  Name: ${data.name}`);
					results.push(`  Slug: ${data.slug}`);
					results.push(`  Active: ${data.isActive}`);
				} else {
					results.push(`❌ Direct document read: Document doesn't exist`);
				}
			} catch (error) {
				results.push(`❌ Direct document read: ${error.message}`);
			}

			// Test query by slug
			try {
				const q = query(
					collection(DB, 'TVs'),
					where('slug', '==', 'booth-1'),
					limit(1)
				);
				const querySnapshot = await getDocs(q);

				if (!querySnapshot.empty) {
					const doc = querySnapshot.docs[0];
					const data = doc.data();
					results.push(`✅ Query by slug: SUCCESS`);
					results.push(`  ID: ${doc.id}`);
					results.push(`  Name: ${data.name}`);
				} else {
					results.push(`❌ Query by slug: No documents found`);
				}
			} catch (error) {
				results.push(`❌ Query by slug: ${error.message}`);
			}

			// Test collection list
			try {
				const allTVs = await getDocs(collection(DB, 'TVs'));
				results.push(`✅ Collection list: Found ${allTVs.size} documents`);

				allTVs.docs.forEach((doc, index) => {
					const data = doc.data();
					results.push(`  ${index + 1}. ${data.name} (${data.slug})`);
				});
			} catch (error) {
				results.push(`❌ Collection list: ${error.message}`);
			}

			testResult = results.join('\n');

		} catch (error) {
			console.error('❌ TV slug test error:', error);
			testResult = `❌ Test Error: ${error.message}`;
		} finally {
			testing = false;
		}
	}

	async function fixTVDocument() {
		testing = true;
		testResult = '';

		try {
			const user = AUTH.currentUser;
			if (!user) {
				testResult = '❌ You must be logged in to fix TV documents';
				return;
			}

			let results = [];

			// Get the TV document
			const tvDoc = await getDoc(doc(DB, 'TVs', 'jFkNf2ArknG7NUlF36Wg'));

			if (!tvDoc.exists()) {
				results.push('❌ TV document not found');
				testResult = results.join('\n');
				return;
			}

			const currentData = tvDoc.data();
			results.push('📋 Current TV document:');
			results.push(`  Name: ${currentData.name}`);
			results.push(`  Slug: ${currentData.slug}`);
			results.push(`  Owner: ${currentData.ownerId}`);
			results.push(`  Active: ${currentData.isActive}`);
			results.push(`  PIN: ${currentData.pin || 'NOT SET'}`);

			// Check if fixes are needed
			const fixes = {};

			if (currentData.isActive !== true) {
				fixes.isActive = true;
				results.push('🔧 Will set isActive = true');
			}

			if (!currentData.pin) {
				fixes.pin = '1234';
				results.push('🔧 Will set default PIN = 1234');
			}

			if (Object.keys(fixes).length > 0) {
				await updateDoc(doc(DB, 'TVs', 'jFkNf2ArknG7NUlF36Wg'), fixes);
				results.push('✅ TV document updated successfully');
			} else {
				results.push('✅ TV document is already correct');
			}

			testResult = results.join('\n');

		} catch (error) {
			console.error('❌ Fix TV error:', error);
			testResult = `❌ Fix Error: ${error.message}`;
		} finally {
			testing = false;
		}
	}

	async function migrateTVCollection() {
		testing = true;
		testResult = '';

		try {
			const user = AUTH.currentUser;
			if (!user) {
				testResult = '❌ You must be logged in to migrate TV collection';
				return;
			}

			let results = [];
			results.push('🔄 Starting TV collection migration...');

			// Get all documents from old collection
			const oldCollection = await getDocs(collection(DB, 'AdultArcadeMakerTVs'));
			results.push(`📋 Found ${oldCollection.size} documents in AdultArcadeMakerTVs`);

			if (oldCollection.size === 0) {
				results.push('✅ No documents to migrate');
				testResult = results.join('\n');
				return;
			}

			// Migrate each document
			let migrated = 0;
			for (const oldDoc of oldCollection.docs) {
				try {
					const data = oldDoc.data();

					// Only migrate documents owned by current user
					if (data.ownerId === user.uid) {
						await setDoc(doc(DB, 'TVs', oldDoc.id), data);
						migrated++;
						results.push(`✅ Migrated: ${data.name} (${oldDoc.id})`);
					} else {
						results.push(`⏭️ Skipped: ${data.name} (not owned by you)`);
					}
				} catch (error) {
					results.push(`❌ Failed to migrate ${oldDoc.id}: ${error.message}`);
				}
			}

			results.push(`🎉 Migration complete! Migrated ${migrated} documents`);
			results.push('⚠️ You can now delete the old AdultArcadeMakerTVs collection manually');

			testResult = results.join('\n');

		} catch (error) {
			console.error('❌ Migration error:', error);
			testResult = `❌ Migration Error: ${error.message}`;
		} finally {
			testing = false;
		}
	}

	async function migrateVideoCollection() {
		testing = true;
		testResult = '';

		try {
			const user = AUTH.currentUser;
			if (!user) {
				testResult = '❌ You must be logged in to migrate video collection';
				return;
			}

			let results = [];
			results.push('🔄 Starting Video collection migration...');

			// Get all documents from old collection
			const oldCollection = await getDocs(collection(DB, 'AdultArcadeMakerVideos'));
			results.push(`📋 Found ${oldCollection.size} documents in AdultArcadeMakerVideos`);

			if (oldCollection.size === 0) {
				results.push('✅ No documents to migrate');
				testResult = results.join('\n');
				return;
			}

			// Migrate each document
			let migrated = 0;
			for (const oldDoc of oldCollection.docs) {
				try {
					const data = oldDoc.data();

					// Only migrate documents owned by current user
					if (data.ownerId === user.uid) {
						await setDoc(doc(DB, 'Videos', oldDoc.id), data);
						migrated++;
						results.push(`✅ Migrated: ${data.title || data.name || 'Untitled'} (${oldDoc.id})`);
					} else {
						results.push(`⏭️ Skipped: ${data.title || data.name || 'Untitled'} (not owned by you)`);
					}
				} catch (error) {
					results.push(`❌ Failed to migrate ${oldDoc.id}: ${error.message}`);
				}
			}

			results.push(`🎉 Migration complete! Migrated ${migrated} documents`);
			results.push('⚠️ You can now delete the old AdultArcadeMakerVideos collection manually');

			testResult = results.join('\n');

		} catch (error) {
			console.error('❌ Video migration error:', error);
			testResult = `❌ Video Migration Error: ${error.message}`;
		} finally {
			testing = false;
		}
	}

	async function testStorageAccess() {
		testing = true;
		testResult = '';

		try {
			const user = AUTH.currentUser;
			if (!user) {
				testResult = '❌ You must be logged in to test storage access';
				return;
			}

			let results = [];
			results.push('🔧 Testing Firebase Storage access...');
			results.push(`🔧 User ID: ${user.uid}`);
			results.push(`🔧 User Email: ${user.email}`);
			results.push(`🔧 User Verified: ${user.emailVerified}`);
			results.push(`🔧 Auth Token: ${user.accessToken ? 'Present' : 'Missing'}`);

			// Get fresh token
			try {
				const token = await user.getIdToken(true);
				results.push(`🔧 Fresh Token: ${token ? 'Retrieved' : 'Failed'}`);
			} catch (tokenError) {
				results.push(`❌ Token Error: ${tokenError.message}`);
			}

			// Create a small test file
			const testContent = new Blob(['Test video content'], { type: 'video/mp4' });
			const testFileName = `test-${Date.now()}.mp4`;

			// Test 1: Upload to new Videos path
			try {
				const videosPath = `Videos/${user.uid}/${testFileName}`;
				const videosRef = ref(STORAGE, videosPath);

				results.push(`🔧 Testing upload to: ${videosPath}`);
				await uploadBytes(videosRef, testContent);
				results.push('✅ Videos path upload: SUCCESS');

				// Get download URL
				const downloadURL = await getDownloadURL(videosRef);
				results.push(`✅ Videos path download URL: SUCCESS`);

				// Clean up
				await deleteObject(videosRef);
				results.push('✅ Videos path cleanup: SUCCESS');

			} catch (error) {
				results.push(`❌ Videos path: ${error.message}`);
			}

			// Test 2: Upload to old AdultArcadeMaker path
			try {
				const oldPath = `AdultArcadeMaker/${user.uid}/${testFileName}`;
				const oldRef = ref(STORAGE, oldPath);

				results.push(`🔧 Testing upload to: ${oldPath}`);
				await uploadBytes(oldRef, testContent);
				results.push('✅ AdultArcadeMaker path upload: SUCCESS');

				// Get download URL
				const downloadURL = await getDownloadURL(oldRef);
				results.push(`✅ AdultArcadeMaker path download URL: SUCCESS`);

				// Clean up
				await deleteObject(oldRef);
				results.push('✅ AdultArcadeMaker path cleanup: SUCCESS');

			} catch (error) {
				results.push(`❌ AdultArcadeMaker path: ${error.message}`);
			}

			testResult = results.join('\n');

		} catch (error) {
			console.error('❌ Storage test error:', error);
			testResult = `❌ Storage Test Error: ${error.message}`;
		} finally {
			testing = false;
		}
	}

	async function debugAuthentication() {
		testing = true;
		testResult = '';

		try {
			let results = [];
			results.push('🔧 Authentication Debug Report');
			results.push('================================');

			// Check current user
			const user = AUTH.currentUser;
			if (!user) {
				results.push('❌ No user currently signed in');
				results.push('🔧 Try signing out and signing back in');
				testResult = results.join('\n');
				return;
			}

			results.push(`✅ User signed in: ${user.email}`);
			results.push(`🔧 User ID: ${user.uid}`);
			results.push(`🔧 Email verified: ${user.emailVerified}`);
			results.push(`🔧 Provider: ${user.providerData[0]?.providerId || 'unknown'}`);

			// Test token
			try {
				const token = await user.getIdToken(true);
				results.push(`✅ Auth token: Retrieved (${token.length} chars)`);

				// Decode token payload (basic info)
				const payload = JSON.parse(atob(token.split('.')[1]));
				results.push(`🔧 Token issued: ${new Date(payload.iat * 1000).toLocaleString()}`);
				results.push(`🔧 Token expires: ${new Date(payload.exp * 1000).toLocaleString()}`);
				results.push(`🔧 Token audience: ${payload.aud}`);

			} catch (tokenError) {
				results.push(`❌ Token error: ${tokenError.message}`);
			}

			// Test basic Firestore connection
			try {
				results.push('🔧 Testing basic Firestore connection...');
				const testDoc = doc(DB, 'test', 'connection');
				// Just try to get metadata, don't actually read
				results.push('✅ Firestore connection: OK');
			} catch (firestoreError) {
				results.push(`❌ Firestore connection: ${firestoreError.message}`);
			}

			testResult = results.join('\n');

		} catch (error) {
			console.error('❌ Auth debug error:', error);
			testResult = `❌ Auth Debug Error: ${error.message}`;
		} finally {
			testing = false;
		}
	}

	async function testRulesDirectly() {
		testing = true;
		testResult = '';

		try {
			const user = AUTH.currentUser;
			if (!user) {
				testResult = '❌ You must be logged in to test rules';
				return;
			}

			let results = [];
			results.push('🔧 Testing Firestore Rules Directly');
			results.push('=====================================');
			results.push(`🔧 User: ${user.uid}`);

			// Test 1: Try to read the exact TV document that's failing
			try {
				results.push('🔧 Test 1: Reading TV by exact ID...');
				const tvDoc = await getDoc(doc(DB, 'TVs', 'alszVEGPYYe0xXCZN49p'));
				if (tvDoc.exists()) {
					const data = tvDoc.data();
					results.push(`✅ Direct read SUCCESS: ${data.name}`);
					results.push(`  - isActive: ${data.isActive}`);
					results.push(`  - ownerId: ${data.ownerId}`);
					results.push(`  - slug: ${data.slug}`);
				} else {
					results.push('❌ Direct read: Document does not exist');
				}
			} catch (error) {
				results.push(`❌ Direct read FAILED: ${error.message}`);
			}

			// Test 2: Try the exact query that's failing
			try {
				results.push('🔧 Test 2: Query by slug (exact same as TV page)...');
				const q = query(
					collection(DB, 'TVs'),
					where('slug', '==', 'booth-1'),
					limit(1)
				);
				const querySnapshot = await getDocs(q);

				if (!querySnapshot.empty) {
					const doc = querySnapshot.docs[0];
					const data = doc.data();
					results.push(`✅ Query SUCCESS: Found ${data.name}`);
				} else {
					results.push('❌ Query: No documents found');
				}
			} catch (error) {
				results.push(`❌ Query FAILED: ${error.message}`);
			}

			// Test 3: Try to read any document in TVs collection
			try {
				results.push('🔧 Test 3: List all TVs collection...');
				const allTVs = await getDocs(collection(DB, 'TVs'));
				results.push(`✅ Collection read SUCCESS: ${allTVs.size} documents`);
			} catch (error) {
				results.push(`❌ Collection read FAILED: ${error.message}`);
			}

			testResult = results.join('\n');

		} catch (error) {
			console.error('❌ Rules test error:', error);
			testResult = `❌ Rules Test Error: ${error.message}`;
		} finally {
			testing = false;
		}
	}
</script>

<div class="firestore-test">
	<h3>🔥 Firestore Access Test</h3>
	<p>This will test if the current user can read/write to Firestore.</p>
	
	<button
		class="test-btn"
		onclick={testFirestoreAccess}
		disabled={testing}
	>
		{testing ? 'Testing...' : 'Test Firestore Access'}
	</button>

	<button
		class="test-btn"
		onclick={debugTVDocuments}
		disabled={testing}
	>
		Debug TV Documents
	</button>

	<button
		class="test-btn"
		onclick={testTVBySlug}
		disabled={testing}
	>
		Test TV by Slug
	</button>

	<button
		class="test-btn"
		onclick={fixTVDocument}
		disabled={testing}
	>
		Fix TV Document
	</button>

	<button
		class="test-btn"
		onclick={migrateTVCollection}
		disabled={testing}
	>
		Migrate TV Collection
	</button>

	<button
		class="test-btn"
		onclick={migrateVideoCollection}
		disabled={testing}
	>
		Migrate Video Collection
	</button>

	<button
		class="test-btn"
		onclick={testStorageAccess}
		disabled={testing}
	>
		Test Storage Access
	</button>

	<button
		class="test-btn"
		onclick={debugAuthentication}
		disabled={testing}
	>
		Debug Authentication
	</button>

	<button
		class="test-btn"
		onclick={testRulesDirectly}
		disabled={testing}
	>
		Test Rules Directly
	</button>

	{#if testResult}
		<div class="test-result" class:success={testResult.includes('✅')} class:error={testResult.includes('❌')}>
			<pre>{testResult}</pre>
		</div>
	{/if}

	<div class="help-section">
		<h4>If you see permission errors:</h4>
		<ol>
			<li>Go to your Firebase Console</li>
			<li>Navigate to Firestore Database → Rules</li>
			<li>Replace the rules with:</li>
		</ol>
		<pre class="rules-code">{`rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own document
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;

      // Allow admins to read/write all user documents
      allow read, write: if request.auth != null &&
        request.auth.token.admin == true;
    }

    // Videos - users can manage their own videos
    match /Videos/{videoId} {
      // Allow read/write for document owner
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.ownerId;

      // Allow create if the user is setting themselves as owner
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.ownerId;

      // Allow admins to read/write all videos
      allow read, write: if request.auth != null &&
        request.auth.token.admin == true;
    }

    // TVs - PIN-based access
    match /TVs/{tvId} {
      // Allow read/write for document owner
      allow read, write: if request.auth != null &&
        request.auth.uid == resource.data.ownerId;

      // Allow create if the user is setting themselves as owner
      allow create: if request.auth != null &&
        request.auth.uid == request.resource.data.ownerId;

      // Allow public read for active TVs (PIN verification in app)
      allow read: if resource.data.isActive == true;

      // Allow admins to read/write all TVs
      allow read, write: if request.auth != null &&
        request.auth.token.admin == true;
    }

    // Deny all other access
    match /{document=**} {
      allow read, write: if false;
    }
  }
}`}</pre>
	</div>
</div>

<style>
	.firestore-test {
		background: white;
		border: 1px solid #e5e7eb;
		border-radius: 8px;
		padding: 1.5rem;
		margin: 1rem 0;
	}

	.firestore-test h3 {
		margin: 0 0 1rem 0;
		color: #1f2937;
	}

	.firestore-test p {
		color: #6b7280;
		margin-bottom: 1rem;
	}

	.test-btn {
		background: #3b82f6;
		color: white;
		border: none;
		padding: 0.75rem 1.5rem;
		border-radius: 6px;
		font-weight: 500;
		cursor: pointer;
		transition: background-color 0.2s;
		margin-bottom: 1rem;
	}

	.test-btn:hover:not(:disabled) {
		background: #2563eb;
	}

	.test-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.test-result {
		padding: 1rem;
		border-radius: 6px;
		margin: 1rem 0;
		font-family: monospace;
		font-size: 0.875rem;
		white-space: pre-wrap;
	}

	.test-result.success {
		background: #d1fae5;
		border: 1px solid #a7f3d0;
		color: #065f46;
	}

	.test-result.error {
		background: #fef2f2;
		border: 1px solid #fecaca;
		color: #dc2626;
	}

	.help-section {
		margin-top: 2rem;
		padding-top: 1rem;
		border-top: 1px solid #e5e7eb;
	}

	.help-section h4 {
		color: #1f2937;
		margin-bottom: 0.5rem;
	}

	.help-section ol {
		color: #6b7280;
		margin-bottom: 1rem;
	}

	.rules-code {
		background: #f3f4f6;
		border: 1px solid #d1d5db;
		border-radius: 4px;
		padding: 1rem;
		font-size: 0.75rem;
		overflow-x: auto;
		color: #374151;
	}
</style>
