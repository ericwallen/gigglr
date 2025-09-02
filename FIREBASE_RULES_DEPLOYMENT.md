# Firebase Security Rules Deployment Guide

This guide will help you deploy the security rules for both Firestore and Storage to enable thumbnail uploads and proper access control.

## 📋 Prerequisites

1. Firebase CLI installed (`npm install -g firebase-tools`)
2. Authenticated with Firebase (`firebase login`)
3. Firebase project initialized in your directory

## 🚀 Quick Deployment

### Option 1: Using Firebase Console (Recommended for beginners)

#### For Storage Rules:
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Select your project
3. Navigate to **Storage** → **Rules**
4. Copy the contents of `storage.rules` file
5. Paste into the rules editor
6. Click **Publish**

#### For Firestore Rules:
1. In the same Firebase Console
2. Navigate to **Firestore Database** → **Rules**
3. Copy the contents of `firestore.rules` file
4. Paste into the rules editor
5. Click **Publish**

### Option 2: Using Firebase CLI

```bash
# Initialize Firebase in your project (if not already done)
firebase init

# Deploy storage rules
firebase deploy --only storage

# Deploy firestore rules
firebase deploy --only firestore:rules

# Deploy both at once
firebase deploy --only storage,firestore:rules
```

## 🔧 What These Rules Enable

### Storage Rules (`storage.rules`)
- ✅ **Video Uploads**: Users can upload videos to `Videos/{userId}/`
- ✅ **Thumbnail Uploads**: Users can upload thumbnails to `Thumbnails/{userId}/`
- ✅ **Public Read Access**: Videos and thumbnails can be read publicly (needed for TV playback)
- ✅ **File Validation**: Enforces file size and type restrictions
- ✅ **User Isolation**: Users can only write to their own folders
- ✅ **Admin Access**: Admins can access all files

### Firestore Rules (`firestore.rules`)
- ✅ **Video Documents**: Users can manage their own video metadata
- ✅ **TV Documents**: Users can manage their own TV channels
- ✅ **Public TV Access**: ALL TVs can be read publicly (PIN verification in app)
- ✅ **Public Video Access**: ALL videos can be read publicly (needed for TV playback)
- ✅ **Data Validation**: Ensures required fields are present
- ✅ **Admin Access**: Admins can access all documents

## 🔍 File Structure Permissions

```
Storage Bucket:
├── Videos/
│   └── {userId}/
│       ├── video1.mp4 ✅ (user can read/write, public can read)
│       └── video2.mp4 ✅ (user can read/write, public can read)
├── Thumbnails/
│   └── {userId}/
│       ├── video1_thumb.jpg ✅ (user can read/write, public can read)
│       └── video2_thumb.jpg ✅ (user can read/write, public can read)
└── AdultArcadeMaker/ (legacy support)
    └── {userId}/
        └── legacy_video.mp4 ✅ (user can read/write, public can read)

Firestore:
├── Videos/{videoId} ✅ (owner can read/write, public can read all)
├── TVs/{tvId} ✅ (owner can read/write, public can read all)
└── users/{userId} ✅ (user can read/write own document)
```

## 🛡️ Security Features

### File Size Limits
- **Videos**: 1MB - 3000MB
- **Thumbnails**: 1KB - 10MB

### Allowed File Types
- **Videos**: `video/*` (mp4, webm, avi, mov, etc.)
- **Thumbnails**: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`

### Access Control
- **Authenticated Users**: Can manage their own content
- **Public Access**: Can read videos and thumbnails (needed for TV playback)
- **Admins**: Full access to all content

## 🧪 Testing the Rules

After deployment, test the rules by:

1. **Upload a video** through your app - should work ✅
2. **Upload should generate thumbnail** - should work ✅
3. **View videos in TV channels** - should work ✅
4. **Try accessing another user's files** - should fail ❌

## 🚨 Troubleshooting

### Common Issues:

1. **Permission Denied on Upload**
   - Check if user is authenticated
   - Verify file size and type restrictions
   - Ensure user is uploading to their own folder

2. **Thumbnail Not Displaying**
   - Check if thumbnail was uploaded successfully
   - Verify public read access is working
   - Check browser console for CORS errors

3. **TV Playback Issues**
   - Ensure videos have public read access
   - Check if video URLs are accessible
   - Verify TV document has correct video IDs

### Debug Commands:
```bash
# Check current rules
firebase firestore:rules:get
firebase storage:rules:get

# Test rules locally (if using emulator)
firebase emulators:start --only firestore,storage
```

## 📞 Support

If you encounter issues:
1. Check the Firebase Console for error messages
2. Review the browser console for client-side errors
3. Verify your Firebase project configuration
4. Ensure your app is using the correct project ID

The rules are designed to be secure while allowing the necessary functionality for video uploads, thumbnail generation, and TV channel playback.
