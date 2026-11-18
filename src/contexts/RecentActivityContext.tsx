import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from './AuthContext';

export interface RecentActivityItem {
  id: string; // ID (e.g. sessionId or file identifier)
  type: 'chat' | 'file' | 'task';
  name: string; // Session title or file name
  featureId?: string; // 'chat' | 'fast-chat' | 'search' | 'maps' | 'batch-process' | etc.
  timestamp: number; // millisecond timestamp
  detail?: string; // subtopic or descriptive info
  icon?: string; // file type/format or category icon description
  content?: string; // exact content (for files) for quick loading or viewing
}

interface RecentActivityContextType {
  activities: RecentActivityItem[];
  logActivity: (item: Omit<RecentActivityItem, 'timestamp'>) => void;
  clearActivities: () => void;
}

const RecentActivityContext = createContext<RecentActivityContextType | undefined>(undefined);

export function RecentActivityProvider({ children }: { children: React.ReactNode }) {
  const { currentUser, isAuthReady } = useAuth();
  const [activities, setActivities] = useState<RecentActivityItem[]>([]);

  // Load activities from localStorage once authentication state is resolved
  useEffect(() => {
    if (!isAuthReady) return;
    if (!currentUser) {
      setActivities([]);
      return;
    }

    try {
      const storageKey = `co_recent_activities_${currentUser.uid}`;
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setActivities(JSON.parse(saved));
      } else {
        setActivities([]);
      }
    } catch (e) {
      console.error('Failed to load recent activities:', e);
      setActivities([]);
    }
  }, [currentUser, isAuthReady]);

  // Log a recent activity
  const logActivity = useCallback((item: Omit<RecentActivityItem, 'timestamp'>) => {
    if (!currentUser) return;

    setActivities((prev) => {
      // Avoid duplicate listings of same item (e.g., clicking on same chat multiple times)
      // Update its timestamp to keep it at the top of the list
      const filtered = prev.filter(
        (act) => !(act.id === item.id && act.type === item.type)
      );
      
      const newActivity: RecentActivityItem = {
        ...item,
        timestamp: Date.now(),
      };

      const updated = [newActivity, ...filtered].slice(0, 15); // keep up to 15 items in history

      try {
        const storageKey = `co_recent_activities_${currentUser.uid}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch (e) {
        console.error('Failed to save recent activities:', e);
      }

      return updated;
    });
  }, [currentUser]);

  // Clear all recorded activity items
  const clearActivities = useCallback(() => {
    if (!currentUser) return;
    try {
      const storageKey = `co_recent_activities_${currentUser.uid}`;
      localStorage.removeItem(storageKey);
      setActivities([]);
    } catch (e) {
      console.error('Failed to clear recent activities:', e);
    }
  }, [currentUser]);

  const value = useMemo(
    () => ({ activities, logActivity, clearActivities }),
    [activities, logActivity, clearActivities]
  );

  return (
    <RecentActivityContext.Provider value={value}>
      {children}
    </RecentActivityContext.Provider>
  );
}

export function useRecentActivity() {
  const context = useContext(RecentActivityContext);
  if (context === undefined) {
    throw new Error('useRecentActivity must be used within a RecentActivityProvider');
  }
  return context;
}
