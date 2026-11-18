import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, signInWithPopup, signOut, onAuthStateChanged, GoogleAuthProvider } from 'firebase/auth';
import { doc, getDoc, getDocFromCache, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, googleProvider, createGoogleDriveProvider } from '../firebase';
import { handleFirestoreError, isFirestoreOfflineError, OperationType } from '../utils/errorHandling';
import { verifyDriveAccessTokenScopes } from '../services/googleDriveService';

// In-memory cache for Google OAuth access token (never store in localStorage/sessionStorage)
let inMemoryAccessToken: string | null = null;

const PROFILE_CACHE_PREFIX = 'colab_user_profile_';

interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  photoURL?: string;
  tier?: string;
  preferences?: {
    defaultModel?: string;
    tier?: string;
    usageCount?: Record<string, number>;
    emailRenewalNotification?: boolean;
    pushRenewalNotification?: boolean;
    accentColor?: string;
    pinnedFeatures?: string[];
    hiddenFeatures?: string[];
  };
  createdAt: any;
  updatedAt?: any;
}

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  isAuthReady: boolean;
  isLoggingOut: boolean;
  isLoggingIn: boolean;
  googleAccessToken: string | null;
  driveAuthError: string | null;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  connectGoogleDrive: () => Promise<string | null>;
  clearGoogleAccessToken: () => void;
  clearDriveAuthError: () => void;
  updatePreferences: (prefs: any) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function readCachedProfile(uid: string): UserProfile | null {
  try {
    const raw = localStorage.getItem(`${PROFILE_CACHE_PREFIX}${uid}`);
    return raw ? (JSON.parse(raw) as UserProfile) : null;
  } catch {
    return null;
  }
}

function writeCachedProfile(uid: string, profile: UserProfile) {
  try {
    localStorage.setItem(`${PROFILE_CACHE_PREFIX}${uid}`, JSON.stringify(profile));
  } catch {
    // Ignore storage quota errors
  }
}

function buildFallbackProfile(user: User): UserProfile {
  return {
    uid: user.uid,
    email: user.email || '',
    ...(user.displayName ? { displayName: user.displayName } : {}),
    ...(user.photoURL ? { photoURL: user.photoURL } : {}),
    createdAt: new Date().toISOString(),
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);
  const [driveAuthError, setDriveAuthError] = useState<string | null>(null);

  useEffect(() => {
    let onlineRetryHandler: (() => void) | null = null;
    let isCancelled = false;

    const clearOnlineRetry = () => {
      if (onlineRetryHandler) {
        window.removeEventListener('online', onlineRetryHandler);
        onlineRetryHandler = null;
      }
    };

    const syncUserProfile = async (user: User) => {
      const userRef = doc(db, 'users', user.uid);
      try {
        const userSnap = await getDoc(userRef);
        if (isCancelled) return;

        if (userSnap.exists()) {
          const rawData = userSnap.data() as UserProfile;
          const data: UserProfile = {
            ...rawData,
            uid: rawData.uid || user.uid,
            email: rawData.email || user.email || '',
          };
          setUserProfile(data);
          writeCachedProfile(user.uid, data);
        } else {
          const newProfile: any = {
            uid: user.uid,
            email: user.email || '',
            createdAt: serverTimestamp(),
          };
          if (user.displayName) newProfile.displayName = user.displayName;
          if (user.photoURL) newProfile.photoURL = user.photoURL;

          await setDoc(userRef, newProfile);
          if (isCancelled) return;
          const localProfile = {
            ...newProfile,
            createdAt: new Date().toISOString(),
          } as UserProfile;
          setUserProfile(localProfile);
          writeCachedProfile(user.uid, localProfile);
        }
        clearOnlineRetry();
      } catch (error) {
        if (isCancelled) return;

        if (isFirestoreOfflineError(error)) {
          console.warn('Firestore client is offline; using cached/fallback user profile and retrying when online.');
          try {
            const cachedSnap = await getDocFromCache(userRef);
            if (!isCancelled && cachedSnap.exists()) {
              const cachedData = cachedSnap.data() as UserProfile;
              setUserProfile(cachedData);
              writeCachedProfile(user.uid, cachedData);
            } else if (!isCancelled) {
              setUserProfile((prev) => prev || readCachedProfile(user.uid) || buildFallbackProfile(user));
            }
          } catch {
            if (!isCancelled) {
              setUserProfile((prev) => prev || readCachedProfile(user.uid) || buildFallbackProfile(user));
            }
          }

          clearOnlineRetry();
          onlineRetryHandler = () => {
            syncUserProfile(user);
          };
          window.addEventListener('online', onlineRetryHandler, { once: true });
          return;
        }

        try {
          handleFirestoreError(error, OperationType.GET, `users/${user.uid}`, auth);
        } catch (e) {
          console.error('Failed to fetch or create user profile:', e);
        }
        if (!isCancelled) {
          setUserProfile((prev) => prev || readCachedProfile(user.uid) || buildFallbackProfile(user));
        }
      }
    };

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      clearOnlineRetry();
      setCurrentUser(user);
      if (user) {
        // Hydrate immediately from local cache or fallback while Firestore syncs
        const cached = readCachedProfile(user.uid);
        setUserProfile(
          cached
            ? { ...cached, email: cached.email || user.email || '' }
            : buildFallbackProfile(user)
        );
        await syncUserProfile(user);
      } else {
        setUserProfile(null);
        inMemoryAccessToken = null;
        setGoogleAccessToken(null);
        setDriveAuthError(null);
      }
      if (!isCancelled) {
        setIsAuthReady(true);
      }
    });

    return () => {
      isCancelled = true;
      clearOnlineRetry();
      unsubscribe();
    };
  }, []);

  const login = useCallback(async () => {
    try {
      setIsLoggingIn(true);
      const result = await signInWithPopup(auth, googleProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      if (credential?.accessToken) {
        const scopeCheck = await verifyDriveAccessTokenScopes(credential.accessToken);
        if (scopeCheck.hasDriveScope && !scopeCheck.confirmedMissingScope) {
          inMemoryAccessToken = credential.accessToken;
          setGoogleAccessToken(credential.accessToken);
        } else {
          inMemoryAccessToken = null;
          setGoogleAccessToken(null);
        }
      }
    } catch (error: any) {
      console.error("Login error:", error);
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const clearGoogleAccessToken = useCallback(() => {
    inMemoryAccessToken = null;
    setGoogleAccessToken(null);
  }, []);

  const clearDriveAuthError = useCallback(() => {
    setDriveAuthError(null);
  }, []);

  const connectGoogleDrive = useCallback(async (): Promise<string | null> => {
    try {
      setIsLoggingIn(true);
      setDriveAuthError(null);
      const driveProvider = createGoogleDriveProvider(auth.currentUser?.email);
      const result = await signInWithPopup(auth, driveProvider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;

      if (!token) {
        setDriveAuthError('未能從 Google 取得存取憑證，請再試一次。');
        return null;
      }

      const scopeCheck = await verifyDriveAccessTokenScopes(token);
      if (scopeCheck.confirmedMissingScope) {
        inMemoryAccessToken = null;
        setGoogleAccessToken(null);
        setDriveAuthError(
          '授權未包含 Google Drive 權限。請在 Google 授權視窗中勾選「查看、編輯、建立及刪除您的所有 Google 雲端硬碟檔案」核取方塊後再點擊繼續。'
        );
        return null;
      }

      inMemoryAccessToken = token;
      setGoogleAccessToken(token);
      return token;
    } catch (error: any) {
      console.error("Google Drive Auth Error:", error);
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        setDriveAuthError(`連接 Google Drive 失敗：${error.message || '請檢查您的 Google 帳戶授權設定。'}`);
      }
      return null;
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const logout = useCallback(async () => {
    const uid = auth.currentUser?.uid;
    try {
      setIsLoggingOut(true);
      await signOut(auth);
      inMemoryAccessToken = null;
      setGoogleAccessToken(null);
      setDriveAuthError(null);
      if (uid) {
        try {
          localStorage.removeItem(`${PROFILE_CACHE_PREFIX}${uid}`);
        } catch {
          // Ignore
        }
      }
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  }, []);

  const updatePreferences = useCallback(async (prefs: any) => {
    if (!currentUser) return;
    const baseProfile = userProfile || readCachedProfile(currentUser.uid) || buildFallbackProfile(currentUser);
    const newPrefs = { ...baseProfile.preferences, ...prefs };
    const nextProfile: UserProfile = { ...baseProfile, preferences: newPrefs };

    setUserProfile(nextProfile);
    writeCachedProfile(currentUser.uid, nextProfile);

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      try {
        await updateDoc(userRef, {
          preferences: newPrefs,
          updatedAt: serverTimestamp(),
        });
      } catch (updateErr: any) {
        if (updateErr?.code === 'not-found') {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email || '',
            ...(currentUser.displayName ? { displayName: currentUser.displayName } : {}),
            ...(currentUser.photoURL ? { photoURL: currentUser.photoURL } : {}),
            preferences: newPrefs,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          throw updateErr;
        }
      }
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        console.warn('Preferences saved locally; Firestore sync deferred while offline.');
        return;
      }
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`, auth);
    }
  }, [currentUser, userProfile]);

  const contextValue = useMemo(() => ({
    currentUser,
    userProfile,
    isAuthReady,
    isLoggingOut,
    isLoggingIn,
    googleAccessToken,
    driveAuthError,
    login,
    logout,
    connectGoogleDrive,
    clearGoogleAccessToken,
    clearDriveAuthError,
    updatePreferences
  }), [
    currentUser,
    userProfile,
    isAuthReady,
    isLoggingOut,
    isLoggingIn,
    googleAccessToken,
    driveAuthError,
    login,
    logout,
    connectGoogleDrive,
    clearGoogleAccessToken,
    clearDriveAuthError,
    updatePreferences
  ]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
