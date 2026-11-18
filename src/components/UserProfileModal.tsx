import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, User, LogOut, LogIn, Settings, Save, Loader2, Crown, HardDrive, CheckCircle2, Zap } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { Tier } from '../types';
import { useTheme, ACCENT_COLORS, AccentColor, Theme } from '../contexts/ThemeContext';
import { usePerformance } from '../contexts/PerformanceContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { currentUser, userProfile, login, logout, updatePreferences, googleAccessToken, connectGoogleDrive, driveAuthError } = useAuth();
  const { tier: activeSubscriptionTier, setTier: setSubscriptionTier, isAdmin } = useSubscription();
  const { theme, setTheme, accentColor, setAccentColor, syncWithOs, setSyncWithOs } = useTheme();
  const { isTurboMode, setTurboMode, toggleTurboMode } = usePerformance();
  
  // Track the initial preference values to restore if cancelled
  const [initialAccentColor] = useState<AccentColor>(accentColor);
  const [initialSyncWithOs] = useState<boolean>(syncWithOs);
  const [initialTheme] = useState<Theme>(theme);
  const [initialTurboMode] = useState<boolean>(isTurboMode);
  const [defaultModel, setDefaultModel] = useState(userProfile?.preferences?.defaultModel || 'gemini-3.1-pro-preview');
  const [tier, setTier] = useState<Tier>(activeSubscriptionTier || (userProfile?.preferences?.tier as Tier) || (userProfile?.tier as Tier) || 'Free');
  const [accentNotice, setAccentNotice] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setDefaultModel(userProfile?.preferences?.defaultModel || 'gemini-3.1-pro-preview');
      setTier(activeSubscriptionTier);
      setAccentNotice(null);
    }
  }, [isOpen, activeSubscriptionTier, userProfile?.preferences?.defaultModel]);

  const handleCancel = () => {
    setAccentColor(initialAccentColor);
    setSyncWithOs(initialSyncWithOs);
    if (!initialSyncWithOs) {
      setTheme(initialTheme);
    }
    setTurboMode(initialTurboMode);
    onClose();
  };

  const handleSave = async () => {
    setIsSaving(true);
    const effectiveTier: Tier = isAdmin && (tier === 'Free' || tier === 'Plus' || tier === 'Go' || tier === 'Pro' || tier === 'One' || tier === 'Advanced')
      ? 'Ultra'
      : tier;
    localStorage.setItem('accentColor', accentColor);
    localStorage.setItem('colab_turbo_mode', isTurboMode ? 'true' : 'false');
    localStorage.setItem('colab_performance_mode', isTurboMode ? 'extreme' : 'balanced');
    setSubscriptionTier(effectiveTier);
    if (currentUser) {
      await updatePreferences({ 
        defaultModel, 
        tier: effectiveTier, 
        accentColor,
        turboMode: isTurboMode,
      });
    }
    setIsSaving(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={handleCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass-panel rounded-[28px] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/20 dark:border-white/5 bg-white/10 dark:bg-zinc-900/10">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-white/10 flex items-center justify-center shadow-sm overflow-hidden">
                  {currentUser?.photoURL ? (
                    <img src={currentUser.photoURL} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User size={20} className="text-zinc-700 dark:text-zinc-300" />
                  )}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">
                    {currentUser?.displayName || (isZh ? '系統與偏好設定' : 'Settings & Preferences')}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {currentUser?.email || (isZh ? '訪客模式（設定已保存在本地瀏覽器）' : 'Guest Mode (Preferences saved locally)')}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/30 dark:hover:bg-white/10 rounded-full transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-6 overflow-y-auto">
              <div>
                <div className="flex items-center gap-2 mb-3 text-zinc-700 dark:text-zinc-300">
                  <Settings size={18} />
                  <h4 className="font-medium">{t('common.preferences')}</h4>
                </div>
                <div className="space-y-4">
                  {/* Global Turbo Mode Toggle (High-Fidelity Visuals vs High-Performance Rendering) */}
                  <div className={`p-4 rounded-2xl border transition-all duration-300 ${
                    isTurboMode 
                      ? 'bg-amber-500/10 border-amber-500/35 shadow-[0_0_20px_rgba(245,158,11,0.08)]' 
                      : 'bg-zinc-500/5 border-zinc-200/40 dark:border-zinc-800/45 hover:border-zinc-300 dark:hover:border-zinc-700'
                  }`}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2.5 rounded-xl transition-all duration-300 ${
                          isTurboMode 
                            ? 'bg-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.5)] scale-105' 
                            : 'bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400'
                        }`}>
                          <Zap size={18} className={isTurboMode ? 'fill-white animate-pulse' : ''} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                              {t('common.turboMode', '極速模式 (Turbo Mode)')}
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider transition-colors ${
                              isTurboMode 
                                ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30' 
                                : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                            }`}>
                              {isTurboMode 
                                ? (isZh ? '高效彩現 ON' : 'High Performance ON') 
                                : (isZh ? '高畫質視覺' : 'High Fidelity')}
                            </span>
                          </div>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 leading-snug">
                            {isTurboMode 
                              ? (isZh 
                                  ? '已為 <html> 元素動態套用 turbo-mode 類別。停用高負擔毛玻璃模糊與動態流體光影，切換為 75ms 超低延遲渲染管線，釋放硬體效能並維持極致畫面流暢度。' 
                                  : "Dynamically added 'turbo-mode' class to <html> element. Disables Gaussian blurs and fluid shaders for 75ms snappy rendering.")
                              : (isZh 
                                  ? '切換高畫質視覺（全彩動態流體背景與毛玻璃質感）或極速高效彩現（降低 GPU 負擔與耗電）。' 
                                  : "Switch between high-fidelity visuals (ambient liquid gradients, glassmorphism) and high-performance rendering.")
                            }
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isTurboMode}
                        aria-label="Toggle Turbo Mode"
                        onClick={toggleTurboMode}
                        className={`relative w-12 h-6.5 rounded-full p-0.5 transition-all duration-300 ease-in-out shrink-0 focus:outline-none cursor-pointer ${
                          isTurboMode 
                            ? 'bg-amber-500 shadow-[0_0_14px_rgba(245,158,11,0.5)]' 
                            : 'bg-zinc-300 dark:bg-zinc-700'
                        }`}
                      >
                        <motion.div
                          layout
                          className="w-5.5 h-5.5 bg-white rounded-full shadow-md flex items-center justify-center text-amber-500"
                          animate={{ x: isTurboMode ? 22 : 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 32 }}
                        >
                          <Zap size={11} className={isTurboMode ? 'fill-amber-500 text-amber-500' : 'text-zinc-400'} />
                        </motion.div>
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Default Chat Model</label>
                    <select
                      value={defaultModel}
                      onChange={(e) => setDefaultModel(e.target.value)}
                      className="glass-input w-full text-zinc-700 dark:text-zinc-300 text-sm rounded-xl focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-white/40 dark:focus:border-white/20 block py-3 px-4 outline-none transition-all shadow-sm"
                    >
                      <option value="gemini-3.1-pro-preview" className="dark:bg-zinc-800">Gemini 3.1 Pro</option>
                      <option value="gemini-3-flash-preview" className="dark:bg-zinc-800">Gemini 3 Flash</option>
                      <option value="gemini-3.1-flash-lite-preview" className="dark:bg-zinc-800">Gemini Flash Lite</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Subscription Tier (Demo)</label>
                    <select
                      value={tier}
                      onChange={(e) => setTier(e.target.value as Tier)}
                      className="glass-input w-full text-zinc-700 dark:text-zinc-300 text-sm rounded-xl focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-white/40 dark:focus:border-white/20 block py-3 px-4 outline-none transition-all shadow-sm"
                    >
                      {!isAdmin && (
                        <>
                          <option value="Free" className="dark:bg-zinc-800">Free</option>
                          <option value="Plus" className="dark:bg-zinc-800">Plus</option>
                          <option value="Go" className="dark:bg-zinc-800">Go (學生方案)</option>
                          <option value="Pro" className="dark:bg-zinc-800">Pro</option>
                          <option value="One" className="dark:bg-zinc-800">One</option>
                          <option value="Advanced" className="dark:bg-zinc-800">Advanced</option>
                        </>
                      )}
                      <option value="Ultra" className="dark:bg-zinc-800">Ultra</option>
                      <option value="Max" className="dark:bg-zinc-800">Max</option>
                      <option value="Super" className="dark:bg-zinc-800">Super</option>
                    </select>
                  </div>
                  
                  {/* Google Drive Workspace Sync Card */}
                  <div className="p-3.5 rounded-2xl bg-zinc-500/5 border border-zinc-200/40 dark:border-zinc-800/45 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
                          <HardDrive size={18} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <span className="text-sm font-medium text-zinc-850 dark:text-zinc-200 flex items-center gap-1.5">
                            Google Drive 雲端同步
                            {googleAccessToken && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 size={10} />
                                已授權
                              </span>
                            )}
                          </span>
                          <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-light pr-2 leading-normal">
                            備份與載入您的 CoLab AI Studio 工作區快照與雲端檔案
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={connectGoogleDrive}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer ${
                          googleAccessToken
                            ? 'bg-zinc-200/80 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                            : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                        }`}
                      >
                        {googleAccessToken ? '重新授權' : '授權連接'}
                      </button>
                    </div>
                    {driveAuthError && (
                      <p className="text-[11px] text-rose-600 dark:text-rose-400 leading-relaxed pl-1">
                        {driveAuthError}
                      </p>
                    )}
                  </div>

                  {/* OS Theme Sync Preference Switch */}
                  <div className="flex items-center justify-between p-3.5 rounded-2xl bg-zinc-500/5 border border-zinc-200/40 dark:border-zinc-800/45">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium text-zinc-850 dark:text-zinc-200">
                        自動同步系統外觀
                      </span>
                      <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-light pr-2 leading-normal">
                        應用程式外觀將與您電腦或手機的深淺色模式設定自動同步
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSyncWithOs(!syncWithOs)}
                      className={`relative w-11 h-6 rounded-full p-0.5 transition-all duration-300 ease-in-out shrink-0 focus:outline-none cursor-pointer ${
                        syncWithOs ? 'bg-indigo-605 dark:bg-indigo-500' : 'bg-zinc-200 dark:bg-zinc-800'
                      }`}
                    >
                      <motion.div
                        layout
                        className="w-5 h-5 bg-white rounded-full shadow-md"
                        animate={{ x: syncWithOs ? 20 : 0 }}
                        transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                      />
                    </button>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">
                        Workspace Accent Color
                      </label>
                      <span className="text-[10px] font-mono font-black uppercase tracking-wider" style={{ color: ACCENT_COLORS[accentColor]?.color }}>
                        {ACCENT_COLORS[accentColor]?.name}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-2.5 p-2.5 rounded-2xl bg-zinc-500/5 border border-zinc-200/40 dark:border-zinc-800/40">
                      {Object.entries(ACCENT_COLORS).map(([key, config]) => {
                        const isGold = key === 'pro-gold';
                        const isPremiumUser = tier !== 'Free' || isAdmin;
                        const isLocked = isGold && !isPremiumUser;

                        return (
                          <button
                            key={key}
                            type="button"
                            onClick={() => {
                              if (isLocked) {
                                setAccentNotice('「👑 尊爵奢華金 (Pro Gold)」主題配色為 Pro 方案獨享特權，請先切換或升級至付費方案即可解鎖。');
                                return;
                              }
                              setAccentNotice(null);
                              setAccentColor(key as AccentColor);
                            }}
                            className={`relative w-8 h-8 rounded-full cursor-pointer transition-all duration-200 hover:scale-110 active:scale-95 flex items-center justify-center shadow-xs border ${
                              accentColor === key 
                                ? 'border-zinc-900 dark:border-white ring-2 ring-zinc-500/20 dark:ring-white/20 scale-105' 
                                : 'border-white/25 dark:border-zinc-800/20'
                            }`}
                            style={{ backgroundColor: config.color }}
                            title={config.name}
                          >
                            {accentColor === key && (
                              <span className="w-2 h-2 bg-white rounded-full shadow-md animate-pulse" />
                            )}
                            {isLocked && (
                              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-zinc-950/90 dark:bg-zinc-900/95 text-white flex items-center justify-center border border-white/25 shadow-sm">
                                <Crown size={7} className="text-amber-400 fill-amber-400" />
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                    {accentNotice && (
                      <p className="mt-2 text-[11px] text-amber-700 dark:text-amber-300 bg-amber-500/10 border border-amber-500/25 rounded-xl px-3 py-2">
                        {accentNotice}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-white/20 dark:border-white/5 bg-white/10 dark:bg-zinc-900/10 flex justify-between items-center gap-3">
              {currentUser ? (
                <button
                  onClick={() => {
                    logout();
                    onClose();
                  }}
                  className="px-4 py-2.5 text-red-600 dark:text-red-400 hover:bg-red-50/50 dark:hover:bg-red-900/30 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogOut size={16} />
                  {t('common.logout')}
                </button>
              ) : (
                <button
                  onClick={() => {
                    onClose();
                    login();
                  }}
                  className="px-4 py-2.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/30 rounded-xl text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <LogIn size={16} />
                  {t('common.login', '登入帳戶')}
                </button>
              )}
              <div className="flex gap-2">
                <button
                  onClick={handleCancel}
                  className="px-5 py-2.5 text-zinc-600 dark:text-zinc-400 hover:bg-white/30 dark:hover:bg-white/10 rounded-xl text-sm font-medium transition-colors cursor-pointer"
                >
                  {t('common.cancel')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="px-6 py-2.5 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:bg-black dark:hover:bg-white transition-colors shadow-sm disabled:opacity-50 flex items-center gap-2 cursor-pointer"
                >
                  {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                  {t('common.save')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
