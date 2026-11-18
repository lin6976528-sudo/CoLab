import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  doc,
  getDocFromServer,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

const firestoreDatabaseId = (firebaseConfig as { firestoreDatabaseId?: string }).firestoreDatabaseId;

function createFirestoreInstance(): Firestore {
  try {
    return initializeFirestore(
      app,
      {
        experimentalAutoDetectLongPolling: true,
        localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
      },
      firestoreDatabaseId
    );
  } catch (err) {
    // Fallback if Firestore was already initialized or IndexedDB persistence is restricted
    try {
      return initializeFirestore(
        app,
        { experimentalAutoDetectLongPolling: true },
        firestoreDatabaseId
      );
    } catch {
      return firestoreDatabaseId ? getFirestore(app, firestoreDatabaseId) : getFirestore(app);
    }
  }
}

export const db = createFirestoreInstance();

async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firestore initial connection check indicates offline state; using local cache until online.');
    }
  }
}
testConnection();

export const GOOGLE_DRIVE_SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/drive.file',
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/drive.appdata',
] as const;

export function createGoogleDriveProvider(loginHint?: string | null): GoogleAuthProvider {
  const provider = new GoogleAuthProvider();
  for (const scope of GOOGLE_DRIVE_SCOPES) {
    provider.addScope(scope);
  }
  provider.setCustomParameters({
    prompt: 'consent',
    include_granted_scopes: 'true',
    ...(loginHint ? { login_hint: loginHint } : {}),
  });
  return provider;
}

export const googleProvider = createGoogleDriveProvider();
