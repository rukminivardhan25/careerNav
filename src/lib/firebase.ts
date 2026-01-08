/**
 * Firebase Authentication Setup for CareerNav
 * 
 * This file initializes Firebase App and Auth services for Google Sign-In.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com/
 * 2. Create a new project (or use existing)
 * 3. Enable Authentication > Sign-in method > Google (enable it)
 * 4. Go to Project Settings > General
 * 5. Scroll down to "Your apps" and click the web icon (</>) to register your app
 * 6. Copy the Firebase config object (apiKey, authDomain, projectId, etc.)
 * 7. Create a .env.local file in the project root with the following variables:
 *    VITE_FIREBASE_API_KEY=your_api_key_here
 *    VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain_here
 *    VITE_FIREBASE_PROJECT_ID=your_project_id_here
 *    VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket_here
 *    VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id_here
 *    VITE_FIREBASE_APP_ID=your_app_id_here
 * 8. Add .env.local to .gitignore (if not already there)
 * 
 * INSTALL FIREBASE:
 * Run: npm install firebase
 */

import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup,
  User as FirebaseUser,
  Auth 
} from "firebase/auth";

// Lazy initialization - Firebase will only be initialized when needed
let app: FirebaseApp | null = null;
let auth: Auth | null = null;
let googleProvider: GoogleAuthProvider | null = null;

/**
 * Initialize Firebase app and auth (lazy initialization)
 * Only called when Firebase is actually needed
 */
const initializeFirebase = (): { app: FirebaseApp; auth: Auth; googleProvider: GoogleAuthProvider } => {
  // Return existing instances if already initialized
  if (app && auth && googleProvider) {
    return { app, auth, googleProvider };
  }

  // Check if Firebase config is available
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  // Validate that required config values exist
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain || !firebaseConfig.projectId || !firebaseConfig.appId) {
    throw new Error(
      "Firebase configuration is incomplete. Please add Firebase config to .env.local file. " +
      "See env.example for setup instructions."
    );
  }

  // Initialize Firebase app
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize auth
  auth = getAuth(app);

  // Initialize Google Auth Provider
  googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({
    prompt: 'select_account'
  });

  return { app, auth, googleProvider };
};

/**
 * Check if Firebase is properly configured
 */
export const isFirebaseConfigured = (): boolean => {
  return !!(
    import.meta.env.VITE_FIREBASE_API_KEY &&
    import.meta.env.VITE_FIREBASE_AUTH_DOMAIN &&
    import.meta.env.VITE_FIREBASE_PROJECT_ID &&
    import.meta.env.VITE_FIREBASE_APP_ID
  );
};

/**
 * Sign in with Google using popup
 * @returns Promise<FirebaseUser> - The authenticated user object
 * @throws Error if Firebase is not configured or sign-in fails
 */
export const signInWithGoogle = async (): Promise<FirebaseUser> => {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase is not configured. Please add Firebase config to .env.local file. " +
      "See env.example and src/lib/firebase.ts for setup instructions."
    );
  }

  try {
    // Initialize Firebase if not already initialized
    const { auth: firebaseAuth, googleProvider: provider } = initializeFirebase();
    const result = await signInWithPopup(firebaseAuth, provider);
    return result.user;
  } catch (error: any) {
    // Handle specific error types
    if (error.code === 'auth/popup-closed-by-user') {
      throw new Error('Sign-in was cancelled. Please try again.');
    } else if (error.code === 'auth/popup-blocked') {
      throw new Error('Popup was blocked by browser. Please allow popups and try again.');
    } else if (error.code === 'auth/network-request-failed') {
      throw new Error('Network error. Please check your connection and try again.');
    } else if (error.code === 'auth/unauthorized-domain') {
      throw new Error(
        'Unauthorized domain. Please add "localhost" to authorized domains in Firebase Console. ' +
        'Go to: Firebase Console → Authentication → Settings → Authorized domains → Add domain: localhost'
      );
    }
    throw error;
  }
};

/**
 * Sign out the current user
 */
export const signOut = async (): Promise<void> => {
  if (!auth) {
    const { auth: firebaseAuth } = initializeFirebase();
    await firebaseAuth.signOut();
  } else {
    await auth.signOut();
  }
};

/**
 * Get the current authenticated user
 */
export const getCurrentUser = (): FirebaseUser | null => {
  if (!auth) {
    try {
      const { auth: firebaseAuth } = initializeFirebase();
      return firebaseAuth.currentUser;
    } catch {
      return null;
    }
  }
  return auth.currentUser;
};

