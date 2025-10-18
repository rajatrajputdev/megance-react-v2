// Firebase configuration and exports
// Usage: ensure VITE_FIREBASE_* env vars are set
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { initializeAuth, indexedDBLocalPersistence, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, browserPopupRedirectResolver } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  // Always use the configured Firebase Auth domain. In dev, Vite proxies /__/auth to this host.
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = initializeAuth(app, {
  persistence: [
    indexedDBLocalPersistence,
    browserLocalPersistence,
    browserSessionPersistence,
    inMemoryPersistence,
  ],
  popupRedirectResolver: browserPopupRedirectResolver,
});
try { auth.useDeviceLanguage(); } catch {}

// Derive a safe storage bucket. Some envs may provide
// "<project>.firebasestorage.app" which is not a valid bucket ID.
// Firebase SDK expects the bucket ID ("<project>.appspot.com").
function resolveStorageBucket() {
  try {
    const projectId = (import.meta.env.VITE_FIREBASE_PROJECT_ID || "megance-8fc33").trim();
    let bucket = (import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "").trim();
    if (!bucket && projectId) bucket = `${projectId}.appspot.com`;
    if (bucket.endsWith(".firebasestorage.app")) {
      bucket = bucket.replace(/\.firebasestorage\.app$/i, ".appspot.com");
    }
    return bucket ? `gs://${bucket}` : undefined;
  } catch {
    return undefined;
  }
}

const storage = getStorage(app, resolveStorageBucket());

export { app, db, auth, storage };
