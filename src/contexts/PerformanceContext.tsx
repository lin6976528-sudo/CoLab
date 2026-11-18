import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { calculateStorageUsage, pruneStaleLocalStorage, triggerMemoryCleanup, StorageStats } from '../utils/performance';

export type PerformanceMode = 'extreme' | 'balanced' | 'quality';

interface OptimizationResult {
  freedKB: number;
  prunedCount: number;
  cleanedUrls: number;
  message: string;
}

interface PerformanceContextType {
  mode: PerformanceMode;
  setMode: (mode: PerformanceMode) => void;
  isTurboMode: boolean;
  turboMode: boolean;
  setTurboMode: (enabled: boolean) => void;
  toggleTurboMode: () => void;
  storageStats: StorageStats;
  refreshStorageStats: () => void;
  optimizeNow: () => OptimizationResult;
  isOptimizing: boolean;
  lastOptimizedAt: Date | null;
  animationSpeedMultiplier: number;
}

interface FpsContextType {
  fps: number;
  isLowFPS: boolean;
}

const PerformanceContext = createContext<PerformanceContextType | undefined>(undefined);
const FpsContext = createContext<FpsContextType>({ fps: 60, isLowFPS: false });

const FpsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fpsState, setFpsState] = useState<FpsContextType>({ fps: 60, isLowFPS: false });

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;

    let animId: number | null = null;
    let intervalId: number | null = null;
    let isCancelled = false;

    // Sample a short ~350ms burst periodically instead of running rAF 100% continuously
    const sampleBurst = () => {
      if (isCancelled || document.visibilityState !== 'visible') return;
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }

      let frames = 0;
      const startTime = performance.now();

      const step = (now: number) => {
        if (isCancelled || document.visibilityState !== 'visible') {
          animId = null;
          return;
        }
        frames++;
        const elapsed = now - startTime;
        if (elapsed >= 350) {
          const measuredFps = Math.min(120, Math.max(1, Math.round(((frames - 1) * 1000) / elapsed)));
          const nextIsLow = measuredFps < 32;
          setFpsState((prev) => {
            if (Math.abs(prev.fps - measuredFps) < 2 && prev.isLowFPS === nextIsLow) {
              return prev;
            }
            return { fps: measuredFps, isLowFPS: nextIsLow };
          });
          animId = null;
          return;
        }
        animId = requestAnimationFrame(step);
      };

      animId = requestAnimationFrame(step);
    };

    const startMonitoring = () => {
      if (intervalId !== null) return;
      sampleBurst();
      intervalId = window.setInterval(sampleBurst, 2500);
    };

    const stopMonitoring = () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
      if (animId !== null) {
        cancelAnimationFrame(animId);
        animId = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        startMonitoring();
      } else {
        stopMonitoring();
      }
    };

    if (document.visibilityState === 'visible') {
      startMonitoring();
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isCancelled = true;
      stopMonitoring();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return (
    <FpsContext.Provider value={fpsState}>
      {children}
    </FpsContext.Provider>
  );
};

export const PerformanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [mode, setModeState] = useState<PerformanceMode>(() => {
    if (typeof window !== 'undefined') {
      const turboStored = localStorage.getItem('colab_turbo_mode');
      if (turboStored === 'true') {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.add('turbo-mode');
        }
        return 'extreme';
      }
      const saved = localStorage.getItem('colab_performance_mode') as PerformanceMode;
      if (saved === 'extreme') {
        if (typeof document !== 'undefined') {
          document.documentElement.classList.add('turbo-mode');
        }
        return 'extreme';
      }
      if (saved === 'balanced' || saved === 'quality') {
        return saved;
      }
      // Detect low CPU cores or low memory if available
      const nav = typeof navigator !== 'undefined' ? navigator as any : null;
      if (nav && (nav.hardwareConcurrency && nav.hardwareConcurrency <= 4)) {
        return 'balanced';
      }
    }
    return 'balanced';
  });

  const [storageStats, setStorageStats] = useState<StorageStats>({
    localStorageKB: 0,
    sessionStorageKB: 0,
    totalMB: 0,
    itemCount: 0,
  });
  const [isOptimizing, setIsOptimizing] = useState<boolean>(false);
  const [lastOptimizedAt, setLastOptimizedAt] = useState<Date | null>(null);

  // Apply or remove turbo-mode class on <html> element dynamically
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const root = document.documentElement;
      if (mode === 'extreme') {
        root.classList.add('turbo-mode');
      } else {
        root.classList.remove('turbo-mode');
      }
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem('colab_performance_mode', mode);
      localStorage.setItem('colab_turbo_mode', mode === 'extreme' ? 'true' : 'false');
    }
  }, [mode]);

  const isTurboMode = mode === 'extreme';

  const setTurboMode = useCallback((enabled: boolean) => {
    setModeState(() => {
      const nextMode = enabled ? 'extreme' : 'balanced';
      if (typeof document !== 'undefined') {
        if (enabled) {
          document.documentElement.classList.add('turbo-mode');
        } else {
          document.documentElement.classList.remove('turbo-mode');
        }
      }
      if (typeof window !== 'undefined') {
        localStorage.setItem('colab_performance_mode', nextMode);
        localStorage.setItem('colab_turbo_mode', enabled ? 'true' : 'false');
      }
      return nextMode;
    });
  }, []);

  const toggleTurboMode = useCallback(() => {
    setTurboMode(!isTurboMode);
  }, [isTurboMode, setTurboMode]);

  const refreshStorageStats = useCallback(() => {
    setStorageStats(calculateStorageUsage());
  }, []);

  useEffect(() => {
    refreshStorageStats();
  }, [refreshStorageStats]);

  const setMode = useCallback((newMode: PerformanceMode) => {
    setModeState(newMode);
  }, []);

  const optimizeNow = useCallback((): OptimizationResult => {
    setIsOptimizing(true);
    const { prunedCount, freedKB } = pruneStaleLocalStorage(0); // Prune all stale cache keys
    const { cleanedUrls } = triggerMemoryCleanup();
    refreshStorageStats();
    setIsOptimizing(false);
    setLastOptimizedAt(new Date());

    const message = freedKB > 0
      ? `已釋放 ${freedKB} KB 快取空間並回收 ${cleanedUrls} 個無用記憶體資源！`
      : `已深度掃描並完成資源回收，目前系統運作於極速最佳狀態！`;

    return {
      freedKB,
      prunedCount,
      cleanedUrls,
      message,
    };
  }, [refreshStorageStats]);

  const animationSpeedMultiplier = useMemo(() => {
    if (mode === 'extreme') return 0; // Disable unnecessary animations
    if (mode === 'balanced') return 1;
    return 1;
  }, [mode]);

  const value = useMemo(() => ({
    mode,
    setMode,
    isTurboMode,
    turboMode: isTurboMode,
    setTurboMode,
    toggleTurboMode,
    storageStats,
    refreshStorageStats,
    optimizeNow,
    isOptimizing,
    lastOptimizedAt,
    animationSpeedMultiplier,
  }), [
    mode,
    setMode,
    isTurboMode,
    setTurboMode,
    toggleTurboMode,
    storageStats,
    refreshStorageStats,
    optimizeNow,
    isOptimizing,
    lastOptimizedAt,
    animationSpeedMultiplier,
  ]);

  return (
    <PerformanceContext.Provider value={value}>
      <FpsProvider>
        {children}
      </FpsProvider>
    </PerformanceContext.Provider>
  );
};

export const usePerformance = (): PerformanceContextType => {
  const context = useContext(PerformanceContext);
  if (!context) {
    throw new Error('usePerformance must be used within a PerformanceProvider');
  }
  return context;
};

export const useLiveFps = (): FpsContextType => {
  return useContext(FpsContext);
};
