import React, { useState, useMemo, useEffect, useRef, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { FEATURES, getIconComponent } from '../constants';
import { FeatureId } from '../types';
import { Menu, X, Search, ChevronLeft, ChevronRight, ChevronDown, Command, Layers, HelpCircle, Info, MessageSquarePlus, ThumbsUp, ThumbsDown, CheckCircle2, Loader2, Clock, User, LogOut, Globe, Moon, Sun, Lock, CreditCard, AlertTriangle, Mic, MicOff, Settings, Sparkles, Bell, Crown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CoCoinIcon } from './CoCoinIcon';
import { CoLabLogo } from './CoLabLogo';
import { ModelStatusIndicator } from './ModelStatusIndicator';
import HelpButton from './HelpButton';
import CoCoinWarningNotification from './CoCoinWarningNotification';
import LanguageSwitcher from './LanguageSwitcher';
import { useAuth } from '../contexts/AuthContext';
import { useTheme, ACCENT_COLORS } from '../contexts/ThemeContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useChatHistory } from '../contexts/ChatHistoryContext';
import { useRecentActivity, RecentActivityItem } from '../contexts/RecentActivityContext';
import { MessageSquare, HardDrive, Image, FileCode, FileText, Keyboard, Zap, Cpu } from 'lucide-react';
import { usePerformance, useLiveFps, PerformanceMode } from '../contexts/PerformanceContext';
import { NetworkStatusIndicator } from './NetworkStatusIndicator';

const HistoryPanel = lazy(() => import('./HistoryPanel'));
const UserProfileModal = lazy(() => import('./UserProfileModal'));
const KeyboardShortcutsModal = lazy(() => import('./KeyboardShortcutsModal'));
const PointsModal = lazy(() => import('./PointsModal'));
const PricingModal = lazy(() => import('./PricingModal'));
const GlobalSearchModal = lazy(() => import('./GlobalSearchModal'));
const RecentActivityPreviewModal = lazy(() => import('./RecentActivityPreviewModal'));
const PerformanceOptimizerModal = lazy(() => import('./PerformanceOptimizerModal'));
const GoogleDriveModal = lazy(() => import('./GoogleDriveModal'));

function useStickyOpened(isOpen: boolean): boolean {
  const [hasOpened, setHasOpened] = useState(isOpen);
  useEffect(() => {
    if (isOpen && !hasOpened) {
      setHasOpened(true);
    }
  }, [isOpen, hasOpened]);
  return isOpen || hasOpened;
}

const SidebarPerfFpsBadge = React.memo(() => {
  const { fps } = useLiveFps();
  return (
    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-bold">
      {fps} FPS
    </span>
  );
});

const TopBarPerfButton = React.memo(({
  perfMode,
  isZh,
  onClick,
}: {
  perfMode: PerformanceMode;
  isZh: boolean;
  onClick: () => void;
}) => {
  const { fps, isLowFPS } = useLiveFps();
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
        perfMode === 'extreme'
          ? 'bg-amber-500/15 dark:bg-amber-500/20 border border-amber-500/35 text-amber-700 dark:text-amber-300'
          : isLowFPS
          ? 'bg-rose-500/15 dark:bg-rose-500/20 border border-rose-500/35 text-rose-600 dark:text-rose-400 animate-pulse'
          : 'glass-button text-zinc-700 dark:text-zinc-200 hover:text-sky-600 dark:hover:text-sky-400'
      }`}
      title={isZh ? '效能加速與記憶體快取清理設定' : 'Performance Optimizer & Cache GC'}
    >
      <Zap size={13} className={perfMode === 'extreme' ? 'text-amber-500 fill-amber-500' : 'text-sky-500'} />
      <span className="font-mono tabular-nums">{fps} FPS</span>
      <span className="hidden xl:inline text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-white/10">
        {perfMode === 'extreme' ? (isZh ? '極速' : 'Turbo') : perfMode === 'balanced' ? (isZh ? '平衡' : 'Auto') : (isZh ? '品質' : 'Full')}
      </span>
    </button>
  );
});

interface LayoutProps {
  children: React.ReactNode;
  activeFeature: FeatureId;
  onSelectFeature: (id: FeatureId) => void;
}

const SpeechRecognitionAPI = typeof window !== 'undefined'
  ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
  : null;

export default function Layout({ children, activeFeature, onSelectFeature }: LayoutProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { syncStatus, setActiveChatSessionId } = useChatHistory();
  const { activities } = useRecentActivity();
  const [isRecentActivityExpanded, setIsRecentActivityExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('colab_recent_activity_expanded');
      return saved !== 'false';
    }
    return true;
  });
  const [activePreviewActivity, setActivePreviewActivity] = useState<RecentActivityItem | null>(null);
  const [isRecentActivityModalOpen, setIsRecentActivityModalOpen] = useState(false);
  const { getLimit, pointsUsed, pointsLimit, tier, isPricingModalOpen, setIsPricingModalOpen, isTrialActive, trialTier, trialDaysRemaining, cancelTrial } = useSubscription();
  const percentageUsed = pointsLimit === Infinity ? 0 : Math.min(100, (pointsUsed / pointsLimit) * 100);
  const isPointsLow = percentageUsed >= 90 && pointsLimit !== Infinity;
  const remainingPoints = pointsLimit === Infinity ? Infinity : Math.max(0, pointsLimit - pointsUsed);
  const isApproachingLimit = pointsLimit !== Infinity && percentageUsed >= 75;
  const [isQuotaWarningDismissed, setIsQuotaWarningDismissed] = useState(false);
  const [lastDismissedPoints, setLastDismissedPoints] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('cocoin_warning_last_dismissed_points');
      return saved ? Number(saved) : null;
    }
    return null;
  });
  const isWarningVisible = pointsLimit !== Infinity && remainingPoints < 50 && (lastDismissedPoints === null || remainingPoints < lastDismissedPoints);

  const handleDismissWarning = (points: number) => {
    setLastDismissedPoints(points);
    if (typeof window !== 'undefined') {
      localStorage.setItem('cocoin_warning_last_dismissed_points', points.toString());
    }
  };
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isDesktopSidebarCollapsed, setIsDesktopSidebarCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false);
  const [feedbackType, setFeedbackType] = useState<'up' | 'down' | null>(null);
  const [feedbackText, setFeedbackText] = useState('');
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPointsModalOpen, setIsPointsModalOpen] = useState(false);
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const [isPerformanceModalOpen, setIsPerformanceModalOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const shouldMountHistory = useStickyOpened(isHistoryOpen);
  const shouldMountProfile = useStickyOpened(isProfileOpen);
  const shouldMountPoints = useStickyOpened(isPointsModalOpen);
  const shouldMountPricing = useStickyOpened(isPricingModalOpen);
  const shouldMountGlobalSearch = useStickyOpened(isGlobalSearchOpen);
  const shouldMountShortcuts = useStickyOpened(isShortcutsOpen);
  const shouldMountPerformance = useStickyOpened(isPerformanceModalOpen);
  const shouldMountDrive = useStickyOpened(isDriveModalOpen);
  const shouldMountActivityPreview = useStickyOpened(Boolean(activePreviewActivity));
  const { mode: perfMode } = usePerformance();
  const [refreshKey, setRefreshKey] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef(0);
  const isPullingRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const pullIndicatorRef = useRef<HTMLDivElement>(null);
  const pullIconRef = useRef<HTMLDivElement>(null);
  const pullWrapperRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { currentUser, userProfile, isAuthReady, login, logout, isLoggingOut, isLoggingIn } = useAuth();
  const isPremium = useMemo(() => {
    const currentTier = userProfile?.preferences?.tier || tier;
    const isSpecialEmail = currentUser?.email && (
      currentUser.email.toLowerCase() === 'lin076976528@gmail.com' || 
      currentUser.email.toLowerCase() === 'lin6976528@gmail.com'
    );
    return !!((currentTier && currentTier !== 'Free') || isSpecialEmail);
  }, [tier, userProfile?.preferences?.tier, currentUser?.email]);
  const { theme, setTheme, isDark } = useTheme();

  // Accent color dynamic application (automatically apply premium pro-gold to the dashboard if premium subscription is active)
  const accentColorId = useMemo(() => {
    if (isPremium && activeFeature === 'dashboard') {
      return 'pro-gold';
    }
    return userProfile?.preferences?.accentColor || 'indigo';
  }, [isPremium, activeFeature, userProfile?.preferences?.accentColor]);

  useEffect(() => {
    const activeColor = ACCENT_COLORS[accentColorId as keyof typeof ACCENT_COLORS] || ACCENT_COLORS.indigo;
    const root = document.documentElement;
    root.style.setProperty('--accent-color', activeColor.color);
    root.style.setProperty('--accent-hover', activeColor.hover);
    root.style.setProperty('--accent-rgb', activeColor.rgb);
  }, [accentColorId]);

  // Login event tracking states
  const [loginSuccessToast, setLoginSuccessToast] = useState<{ displayName: string; photoURL: string | null; email: string; tier: string } | null>(null);
  const [showCelebrateOverlay, setShowCelebrateOverlay] = useState(false);
  const prevUserUid = useRef<string | null>(null);
  const isInitialAuthRef = useRef(true);

  useEffect(() => {
    if (isAuthReady) {
      const currentUid = currentUser?.uid || null;
      if (isInitialAuthRef.current) {
        prevUserUid.current = currentUid;
        isInitialAuthRef.current = false;
      } else {
        if (currentUid && currentUid !== prevUserUid.current) {
          const matchedDisplayName = currentUser?.displayName || userProfile?.displayName || 'CoLab 使用者';
          const matchedPhotoURL = currentUser?.photoURL || userProfile?.photoURL || null;
          const matchedEmail = currentUser?.email || '';
          const matchedTier = userProfile?.preferences?.tier || (currentUser?.email && (currentUser.email.toLowerCase() === 'lin076976528@gmail.com' || currentUser.email.toLowerCase() === 'lin6976528@gmail.com') ? 'Ultra' : 'Free');

          setLoginSuccessToast({
            displayName: matchedDisplayName,
            photoURL: matchedPhotoURL,
            email: matchedEmail,
            tier: matchedTier,
          });
          
          setShowCelebrateOverlay(true);
          const celebrateTimer = setTimeout(() => {
            setShowCelebrateOverlay(false);
          }, 2200);

          const toastTimer = setTimeout(() => {
            setLoginSuccessToast(null);
          }, 4500);

          return () => {
            clearTimeout(celebrateTimer);
            clearTimeout(toastTimer);
          };
        }
        prevUserUid.current = currentUid;
      }
    }
  }, [currentUser, isAuthReady, userProfile]);

  // Dynamic Sidebar states and logic
  const [isRarelyUsedExpanded, setIsRarelyUsedExpanded] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('colab_rarely_used_expanded');
      return saved === 'true';
    }
    return false;
  });

  const [groupRareFeatures, setGroupRareFeatures] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('colab_group_rare_features');
      return saved !== 'false';
    }
    return true;
  });

  const [usageStats, setUsageStats] = useState<Record<string, number>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('colab_feature_usage_stats');
      if (saved) {
        return JSON.parse(saved);
      } else {
        const defaultUsage: Record<string, number> = {
          'chat': 8,
          'fast-chat': 5,
          'image-gen': 6,
        };
        localStorage.setItem('colab_feature_usage_stats', JSON.stringify(defaultUsage));
        return defaultUsage;
      }
    }
    return {};
  });

  // Track active feature changes to count interaction frequency
  useEffect(() => {
    const ignoredFeatures = ['dashboard', 'about', 'admin'];
    if (activeFeature && !ignoredFeatures.includes(activeFeature)) {
      setUsageStats(prev => {
        const updated = {
          ...prev,
          [activeFeature]: (prev[activeFeature] || 0) + 1
        };
        localStorage.setItem('colab_feature_usage_stats', JSON.stringify(updated));
        return updated;
      });
    }
  }, [activeFeature]);

  // Derive dynamic grouping
  const { rarelyUsedSet, totalInteractions, maxUsage } = useMemo(() => {
    const rootFeatures = ['dashboard', 'three-d-studio', 'about', 'admin'];
    const coreFeatures = FEATURES.filter(f => !rootFeatures.includes(f.id));
    
    let total = 0;
    let max = 0;
    coreFeatures.forEach(f => {
      const count = usageStats[f.id] || 0;
      total += count;
      if (count > max) max = count;
    });

    const set = new Set<string>();

    // We only trigger frequency-based grouping once the user has built up some baseline interactions (e.g. 5 total clicks)
    if (groupRareFeatures && total >= 5) {
      coreFeatures.forEach(f => {
        const count = usageStats[f.id] || 0;
        const isRare = count <= 1 || (max > 2 && count < max * 0.35);
        if (isRare) {
          set.add(f.id);
        }
      });
    }

    return {
      rarelyUsedSet: set,
      totalInteractions: total,
      maxUsage: max
    };
  }, [usageStats, groupRareFeatures]);

  const rarelyUsedFeatures = useMemo(() => {
    return FEATURES.filter(f => rarelyUsedSet.has(f.id));
  }, [rarelyUsedSet]);

  const handleToggleGroupRareFeatures = () => {
    const newVal = !groupRareFeatures;
    setGroupRareFeatures(newVal);
    localStorage.setItem('colab_group_rare_features', String(newVal));
  };

  const handleToggleRarelyUsedExpanded = () => {
    const newVal = !isRarelyUsedExpanded;
    setIsRarelyUsedExpanded(newVal);
    localStorage.setItem('colab_rarely_used_expanded', String(newVal));
  };

  const handleToggleRecentActivity = () => {
    const newVal = !isRecentActivityExpanded;
    setIsRecentActivityExpanded(newVal);
    localStorage.setItem('colab_recent_activity_expanded', String(newVal));
  };

  const handleImportActivityToChat = (activity: RecentActivityItem) => {
    setActivePreviewActivity(null);
    if (activity.content) {
      localStorage.setItem('co_staged_activity_file', JSON.stringify({ name: activity.name, content: activity.content }));
    }
    onSelectFeature('chat');
  };

  const handleResetUsageStats = () => {
    if (window.confirm(t('common.sidebarDynamic.resetConfirm', '確定要清除所有功能的使用點擊頻率數據嗎？'))) {
      setUsageStats({});
      localStorage.removeItem('colab_feature_usage_stats');
    }
  };

  const [isListening, setIsListening] = useState(false);
  const [voiceToast, setVoiceToast] = useState<{ text: string; type: 'info' | 'success' | 'recording' | 'error' } | null>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!SpeechRecognitionAPI) return;

    const SpeechRec = SpeechRecognitionAPI;
    const rec = new SpeechRec();
    rec.continuous = false;
    rec.interimResults = false;

    rec.onstart = () => {
      setIsListening(true);
      setVoiceToast({ text: t('common.listening', '正在聆聽語音指令...'), type: 'recording' });
    };

    rec.onresult = (event: any) => {
      const transcript = event.results[event.results.length - 1][0].transcript;
      if (!transcript) return;

      setSearchQuery(transcript);
      setVoiceToast({ text: `${t('common.heard', '識別到')}: "${transcript}"`, type: 'info' });

      const query = transcript.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?？。！!,，]/g, "");

      // Look for custom command words
      let matchedId: FeatureId | null = null;
      if (query.includes('聊天') || query.includes('對話') || query.includes('chatbot') || query.includes('chat')) {
        matchedId = 'chat';
      } else if (query.includes('代理') || query.includes('智能代理') || query.includes('智慧代理') || query.includes('agent')) {
        matchedId = 'agent';
      } else if (query.includes('批批') || query.includes('批次') || query.includes('批量') || query.includes('batch')) {
        matchedId = 'batch-process';
      } else if (query.includes('快速') || query.includes('回覆') || query.includes('解答') || query.includes('flash') || query.includes('lite')) {
        matchedId = 'fast-chat';
      } else if (query.includes('搜尋') || query.includes('關鍵字') || query.includes('網頁搜尋') || query.includes('search')) {
        matchedId = 'search';
      } else if (query.includes('地圖') || query.includes('導航') || query.includes('位置') || query.includes('地點') || query.includes('map')) {
        matchedId = 'maps';
      } else if (query.includes('分析圖片') || query.includes('圖片分析') || query.includes('理解照片') || query.includes('看圖') || query.includes('圖片理解') || query.includes('analyze image')) {
        matchedId = 'image-understand';
      } else if (query.includes('生成圖片') || query.includes('圖片生成') || query.includes('畫圖') || query.includes('畫畫') || query.includes('生圖') || query.includes('創圖') || query.includes('generate image')) {
        matchedId = 'image-gen';
      } else if (query.includes('編輯圖片') || query.includes('圖片編輯') || query.includes('修改圖片') || query.includes('改圖') || query.includes('修圖') || query.includes('edit image')) {
        matchedId = 'edit-image';
      } else if (query.includes('分析影片') || query.includes('影片分析') || query.includes('看影片') || query.includes('理解影片') || query.includes('analyze video')) {
        matchedId = 'video-understand';
      } else if (query.includes('生成影片') || query.includes('影片生成') || query.includes('生影') || query.includes('製作影片') || query.includes('generate video') || query.includes('veo')) {
        matchedId = 'video-gen';
      } else if (query.includes('youtube') || query.includes('短影音') || query.includes('建立影片') || query.includes('shorts')) {
        matchedId = 'youtube-gen';
      } else if (query.includes('圖片動畫') || query.includes('照片轉影片') || query.includes('動畫化') || query.includes('微動態') || query.includes('animate')) {
        matchedId = 'animate-image';
      } else if (query.includes('音樂') || query.includes('作詞') || query.includes('作曲') || query.includes('寫歌') || query.includes('music')) {
        matchedId = 'music-gen';
      } else if (query.includes('文字轉語音') || query.includes('生成語音') || query.includes('唸出來') || query.includes('合成語音') || query.includes('tts')) {
        matchedId = 'tts';
      } else if (query.includes('語音轉文字') || query.includes('聽寫') || query.includes('轉錄') || query.includes('聽語音') || query.includes('transcribe')) {
        matchedId = 'transcribe';
      } else if (query.includes('即時對話') || query.includes('即時語音') || query.includes('對話模式') || query.includes('live')) {
        matchedId = 'live-audio';
      } else if (query.includes('提醒') || query.includes('鬧鐘') || query.includes('備忘錄') || query.includes('待辦') || query.includes('reminder')) {
        matchedId = 'reminders';
      }

      if (matchedId) {
        const foundFeature = FEATURES.find(f => f.id === matchedId);
        if (foundFeature) {
          setVoiceToast({
            text: `${t('common.voiceSelected', '已自動選取')}: "${t(`features.${foundFeature.id}.title`)}"`,
            type: 'success'
          });
          onSelectFeature(foundFeature.id);
          setIsSidebarOpen(false);
          setTimeout(() => setVoiceToast(null), 2500);
          return;
        }
      }

      // If we didn't find specific command, try standard text search matches
      const matchedFeature = FEATURES.find(feature => {
        const title = t(`features.${feature.id}.title`).toLowerCase();
        const description = t(`features.${feature.id}.description`).toLowerCase();
        return query.includes(title) || title.includes(query) || query.includes(description) || description.includes(query);
      });

      if (matchedFeature) {
        setVoiceToast({
          text: `${t('common.voiceSelected', '已自動選取')}: "${t(`features.${matchedFeature.id}.title`)}"`,
          type: 'success'
        });
        onSelectFeature(matchedFeature.id);
        setIsSidebarOpen(false);
        setTimeout(() => setVoiceToast(null), 2500);
      } else {
        setTimeout(() => setVoiceToast(null), 3000);
      }
    };

    rec.onerror = (e: any) => {
      console.error('Speech recognition error', e);
      if (e.error === 'not-allowed') {
        setVoiceToast({ text: t('common.speechNotAllowed', '請允許麥克風權限以使用語音搜尋'), type: 'error' });
      } else {
        setVoiceToast({ text: t('common.speechError', '語音識別出錯，請再試一次'), type: 'error' });
      }
      setIsListening(false);
      setTimeout(() => setVoiceToast(null), 3000);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [i18n.language, t, onSelectFeature]);

  // Set language dynamically
  useEffect(() => {
    if (recognitionRef.current) {
      recognitionRef.current.lang = i18n.language === 'zh' ? 'zh-TW' : 'en-US';
    }
  }, [i18n.language]);

  const toggleVoiceSearch = () => {
    if (!SpeechRecognitionAPI) {
      alert(t('common.speechNotSupported', '您的瀏覽器不支援 Web Speech API。請使用 Google Chrome 獲得完整體驗。'));
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      try {
        recognitionRef.current.lang = i18n.language === 'zh' ? 'zh-TW' : 'en-US';
        recognitionRef.current.start();
      } catch (err) {
        console.error(err);
        setIsListening(false);
      }
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target?.tagName === 'INPUT' || target?.tagName === 'TEXTAREA' || target?.isContentEditable;

      // Escape close works even inside inputs
      if (e.key === 'Escape') {
        setIsGlobalSearchOpen(false);
        setIsShortcutsOpen(false);
        setIsHistoryOpen(false);
        setIsProfileOpen(false);
        setIsPerformanceModalOpen(false);
        setIsDriveModalOpen(false);
        return;
      }

      if (isInput) return;

      // Alt+P or Ctrl/Cmd+Alt+P for Performance Optimizer Modal
      if (e.altKey && e.key?.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPerformanceModalOpen(prev => !prev);
      }

      // Alt+G for Google Drive Modal
      if (e.altKey && e.key?.toLowerCase() === 'g') {
        e.preventDefault();
        setIsDriveModalOpen(prev => !prev);
      }

      // Ctrl+K or Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key?.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen(prev => !prev);
      }

      // Ctrl+/ or Cmd+/ or ? key
      if (((e.metaKey || e.ctrlKey) && e.key === '/') || e.key === '?') {
        e.preventDefault();
        setIsShortcutsOpen(prev => !prev);
      }

      // Alt/Opt combinations
      if (e.altKey && e.key) {
        const key = e.key.toLowerCase();
        if (key === 'd') {
          e.preventDefault();
          onSelectFeature('dashboard');
        } else if (key === 'c') {
          e.preventDefault();
          onSelectFeature('chat');
        } else if (key === 'i') {
          e.preventDefault();
          onSelectFeature('infinite-canvas');
        } else if (key === 'v') {
          e.preventDefault();
          onSelectFeature('video-gen');
        } else if (key === 'g') {
          e.preventDefault();
          onSelectFeature('image-gen');
        } else if (key === 'h') {
          e.preventDefault();
          setIsHistoryOpen(prev => !prev);
        } else if (key === 's') {
          e.preventDefault();
          setIsProfileOpen(prev => !prev);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onSelectFeature]);

  const filteredFeatures = useMemo(() => {
    let list = FEATURES;
    const isAdmin = currentUser?.email && (
      currentUser.email.toLowerCase() === 'lin076976528@gmail.com' || 
      currentUser.email.toLowerCase() === 'lin6976528@gmail.com'
    );
    const userTier = userProfile?.preferences?.tier || userProfile?.tier || 'Free';
    const isOrgOwner = ['Advanced', 'Ultra', 'Max', 'Super'].includes(userTier);
    
    if (!isAdmin && !isOrgOwner) {
      list = list.filter(f => f.id !== 'admin');
    }
    if (!searchQuery.trim()) return list;
    const query = searchQuery.toLowerCase();
    return list.filter(
      f => t(`features.${f.id}.title`).toLowerCase().includes(query) || t(`features.${f.id}.description`).toLowerCase().includes(query)
    );
  }, [searchQuery, t, currentUser]);

  const effectiveRarelyUsedSet = useMemo(() => {
    return searchQuery.trim() ? new Set<string>() : rarelyUsedSet;
  }, [searchQuery, rarelyUsedSet]);

  const categories = ['Overview', 'Text & Chat', 'Image', 'Video', 'Audio'];

  const activeFeatureData = useMemo(() => {
    return FEATURES.find(f => f.id === activeFeature);
  }, [activeFeature]);

  const handleFeedbackSubmit = () => {
    if (!feedbackType && !feedbackText.trim()) return;
    setIsSubmittingFeedback(true);
    // Mock API call
    setTimeout(() => {
      setIsSubmittingFeedback(false);
      setFeedbackSuccess(true);
      setTimeout(() => {
        setIsFeedbackModalOpen(false);
        // Reset state after transition
        setTimeout(() => {
          setFeedbackSuccess(false);
          setFeedbackType(null);
          setFeedbackText('');
        }, 300);
      }, 2000);
    }, 800);
  };

  const applyPullStyles = (distance: number, animate: boolean) => {
    const transitionVal = animate ? 'transform 0.25s ease-out, opacity 0.25s ease-out' : 'none';
    if (pullIndicatorRef.current) {
      pullIndicatorRef.current.style.transition = transitionVal;
      pullIndicatorRef.current.style.transform = `translate3d(0, ${Math.max(0, distance - 40)}px, 0)`;
      pullIndicatorRef.current.style.opacity = String(Math.min(distance / 40, 1));
    }
    if (pullIconRef.current) {
      pullIconRef.current.style.transform = distance > 0 ? `rotate(${distance * 3}deg)` : 'none';
    }
    if (pullWrapperRef.current) {
      pullWrapperRef.current.style.transition = animate ? 'transform 0.25s ease-out' : 'none';
      pullWrapperRef.current.style.transform = distance > 0 ? `translate3d(0, ${distance}px, 0)` : 'none';
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (contentRef.current && contentRef.current.scrollTop <= 0) {
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
      pullDistanceRef.current = 0;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isPullingRef.current) return;
    if (contentRef.current && contentRef.current.scrollTop > 0) {
      isPullingRef.current = false;
      if (pullDistanceRef.current !== 0) {
        pullDistanceRef.current = 0;
        applyPullStyles(0, true);
      }
      return;
    }
    const currentY = e.touches[0].clientY;
    const distance = currentY - startYRef.current;

    if (distance > 0) {
      const nextDist = Math.min(distance * 0.4, 80);
      pullDistanceRef.current = nextDist;
      applyPullStyles(nextDist, false);
    } else if (pullDistanceRef.current !== 0) {
      pullDistanceRef.current = 0;
      applyPullStyles(0, false);
    }
  };

  const handleTouchEnd = () => {
    if (!isPullingRef.current) return;
    isPullingRef.current = false;

    if (pullDistanceRef.current >= 60) {
      setIsRefreshing(true);
      pullDistanceRef.current = 60;
      applyPullStyles(60, true);

      setTimeout(() => {
        setRefreshKey(prev => prev + 1);
        setIsRefreshing(false);
        pullDistanceRef.current = 0;
        applyPullStyles(0, true);
      }, 1000);
    } else if (pullDistanceRef.current !== 0) {
      pullDistanceRef.current = 0;
      applyPullStyles(0, true);
    }
  };

  return (
    <div className="flex h-screen liquid-bg text-zinc-900 dark:text-zinc-100 font-sans overflow-hidden selection:bg-zinc-200 dark:selection:bg-zinc-700">
      {/* Mobile Top Bar - Translucent Apple Liquid Glass */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-16 glass-panel !rounded-none !border-x-0 !border-t-0 z-50 flex items-center justify-between px-4">
        {activeFeature !== 'dashboard' ? (
          <button
            onClick={() => onSelectFeature('dashboard')}
            className="flex items-center gap-2 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-medium text-sm transition-colors"
          >
            <ChevronLeft size={18} />
            <span>{t('common.back', '返回')}</span>
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center filter drop-shadow-sm">
              <CoLabLogo size={30} />
            </div>
            <div className="font-serif font-medium text-lg text-zinc-900 dark:text-zinc-100 tracking-tight">CoLab</div>
          </div>
        )}
        <div className="flex items-center gap-1">
          {isApproachingLimit && (
            <motion.button
              initial={{ scale: 0.9 }}
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              onClick={() => setIsPricingModalOpen(true)}
              className="px-2.5 py-1 bg-red-500/10 dark:bg-red-950/30 border border-red-500/20 rounded-full text-[10px] text-red-650 dark:text-red-400 font-extrabold flex items-center gap-0.5 shadow-sm cursor-pointer"
              title="配額不足，點此升級方案"
            >
              <AlertTriangle size={11} className="text-red-500 shrink-0" />
              <span className="tabular-nums">{Math.round(percentageUsed)}%</span>
            </motion.button>
          )}
          <button
            onClick={() => setIsGlobalSearchOpen(true)}
            className="p-2 text-zinc-700 dark:text-zinc-300 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors flex items-center justify-center cursor-pointer"
            title={t('common.searchGlobal', '全域搜尋')}
          >
            <Search size={18} />
          </button>
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className="p-2 text-zinc-700 dark:text-zinc-300 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors flex items-center justify-center"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <LanguageSwitcher align="right" />
          <button
            className="p-2 -mr-2 text-zinc-700 dark:text-zinc-300 hover:bg-white/40 dark:hover:bg-white/10 rounded-full transition-colors"
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Floating Apple Liquid Glass Sidebar */}
      <aside
        className={`fixed md:relative top-16 md:top-0 bottom-0 left-0 md:my-3 md:ml-3 md:h-[calc(100vh-1.5rem)] md:rounded-[28px] z-40 glass-panel transform sidebar-transition flex flex-col shrink-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        } ${isDesktopSidebarCollapsed ? 'w-[80px]' : 'w-[280px]'}`}
      >
        <div className={`hidden md:flex p-7 pb-4 flex-col gap-1 shrink-0 relative ${isDesktopSidebarCollapsed ? 'items-center px-4' : ''}`}>
          {!isDesktopSidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center shrink-0">
                <CoLabLogo size={42} />
              </div>
              <h1 className="text-3xl font-serif font-medium tracking-tight text-zinc-900 dark:text-zinc-100">CoLab</h1>
            </div>
          ) : (
            <div className="flex items-center justify-center shrink-0">
              <CoLabLogo size={42} />
            </div>
          )}
          
          <button
            onClick={() => setIsDesktopSidebarCollapsed(!isDesktopSidebarCollapsed)}
            className="hidden md:flex absolute top-7 -right-3.5 w-7 h-7 glass-button rounded-full items-center justify-center text-zinc-500 hover:text-zinc-950 dark:text-zinc-300 dark:hover:text-white transition-all z-50 cursor-pointer"
          >
            {isDesktopSidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {!isDesktopSidebarCollapsed && (
          <div className="px-6 pt-4 md:pt-0 pb-4 shrink-0 relative">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 opacity-60 group-focus-within:opacity-100 transition-opacity" size={14} />
              <input
                ref={searchInputRef}
                type="text"
                placeholder={t('common.searchTools')}
                value={searchQuery}
                onFocus={() => setIsGlobalSearchOpen(true)}
                onClick={() => setIsGlobalSearchOpen(true)}
                readOnly
                className="w-full pl-9 pr-20 py-2 glass-input rounded-2xl text-sm focus:outline-none placeholder:text-zinc-500 dark:placeholder:text-zinc-400 font-light cursor-pointer"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-zinc-400">
                <button
                  type="button"
                  onClick={toggleVoiceSearch}
                  className={`p-1.5 rounded-xl transition-all duration-300 ${
                    isListening
                      ? 'bg-rose-500 dark:bg-rose-600 text-white animate-pulse shadow-md scale-105'
                      : 'hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100'
                  }`}
                  title={t('common.voiceSearch', '語音搜尋')}
                >
                  <Mic size={13} className={isListening ? 'animate-bounce' : ''} />
                </button>
                <div className="flex items-center gap-0.5 text-[10px] font-medium opacity-60 select-none pointer-events-none">
                  <Command size={9} />
                  <span>K</span>
                </div>
              </div>
            </div>

            {/* Voice Search Feedback Panel */}
            <AnimatePresence>
              {voiceToast && (
                <motion.div
                  initial={{ opacity: 0, y: -10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -10, scale: 0.95 }}
                  className="absolute top-full left-6 right-6 z-50 mt-1 p-3.5 glass-panel rounded-2xl shadow-xl border border-zinc-200/50 dark:border-zinc-800/50 flex flex-col gap-2 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md"
                >
                  <div className="flex items-center gap-2.5">
                    {voiceToast.type === 'recording' && (
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500"></span>
                      </span>
                    )}
                    {voiceToast.type === 'success' && (
                      <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                    )}
                    {voiceToast.type === 'info' && (
                      <Loader2 size={14} className="text-zinc-600 dark:text-zinc-400 animate-spin shrink-0" />
                    )}
                    {voiceToast.type === 'error' && (
                      <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                    )}
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 leading-none truncate flex-grow">
                      {voiceToast.type === 'recording' ? t('common.listening', '正在聆聽語音指令...') : voiceToast.text}
                    </span>
                    {voiceToast.type === 'recording' && (
                      <button
                        onClick={() => {
                          if (recognitionRef.current) {
                            recognitionRef.current.abort();
                          }
                          setIsListening(false);
                          setVoiceToast(null);
                        }}
                        className="text-[10px] uppercase font-bold tracking-wider text-rose-500 hover:text-rose-600 transition-colors"
                      >
                        {t('common.cancel', '取消')}
                      </button>
                    )}
                  </div>
                  {voiceToast.type === 'recording' && (
                    <div className="text-[10px] text-zinc-400 dark:text-zinc-500 font-light leading-relaxed flex flex-col gap-1 border-t border-zinc-100 dark:border-zinc-800/80 pt-2 shrink-0">
                      <span>💡 嘗試說出：</span>
                      <div className="flex flex-wrap gap-1.5 mt-0.5 max-h-16 overflow-y-auto pr-1">
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors" onClick={() => setSearchQuery('聊天')}>"AI 聊天"</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors" onClick={() => setSearchQuery('生成圖片')}>"圖片生成"</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors" onClick={() => setSearchQuery('地圖增強')}>"地圖增強"</span>
                        <span className="px-1.5 py-0.5 rounded-md bg-zinc-100/80 dark:bg-zinc-800/50 hover:bg-zinc-200/80 dark:hover:bg-zinc-800 text-[10px] text-zinc-600 dark:text-zinc-400 cursor-pointer transition-colors" onClick={() => setSearchQuery('音樂生成')}>"寫歌"</span>
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}
        
        <nav className={`flex-1 overflow-y-auto pb-8 space-y-6 ${isDesktopSidebarCollapsed ? 'px-3 mt-4' : 'px-4'}`}>
          {categories.map((category) => {
            const categoryFeatures = filteredFeatures.filter(
              f => f.category === category && (!isDesktopSidebarCollapsed ? !effectiveRarelyUsedSet.has(f.id) : true)
            );
            if (categoryFeatures.length === 0) return null;

            return (
              <div key={category} className="space-y-1">
                {!isDesktopSidebarCollapsed && (
                  <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mb-2 px-4 mt-2">{t(`common.categories.${category}`)}</div>
                )}
                {isDesktopSidebarCollapsed && (
                  <div className="w-full h-px bg-zinc-200/50 my-2" />
                )}
                {categoryFeatures.map((feature) => {
                  const Icon = getIconComponent(feature.icon);
                  const isActive = activeFeature === feature.id;
                  return (
                    <button
                      key={feature.id}
                      id={`sidebar-feature-${feature.id}`}
                      onClick={() => {
                        onSelectFeature(feature.id);
                        setIsSidebarOpen(false);
                      }}
                      title={isDesktopSidebarCollapsed ? t(`features.${feature.id}.title`) : undefined}
                      className={`w-full flex items-center ${isDesktopSidebarCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-2.5'} rounded-2xl text-sm transition-all duration-200 group relative cursor-pointer ${
                        isActive
                          ? 'text-zinc-950 dark:text-white glass-button'
                          : 'text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-white/35 dark:hover:bg-white/10 border border-transparent'
                      }`}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="active-indicator"
                          className="absolute inset-0 rounded-2xl ring-1 ring-white/80 dark:ring-white/25 bg-white/30 dark:bg-white/5 pointer-events-none"
                          initial={false}
                          transition={{ type: "spring", stiffness: 360, damping: 32 }}
                        />
                      )}
                      <Icon size={isDesktopSidebarCollapsed ? 20 : 18} strokeWidth={isActive ? 2 : 1.5} className={`shrink-0 relative z-10 ${isActive ? 'text-sky-600 dark:text-sky-400' : 'text-zinc-500 group-hover:text-zinc-800 dark:text-zinc-400 dark:group-hover:text-zinc-200'}`} />
                      
                      {!isDesktopSidebarCollapsed && (
                        <div className="text-left flex-1 min-w-0 flex items-center justify-between gap-1.5">
                          <div className={`truncate ${isActive ? 'font-medium' : 'font-normal'}`}>
                            {t(`features.${feature.id}.title`)}
                          </div>
                          {getLimit(feature.id) === 0 && (
                            <Lock size={12} className="text-zinc-400 shrink-0" />
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}

          {/* Collapsible Rarely Used Features Section */}
          {(!isDesktopSidebarCollapsed && !searchQuery.trim() && rarelyUsedFeatures.length > 0) && (
            <div className="pt-2 border-t border-zinc-200/40 dark:border-zinc-805/40 space-y-2">
              <button
                type="button"
                onClick={handleToggleRarelyUsedExpanded}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/30 rounded-2xl transition-all group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-zinc-100/80 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                    <Layers size={12} className="opacity-70 group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('common.sidebarDynamic.rarelyUsedTools', '智慧收納工具')}
                    </span>
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-[9px] font-bold text-zinc-500 dark:text-zinc-400">
                      {rarelyUsedFeatures.length}
                    </span>
                  </div>
                </div>
                <div className="text-zinc-400 group-hover:text-zinc-750 dark:group-hover:text-zinc-200 transition-colors">
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isRarelyUsedExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isRarelyUsedExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden pl-2.5 pr-1.5 space-y-1 ml-4 border-l border-zinc-200/40 dark:border-zinc-800"
                  >
                    <p className="text-[10px] text-zinc-400 dark:text-zinc-500 px-4 py-1 leading-relaxed font-light">
                      {t('common.sidebarDynamic.groupedHint', '已根據使用頻率自動收折')}
                    </p>
                    
                    {rarelyUsedFeatures.map((feature) => {
                      const Icon = getIconComponent(feature.icon);
                      const isActive = activeFeature === feature.id;
                      const clickCount = usageStats[feature.id] || 0;

                      return (
                        <button
                          key={feature.id}
                          onClick={() => {
                            onSelectFeature(feature.id);
                            setIsSidebarOpen(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs transition-all group relative ${
                            isActive
                              ? 'text-zinc-900 dark:text-zinc-100 glass-button shadow-sm'
                              : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 hover:bg-white/20 dark:hover:bg-white/5'
                          }`}
                        >
                          <Icon size={14} className={`shrink-0 ${isActive ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400'}`} />
                          <div className="text-left flex-1 min-w-0 flex items-center justify-between gap-1.5">
                            <span className="truncate">{t(`features.${feature.id}.title`)}</span>
                            <span className="text-[9px] font-mono font-medium opacity-50 whitespace-nowrap bg-zinc-100 dark:bg-zinc-850 px-1.5 py-0.5 rounded-md">
                              {clickCount}{isZh ? '次' : ' times'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Collapsible Recent Activity Section */}
          {(!isDesktopSidebarCollapsed && !searchQuery.trim()) && (
            <div className="pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 space-y-2">
              <button
                type="button"
                onClick={handleToggleRecentActivity}
                className="w-full flex items-center justify-between px-4 py-2 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30 rounded-2xl transition-all group select-none cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-5 h-5 rounded-md bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0">
                    <Clock size={12} className="opacity-70 group-hover:scale-105 transition-transform" />
                  </div>
                  <div className="text-left">
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {isZh ? '最近活動 (Recent Activity)' : 'Recent Activity'}
                    </span>
                    {activities.length > 0 && (
                      <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/40 text-[9px] font-bold text-indigo-650 dark:text-indigo-400">
                        {Math.min(5, activities.length)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="text-zinc-400 group-hover:text-zinc-750 dark:group-hover:text-zinc-200 transition-colors">
                  <ChevronDown size={14} className={`transition-transform duration-200 ${isRecentActivityExpanded ? 'rotate-180' : ''}`} />
                </div>
              </button>

              <AnimatePresence initial={false}>
                {isRecentActivityExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: "easeInOut" }}
                    className="overflow-hidden pl-2.5 pr-1.5 space-y-1 ml-4 border-l border-zinc-200/40 dark:border-zinc-800"
                  >
                    {activities.length === 0 ? (
                      <p className="text-[10px] text-zinc-400 dark:text-zinc-500 px-4 py-3 leading-relaxed font-light">
                        目前尚無最近活動紀錄。
                      </p>
                    ) : (
                      activities.slice(0, 5).map((act) => {
                        const isChat = act.type === 'chat';
                        const formatter = (time: number) => {
                          const diff = Date.now() - time;
                          if (diff < 60000) return '剛剛';
                          const mins = Math.floor(diff / 60000);
                          if (mins < 60) return `${mins}分前`;
                          const hrs = Math.floor(mins / 60);
                          if (hrs < 24) return `${hrs}小時前`;
                          return `${Math.floor(hrs / 24)}天前`;
                        };
                        return (
                          <button
                            key={`${act.type}-${act.id}`}
                            onClick={() => {
                              if (isChat) {
                                setActiveChatSessionId(act.id);
                                onSelectFeature((act.featureId || 'chat') as FeatureId);
                              } else {
                                setActivePreviewActivity(act);
                              }
                              setIsSidebarOpen(false);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-zinc-650 dark:text-zinc-450 hover:text-zinc-950 dark:hover:text-zinc-105 hover:bg-zinc-55 dark:hover:bg-zinc-900 transition-all text-left group/item cursor-pointer"
                          >
                            <div className="shrink-0 text-zinc-450 group-hover/item:text-indigo-500 dark:group-hover/item:text-indigo-400 transition-colors">
                              {act.type === 'chat' ? (
                                <MessageSquare size={13} />
                              ) : act.icon === 'HardDrive' ? (
                                <HardDrive size={13} className="text-blue-500/70" />
                              ) : act.icon === 'Image' ? (
                                <Image size={13} className="text-emerald-500/70" />
                              ) : act.icon === 'FileCode' ? (
                                <FileCode size={13} className="text-amber-500/70" />
                              ) : (
                                <FileText size={13} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 pr-1">
                              <p className="truncate text-[11px] font-medium leading-tight text-zinc-700 dark:text-zinc-300 group-hover/item:text-zinc-950 dark:group-hover/item:text-white transition-colors">{act.name}</p>
                              <span className="text-[9px] text-zinc-400 dark:text-zinc-500 font-light mt-0.5 block">{act.detail || (isChat ? '對話歷史' : '文件')} • {formatter(act.timestamp)}</span>
                            </div>
                          </button>
                        );
                      })
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {!isDesktopSidebarCollapsed && filteredFeatures.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-zinc-500 font-light">
              {t('common.noToolsFound', { query: searchQuery })}
            </div>
          )}

          {/* System & Support Section - Positioned immediately after categories/tools (following '즉시대화/即時對話') */}
          <div className="space-y-1 pt-4 border-t border-zinc-200/50 dark:border-zinc-800/50">
            {!isDesktopSidebarCollapsed && (
              <div className="text-[10px] font-mono font-semibold text-zinc-400 uppercase tracking-widest mb-2 px-4 mt-2">
                {t('common.categories.system', '系統設定')}
              </div>
            )}

            {/* Dynamic Sidebar Grouping Toggle */}
            {!isDesktopSidebarCollapsed && (
              <div className="px-4 py-2.5 mx-1 mb-2 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/20 space-y-2 select-none">
                <div className="flex items-center justify-between gap-1">
                  <div className="flex items-center gap-2">
                    <Settings size={13} className="text-zinc-400 text-indigo-500 dark:text-indigo-400" />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('common.sidebarDynamic.enableLabel', '使用頻率智慧收納')}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleToggleGroupRareFeatures}
                    className={`relative inline-flex h-5 w-8 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      groupRareFeatures ? 'bg-indigo-600 dark:bg-indigo-500' : 'bg-zinc-250 dark:bg-zinc-800'
                    }`}
                  >
                    <span
                      aria-hidden="true"
                      className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out mt-[2px] ml-[2px] ${
                        groupRareFeatures ? 'translate-x-3.5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
                {groupRareFeatures && (
                  <div className="flex items-center justify-between gap-2 border-t border-zinc-200/30 dark:border-zinc-800/40 pt-1.5 mt-0.5">
                    <span className="text-[9px] font-light text-zinc-500 dark:text-zinc-505">
                      {isZh ? `累計點擊: ${totalInteractions} 次` : `Total Clicks: ${totalInteractions}`}
                    </span>
                    <button
                      type="button"
                      onClick={handleResetUsageStats}
                      className="text-[9px] text-zinc-450 hover:text-rose-500 dark:hover:text-rose-400 font-semibold px-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors leading-none"
                    >
                      {t('common.sidebarDynamic.resetLabel', '重置紀錄')}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {/* Theme Toggle (Dark/Light mode) */}
            <button
              onClick={() => setTheme(isDark ? 'light' : 'dark')}
              className={`w-full flex items-center ${isDesktopSidebarCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-2.5'} rounded-2xl text-sm transition-all duration-300 group relative text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/30 dark:hover:bg-white/10`}
              title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {isDark ? (
                <Sun size={18} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 shrink-0" />
              ) : (
                <Moon size={18} className="text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300 shrink-0" />
              )}
              {!isDesktopSidebarCollapsed && (
                <span className="text-sm font-normal">{isDark ? 'Light Mode' : 'Dark Mode'}</span>
              )}
            </button>

            {/* Performance Optimizer Toggle Button */}
            <button
              onClick={() => {
                setIsPerformanceModalOpen(true);
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center ${isDesktopSidebarCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-2.5'} rounded-2xl text-sm transition-all duration-300 group relative text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/30 dark:hover:bg-white/10 cursor-pointer`}
              title={isZh ? '全域效能與快取優化 (Turbo/FPS)' : 'Performance & Cache Optimizer'}
            >
              <Zap size={18} className="text-amber-500 shrink-0" />
              {!isDesktopSidebarCollapsed && (
                <div className="flex items-center justify-between flex-1">
                  <span className="text-sm font-normal">{isZh ? '效能與快取優化' : 'Performance Optimizer'}</span>
                  <SidebarPerfFpsBadge />
                </div>
              )}
            </button>

            {/* About CoLab */}
            <button
              onClick={() => {
                onSelectFeature('about');
                setIsSidebarOpen(false);
              }}
              className={`w-full flex items-center ${isDesktopSidebarCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-2.5'} rounded-2xl text-sm transition-all duration-300 group relative ${
                activeFeature === 'about'
                  ? 'text-zinc-900 dark:text-zinc-100 glass-button shadow-sm'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/30 dark:hover:bg-white/10'
              }`}
              title={t('common.aboutColab', 'About CoLab')}
            >
              <Info size={18} className={`${activeFeature === 'about' ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 group-hover:text-zinc-600 dark:group-hover:text-zinc-300'} shrink-0`} />
              {!isDesktopSidebarCollapsed && <span className="text-sm font-normal">{t('common.aboutColab', 'About CoLab')}</span>}
            </button>

            {/* Points Rules */}
            <button
              onClick={() => setIsPointsModalOpen(true)}
              className={`w-full flex items-center ${isDesktopSidebarCollapsed ? 'justify-center p-3' : 'gap-3.5 px-4 py-2.5'} rounded-2xl text-sm transition-all duration-300 group relative ${
                isPointsLow
                  ? 'text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10'
                  : 'text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/30 dark:hover:bg-white/10'
              }`}
              title={t('common.pointsRules', 'Co幣規則')}
            >
              <div className="relative shrink-0 flex items-center justify-center">
                <CoCoinIcon size={18} isLow={isPointsLow} />
                {isPointsLow && <span className="absolute -top-1 -right-1 w-1.5 h-1.5 bg-red-500 rounded-full border border-white dark:border-zinc-900 animate-ping" />}
              </div>
              {!isDesktopSidebarCollapsed && <span className="text-sm font-normal">{t('common.pointsRules', 'Co幣規則')}</span>}
            </button>
          </div>
        </nav>

        {/* User Profile / Login */}
        <div className={`p-3.5 pb-6 md:p-4 border-t border-white/30 dark:border-white/10 shrink-0 flex flex-col gap-2.5`}>
          {/* Daily API Quota Progress Bar */}
          {!isDesktopSidebarCollapsed ? (
            <div className="flex flex-col gap-1.5 p-3.5 rounded-[22px] bg-white/45 dark:bg-white/5 border border-white/65 dark:border-white/12 shadow-[inset_0_1px_0_rgba(255,255,255,0.75)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={12} className="text-sky-500 dark:text-sky-400" />
                  <span className="text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                    {t('common.dailyQuota', '算力配額')}
                  </span>
                </div>
                <span className={`text-[9.5px] font-extrabold px-2 py-0.5 rounded-full ${
                  tier === 'Super' ? 'bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300' :
                  tier === 'Max' ? 'bg-rose-500/15 text-rose-700 dark:text-rose-300' :
                  tier === 'Ultra' ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300' :
                  tier === 'Pro' ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300' :
                  tier === 'Go' ? 'bg-teal-500/15 text-teal-800 dark:text-teal-300' :
                  tier === 'Plus' ? 'bg-emerald-500/15 text-emerald-800 dark:text-emerald-300' :
                  'bg-zinc-500/10 text-zinc-700 dark:text-zinc-300'
                }`}>
                  {tier === 'Go' ? (isZh ? 'Go 學生方案' : 'Go Student Plan') : tier}
                </span>
              </div>

              <div className="w-full bg-zinc-900/8 dark:bg-white/10 h-2 rounded-full overflow-hidden relative">
                <motion.div
                  className={`h-full rounded-full bg-gradient-to-r ${
                    isPointsLow ? 'from-rose-500 to-red-500' :
                    isApproachingLimit ? 'from-amber-500 to-orange-500' :
                    'from-sky-500 via-blue-500 to-indigo-500'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${(tier === 'Ultra' || tier === 'Max' || tier === 'Super') ? 100 : percentageUsed}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono tabular-nums text-zinc-600 dark:text-zinc-400 mt-0.5">
                <span>
                  {(tier === 'Ultra' || tier === 'Max' || tier === 'Super') ? t('common.unlimited', '無限制') : `${pointsUsed} / ${pointsLimit} ${isZh ? 'Co幣' : 'CoCoins'}`}
                </span>
                {!(tier === 'Ultra' || tier === 'Max' || tier === 'Super') && (
                  <span>{Math.round(percentageUsed)}%</span>
                )}
              </div>

              {isTrialActive && (
                <div className="mt-2.5 p-2 rounded-xl bg-indigo-500/5 dark:bg-indigo-500/10 border border-indigo-500/20 flex flex-col gap-1 text-[10px] select-none">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400">{isZh ? '✨ 7 天免費試用期' : '✨ 7-Day Free Trial'}</span>
                    <span className="font-extrabold text-indigo-750 dark:text-indigo-300">{isZh ? '剩餘 7 天' : '7 Days Left'}</span>
                  </div>
                  <div className="flex items-center justify-between mt-1 pt-1 border-t border-indigo-500/10">
                    <span className="text-zinc-500 dark:text-zinc-500">{isZh ? '隨時可退訂 0 扣款' : 'Cancel anytime, $0 charge'}</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        if (confirm(isZh ? "您確定要取消目前的免費試用方案嗎？取消後將立刻恢復為免費 Free 版。" : "Are you sure you want to cancel your current free trial? You will immediately revert to the Free version.")) {
                          cancelTrial();
                        }
                      }}
                      className="text-[9px] font-bold text-red-650 hover:text-red-750 hover:underline transition-all cursor-pointer"
                    >
                      {isZh ? '取消試用' : 'Cancel Trial'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1 relative group cursor-pointer" onClick={() => setIsPointsModalOpen(true)}>
              <div className="w-8 h-8 rounded-xl bg-zinc-50/50 dark:bg-zinc-900/35 border border-zinc-200/35 dark:border-zinc-800/40 flex items-center justify-center hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-all shadow-xs" title={`${tier} Quota: ${(tier === 'Ultra' || tier === 'Max' || tier === 'Super') ? 'Unlimited' : `${pointsUsed}/${pointsLimit} Co幣`}`}>
                <div className="relative w-6 h-6 flex items-center justify-center">
                  <svg className="w-6 h-6 -rotate-90">
                    <circle
                      cx="12"
                      cy="12"
                      r="9"
                      className="stroke-zinc-200 dark:stroke-zinc-800 fill-none"
                      strokeWidth="2.5"
                    />
                    <motion.circle
                      cx="12"
                      cy="12"
                      r="9"
                      className={`fill-none ${
                        isPointsLow ? 'stroke-rose-500' :
                        isApproachingLimit ? 'stroke-amber-500' :
                        'stroke-indigo-500'
                      }`}
                      strokeWidth="2.5"
                      strokeDasharray={2 * Math.PI * 9}
                      initial={{ strokeDashoffset: 2 * Math.PI * 9 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 9 * (1 - ((tier === 'Ultra' || tier === 'Max' || tier === 'Super') ? 0.05 : percentageUsed / 100)) }}
                      transition={{ duration: 0.5, ease: 'easeOut' }}
                    />
                  </svg>
                  <Sparkles size={10} className="absolute text-indigo-500/80 animate-pulse" />
                </div>
              </div>
            </div>
          )}

          {currentUser ? (
            <div className={`flex ${isDesktopSidebarCollapsed ? 'items-center justify-center flex-col gap-3' : 'flex-col gap-2 w-full'}`}>
              <button
                onClick={() => setIsProfileOpen(true)}
                className={`flex items-center gap-3 p-2.5 rounded-2xl transition-all duration-300 relative ${
                  isDesktopSidebarCollapsed ? 'justify-center p-2' : 'w-full min-w-0 text-left'
                } ${
                  isPremium
                    ? 'border border-amber-500/25 bg-amber-500/5 hover:bg-amber-500/10 dark:border-amber-400/20 dark:bg-amber-400/5 dark:hover:bg-amber-400/10 shadow-[0_2px_12px_rgba(245,158,11,0.05)] hover:shadow-[0_2px_16px_rgba(245,158,11,0.12)]'
                    : 'hover:bg-white/30 dark:hover:bg-white/10 transition-colors border border-zinc-200/40 dark:border-zinc-800/40 bg-zinc-50/40 dark:bg-zinc-900/25'
                }`}
                title={t('common.profile')}
              >
                <div className={`relative shrink-0 ${
                  isPremium 
                    ? 'w-9 h-9 rounded-full p-[1.5px] bg-gradient-to-tr from-amber-400 via-yellow-400 to-amber-600 shadow-[0_0_8px_rgba(245,158,11,0.35)] flex items-center justify-center overflow-hidden'
                    : 'w-9 h-9 rounded-full bg-white border border-zinc-200 flex items-center justify-center shadow-sm overflow-hidden'
                }`}>
                  {isPremium ? (
                    <div className="w-full h-full rounded-full bg-white dark:bg-zinc-900 flex items-center justify-center overflow-hidden">
                      {currentUser.photoURL ? (
                        <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} className="text-amber-500" />
                      )}
                    </div>
                  ) : (
                    currentUser.photoURL ? (
                      <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={16} />
                    )
                  )}

                  {isPremium && isDesktopSidebarCollapsed && (
                    <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-linear-to-tr from-amber-500 to-yellow-400 border border-white dark:border-zinc-900 flex items-center justify-center text-[7px] text-white shadow-sm">
                      <Crown size={7} strokeWidth={2.5} className="fill-white text-white" />
                    </span>
                  )}
                </div>
                {!isDesktopSidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1.5">
                      <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                        {currentUser.displayName || 'User'}
                      </span>
                      {isPremium && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-linear-to-r from-amber-500 to-yellow-500 text-white font-extrabold uppercase tracking-wider shrink-0 flex items-center gap-0.5 select-none shadow-[0_1.5px_4px_rgba(245,158,11,0.2)] whitespace-nowrap">
                          <Crown size={8} strokeWidth={3} className="fill-white text-white" />
                          PRO
                        </span>
                      )}
                    </div>
                    {(tier !== 'Free' || userProfile?.preferences?.tier || (currentUser.email && (currentUser.email.toLowerCase() === 'lin076976528@gmail.com' || currentUser.email.toLowerCase() === 'lin6976528@gmail.com'))) && (
                      <div className="flex items-center gap-1 flex-wrap mt-1">
                        {(currentUser.email && (currentUser.email.toLowerCase() === 'lin076976528@gmail.com' || currentUser.email.toLowerCase() === 'lin6976528@gmail.com')) && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold uppercase tracking-wider whitespace-nowrap">
                            {isZh ? '管理員' : 'Admin'}
                          </span>
                        )}
                        <span className={`${
                          tier === 'Go'
                            ? 'bg-teal-100 text-teal-850 dark:bg-teal-955/35 dark:text-teal-300' 
                            : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300'
                        } text-[9.5px] px-1.5 py-0.5 rounded-md font-semibold uppercase tracking-wider whitespace-nowrap`}>
                           CoLab Ai {tier === 'Go' ? (isZh ? 'Go 學生方案' : 'Go Student Plan') : tier}
                        </span>
                        {isPointsLow && (
                          <span className="text-[9.5px] px-1.5 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 font-semibold flex items-center gap-1 whitespace-nowrap" title={isZh ? "Co幣剩餘不足 10%" : "CoCoins below 10%"}>
                            <AlertTriangle size={10} />
                            {isZh ? 'Co幣不足' : 'Low CoCoins'}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="text-[11px] text-zinc-500 truncate mt-1">{currentUser.email}</div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-zinc-500 dark:text-zinc-450 font-medium select-none whitespace-nowrap">
                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        syncStatus === 'synced' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' :
                        syncStatus === 'syncing' ? 'bg-amber-400' :
                        syncStatus === 'error' ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]' :
                        'bg-zinc-300'
                      } ${syncStatus === 'syncing' ? 'animate-pulse' : ''}`} />
                      <span className="truncate">
                        {syncStatus === 'synced' && t('common.dbSynced', '離線存檔已同步')}
                        {syncStatus === 'syncing' && t('common.dbSyncing', '正在備份至本地...')}
                        {syncStatus === 'error' && t('common.dbError', '同步失敗')}
                        {syncStatus === 'loading' && t('common.dbLoading', '載入本地中...')}
                      </span>
                    </div>
                  </div>
                )}
              </button>
              <div className={`${isDesktopSidebarCollapsed ? 'flex flex-col items-center gap-0.5 shrink-0' : 'grid grid-cols-5 gap-1 w-full p-1 rounded-xl bg-zinc-100/60 dark:bg-zinc-900/45 border border-zinc-200/40 dark:border-zinc-800/40'}`}>
                <button
                  onClick={() => setIsShortcutsOpen(true)}
                  className={`p-2 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center cursor-pointer ${isDesktopSidebarCollapsed ? 'rounded-2xl' : ''}`}
                  title={t('common.shortcuts', '快捷鍵說明 / Keyboard Shortcuts')}
                >
                  <Keyboard size={17} />
                </button>
                <button
                  onClick={() => setIsProfileOpen(true)}
                  className={`p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition-colors relative flex items-center justify-center cursor-pointer ${isDesktopSidebarCollapsed ? 'rounded-2xl' : ''}`}
                  title={`${t('common.settings', '設定')} (${
                    syncStatus === 'synced' ? t('common.dbSynced', '離線存檔已同步') :
                    syncStatus === 'syncing' ? t('common.dbSyncing', '正在備份至本地...') :
                    syncStatus === 'error' ? t('common.dbError', '同步失敗') :
                    t('common.dbLoading', '載入本地中...')
                  })`}
                >
                  <Settings size={17} />
                  {isDesktopSidebarCollapsed && (
                    <span className={`absolute top-1 right-1 w-2 h-2 rounded-full border border-white dark:border-zinc-900 ${
                      syncStatus === 'synced' ? 'bg-emerald-500' :
                      syncStatus === 'syncing' ? 'bg-amber-400 animate-pulse' :
                      syncStatus === 'error' ? 'bg-rose-500' :
                      'bg-zinc-300 animate-pulse'
                    }`} />
                  )}
                </button>
                <button
                  onClick={() => setIsHistoryOpen(true)}
                  className={`p-2 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center cursor-pointer ${isDesktopSidebarCollapsed ? 'rounded-2xl' : ''}`}
                  title={t('common.history')}
                >
                  <Clock size={17} />
                </button>
                <button
                  onClick={() => setIsDriveModalOpen(true)}
                  className={`p-2 text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white/60 dark:hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center cursor-pointer ${isDesktopSidebarCollapsed ? 'rounded-2xl' : ''}`}
                  title="Google Drive 雲端同步與備份 (Alt+G)"
                >
                  <HardDrive size={17} />
                </button>
                <button
                  onClick={logout}
                  className={`p-2 text-zinc-600 dark:text-zinc-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50/70 dark:hover:bg-red-950/30 rounded-xl transition-colors flex items-center justify-center cursor-pointer ${isDesktopSidebarCollapsed ? 'rounded-2xl' : ''}`}
                  title={t('common.logout')}
                >
                  <LogOut size={17} />
                </button>
              </div>
            </div>
          ) : (
            <div className={`flex items-center ${isDesktopSidebarCollapsed ? 'flex-col gap-2' : 'gap-1.5 w-full'}`}>
              <button
                onClick={login}
                className={`flex items-center justify-center gap-2 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:bg-black dark:hover:bg-white transition-colors shadow-sm cursor-pointer ${isDesktopSidebarCollapsed ? 'w-10 h-10 p-0 rounded-full' : 'flex-1 py-2.5 px-4'}`}
                title={t('common.login')}
              >
                <User size={16} />
                {!isDesktopSidebarCollapsed && <span>{t('common.login')}</span>}
              </button>
              <button
                onClick={() => setIsProfileOpen(true)}
                className="p-2.5 text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/30 dark:hover:bg-white/10 rounded-2xl transition-colors shrink-0 cursor-pointer"
                title={`${t('common.settings', '設定')} / Settings`}
              >
                <Settings size={18} />
              </button>
            </div>
          )}
          
          {/* Language Switcher */}
          <div className={`pt-3 border-t border-white/30 hidden md:flex ${isDesktopSidebarCollapsed ? 'justify-center' : 'justify-between items-center'}`}>
            {!isDesktopSidebarCollapsed && <span className="text-xs text-zinc-600 font-medium flex items-center gap-1.5"><Globe size={14} /> {t('common.language', 'Language')}</span>}
            <LanguageSwitcher align="left" />
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col h-screen relative overflow-hidden bg-transparent pt-16 md:pt-0">
        {/* Desktop Floating Apple Liquid Glass Top Bar */}
        <div className="hidden md:flex items-center justify-between gap-4 px-5 h-13 mx-4 mt-3 rounded-[22px] glass-panel shrink-0 z-30">
          <div className="min-w-0 shrink-0">
            {activeFeature !== 'dashboard' ? (
              <button
                onClick={() => onSelectFeature('dashboard')}
                className="flex items-center gap-1.5 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white font-medium text-sm transition-all hover:translate-x-[-2px] cursor-pointer whitespace-nowrap"
              >
                <ChevronLeft size={16} />
                <span>{t('common.backToDashboard', '返回儀表板')}</span>
              </button>
            ) : (
              <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400 tracking-wide whitespace-nowrap">
                CoLab Workspace
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 lg:gap-3 min-w-0">
            {isApproachingLimit && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9, y: -4 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="flex items-center gap-2 shrink-0"
              >
                <button
                  onClick={() => setIsPricingModalOpen(true)}
                  className="flex items-center gap-2 px-3 py-1.5 glass-button rounded-full text-red-600 dark:text-red-400 text-xs font-bold transition-all duration-200 cursor-pointer group whitespace-nowrap"
                  title={`${Math.round(percentageUsed)}% of quota used. Click to upgrade!`}
                >
                  <AlertTriangle size={13} className="text-red-500 shrink-0 group-hover:scale-110 transition-transform" />
                  <span className="hidden lg:inline leading-none tabular-nums">{isZh ? `算力配額已用 ${Math.round(percentageUsed)}% · 升級` : `Quota ${Math.round(percentageUsed)}% · Upgrade`}</span>
                  <span className="lg:hidden leading-none tabular-nums">{Math.round(percentageUsed)}% · {isZh ? '升級' : 'Upgrade'}</span>
                </button>
              </motion.div>
            )}
            {/* Search Pill */}
            <button
              onClick={() => setIsGlobalSearchOpen(true)}
              className="flex items-center gap-2 px-3.5 py-1.5 glass-input rounded-full text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-normal transition-all cursor-pointer min-w-0 whitespace-nowrap"
            >
              <Search size={13} strokeWidth={1.75} className="shrink-0" />
              <span className="hidden xl:inline truncate max-w-[160px]">{t('common.searchGlobalPlaceholderShort', '搜尋功能、歷史紀錄...')}</span>
              <span className="xl:hidden">{t('common.search', '搜尋')}</span>
              <span className="hidden sm:flex items-center gap-0.5 ml-1 border border-white/60 dark:border-white/15 px-1.5 py-0.5 rounded-full text-[9px] bg-white/50 dark:bg-white/10 font-mono select-none shrink-0">
                <Command size={8} /> K
              </span>
            </button>

            {/* Performance Optimizer Quick Button */}
            <TopBarPerfButton
              perfMode={perfMode}
              isZh={isZh}
              onClick={() => setIsPerformanceModalOpen(true)}
            />

            {/* Google Drive Workspace File & Backup Manager Button */}
            <button
              onClick={() => setIsDriveModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-button text-xs font-semibold text-zinc-700 dark:text-zinc-200 cursor-pointer whitespace-nowrap shrink-0"
              title="Google Drive 雲端檔案與備份"
            >
              <HardDrive size={13} className="text-sky-500 shrink-0" />
              <span className="text-[11px] hidden lg:inline">Google Drive</span>
            </button>

            {/* Subtle Network & Server-Side Gemini API Status Indicator */}
            <NetworkStatusIndicator variant="navbar" />

            {/* Language Switcher Dropdown */}
            <LanguageSwitcher align="right" />
            
            {activeFeature !== 'dashboard' && (
              <div className="hidden xl:block text-xs font-medium text-zinc-600 dark:text-zinc-300 tracking-wide whitespace-nowrap truncate max-w-[140px]">
                {activeFeatureData ? t(`features.${activeFeatureData.id}.title`) : ''}
              </div>
            )}
          </div>
        </div>

        {/* Approaching Quota Notification Toast inside/below Navigation Bar */}
        <AnimatePresence>
          {isApproachingLimit && !isQuotaWarningDismissed && (
            <motion.div
              initial={{ opacity: 0, y: -15, height: 0 }}
              animate={{ opacity: 1, y: 0, height: 'auto' }}
              exit={{ opacity: 0, y: -15, height: 0 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="bg-gradient-to-r from-indigo-605/95 via-purple-600/95 to-pink-605/95 text-white overflow-hidden shrink-0 z-25 border-b border-indigo-500/20 shadow-md relative"
            >
              <div className="px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3.5 max-w-7xl mx-auto">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0 animate-bounce">
                    <Bell size={14} className="text-white shrink-0" />
                  </div>
                  <div className="space-y-0.5 text-center sm:text-left">
                    <div className="text-xs font-bold flex items-center justify-center sm:justify-start gap-2">
                      <span>{isZh ? '算力配額預警 (Quota Alert)' : 'Compute Quota Alert'}</span>
                      <span className="bg-white/20 px-2 py-0.5 rounded-full text-[9px] font-mono tracking-wider font-extrabold text-amber-200">
                        {Math.round(percentageUsed)}% USED
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-100 font-light max-w-2xl leading-relaxed">
                      {isZh ? `您的月度 Co幣算力已消耗達 ${Math.round(percentageUsed)}%。建議立即升級至更高的方案，確保在創作、編譯及 Live 語音互動中不間斷地享受高速算力！` : `You have used ${Math.round(percentageUsed)}% of your monthly CoCoins computing quota. We suggest upgrading your plan to enjoy uninterrupted high-speed creations!`}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center justify-center gap-2 shrink-0">
                  <button
                    onClick={() => setIsPricingModalOpen(true)}
                    className="px-3.5 py-1.5 bg-white text-indigo-750 hover:bg-zinc-50 font-extrabold text-xs rounded-xl shadow-xs hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Sparkles size={11} className="animate-spin text-amber-500 shrink-0" />
                    <span>{isZh ? '立即升級方案' : 'Upgrade Plan Now'}</span>
                  </button>
                  <button
                    onClick={() => setIsQuotaWarningDismissed(true)}
                    className="p-1 px-2.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-all font-semibold text-xs cursor-pointer"
                  >
                    {isZh ? '忽略' : 'Ignore'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overlay for mobile */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-30 md:hidden"
              onClick={() => setIsSidebarOpen(false)}
            />
          )}
        </AnimatePresence>
        
        <div 
          ref={contentRef}
          className="flex-1 overflow-y-auto w-full h-full relative overscroll-y-none"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          {/* Pull to refresh indicator */}
          <div 
            ref={pullIndicatorRef}
            className="absolute top-0 left-0 right-0 flex justify-center z-20 pointer-events-none md:hidden"
            style={{ 
              transform: isRefreshing ? 'translate3d(0, 20px, 0)' : 'translate3d(0, 0px, 0)',
              opacity: isRefreshing ? 1 : 0,
            }}
          >
            <div ref={pullIconRef} className="bg-white rounded-full shadow-md flex items-center justify-center w-10 h-10 border border-zinc-100">
              <Loader2 
                size={20} 
                className={`text-zinc-600 ${isRefreshing ? 'animate-spin' : ''}`} 
              />
            </div>
          </div>

          <div 
            ref={pullWrapperRef}
            className="w-full h-full"
            style={{ 
              transform: isRefreshing ? 'translate3d(0, 60px, 0)' : undefined,
            }}
          >
            <motion.div
              key={`${activeFeature}-${refreshKey}`}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={perfMode === 'extreme' ? { duration: 0.05 } : { duration: 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="w-full h-full"
            >
              {children}
            </motion.div>
          </div>
          
          {/* Floating Action Buttons */}
          <div className={`fixed z-40 flex flex-col gap-3 transition-all duration-300 ${
            ['chat', 'agent', 'fast-chat', 'live-audio'].includes(activeFeature)
              ? 'bottom-24 md:bottom-28 right-6'
              : activeFeature === 'three-d-studio'
              ? 'bottom-32 md:bottom-6 right-4'
              : 'bottom-6 right-6'
          }`}>
            <button
              onClick={() => setIsFeedbackModalOpen(true)}
              className="w-12 h-12 glass-button text-zinc-700 dark:text-zinc-300 rounded-full flex items-center justify-center shadow-lg hover:text-zinc-900 dark:hover:text-zinc-100 hover:scale-105 active:scale-95 transition-all"
              title={t('common.provideFeedback')}
            >
              <MessageSquarePlus size={24} />
            </button>
            
            {activeFeatureData?.tutorial && (
              <HelpButton featureId={activeFeatureData.id} />
            )}
          </div>
        </div>

        {/* Feedback Modal */}
        <AnimatePresence>
          {isFeedbackModalOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
                onClick={() => !isSubmittingFeedback && setIsFeedbackModalOpen(false)}
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                className="relative w-full max-w-md glass-panel dark:bg-zinc-900/90 rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
              >
                {feedbackSuccess ? (
                  <div className="p-10 flex flex-col items-center justify-center text-center space-y-4">
                    <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-2">
                      <CheckCircle2 size={32} />
                    </div>
                    <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100">{t('common.feedbackSuccess')}</h3>
                    <p className="text-zinc-500 dark:text-zinc-400 font-light">{t('common.feedbackSuccessDesc', { feature: activeFeatureData ? t(`features.${activeFeatureData.id}.title`) : 'CoLab' })}</p>
                  </div>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center shadow-sm">
                          <MessageSquarePlus size={20} className="text-zinc-700 dark:text-zinc-300" />
                        </div>
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{t('common.provideFeedback')}</h3>
                      </div>
                      <button
                        onClick={() => setIsFeedbackModalOpen(false)}
                        disabled={isSubmittingFeedback}
                        className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors disabled:opacity-50"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    
                    <div className="p-6 space-y-6">
                      <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">{t('common.feedbackQuestion', { feature: activeFeatureData ? t(`features.${activeFeatureData.id}.title`) : '' })}</p>
                        <div className="flex gap-4">
                          <button
                            onClick={() => setFeedbackType('up')}
                            className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                              feedbackType === 'up' 
                                ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 shadow-sm' 
                                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                            }`}
                          >
                            <ThumbsUp size={18} className={feedbackType === 'up' ? 'fill-emerald-100' : ''} />
                            <span>{t('common.thumbsUp')}</span>
                          </button>
                          <button
                            onClick={() => setFeedbackType('down')}
                            className={`flex-1 py-3 px-4 rounded-xl border flex items-center justify-center gap-2 transition-all ${
                              feedbackType === 'down' 
                                ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 shadow-sm' 
                                : 'bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-700'
                            }`}
                          >
                            <ThumbsDown size={18} className={feedbackType === 'down' ? 'fill-red-100' : ''} />
                            <span>{t('common.thumbsDown')}</span>
                          </button>
                        </div>
                      </div>
                      
                      <div>
                        <p className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3">{t('common.feedbackDetails')}</p>
                        <textarea
                          value={feedbackText}
                          onChange={(e) => setFeedbackText(e.target.value)}
                          placeholder={t('common.feedbackPlaceholder')}
                          className="w-full p-3 bg-zinc-50/50 dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-700 rounded-xl focus:bg-white dark:focus:bg-zinc-800 focus:border-zinc-400 dark:focus:border-zinc-500 focus:ring-4 focus:ring-zinc-100 dark:focus:ring-zinc-800 transition-all outline-none resize-none h-28 font-light text-sm dark:text-zinc-100"
                        />
                      </div>
                    </div>
                    
                    <div className="p-4 border-t border-white/20 dark:border-white/5 bg-white/10 dark:bg-zinc-900/10 flex justify-end gap-3">
                      <button
                        onClick={() => setIsFeedbackModalOpen(false)}
                        disabled={isSubmittingFeedback}
                        className="px-5 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-white/30 dark:hover:bg-white/10 rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
                      >
                        {t('common.cancel')}
                      </button>
                      <button
                        onClick={handleFeedbackSubmit}
                        disabled={(!feedbackType && !feedbackText.trim()) || isSubmittingFeedback}
                        className="px-6 py-2.5 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:bg-black dark:hover:bg-white transition-colors shadow-sm disabled:opacity-50 disabled:hover:bg-black/80 dark:disabled:hover:bg-white/90 flex items-center gap-2"
                      >
                        {isSubmittingFeedback ? (
                          <>
                            <Loader2 size={16} className="animate-spin" />
                            {t('common.submitting')}
                          </>
                        ) : (
                          t('common.submitFeedback')
                        )}
                      </button>
                    </div>
                  </>
                )}
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <Suspense fallback={null}>
          {shouldMountHistory && (
            <HistoryPanel isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
          )}
          {shouldMountProfile && (
            <UserProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
          )}
          {shouldMountShortcuts && (
            <KeyboardShortcutsModal 
              isOpen={isShortcutsOpen} 
              onClose={() => setIsShortcutsOpen(false)}
              onSelectFeature={onSelectFeature}
              onToggleHistory={() => setIsHistoryOpen(prev => !prev)}
              onToggleSettings={() => setIsProfileOpen(prev => !prev)}
            />
          )}
          {shouldMountPoints && (
            <PointsModal 
              isOpen={isPointsModalOpen} 
              onClose={() => setIsPointsModalOpen(false)} 
              onUpgradeClick={() => {
                setIsPointsModalOpen(false);
                setIsPricingModalOpen(true);
              }}
            />
          )}
          {shouldMountPricing && (
            <PricingModal isOpen={isPricingModalOpen} onClose={() => setIsPricingModalOpen(false)} />
          )}
          {shouldMountGlobalSearch && (
            <GlobalSearchModal isOpen={isGlobalSearchOpen} onClose={() => setIsGlobalSearchOpen(false)} onSelectFeature={onSelectFeature} />
          )}
        </Suspense>
        
        <CoCoinWarningNotification
          isVisible={isWarningVisible}
          remainingPoints={remainingPoints}
          onClose={() => handleDismissWarning(remainingPoints)}
          onUpgradeClick={() => setIsPricingModalOpen(true)}
        />

        <AnimatePresence>
          {isLoggingIn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="flex flex-col items-center gap-6 p-8 glass-panel rounded-3xl shadow-2xl max-w-sm w-full mx-4"
              >
                <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-inner relative">
                  <img 
                    src="https://images.unsplash.com/photo-1544568100-847a948585b9?q=80&w=400&auto=format&fit=crop" 
                    alt="Welcome Back" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{t('common.welcomeBack', '歡迎回來')}</h3>
                  <p className="text-base text-zinc-500 dark:text-zinc-400 font-medium">{t('common.niceToSeeYou', '很高興再次見到您 ✨')}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 text-zinc-400 dark:text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium uppercase tracking-widest">{t('common.loggingIn') || 'Logging in...'}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {isLoggingOut && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="flex flex-col items-center gap-6 p-8 glass-panel rounded-3xl shadow-2xl max-w-sm w-full mx-4"
              >
                <div className="w-48 h-48 rounded-2xl overflow-hidden shadow-inner relative">
                  <img 
                    src="https://images.unsplash.com/photo-1517849845537-4d257902454a?q=80&w=400&auto=format&fit=crop" 
                    alt="Goodbye" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center space-y-2">
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{t('common.goodbye', '我們捨不得你離開')}</h3>
                  <p className="text-base text-zinc-500 dark:text-zinc-400 font-medium">{t('common.hopeToSeeYou', '希望與您再相見 👋')}</p>
                </div>
                <div className="flex items-center gap-2 mt-2 text-zinc-400 dark:text-zinc-500">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-medium uppercase tracking-widest">{t('common.loggingOut') || 'Logging out...'}</span>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Full-Screen Login Celebrate Overlay */}
        <AnimatePresence>
          {showCelebrateOverlay && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-md pointer-events-none"
            >
              <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-emerald-500/10 mix-blend-color-dodge animate-pulse" />
              <motion.div
                initial={{ scale: 0.8, opacity: 0, y: 30 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.85, opacity: 0, y: -20 }}
                transition={{ type: "spring", damping: 15, stiffness: 120 }}
                className="relative flex flex-col items-center gap-5 p-10 bg-white/90 dark:bg-zinc-950/80 border border-zinc-200/50 dark:border-zinc-800/80 rounded-3xl shadow-2xl max-w-sm w-full mx-4 text-center backdrop-blur-xl"
              >
                {/* Glowing check circle & sparkling aura */}
                <div className="relative">
                  <motion.div
                    animate={{ scale: [1, 1.15, 1], rotate: [0, 5, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
                    className="w-20 h-20 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-500 shadow-lg shadow-emerald-500/10"
                  >
                    <CheckCircle2 size={44} className="stroke-[1.5]" />
                  </motion.div>
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
                    className="absolute -inset-2 border-2 border-dashed border-indigo-500/20 rounded-full"
                  />
                  <div className="absolute -top-1 -right-1 text-xl animate-bounce">✨</div>
                  <div className="absolute -bottom-1 -left-1 text-xl animate-bounce [animation-delay:0.3s]">🎉</div>
                </div>

                <div className="space-y-2 mt-2">
                  <motion.h4
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                    className="text-2xl font-black bg-gradient-to-r from-zinc-900 via-indigo-900 to-emerald-900 dark:from-white dark:via-zinc-200 dark:to-emerald-400 bg-clip-text text-transparent tracking-tight"
                  >
                    {t('common.loginSuccessTitle', '登入成功')}
                  </motion.h4>
                  <motion.p
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-sm font-medium text-zinc-500 dark:text-zinc-400"
                  >
                    {t('common.loginSuccessSub', '歡迎啟動卓越的 AI 創作協作世界')}
                  </motion.p>
                </div>

                {/* Animated Greeting Card */}
                {loginSuccessToast && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="flex items-center gap-3.5 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-150/50 dark:border-zinc-800/30 p-3.5 rounded-2xl w-full"
                  >
                    <div className="w-11 h-11 rounded-full ring-2 ring-emerald-500/20 shadow-inner overflow-hidden shrink-0">
                      {loginSuccessToast.photoURL ? (
                        <img src={loginSuccessToast.photoURL} alt={loginSuccessToast.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-zinc-150 dark:bg-zinc-850 flex items-center justify-center text-zinc-500">
                          <User size={18} />
                        </div>
                      )}
                    </div>
                    <div className="text-left min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200 truncate">{loginSuccessToast.displayName}</span>
                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border ${
                          loginSuccessToast.tier === 'Super'
                            ? 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20'
                            : loginSuccessToast.tier === 'Max'
                              ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                              : loginSuccessToast.tier === 'Ultra'
                                ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 border-transparent'
                        }`}>
                          CoLab Ai {loginSuccessToast.tier}
                        </span>
                      </div>
                      <span className="text-[10px] text-zinc-500 truncate block mt-0.5">{loginSuccessToast.email}</span>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Toast Notification */}
        <AnimatePresence>
          {loginSuccessToast && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.9, x: 20 }}
              animate={{ opacity: 1, y: 0, scale: 1, x: 0 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ type: "spring", damping: 20, stiffness: 220 }}
              className="fixed top-6 right-6 z-[120] w-[340px] bg-white/95 dark:bg-zinc-950/95 border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl shadow-xl shadow-zinc-200/40 dark:shadow-black/60 overflow-hidden backdrop-blur-md animate-in fade-in slide-in-from-top-6"
            >
              {/* Colored top gradient border */}
              <div className="h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
              
              <div className="p-4 flex gap-3.5 relative">
                {/* Image and icon indicator container */}
                <div className="relative shrink-0">
                  <div className="w-11 h-11 rounded-xl ring-2 ring-emerald-500/20 shadow-inner overflow-hidden">
                    {loginSuccessToast.photoURL ? (
                      <img src={loginSuccessToast.photoURL} alt={loginSuccessToast.displayName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-zinc-150 dark:bg-zinc-850 flex items-center justify-center text-zinc-500">
                        <User size={18} />
                      </div>
                    )}
                  </div>
                  {/* Small absolute check indicator bubble */}
                  <span className="absolute -bottom-1 -right-1.5 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white dark:ring-zinc-950">
                    <CheckCircle2 size={10} className="stroke-[3]" />
                  </span>
                </div>

                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-zinc-850 dark:text-zinc-100 truncate">
                      {loginSuccessToast.displayName}
                    </span>
                    <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border select-none ${
                      loginSuccessToast.tier === 'Super'
                        ? 'bg-fuchsia-500/10 text-fuchsia-600 dark:text-fuchsia-400 border-fuchsia-500/20'
                        : loginSuccessToast.tier === 'Max'
                          ? 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                          : loginSuccessToast.tier === 'Ultra'
                            ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                            : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 border-transparent'
                    }`}>
                      CoLab Ai {loginSuccessToast.tier}
                    </span>
                  </div>
                  <h5 className="text-[11px] font-medium text-zinc-500 dark:text-zinc-400 mt-1">
                    {t('common.loginSuccessGreeting', '登入成功！歡迎回到協作平台 ✨')}
                  </h5>
                  <p className="text-[9px] text-zinc-400 mt-0.5 truncate">{loginSuccessToast.email}</p>
                </div>

                {/* Dismiss button */}
                <button
                  onClick={() => setLoginSuccessToast(null)}
                  className="absolute top-3.5 right-3 px-1.5 py-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={14} />
                </button>
              </div>

              {/* Countdown Progress Indicator line */}
              <motion.div
                initial={{ width: "100%" }}
                animate={{ width: "0%" }}
                transition={{ duration: 4.5, ease: "linear" }}
                className="h-0.5 bg-emerald-500/60"
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <ModelStatusIndicator activeFeature={activeFeature} />

      <Suspense fallback={null}>
        {shouldMountPerformance && (
          <PerformanceOptimizerModal
            isOpen={isPerformanceModalOpen}
            onClose={() => setIsPerformanceModalOpen(false)}
          />
        )}

        {shouldMountDrive && (
          <GoogleDriveModal
            isOpen={isDriveModalOpen}
            onClose={() => setIsDriveModalOpen(false)}
          />
        )}

        {shouldMountActivityPreview && (
          <RecentActivityPreviewModal
            activity={activePreviewActivity}
            onClose={() => setActivePreviewActivity(null)}
            onImportToChat={handleImportActivityToChat}
          />
        )}
      </Suspense>
    </div>
  );
}
