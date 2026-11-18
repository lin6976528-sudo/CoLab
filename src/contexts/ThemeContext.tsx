import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Monitor, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type Theme = 'light' | 'dark' | 'system';
export type AccentColor = 'indigo' | 'violet' | 'rose' | 'amber' | 'emerald' | 'teal' | 'blue' | 'pro-gold';

export const ACCENT_COLORS = {
  indigo: {
    name: '靛藍 (Indigo)',
    color: '#6366f1',
    hover: '#4f46e5',
    rgb: '99, 102, 241',
  },
  violet: {
    name: '羅蘭紫 (Violet)',
    color: '#8b5cf6',
    hover: '#7c3aed',
    rgb: '139, 92, 246',
  },
  rose: {
    name: '玫瑰紅 (Rose)',
    color: '#f43f5e',
    hover: '#e11d48',
    rgb: '244, 63, 94',
  },
  amber: {
    name: '琥珀金 (Amber)',
    color: '#f59e0b',
    hover: '#d97706',
    rgb: '245, 158, 11',
  },
  emerald: {
    name: '祖母綠 (Emerald)',
    color: '#10b981',
    hover: '#059669',
    rgb: '16, 185, 129',
  },
  teal: {
    name: '粉黛綠 (Teal)',
    color: '#14b8a6',
    hover: '#0d9488',
    rgb: '20, 184, 166',
  },
  blue: {
    name: '極客藍 (Blue)',
    color: '#3b82f6',
    hover: '#2563eb',
    rgb: '59, 130, 246',
  },
  'pro-gold': {
    name: '👑 尊爵奢華金 (Pro Gold)',
    color: '#eab308', // Brilliant metallic gold
    hover: '#ca8a04', // Rich luxury bronze yellow
    rgb: '234, 179, 8',
  }
};

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDark: boolean;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
  syncWithOs: boolean;
  setSyncWithOs: (sync: boolean) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(() => {
    const saved = localStorage.getItem('theme') as Theme;
    return saved || 'system';
  });

  const [syncWithOs, setSyncWithOsState] = useState<boolean>(() => {
    const savedSync = localStorage.getItem('syncWithOs');
    if (savedSync !== null) {
      return savedSync === 'true';
    }
    const savedTheme = localStorage.getItem('theme') as Theme;
    return savedTheme ? savedTheme === 'system' : true;
  });

  const [accentColor, setAccentColor] = useState<AccentColor>(() => {
    const saved = localStorage.getItem('accentColor') as AccentColor;
    return saved || 'indigo';
  });

  const [isDark, setIsDark] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
    if (newTheme === 'system') {
      setSyncWithOsState(true);
      localStorage.setItem('syncWithOs', 'true');
    } else {
      setSyncWithOsState(false);
      localStorage.setItem('syncWithOs', 'false');
    }
  }, []);

  const setSyncWithOs = useCallback((sync: boolean) => {
    setSyncWithOsState(sync);
    localStorage.setItem('syncWithOs', sync ? 'true' : 'false');
    if (sync) {
      setThemeState('system');
    } else {
      // If turning off sync, persist current static theme ('light' or 'dark')
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      setThemeState(mediaQuery.matches ? 'dark' : 'light');
    }
  }, []);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    
    const updateTheme = () => {
      const shouldBeDark = theme === 'dark' || (theme === 'system' && mediaQuery.matches);
      setIsDark(shouldBeDark);
      
      if (shouldBeDark) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    updateTheme();
    localStorage.setItem('theme', theme);

    const listener = (e: MediaQueryListEvent) => {
      if (theme === 'system') {
        const nextIsDark = e.matches;
        setIsDark(nextIsDark);
        if (nextIsDark) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
        setToastMessage(
          nextIsDark 
            ? '偵測到 OS 切換為深色模式，應用程式已自動完成主題同步！' 
            : '偵測到 OS 切換為淺色模式，應用程式已自動完成主題同步！'
        );
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // Handle auto-clear toast message after 4.5 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 4500);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  useEffect(() => {
    const config = ACCENT_COLORS[accentColor] || ACCENT_COLORS.indigo;
    const root = document.documentElement;
    root.style.setProperty('--accent-color', config.color);
    root.style.setProperty('--accent-hover', config.hover);
    root.style.setProperty('--accent-rgb', config.rgb);
    localStorage.setItem('accentColor', accentColor);
  }, [accentColor]);

  const contextValue = useMemo(
    () => ({ theme, setTheme, isDark, accentColor, setAccentColor, syncWithOs, setSyncWithOs }),
    [theme, setTheme, isDark, accentColor, syncWithOs, setSyncWithOs]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
      
      {/* OS Theme Sync Dynamic Toast Overlay */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            className="fixed bottom-6 right-6 z-[9999] max-w-sm flex items-center gap-3 px-4.5 py-3.5 bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/50 dark:border-zinc-850/60 shadow-2xl rounded-2xl backdrop-blur-md"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 dark:bg-indigo-400/15 flex items-center justify-center shrink-0 text-indigo-600 dark:text-indigo-450">
              <Monitor size={16} className="animate-pulse" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] uppercase tracking-wider font-bold text-zinc-400 dark:text-zinc-500 font-mono">
                System Theme Link
              </p>
              <p className="text-xs font-medium text-zinc-700 dark:text-zinc-250 leading-relaxed mt-0.5">
                {toastMessage}
              </p>
            </div>
            <button
              onClick={() => setToastMessage(null)}
              className="p-1 text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
            >
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
