import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { collection, addDoc, updateDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from './AuthContext';
import { handleFirestoreError, isFirestoreOfflineError, OperationType } from '../utils/errorHandling';

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: string; // JSON stringified array of messages
  model: string;
  featureId: string;
  createdAt: any;
  updatedAt: any;
}

export type SyncStatus = 'loading' | 'synced' | 'syncing' | 'error';

interface ChatHistoryContextType {
  chatSessions: ChatSession[];
  saveChatSession: (id: string | null, title: string, messages: any[], model: string, featureId: string) => Promise<string | null>;
  deleteChatSession: (id: string) => Promise<void>;
  clearChatHistory: () => Promise<void>;
  syncStatus: SyncStatus;
  activeChatSessionId: string | null;
  setActiveChatSessionId: (id: string | null) => void;
}

const ChatHistoryContext = createContext<ChatHistoryContextType | undefined>(undefined);

// IndexedDB utilities for offline support
const DB_NAME = 'CoLabOfflineDB';
const STORE_NAME = 'chatSessions';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB is not supported'));
      return;
    }
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event: any) => {
      const database = event.target.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

function serializeSession(session: ChatSession) {
  const serializeField = (field: any) => {
    if (!field) return null;
    if (typeof field.toDate === 'function') {
      return field.toDate().toISOString();
    }
    if (typeof field.seconds === 'number') {
      return new Date(field.seconds * 1000).toISOString();
    }
    if (field instanceof Date) {
      return field.toISOString();
    }
    return field;
  };

  return {
    ...session,
    createdAt: serializeField(session.createdAt),
    updatedAt: serializeField(session.updatedAt)
  };
}

async function saveSessionsToIndexedDB(sessions: ChatSession[]): Promise<void> {
  try {
    const database = await openDB();
    const transaction = database.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    // Synchronize current local sessions by clearing first to avoid stale sessions remaining
    await new Promise<void>((resolve, reject) => {
      const clearReq = store.clear();
      clearReq.onsuccess = () => resolve();
      clearReq.onerror = () => reject(clearReq.error);
    });

    const putPromises = sessions.map(session => {
      return new Promise<void>((resolve, reject) => {
        const serialized = serializeSession(session);
        const putReq = store.put(serialized);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      });
    });

    await Promise.all(putPromises);
  } catch (err) {
    console.error('Failed to save sessions to IndexedDB:', err);
  }
}

async function loadSessionsFromIndexedDB(): Promise<ChatSession[]> {
  try {
    const database = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result as ChatSession[]);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.warn('Failed to load sessions from IndexedDB:', err);
    return [];
  }
}

export function ChatHistoryProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthReady } = useAuth();
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('loading');
  const [activeChatSessionId, setActiveChatSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthReady || !currentUser) {
      setChatSessions([]);
      return;
    }

    setSyncStatus('loading');
    // Load initial offline sessions from IndexedDB immediately so historical lists are viewable offline
    loadSessionsFromIndexedDB()
      .then((offlineSessions) => {
        if (offlineSessions && offlineSessions.length > 0) {
          setChatSessions(prev => {
            // Keep the offline ones if we don't have fresh Firestore sessions yet
            return prev.length === 0 ? offlineSessions : prev;
          });
        }
        setSyncStatus('synced');
      })
      .catch((err) => {
        console.error('Failed to load offline sessions:', err);
        setSyncStatus('error');
      });

    const q = query(
      collection(db, 'chats'),
      where('userId', '==', currentUser.uid),
      orderBy('updatedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setSyncStatus('syncing');
      const items: ChatSession[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as ChatSession);
      });
      setChatSessions(items);
      saveSessionsToIndexedDB(items)
        .then(() => {
          setSyncStatus('synced');
        })
        .catch(() => {
          setSyncStatus('error');
        });
    }, (error) => {
      if (isFirestoreOfflineError(error)) {
        console.warn('ChatHistoryContext listener paused while offline; using local IndexedDB cache.');
        setSyncStatus('synced');
        return;
      }
      setSyncStatus('error');
      handleFirestoreError(error, OperationType.LIST, 'chats', auth);
    });

    return unsubscribe;
  }, [currentUser, isAuthReady]);

  const saveChatSession = useCallback(async (id: string | null, title: string, messages: any[], model: string, featureId: string) => {
    if (!currentUser) return null;
    
    try {
      const messagesJson = JSON.stringify(messages);
      
      if (id) {
        // Update existing
        const docRef = doc(db, 'chats', id);
        await updateDoc(docRef, {
          title,
          messages: messagesJson,
          model,
          featureId,
          updatedAt: serverTimestamp()
        });
        return id;
      } else {
        // Create new
        const docRef = await addDoc(collection(db, 'chats'), {
          userId: currentUser.uid,
          title,
          messages: messagesJson,
          model,
          featureId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
        return docRef.id;
      }
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        console.warn('Chat session write deferred while offline.');
        return null;
      }
      handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, id ? `chats/${id}` : 'chats', auth);
      return null;
    }
  }, [currentUser]);

  const deleteChatSession = useCallback(async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'chats', id));
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        console.warn('Chat session delete deferred while offline.');
        return;
      }
      handleFirestoreError(error, OperationType.DELETE, `chats/${id}`, auth);
    }
  }, [currentUser]);

  const clearChatHistory = useCallback(async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'chats'), where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        console.warn('Clear chat history deferred while offline.');
        return;
      }
      handleFirestoreError(error, OperationType.DELETE, 'chats', auth);
    }
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    chatSessions,
    saveChatSession,
    deleteChatSession,
    clearChatHistory,
    syncStatus,
    activeChatSessionId,
    setActiveChatSessionId
  }), [chatSessions, saveChatSession, deleteChatSession, clearChatHistory, syncStatus, activeChatSessionId]);

  return (
    <ChatHistoryContext.Provider value={contextValue}>
      {children}
    </ChatHistoryContext.Provider>
  );
}

export function useChatHistory() {
  const context = useContext(ChatHistoryContext);
  if (context === undefined) {
    throw new Error('useChatHistory must be used within a ChatHistoryProvider');
  }
  return context;
}
