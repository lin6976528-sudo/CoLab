import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { collection, addDoc, query, where, orderBy, onSnapshot, serverTimestamp, deleteDoc, doc, getDocs } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useAuth } from './AuthContext';
import { handleFirestoreError, isFirestoreOfflineError, OperationType } from '../utils/errorHandling';

export interface HistoryItem {
  id: string;
  userId: string;
  tool: string;
  prompt: string;
  result: string;
  model: string;
  createdAt: any;
  isError?: boolean;
  errorMessage?: string;
}

interface HistoryContextType {
  history: HistoryItem[];
  addHistoryItem: (item: Omit<HistoryItem, 'id' | 'userId' | 'createdAt'>) => Promise<void>;
  clearHistory: () => Promise<void>;
  deleteHistoryItem: (id: string) => Promise<void>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export function HistoryProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthReady } = useAuth();
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    if (!isAuthReady || !currentUser) {
      setHistory([]);
      return;
    }

    const q = query(
      collection(db, 'history'),
      where('userId', '==', currentUser.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items: HistoryItem[] = [];
      snapshot.forEach((doc) => {
        items.push({ id: doc.id, ...doc.data() } as HistoryItem);
      });
      setHistory(items);
    }, (error) => {
      if (isFirestoreOfflineError(error)) {
        console.warn('HistoryContext listener paused while offline.');
        return;
      }
      handleFirestoreError(error, OperationType.LIST, 'history', auth);
    });

    return unsubscribe;
  }, [currentUser, isAuthReady]);

  const addHistoryItem = useCallback(async (item: Omit<HistoryItem, 'id' | 'userId' | 'createdAt'>) => {
    if (!currentUser) return;
    try {
      await addDoc(collection(db, 'history'), {
        ...item,
        userId: currentUser.uid,
        createdAt: serverTimestamp(),
      });
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        console.warn('History item write deferred while offline.');
        return;
      }
      handleFirestoreError(error, OperationType.CREATE, 'history', auth);
    }
  }, [currentUser]);

  const deleteHistoryItem = useCallback(async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteDoc(doc(db, 'history', id));
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        console.warn('History item delete deferred while offline.');
        return;
      }
      handleFirestoreError(error, OperationType.DELETE, `history/${id}`, auth);
    }
  }, [currentUser]);

  const clearHistory = useCallback(async () => {
    if (!currentUser) return;
    try {
      const q = query(collection(db, 'history'), where('userId', '==', currentUser.uid));
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      if (isFirestoreOfflineError(error)) {
        console.warn('Clear history deferred while offline.');
        return;
      }
      handleFirestoreError(error, OperationType.DELETE, 'history', auth);
    }
  }, [currentUser]);

  const contextValue = useMemo(() => ({
    history,
    addHistoryItem,
    clearHistory,
    deleteHistoryItem
  }), [history, addHistoryItem, clearHistory, deleteHistoryItem]);

  return (
    <HistoryContext.Provider value={contextValue}>
      {children}
    </HistoryContext.Provider>
  );
}

export function useHistory() {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
}
