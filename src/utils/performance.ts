/**
 * High-performance utility functions for application-wide optimization
 */

export function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  const debounced = function (this: any, ...args: Parameters<T>) {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => {
      func.apply(this, args);
    }, wait);
  } as T;
  return debounced;
}

export function throttle<T extends (...args: any[]) => void>(func: T, limit: number): T {
  let inThrottle = false;
  return function (this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  } as T;
}

export interface StorageStats {
  localStorageKB: number;
  sessionStorageKB: number;
  totalMB: number;
  itemCount: number;
}

export function calculateStorageUsage(): StorageStats {
  let localStorageBytes = 0;
  let sessionStorageBytes = 0;
  let itemCount = 0;

  if (typeof window !== 'undefined') {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const value = localStorage.getItem(key) || '';
          localStorageBytes += (key.length + value.length) * 2;
          itemCount++;
        }
      }
    } catch (e) {
      // Ignore security access errors in restricted iframes
    }

    try {
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key) {
          const value = sessionStorage.getItem(key) || '';
          sessionStorageBytes += (key.length + value.length) * 2;
          itemCount++;
        }
      }
    } catch (e) {
      // Ignore
    }
  }

  const localStorageKB = Math.round((localStorageBytes / 1024) * 10) / 10;
  const sessionStorageKB = Math.round((sessionStorageBytes / 1024) * 10) / 10;
  const totalMB = Math.round(((localStorageBytes + sessionStorageBytes) / (1024 * 1024)) * 100) / 100;

  return {
    localStorageKB,
    sessionStorageKB,
    totalMB,
    itemCount,
  };
}

/**
 * Prune stale or excessively large cache entries from localStorage to improve startup JSON parse speed
 */
export function pruneStaleLocalStorage(maxTotalMB = 4): { prunedCount: number; freedKB: number } {
  if (typeof window === 'undefined') return { prunedCount: 0, freedKB: 0 };

  let prunedCount = 0;
  let freedBytes = 0;

  try {
    const usage = calculateStorageUsage();
    if (usage.totalMB < maxTotalMB) {
      return { prunedCount: 0, freedKB: 0 };
    }

    // Identifiers for transient or oversized cache keys that can be pruned safely
    const prunablePrefixes = [
      'colab_chat_cache_',
      'temp_preview_',
      'ai_draft_',
      'canvas_undo_history_',
      'image_preview_cache_'
    ];

    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i);
      if (key) {
        const matchesPrefix = prunablePrefixes.some(p => key.startsWith(p));
        if (matchesPrefix) {
          const val = localStorage.getItem(key) || '';
          freedBytes += (key.length + val.length) * 2;
          localStorage.removeItem(key);
          prunedCount++;
        }
      }
    }
  } catch (e) {
    console.warn('[PerformanceOptimizer] Cache prune skipped:', e);
  }

  return {
    prunedCount,
    freedKB: Math.round((freedBytes / 1024) * 10) / 10,
  };
}

/**
 * Trigger garbage collection hint for URL Object URLs and temporary references
 */
export function triggerMemoryCleanup(): { cleanedUrls: number } {
  let cleanedUrls = 0;
  try {
    if (typeof window !== 'undefined' && (window as any).__colab_temp_object_urls__) {
      const urls: string[] = (window as any).__colab_temp_object_urls__ || [];
      urls.forEach(url => {
        try {
          URL.revokeObjectURL(url);
          cleanedUrls++;
        } catch (e) {
          // ignore
        }
      });
      (window as any).__colab_temp_object_urls__ = [];
    }
  } catch (e) {
    // Ignore
  }
  return { cleanedUrls };
}
