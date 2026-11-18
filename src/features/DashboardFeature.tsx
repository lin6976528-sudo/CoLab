import React from 'react';
import { useTranslation } from 'react-i18next';
import { FEATURES, getIconComponent } from '../constants';
import { FeatureId } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Calendar, Zap, Shield, Crown, HelpCircle, Mail, Bell, Check, Loader2, Star, SlidersHorizontal, Eye, EyeOff, Search, Box } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription, TIER_LIMITS } from '../contexts/SubscriptionContext';
import { useHistory } from '../contexts/HistoryContext';
import { DashboardAnalyticsTrend } from '../components/DashboardAnalyticsTrend';
import { CompareModelsView } from '../components/CompareModelsView';
import { useRecentActivity, RecentActivityItem } from '../contexts/RecentActivityContext';
import { RecentActivityPanel } from '../components/RecentActivityPanel';
import { PromptLibraryWidget } from '../components/PromptLibraryWidget';
import { useChatHistory } from '../contexts/ChatHistoryContext';
import RecentActivityPreviewModal from '../components/RecentActivityPreviewModal';
import InteractionHeatmap from '../components/InteractionHeatmap';
import FocusModeWidget from '../components/FocusModeWidget';
import { RecommendedToolsWidget } from '../components/RecommendedToolsWidget';
import { Clock, MessageSquare, HardDrive, FileText, Image, FileCode } from 'lucide-react';

interface DashboardFeatureProps {
  onSelectFeature: (id: FeatureId) => void;
}

function DashboardFeature({ onSelectFeature }: DashboardFeatureProps) {
  const { t } = useTranslation();
  const { currentUser, userProfile, updatePreferences } = useAuth();
  const { tier, pointsUsed, pointsLimit } = useSubscription();
  const { history } = useHistory();
  const { activities } = useRecentActivity();
  const { setActiveChatSessionId } = useChatHistory();
  const [activePreviewActivity, setActivePreviewActivity] = React.useState<RecentActivityItem | null>(null);

  // Compute today's dynamic requests
  const todayRequestsCount = React.useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    return history.filter((item) => {
      if (!item.createdAt) return false;
      let d: Date;
      if (typeof item.createdAt.toDate === 'function') {
        d = item.createdAt.toDate();
      } else if (item.createdAt.seconds) {
        d = new Date(item.createdAt.seconds * 1000);
      } else {
        d = new Date(item.createdAt);
      }
      return d.toISOString().split('T')[0] === todayStr;
    }).length;
  }, [history]);

  const dailyLimit = TIER_LIMITS[tier] || 5;
  const dailyPercentage = dailyLimit !== Infinity ? Math.min(100, Math.max(0, (todayRequestsCount / dailyLimit) * 100)) : 100;

  const handleImportActivityToChat = (activity: RecentActivityItem) => {
    setActivePreviewActivity(null);
    if (activity.content) {
      localStorage.setItem('co_staged_activity_file', JSON.stringify({ name: activity.name, content: activity.content }));
    }
    onSelectFeature('chat');
  };

  const categories = ['Text & Chat', 'Image', 'Video', 'Audio'];

  // Helper to dynamically calculate and format real renewal date
  const renewalDateStr = React.useMemo(() => {
    let creationDate = new Date();
    if (userProfile?.createdAt) {
      const seconds = userProfile.createdAt.seconds || userProfile.createdAt._seconds;
      if (seconds) {
        creationDate = new Date(seconds * 1000);
      }
    } else if (currentUser?.metadata?.creationTime) {
      creationDate = new Date(currentUser.metadata.creationTime);
    }
    
    const today = new Date();
    // Next renewal is the same day of the month as creation, in the next month
    const renewal = new Date(today.getFullYear(), today.getMonth() + 1, creationDate.getDate());
    
    if (isNaN(renewal.getTime())) {
      return '2026-07-08';
    }
    
    return renewal.toLocaleDateString('zh-TW', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '-');
  }, [userProfile?.createdAt, currentUser?.metadata?.creationTime]);

  // Tier-specific rendering properties
  const visuals = React.useMemo(() => {
    switch (tier) {
      case 'Super':
        return {
          icon: <Crown className="text-fuchsia-500 dark:text-fuchsia-400" size={24} />,
          badgeColor: 'bg-fuchsia-500/10 text-fuchsia-700 dark:text-fuchsia-300 border-fuchsia-500/20',
          gradientBg: 'from-fuchsia-500/12 via-pink-400/5 to-transparent',
          glowEffect: '',
          statusLabel: '究極尊榮 · 全自動化 AGI 核心方案',
          renewalLabel: '永久展延 (終身無極限)',
          bannerLeftBorder: '',
        };
      case 'Max':
        return {
          icon: <Crown className="text-rose-500 dark:text-rose-400" size={24} />,
          badgeColor: 'bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/20',
          gradientBg: 'from-rose-500/10 via-pink-400/5 to-transparent',
          glowEffect: '',
          statusLabel: '頂規尊榮方案 · 已啟動',
          renewalLabel: '永久展延 (終身無限暢玩)',
          bannerLeftBorder: '',
        };
      case 'Ultra':
        return {
          icon: <Crown className="text-amber-500 dark:text-amber-400" size={24} />,
          badgeColor: 'bg-sky-500/12 text-sky-700 dark:text-sky-300 border-sky-500/20',
          gradientBg: 'from-sky-400/12 via-indigo-400/5 to-transparent',
          glowEffect: '',
          statusLabel: 'CoLab 終身管理員 · 旗艦頂級訂閱',
          renewalLabel: '自動展延 (終身無限制)',
          bannerLeftBorder: '',
        };
      case 'Pro':
        return {
          icon: <Crown className="text-blue-500 dark:text-blue-400" size={24} />,
          badgeColor: 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border-blue-500/20',
          gradientBg: 'from-blue-500/10 via-sky-400/5 to-transparent',
          glowEffect: '',
          statusLabel: '高能創作型 · 已啟動',
          renewalLabel: `續期扣款：${renewalDateStr}`,
          bannerLeftBorder: '',
        };
      case 'Go':
        return {
          icon: <Zap className="text-teal-500 dark:text-teal-400" size={24} />,
          badgeColor: 'bg-teal-500/10 text-teal-700 dark:text-teal-300 border-teal-500/20',
          gradientBg: 'from-teal-500/10 via-emerald-400/5 to-transparent',
          glowEffect: '',
          statusLabel: '學生青年 Go 創新方案 · 已啟動',
          renewalLabel: `續期扣款：${renewalDateStr}`,
          bannerLeftBorder: '',
        };
      case 'Plus':
        return {
          icon: <Zap className="text-indigo-500 dark:text-indigo-400" size={24} />,
          badgeColor: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/20',
          gradientBg: 'from-indigo-500/10 via-sky-400/5 to-transparent',
          glowEffect: '',
          statusLabel: '超值精選 · 已啟動',
          renewalLabel: `續期扣款：${renewalDateStr}`,
          bannerLeftBorder: '',
        };
      default:
        return {
          icon: <Shield className="text-zinc-500 dark:text-zinc-400" size={24} />,
          badgeColor: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300 border-zinc-400/20',
          gradientBg: 'from-sky-400/8 via-transparent to-transparent',
          glowEffect: '',
          statusLabel: '免費體驗中',
          renewalLabel: '永久有效 (不限期)',
          bannerLeftBorder: '',
        };
    }
  }, [tier, renewalDateStr]);

  const usagePercentage = pointsLimit && pointsLimit !== Infinity ? Math.min(100, Math.max(0, (pointsUsed / pointsLimit) * 100)) : 0;

  // Toggle Preferences States for Email & Push Notifications
  const [emailNotifs, setEmailNotifs] = React.useState<boolean>(() => {
    if (userProfile?.preferences?.emailRenewalNotification !== undefined) {
      return !!userProfile.preferences.emailRenewalNotification;
    }
    return typeof window !== 'undefined' ? localStorage.getItem('email_renewal_notifs') === 'true' : false;
  });

  const [pushNotifs, setPushNotifs] = React.useState<boolean>(() => {
    if (userProfile?.preferences?.pushRenewalNotification !== undefined) {
      return !!userProfile.preferences.pushRenewalNotification;
    }
    return typeof window !== 'undefined' ? localStorage.getItem('push_renewal_notifs') === 'true' : false;
  });

  const [isUpdatingEmail, setIsUpdatingEmail] = React.useState(false);
  const [isUpdatingPush, setIsUpdatingPush] = React.useState(false);
  const [toastMessage, setToastMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (userProfile?.preferences?.emailRenewalNotification !== undefined) {
      setEmailNotifs(!!userProfile.preferences.emailRenewalNotification);
    }
  }, [userProfile?.preferences?.emailRenewalNotification]);

  React.useEffect(() => {
    if (userProfile?.preferences?.pushRenewalNotification !== undefined) {
      setPushNotifs(!!userProfile.preferences.pushRenewalNotification);
    }
  }, [userProfile?.preferences?.pushRenewalNotification]);

  const [pinnedFeatures, setPinnedFeatures] = React.useState<string[]>(() => {
    if (userProfile?.preferences?.pinnedFeatures) {
      return userProfile.preferences.pinnedFeatures;
    }
    try {
      const saved = localStorage.getItem('colab_pinned_features');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [hiddenFeatures, setHiddenFeatures] = React.useState<string[]>(() => {
    if (userProfile?.preferences?.hiddenFeatures) {
      return userProfile.preferences.hiddenFeatures;
    }
    try {
      const saved = localStorage.getItem('colab_hidden_features');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isCustomizing, setIsCustomizing] = React.useState(false);
  const [customizingSearchQuery, setCustomizingSearchQuery] = React.useState('');

  React.useEffect(() => {
    if (userProfile?.preferences?.pinnedFeatures) {
      setPinnedFeatures(userProfile.preferences.pinnedFeatures);
    }
  }, [userProfile?.preferences?.pinnedFeatures]);

  React.useEffect(() => {
    if (userProfile?.preferences?.hiddenFeatures) {
      setHiddenFeatures(userProfile.preferences.hiddenFeatures);
    }
  }, [userProfile?.preferences?.hiddenFeatures]);

  const toggleFeatureVisibility = async (featureId: string) => {
    const isCurrentlyHidden = hiddenFeatures.includes(featureId);
    let updatedHidden: string[];
    if (isCurrentlyHidden) {
      updatedHidden = hiddenFeatures.filter(id => id !== featureId);
    } else {
      updatedHidden = [...hiddenFeatures, featureId];
    }

    setHiddenFeatures(updatedHidden);
    try {
      localStorage.setItem('colab_hidden_features', JSON.stringify(updatedHidden));
    } catch (err) {
      console.error('Failed to save hidden features locally:', err);
    }

    showNotification(isCurrentlyHidden ? '👁️ 已恢復工具在工作區的顯示' : '🙈 已在工作區暫時隱藏該工具');

    if (currentUser && userProfile) {
      try {
        await updatePreferences({ hiddenFeatures: updatedHidden });
      } catch (err) {
        console.error('Failed to save hidden features to profile:', err);
      }
    }
  };

  const resetFeatureVisibility = async () => {
    setHiddenFeatures([]);
    try {
      localStorage.setItem('colab_hidden_features', JSON.stringify([]));
    } catch (err) {
      console.error('Failed to reset hidden features locally:', err);
    }

    showNotification('🔄 儀表板已全部還原為預設顯示設定');

    if (currentUser && userProfile) {
      try {
        await updatePreferences({ hiddenFeatures: [] });
      } catch (err) {
        console.error('Failed to reset hidden features of profile:', err);
      }
    }
  };

  const togglePinFeature = async (featureId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const isPinned = pinnedFeatures.includes(featureId);
    let updatedPins: string[];
    if (isPinned) {
      updatedPins = pinnedFeatures.filter(id => id !== featureId);
    } else {
      updatedPins = [...pinnedFeatures, featureId];
    }

    setPinnedFeatures(updatedPins);
    try {
      localStorage.setItem('colab_pinned_features', JSON.stringify(updatedPins));
    } catch (err) {
      console.error('Failed to save pinned features locally:', err);
    }

    showNotification(isPinned ? '📌 已取消釘選該工具' : '⭐ 已成功固定工具至最上方');

    if (currentUser && userProfile) {
      try {
        await updatePreferences({ pinnedFeatures: updatedPins });
      } catch (err) {
        console.error('Failed to save pinned features to profile:', err);
      }
    }
  };

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    const timer = setTimeout(() => {
      setToastMessage(null);
    }, 3000);
    return () => clearTimeout(timer);
  };

  const handleToggleEmail = async () => {
    const newValue = !emailNotifs;
    setEmailNotifs(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('email_renewal_notifs', String(newValue));
    }
    
    showNotification(newValue ? '✉️ 郵件訂閱續期通知已啟用' : '🔔 郵件訂閱通知已關閉');

    if (currentUser && userProfile) {
      setIsUpdatingEmail(true);
      try {
        await updatePreferences({ emailRenewalNotification: newValue });
      } catch (err) {
        console.error('Failed to update email preferences:', err);
      } finally {
        setIsUpdatingEmail(false);
      }
    }
  };

  const handleTogglePush = async () => {
    const newValue = !pushNotifs;
    setPushNotifs(newValue);
    if (typeof window !== 'undefined') {
      localStorage.setItem('push_renewal_notifs', String(newValue));
    }
    
    showNotification(newValue ? '✨ 瀏覽器推送通知已成功啟用' : '🔔 瀏覽器推送通知已關閉');

    if (currentUser && userProfile) {
      setIsUpdatingPush(true);
      try {
        await updatePreferences({ pushRenewalNotification: newValue });
      } catch (err) {
        console.error('Failed to update push preferences:', err);
      } finally {
        setIsUpdatingPush(false);
      }
    }
  };

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto">
      {/* Toast Confirmation Layer */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 30, x: '-50%' }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 15 }}
            className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 px-5 py-3 bg-zinc-900/95 dark:bg-zinc-800/95 text-white dark:text-zinc-100 rounded-2xl shadow-xl flex items-center gap-3 border border-zinc-250/20 dark:border-zinc-700/35 backdrop-blur-md"
          >
            <div className="w-5 h-5 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <Check size={12} strokeWidth={3} />
            </div>
            <span className="text-xs font-bold font-sans tracking-tight leading-none whitespace-nowrap">
              {toastMessage}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <div className="px-6 py-16 md:px-12 md:py-24 border-b border-white/20 relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_top_right,rgba(24,24,27,0.03),transparent_50%)]" />
        <div className="max-w-5xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h1 className="text-4xl md:text-6xl font-serif font-medium text-zinc-900 dark:text-white tracking-tight leading-[1.1] mb-6">
              {t('dashboard.heroTitle1')} <br className="hidden md:block" />
              <span className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent italic font-serif">
                {t('dashboard.heroTitle2')}
              </span>
            </h1>
            <p className="text-lg md:text-xl text-zinc-500 dark:text-zinc-400 font-light max-w-2xl leading-relaxed mb-6">
              {t('dashboard.heroSubtitle')}
            </p>
            
            <div className="flex flex-wrap gap-4 mt-6">
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('trigger-onboarding'))}
                className="flex items-center gap-2.5 px-6 py-3 glass-button text-sky-700 dark:text-sky-300 text-sm font-semibold rounded-full active:scale-95 cursor-pointer"
              >
                <Sparkles size={16} className="text-sky-500" />
                <span>{t('dashboard.takeTour', '觀看功能介紹')}</span>
              </button>
              <button
                onClick={() => onSelectFeature('three-d-studio')}
                className="flex items-center gap-2.5 px-6 py-3 glass-button text-zinc-900 dark:text-zinc-100 text-sm font-semibold rounded-full active:scale-95 cursor-pointer"
              >
                <Box size={16} className="text-sky-500" />
                <span>{t('features.three-d-studio.title')}</span>
                <ArrowRight size={14} className="text-zinc-400" />
              </button>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Tools Grid */}
      <div className="flex-1 px-6 py-12 md:px-12 md:py-16">
        <div className="max-w-5xl mx-auto space-y-12">
          
          {/* Subscription Status & Renewal Indicator Card */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="glass-panel neural-card-pulse rounded-[28px] p-6 md:p-7 flex flex-col justify-between gap-6 relative overflow-hidden"
          >
            {/* Ambient Background decoration */}
            <div className={`absolute top-0 right-0 w-72 h-72 bg-gradient-to-br ${visuals.gradientBg} rounded-full blur-3xl opacity-70 pointer-events-none`} />

            {/* Top Row Grid */}
            <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 relative z-10">
              {/* Left: Tier Information */}
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl glass-button flex items-center justify-center shrink-0">
                  {visuals.icon}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-sans">
                      CoLab Ai {tier}
                    </h3>
                    <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full border tracking-wide select-none ${visuals.badgeColor}`}>
                      {tier === 'Free' ? '主方案' : (tier === 'Ultra' || tier === 'Max' || tier === 'Super') ? 'Flagship' : 'Premium'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                    {visuals.statusLabel}
                  </p>
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 dark:text-zinc-400 font-medium select-text">
                    <Calendar size={13} className="text-zinc-400 shrink-0" />
                    <span>訂閱合約：</span>
                    <span className="font-semibold text-zinc-600 dark:text-zinc-300">{visuals.renewalLabel}</span>
                  </div>
                </div>
              </div>

              {/* Middle: Quota Details & Today's AI Requests Trackers */}
              <div className="flex-1 max-w-sm lg:px-4 flex flex-col gap-4">
                {/* 1. Cycle's General Points Tracker */}
                <div className="flex flex-col space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-sans">
                      <Zap size={12} className="text-indigo-500 dark:text-indigo-400 shrink-0" />
                      總算力用量：{pointsUsed} / {pointsLimit === Infinity ? '無上限' : `${pointsLimit} Co幣`}
                    </span>
                    {pointsLimit !== Infinity && (
                      <span className="text-zinc-400 font-mono text-[10px]">
                        {Math.round(usagePercentage)}%
                      </span>
                    )}
                  </div>
                  
                  {pointsLimit === Infinity ? (
                    <div className="flex items-center gap-1.5 py-1 px-2.5 bg-amber-500/10 dark:bg-amber-500/15 rounded-lg border border-amber-500/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold w-fit shadow-2xs">
                      <Sparkles size={11} className="animate-pulse shrink-0" />
                      <span>無限旗艦算力已啟動</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-zinc-105/90 dark:bg-zinc-850 rounded-full overflow-hidden border border-zinc-200/10 p-0.2">
                        <motion.div 
                          className={`h-full rounded-full bg-gradient-to-r ${
                            usagePercentage > 85 
                              ? 'from-red-500 to-pink-500' 
                              : usagePercentage > 60 
                                ? 'from-orange-500 to-amber-500' 
                                : 'from-indigo-500/90 to-blue-500/90'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${usagePercentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. Today's AI Requests Progress Tracker */}
                <div className="flex flex-col space-y-1.5 pt-2 border-t border-zinc-200/10 dark:border-zinc-800/10">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1 font-sans">
                      <Calendar size={12} className="text-purple-500 dark:text-purple-400 shrink-0" />
                      今日 AI 請求次數：{todayRequestsCount} / {dailyLimit === Infinity ? '無上限' : `${dailyLimit} 次`}
                    </span>
                    {dailyLimit !== Infinity && (
                      <span className="text-zinc-400 font-mono text-[10px]">
                        {Math.round(dailyPercentage)}%
                      </span>
                    )}
                  </div>

                  {dailyLimit === Infinity ? (
                    <div className="flex items-center gap-1.5 py-1 px-2.5 bg-purple-500/10 dark:bg-purple-500/15 rounded-lg border border-purple-500/20 text-purple-600 dark:text-purple-400 text-[10px] font-bold w-fit shadow-2xs">
                      <Sparkles size={11} className="animate-pulse shrink-0" />
                      <span>尊享無限請求響應</span>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <div className="w-full h-1.5 bg-zinc-105/90 dark:bg-zinc-850 rounded-full overflow-hidden border border-zinc-200/10 p-0.2">
                        <motion.div 
                          className={`h-full rounded-full bg-gradient-to-r ${
                            dailyPercentage > 85 
                              ? 'from-rose-500 to-red-500' 
                              : dailyPercentage > 60 
                                ? 'from-purple-500 to-amber-500' 
                                : 'from-emerald-500 to-indigo-505'
                          }`}
                          initial={{ width: 0 }}
                          animate={{ width: `${dailyPercentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <p className="text-[9.5px] text-zinc-450 dark:text-zinc-500 font-medium">
                        {dailyPercentage >= 100 
                          ? '今日請求配額已滿，升級方案或明日刷新額度' 
                          : `今日剩餘 ${dailyLimit - todayRequestsCount} 次優先算力請求`}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Call To Action button */}
              <div className="flex items-center">
                <button
                  onClick={() => onSelectFeature('analytics')}
                  className="group w-full lg:w-auto px-4.5 py-2.5 bg-zinc-900/90 hover:bg-zinc-900 dark:bg-zinc-800 dark:hover:bg-zinc-700/80 text-white dark:text-zinc-100 rounded-2xl text-xs font-bold flex items-center justify-center gap-2 border border-zinc-700/50 dark:border-zinc-700/20 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer shadow-md shadow-zinc-950/5"
                >
                  <span>配額度分析 & 訂閱管理</span>
                  <ArrowRight size={14} className="text-zinc-400 group-hover:text-white group-hover:translate-x-1 transition-transform" />
                </button>
              </div>
            </div>

            {/* Bottom Row: Subscription Renewal Alerts Preferences Toggles */}
            <div className="w-full border-t border-zinc-20/60 dark:border-zinc-800/60 pt-4 mt-2 flex flex-col sm:flex-row items-center justify-between gap-4 relative z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <Bell size={13} className="text-indigo-500 dark:text-purple-400 shrink-0" />
                <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                  訂閱續期通知提醒 (Renewal Alerts)
                </span>
                <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
                  {tier === 'Free' ? '(適用於試用期滿/升級後)' : '(將在扣款前 3 天自動提醒)'}
                </span>
              </div>
              
              <div className="flex items-center gap-4.5 flex-wrap">
                {/* Email Alert Toggle */}
                <button
                  onClick={handleToggleEmail}
                  disabled={isUpdatingEmail}
                  className="flex items-center gap-2 cursor-pointer group select-none border-0 bg-transparent p-0"
                >
                  <div className="relative">
                    <div className={`w-9 h-5 rounded-full transition-all duration-200 ${
                      emailNotifs 
                        ? 'bg-indigo-600 dark:bg-indigo-500' 
                        : 'bg-zinc-200 dark:bg-zinc-800 border border-zinc-300/60 dark:border-zinc-700/60'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
                        emailNotifs ? 'transform translate-x-4' : ''
                      }`}>
                        {isUpdatingEmail && (
                          <span className="w-2.5 h-2.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors flex items-center gap-1">
                    <Mail size={12} className="text-zinc-450 dark:text-zinc-500 group-hover:text-zinc-600 shrink-0" />
                    郵件提醒 (Email Alert)
                  </span>
                </button>

                {/* Push Alert Toggle */}
                <button
                  onClick={handleTogglePush}
                  disabled={isUpdatingPush}
                  className="flex items-center gap-2 cursor-pointer group select-none border-0 bg-transparent p-0"
                >
                  <div className="relative">
                    <div className={`w-9 h-5 rounded-full transition-all duration-200 ${
                      pushNotifs 
                        ? 'bg-purple-600 dark:bg-purple-500' 
                        : 'bg-zinc-200 dark:bg-zinc-800 border border-zinc-300/60 dark:border-zinc-700/60'
                    }`}>
                      <div className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-200 flex items-center justify-center ${
                        pushNotifs ? 'transform translate-x-4' : ''
                      }`}>
                        {isUpdatingPush && (
                          <span className="w-2.5 h-2.5 rounded-full border-2 border-purple-500 border-t-transparent animate-spin shrink-0" />
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors flex items-center gap-1">
                    <Bell size={12} className="text-zinc-450 dark:text-zinc-500 group-hover:text-zinc-600 shrink-0" />
                    推送通知 (Web Push)
                  </span>
                </button>
              </div>
            </div>
          </motion.div>

          {/* 30-Day Activity Heatmap Widget */}
          <div className="content-visibility-auto">
            <InteractionHeatmap />
          </div>

          {/* Focus Mode audio toggle widget */}
          <FocusModeWidget />

          {/* Recent Activity Dashboard Widget */}
          <div className="content-visibility-auto">
            <RecentActivityPanel 
              activities={activities}
              onSelectFeature={onSelectFeature}
              setActiveChatSessionId={setActiveChatSessionId}
              setActivePreviewActivity={setActivePreviewActivity}
            />
          </div>

          {/* Recommended Tools Dashboard Widget */}
          <div className="content-visibility-auto">
            <RecommendedToolsWidget onSelectFeature={onSelectFeature} />
          </div>

          {/* Prompt Library Dashboard Widget */}
          <div className="content-visibility-auto">
            <PromptLibraryWidget onSelectFeature={onSelectFeature} />
          </div>

          {/* Mini Usage Trends with Recharts */}
          <div className="content-visibility-auto">
            <DashboardAnalyticsTrend onSelectFeature={onSelectFeature} />
          </div>

          {/* Interactive Compare Models View */}
          <div className="content-visibility-auto">
            <CompareModelsView onSelectFeature={onSelectFeature} />
          </div>

          {/* Workspace Personalization Toolbar & Trigger */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6 mt-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                <span className="w-1.5 h-6 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                系統運作大腦工具箱 (Core Intelligence Engines)
              </h2>
              <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5 font-light">
                依您日常所需客製顯示所需的 AI 圖表、聊天與多模態算力。
              </p>
            </div>
            
            <button
              onClick={() => setIsCustomizing(!isCustomizing)}
              className={`flex items-center gap-2 px-4.5 py-2 rounded-2xl text-xs font-bold border cursor-pointer select-none transition-all duration-300 ${
                isCustomizing
                  ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-lg shadow-indigo-500/5'
                  : 'bg-white dark:bg-zinc-900/50 text-zinc-650 dark:text-zinc-300 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/50'
              }`}
            >
              <SlidersHorizontal size={14} className={isCustomizing ? 'text-indigo-500' : 'text-zinc-400'} />
              <span>工作區客製化 (Customize Dashboard)</span>
            </button>
          </div>

          {/* Expanded Customization Panel */}
          <AnimatePresence>
            {isCustomizing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ type: 'spring', stiffness: 350, damping: 30 }}
                className="overflow-hidden"
              >
                <div className="p-6 md:p-7 rounded-3xl border border-dashed border-zinc-205 dark:border-zinc-800 bg-zinc-500/2 dark:bg-zinc-950/25 space-y-6 mt-4">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-zinc-800 dark:text-zinc-200">
                        隱藏/顯示特定 AI 算力卡片
                      </h3>
                      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-light">
                        已隱藏的工具將不顯示於首頁清單及最上方固定區域，隨時可按以下開關進行恢復。
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {hiddenFeatures.length > 0 && (
                        <button
                          onClick={resetFeatureVisibility}
                          className="px-3.5 py-1.5 rounded-xl border border-zinc-250 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-905 text-zinc-600 dark:text-zinc-300 text-[11px] font-bold transition-all cursor-pointer select-none"
                        >
                          全部恢復預設顯示
                        </button>
                      )}
                      
                      {/* Search Input for fast filtering */}
                      <div className="relative min-w-[200px]">
                        <Search size={13} className="absolute left-3 top-2.5 text-zinc-400" />
                        <input
                          type="text"
                          value={customizingSearchQuery}
                          onChange={(e) => setCustomizingSearchQuery(e.target.value)}
                          placeholder="搜尋 AI 工具名稱..."
                          className="w-full pl-8.5 pr-3 py-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs text-zinc-700 dark:text-zinc-200 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-indigo-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Grid list of tools available for customization */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {FEATURES.filter(f => f.category !== 'Overview').filter(f => {
                      if (!customizingSearchQuery) return true;
                      const q = customizingSearchQuery.toLowerCase();
                      const title = t(`features.${f.id}.title`).toLowerCase();
                      const desc = t(`features.${f.id}.description`).toLowerCase();
                      return title.includes(q) || desc.includes(q) || f.id.toLowerCase().includes(q);
                    }).map((feature) => {
                      const isHidden = hiddenFeatures.includes(feature.id);
                      const FeatureIcon = getIconComponent(feature.icon);
                      
                      return (
                        <div
                          key={`customize-item-${feature.id}`}
                          onClick={() => toggleFeatureVisibility(feature.id)}
                          className={`p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all duration-300 cursor-pointer select-none hover:scale-[1.01] active:scale-[0.99] group ${
                            isHidden
                              ? 'bg-zinc-100/45 dark:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/40 opacity-55'
                              : 'bg-white dark:bg-zinc-900/80 border-zinc-200/80 dark:border-zinc-800/80 shadow-xs hover:border-indigo-500/40 dark:hover:border-indigo-500/30'
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border ${
                              isHidden
                                ? 'bg-zinc-100 dark:bg-zinc-850 border-zinc-250 dark:border-zinc-800 text-zinc-400'
                                : 'bg-indigo-500/5 dark:bg-indigo-500/10 border-indigo-500/10 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-500/10'
                            }`}>
                              <FeatureIcon size={15} strokeWidth={2} />
                            </div>
                            <div className="min-w-0">
                              <h4 className={`text-xs font-bold leading-tight truncate ${
                                isHidden ? 'text-zinc-400 dark:text-zinc-500 line-through' : 'text-zinc-850 dark:text-zinc-200'
                              }`}>
                                {t(`features.${feature.id}.title`)}
                              </h4>
                              <span className="text-[10px] text-zinc-400 dark:text-zinc-500 block truncate leading-normal mt-0.5 font-medium">
                                {t(`common.categories.${feature.category}`)}
                              </span>
                            </div>
                          </div>

                          <div className="shrink-0 flex items-center">
                            {isHidden ? (
                              <div className="w-7 h-7 rounded-lg bg-zinc-250/20 dark:bg-zinc-800/40 flex items-center justify-center text-zinc-400 dark:text-zinc-500" title="已隱藏">
                                <EyeOff size={13} />
                              </div>
                            ) : (
                              <div className="w-7 h-7 rounded-lg bg-emerald-500/10 dark:bg-emerald-400/10 flex items-center justify-center text-emerald-600 dark:text-emerald-400 border border-emerald-500/10 dark:border-emerald-400/20 group-hover:bg-emerald-500/15" title="顯示中">
                                <Eye size={13} />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Pinned / Starred Features Area */}
          <AnimatePresence>
            {pinnedFeatures.filter(id => !hiddenFeatures.includes(id)).length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-8 overflow-hidden"
              >
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                    {t('dashboard.pinnedTools', '⭐ 常用快捷釘選')}
                  </h2>
                  <div className="h-px flex-1 bg-zinc-200/50 dark:bg-zinc-850/50" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {FEATURES.filter(f => pinnedFeatures.includes(f.id) && !hiddenFeatures.includes(f.id)).map((feature) => {
                    const Icon = getIconComponent(feature.icon);
                    return (
                      <div
                        key={`pinned-${feature.id}`}
                        onClick={() => onSelectFeature(feature.id)}
                        className="group text-left glass-panel neural-card-pulse dashboard-tactile-card pinned-tactile-card p-6 rounded-[28px] flex flex-col h-full relative overflow-hidden cursor-pointer select-none"
                      >
                        {/* Top Right Star and Arrow Controls */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                          <button
                            onClick={(e) => togglePinFeature(feature.id, e)}
                            className="p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-white/10 text-amber-500 hover:scale-110 active:scale-95 transition-all cursor-pointer"
                            title={t('dashboard.unpin', '取消釘選')}
                          >
                            <Star size={16} fill="currentColor" />
                          </button>
                          <ArrowRight size={16} className="text-sky-500 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0" />
                        </div>

                        <div className="w-12 h-12 rounded-2xl glass-button flex items-center justify-center mb-6 group-hover:scale-105 transition-all duration-300">
                          <Icon size={24} className="text-zinc-700 dark:text-zinc-200 group-hover:text-amber-600 dark:group-hover:text-amber-400" strokeWidth={1.5} />
                        </div>

                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors mb-2">
                          {t(`features.${feature.id}.title`)}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light leading-relaxed flex-1">
                          {t(`features.${feature.id}.description`)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {categories.map((category) => {
            const categoryFeatures = FEATURES.filter(f => f.category === category && !hiddenFeatures.includes(f.id) && !pinnedFeatures.includes(f.id));
            if (categoryFeatures.length === 0) return null;

            return (
              <div
                key={category}
                className="content-visibility-auto"
              >
                <div className="flex items-center gap-4 mb-8">
                  <h2 className="text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50 flex items-center gap-2">
                    <span className="w-1.5 h-6 rounded-full bg-indigo-500 shadow-[0_0_8px_#6366f1]" />
                    {t(`common.categories.${category}`)}
                  </h2>
                  <div className="h-px flex-1 bg-zinc-200/50 dark:bg-zinc-850/50" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                  {categoryFeatures.map((feature, index) => {
                    const Icon = getIconComponent(feature.icon);
                    const isPinned = pinnedFeatures.includes(feature.id);
                    return (
                      <div
                        key={feature.id}
                        onClick={() => onSelectFeature(feature.id)}
                        className="group text-left glass-panel neural-card-pulse dashboard-tactile-card p-6 rounded-[28px] flex flex-col h-full relative overflow-hidden cursor-pointer select-none"
                      >
                        {/* Top Right Hover Actions */}
                        <div className="absolute top-4 right-4 flex items-center gap-1.5 z-10">
                          <button
                            onClick={(e) => togglePinFeature(feature.id, e)}
                            className={`p-1.5 rounded-full hover:bg-white/50 dark:hover:bg-white/10 hover:scale-110 active:scale-95 transition-all duration-200 cursor-pointer ${
                              isPinned ? 'text-amber-500' : 'text-zinc-400 dark:text-zinc-500 hover:text-amber-500 dark:hover:text-amber-400'
                            }`}
                            title={isPinned ? t('dashboard.unpin', '取消釘選') : t('dashboard.pin', '固定置頂')}
                          >
                            <Star size={16} fill={isPinned ? "currentColor" : "none"} />
                          </button>
                          <ArrowRight size={16} className="text-sky-500 dark:text-sky-400 opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-2 group-hover:translate-x-0" />
                        </div>
                        
                        <div className="w-12 h-12 rounded-2xl glass-button flex items-center justify-center mb-6 group-hover:scale-105 transition-all duration-300">
                          <Icon size={24} className="text-zinc-700 dark:text-zinc-200 group-hover:text-sky-600 dark:group-hover:text-sky-400" strokeWidth={1.5} />
                        </div>
                        
                        <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 group-hover:text-indigo-600 dark:group-hover:text-purple-400 transition-colors mb-2">
                          {t(`features.${feature.id}.title`)}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light leading-relaxed flex-1">
                          {t(`features.${feature.id}.description`)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <RecentActivityPreviewModal
        activity={activePreviewActivity}
        onClose={() => setActivePreviewActivity(null)}
        onImportToChat={handleImportActivityToChat}
      />
    </div>
  );
}

export default React.memo(DashboardFeature);
