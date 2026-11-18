import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { usePerformance, useLiveFps, PerformanceMode } from '../contexts/PerformanceContext';
import { Zap, Gauge, Activity, Trash2, CheckCircle2, RefreshCw, Cpu, Layers, Sparkles, X, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface PerformanceOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PerformanceOptimizerModal({ isOpen, onClose }: PerformanceOptimizerModalProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { mode, setMode, isTurboMode, toggleTurboMode, storageStats, optimizeNow, isOptimizing, lastOptimizedAt } = usePerformance();
  const { fps, isLowFPS } = useLiveFps();
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOptimize = () => {
    const result = optimizeNow();
    setToastMessage(result.message);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  };

  const getFpsColor = (value: number) => {
    if (value >= 50) return 'text-emerald-500 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/40';
    if (value >= 30) return 'text-amber-500 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/40';
    return 'text-rose-500 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/40';
  };

  const modes: { id: PerformanceMode; nameZh: string; nameEn: string; descZh: string; descEn: string; icon: React.ReactNode; badgeZh?: string; badgeEn?: string }[] = [
    {
      id: 'extreme',
      nameZh: '⚡ 極速效能模式 (Turbo)',
      nameEn: '⚡ Extreme Turbo Mode',
      descZh: '停用動態流體背景與毛玻璃模糊渲染，縮短轉場時間至 75ms，提供最高 FPS 流暢度與最低記憶體占用。',
      descEn: 'Disables dynamic liquid backgrounds and Gaussian blur filters. Ultra-fast 75ms transitions for maximum FPS.',
      icon: <Zap className="text-amber-500" size={20} />,
      badgeZh: '最省電/極佳順暢',
      badgeEn: 'Best FPS / Battery'
    },
    {
      id: 'balanced',
      nameZh: '⚖️ 智慧平衡模式 (Balanced)',
      nameEn: '⚖️ Smart Balanced Mode',
      descZh: '預設推薦模式。在優雅的視覺外觀與系統反應速度間取得完美平衡，自動依裝置狀況調整彩現品質。',
      descEn: 'Recommended default. Perfect harmony between aesthetic visual fidelity and snappy responsiveness.',
      icon: <Gauge className="text-indigo-500" size={20} />,
      badgeZh: '建議預設',
      badgeEn: 'Recommended'
    },
    {
      id: 'quality',
      nameZh: '✨ 極致視覺模式 (Quality)',
      nameEn: '✨ Ultra Quality Mode',
      descZh: '啟用全幅 24px 深度玻璃光影與 25s 循環量子流體背景，適合高階硬體與最沉浸式的視覺創作體驗。',
      descEn: 'Enables full 24px glass depth and 25s ambient liquid background for flagship devices.',
      icon: <Sparkles className="text-purple-500" size={20} />
    }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Cpu size={22} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {isZh ? '全域效能與記憶體優化中心' : 'Performance & Memory Optimizer'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                {isZh ? '即時監控系統幀率 (FPS) 並深度回收快取與記憶體資源' : 'Monitor live FPS, tune rendering pipeline & clear stale cache'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Live System Metrics Dashboard */}
          <div className="grid grid-cols-3 gap-3">
            <div className={`p-4 rounded-2xl border flex flex-col justify-between ${getFpsColor(fps)}`}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider opacity-80">
                  {isZh ? '畫面更新率' : 'Frame Rate'}
                </span>
                <Activity size={16} />
              </div>
              <div className="mt-2 flex items-baseline gap-1">
                <span className="text-2xl font-black">{fps}</span>
                <span className="text-xs font-bold">FPS</span>
              </div>
              <span className="text-[11px] opacity-80 mt-1 font-medium">
                {fps >= 50 ? (isZh ? '極佳流暢' : 'Smooth 60Hz') : fps >= 30 ? (isZh ? '運行穩定' : 'Stable') : (isZh ? '建議開極速' : 'Low FPS')}
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {isZh ? '本地快取體積' : 'Cache Size'}
                </span>
                <Layers size={16} />
              </div>
              <div className="mt-2 flex items-baseline gap-1 text-zinc-900 dark:text-zinc-100">
                <span className="text-2xl font-black">{storageStats.totalMB}</span>
                <span className="text-xs font-bold">MB</span>
              </div>
              <span className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 font-medium">
                {isZh ? `共 ${storageStats.itemCount} 筆快取紀錄` : `${storageStats.itemCount} cached objects`}
              </span>
            </div>

            <div className="p-4 rounded-2xl border border-zinc-200/80 dark:border-zinc-800 bg-zinc-50/80 dark:bg-zinc-800/40 flex flex-col justify-between">
              <div className="flex items-center justify-between text-zinc-500 dark:text-zinc-400">
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {isZh ? '引擎狀態' : 'Engine Status'}
                </span>
                <Zap size={16} className="text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-1 text-zinc-900 dark:text-zinc-100">
                <span className="text-lg font-black">
                  {mode === 'extreme' ? (isZh ? '極速模式' : 'Turbo') : mode === 'balanced' ? (isZh ? '智慧平衡' : 'Balanced') : (isZh ? '極致品質' : 'Quality')}
                </span>
              </div>
              <span className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-medium flex items-center gap-1">
                <CheckCircle2 size={12} />
                {isZh ? '硬體加速已啟動' : 'GPU Compositing'}
              </span>
            </div>
          </div>

          {/* Toast feedback if recently optimized */}
          <AnimatePresence>
            {toastMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-3 text-emerald-800 dark:text-emerald-300 text-xs font-semibold"
              >
                <CheckCircle2 className="text-emerald-600 dark:text-emerald-400 shrink-0" size={18} />
                <span>{toastMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* One-click Deep GC & Cache Pruning action card */}
          <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 dark:border-indigo-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                  {isZh ? '立即回收記憶體與清理過期快取' : 'One-Click Deep Memory & Cache GC'}
                </h4>
                {lastOptimizedAt && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-zinc-200/70 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 font-medium">
                    {isZh ? `上次優化: ${lastOptimizedAt.toLocaleTimeString()}` : `Last: ${lastOptimizedAt.toLocaleTimeString()}`}
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400">
                {isZh
                  ? '自動清除舊對話殘存圖片、過期預覽快取及未釋放的記憶體引用，大幅提升長時間運作之流暢度。'
                  : 'Sweeps stale preview blobs, clears temporary image caches & triggers memory garbage collection.'}
              </p>
            </div>
            <button
              onClick={handleOptimize}
              disabled={isOptimizing}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={14} className={isOptimizing ? 'animate-spin' : ''} />
              <span>{isZh ? '立即執行優化' : 'Optimize Now'}</span>
            </button>
          </div>

          {/* Global Turbo Mode Switch Card */}
          <div className={`p-4 rounded-2xl border transition-all duration-300 ${
            isTurboMode 
              ? 'bg-amber-500/10 border-amber-500/40 shadow-[0_0_24px_rgba(245,158,11,0.12)]' 
              : 'bg-zinc-50 dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800'
          }`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                  isTurboMode 
                    ? 'bg-amber-500 text-white shadow-[0_0_16px_rgba(245,158,11,0.5)] scale-105' 
                    : 'bg-zinc-200 dark:bg-zinc-700 text-zinc-500 dark:text-zinc-400'
                }`}>
                  <Zap size={22} className={isTurboMode ? 'fill-white animate-pulse' : ''} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50">
                      {isZh ? '⚡ 全域極速模式 (Turbo Mode)' : '⚡ Global Turbo Mode'}
                    </h4>
                    <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                      isTurboMode 
                        ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30' 
                        : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}>
                      {isTurboMode ? (isZh ? '高效彩現啟用中' : 'High Performance ON') : (isZh ? '高畫質視覺' : 'High Fidelity')}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {isTurboMode
                      ? (isZh 
                          ? '已於 <html> 標籤套用 turbo-mode 類別。停用動態流體背景與毛玻璃模糊，轉場全面加速至 75ms，釋放 GPU 算力以維持最高畫面幀率。'
                          : "Adds 'turbo-mode' class to the <html> element. Disables expensive blurs and dynamic liquid backgrounds for maximum FPS.")
                      : (isZh 
                          ? '動態切換高畫質視覺與極速高效彩現。一鍵套用全域加速，適合省電或高負載多工操作。'
                          : 'Dynamically switch between high-fidelity visuals and high-performance rendering for <html>.')
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
                  isTurboMode ? 'bg-amber-500 shadow-[0_0_16px_rgba(245,158,11,0.5)]' : 'bg-zinc-300 dark:bg-zinc-700'
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

          {/* Mode Selector */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                {isZh ? '選擇渲染與效能模式' : 'Rendering & Performance Engine Mode'}
              </label>
              {isLowFPS && (
                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1">
                  <AlertCircle size={12} />
                  {isZh ? '偵測到幀率稍低，建議切換至極速模式' : 'Low FPS detected — recommend Turbo'}
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 gap-3">
              {modes.map((item) => {
                const isActive = mode === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setMode(item.id)}
                    className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex items-start gap-4 ${
                      isActive
                        ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-indigo-500 dark:border-indigo-400 ring-2 ring-indigo-500/15 shadow-sm'
                        : 'bg-white dark:bg-zinc-800/40 border-zinc-200/80 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-white dark:bg-zinc-800 shadow-sm' : 'bg-zinc-100 dark:bg-zinc-800/60'
                    }`}>
                      {item.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                          {isZh ? item.nameZh : item.nameEn}
                        </span>
                        {item.badgeZh && (
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300">
                            {isZh ? item.badgeZh : item.badgeEn}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                        {isZh ? item.descZh : item.descEn}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200/60 dark:border-zinc-800/60 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
          <span className="text-xs text-zinc-500 dark:text-zinc-400">
            {isZh ? '🚀 所有優化設定自動儲存，即時生效' : '🚀 Settings automatically applied in real time'}
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-bold rounded-xl hover:opacity-90 transition-opacity cursor-pointer"
          >
            {isZh ? '完成' : 'Done'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
