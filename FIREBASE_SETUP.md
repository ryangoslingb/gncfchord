# Firebase Setup Guide for ChordShift

This guide will help you set up Firebase Authentication and Firestore for the ChordShift app.

## Table of Contents

1. [Create a Firebase Project](#1-create-a-firebase-project)
2. [Enable Authentication](#2-enable-authentication)
3. [Set Up Firestore Database](#3-set-up-firestore-database)
4. [Get Firebase Configuration](#4-get-firebase-configuration)
5. [Configure Environment Variables](#5-configure-environment-variables)
6. [Firestore Security Rules](#6-firestore-security-rules)

---

## 1. Create a Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Create a project"** (or "Add project")
3. Enter a project name (e.g., "ChordShift")
4. Choose whether to enable Google Analytics (optional)
5. Click **"Create project"**
6. Wait for the project to be created, then click **"Continue"**

---

## 2. Enable Authentication

1. In the Firebase Console, select your project
2. Click **"Authentication"** in the left sidebar (under Build)
3. Click **"Get started"**
4. Go to **"Sign-in method"** tab
5. Click on **"Email/Password"**
6. Enable **"Email/Password"** toggle
7. (Optional) Enable **"Email link (passwordless sign-in)"** if desired
8. Click **"Save"**

### Optional: Enable additional sign-in providers

- **Google Sign-in**: Click on Google, enable it, add your support email
- **Anonymous**: Enable for guest access
- **Phone**: Enable for SMS authentication

---

## 3. Set Up Firestore Database

1. In the Firebase Console, click **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose a location for your database (select the closest to your users)
4. Select **"Start in test mode"** (we'll add security rules later)
5. Click **"Enable"**

### Create Initial Collections (Optional)

The app will automatically create collections when users register. The structure will be:

```
users/
  └── {userId}/
      ├── uid: string
      ├── email: string
      ├── displayName: string
      ├── createdAt: timestamp
      └── lastLogin: timestamp
```

---

## 4. Get Firebase Configuration

1. In the Firebase Console, click the **gear icon ⚙️** next to "Project Overview"
2. Select **"Project settings"**
3. Scroll down to **"Your apps"** section
4. Click the **web icon `</>`** to add a web app
5. Enter an app nickname (e.g., "ChordShift Web")
6. (Optional) Check "Also set up Firebase Hosting"
7. Click **"Register app"**
8. Copy the Firebase configuration object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123",
};
```

---

## 5. Configure Environment Variables

1. In your project root, copy `.env.example` to `.env`:

   ```bash
   cp .env.example .env
   ```

2. Open `.env` and fill in your Firebase configuration:

   ```env
   VITE_FIREBASE_API_KEY=AIza...
   VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=your-project
   VITE_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
   VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
   VITE_FIREBASE_APP_ID=1:123456789:web:abc123
   ```

3. **Important**: Add `.env` to your `.gitignore` file to keep your credentials secret:
   ```
   .env
   .env.local
   ```

---

## 6. Firestore Security Rules

Go to **Firestore Database > Rules** and replace the default rules with:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection
    match /users/{userId} {
      // Allow users to read their own data
      allow read: if request.auth != null && request.auth.uid == userId;

      // Allow users to create their own document
      allow create: if request.auth != null && request.auth.uid == userId;

      // Allow users to update their own document
      allow update: if request.auth != null && request.auth.uid == userId;

      // Prevent deletion
      allow delete: if false;
    }

    // Songs collection (if you want to sync songs to cloud)
    match /songs/{songId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }

    // SetLists collection (if you want to sync setlists to cloud)
    match /setlists/{setlistId} {
      allow read: if request.auth != null && resource.data.userId == request.auth.uid;
      allow create: if request.auth != null && request.resource.data.userId == request.auth.uid;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

Click **"Publish"** to save the rules.

---

## Testing the Setup

1. Start the development server:

   ```bash
   npm run dev
   # or
   ionic serve
   ```

2. Navigate to `http://localhost:5173` (or your configured port)

3. You should see the Login page

4. Click **"Create Account"** to register a new user

5. After registration, you should be redirected to the home page

6. Check Firebase Console > Authentication > Users to see the new user

7. Check Firebase Console > Firestore to see the user document

---

## Troubleshooting

### "Firebase: Error (auth/configuration-not-found)"

- Make sure your `.env` file has the correct values
- Restart the development server after changing `.env`

### "Firebase: Error (auth/network-request-failed)"

- Check your internet connection
- Make sure Firebase services aren't blocked by firewall

### "Missing or insufficient permissions"

- Check Firestore Security Rules
- Make sure the user is authenticated before accessing data

### Environment variables not loading

- Vite requires `VITE_` prefix for environment variables
- Make sure the `.env` file is in the project root
- Restart the dev server after changes

---

## Additional Resources

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firebase Authentication](https://firebase.google.com/docs/auth)
- [Cloud Firestore](https://firebase.google.com/docs/firestore)
- [Firebase Security Rules](https://firebase.google.com/docs/firestore/security/get-started)

---

## Support

If you encounter any issues, please:

1. Check the browser console for error messages
2. Verify your Firebase configuration
3. Review the Firestore Security Rules
4. Check Firebase Console for any service issues
