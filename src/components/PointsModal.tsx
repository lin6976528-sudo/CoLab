import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, CreditCard, Sparkles, Image as ImageIcon, Video, Music, MessageSquare, AlertTriangle, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSubscription, FEATURE_POINTS_COST } from '../contexts/SubscriptionContext';
import { useAuth } from '../contexts/AuthContext';
import { CoCoinIcon } from './CoCoinIcon';

interface PointsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgradeClick?: () => void;
}

export default function PointsModal({ isOpen, onClose, onUpgradeClick }: PointsModalProps) {
  const { t } = useTranslation();
  const { pointsUsed, pointsLimit, tier, usageCount } = useSubscription();
  const { currentUser } = useAuth();

  const isAdmin = currentUser?.email && (
    currentUser.email.toLowerCase() === 'lin076976528@gmail.com' || 
    currentUser.email.toLowerCase() === 'lin6976528@gmail.com'
  );

  const remainingPoints = pointsLimit === Infinity ? '無限' : Math.max(0, pointsLimit - pointsUsed);
  const percentageUsed = pointsLimit === Infinity ? 0 : Math.min(100, (pointsUsed / pointsLimit) * 100);

  const rulesCategories = [
    {
      title: '影片與動畫',
      icon: <Video size={20} className="text-indigo-500" />,
      items: [
        { id: 'video-gen', name: '影片生成 (Veo 3.1)', cost: FEATURE_POINTS_COST['video-gen'] },
        { id: 'youtube-gen', name: 'YouTube 短影音', cost: FEATURE_POINTS_COST['youtube-gen'] },
        { id: 'animate-image', name: '圖片動畫化', cost: FEATURE_POINTS_COST['animate-image'] },
        { id: 'video-understand', name: '影片理解', cost: FEATURE_POINTS_COST['video-understand'] },
      ]
    },
    {
      title: '圖片生成',
      icon: <ImageIcon size={20} className="text-emerald-500" />,
      items: [
        { id: 'image-gen', name: '圖片生成 / 編輯', cost: FEATURE_POINTS_COST['image-gen'] },
        { id: 'image-understand', name: '視覺理解', cost: FEATURE_POINTS_COST['image-understand'] },
      ]
    },
    {
      title: '語音與音樂',
      icon: <Music size={20} className="text-amber-500" />,
      items: [
        { id: 'music-gen', name: '音樂生成', cost: FEATURE_POINTS_COST['music-gen'] },
        { id: 'live-audio', name: '即時語音對話', cost: FEATURE_POINTS_COST['live-audio'] },
        { id: 'transcribe', name: '語音轉文字', cost: FEATURE_POINTS_COST['transcribe'] },
        { id: 'tts', name: '文字轉語音', cost: FEATURE_POINTS_COST['tts'] },
      ]
    },
    {
      title: '對話與自動化',
      icon: <MessageSquare size={20} className="text-blue-500" />,
      items: [
        { id: 'chat', name: 'AI 對話', cost: FEATURE_POINTS_COST['chat'] },
        { id: 'agent', name: '智能代理', cost: FEATURE_POINTS_COST['agent'] },
        { id: 'batch-process', name: '批次處理', cost: FEATURE_POINTS_COST['batch-process'] },
      ]
    }
  ];

  const topFeatureId = Object.keys(usageCount).length > 0 
    ? Object.keys(usageCount).reduce((a, b) => usageCount[a] > usageCount[b] ? a : b) 
    : null;
    
  let topFeatureName = '';
  if (topFeatureId) {
    for (const category of rulesCategories) {
      const item = category.items.find(i => i.id === topFeatureId);
      if (item) {
        topFeatureName = item.name;
        break;
      }
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl glass-panel dark:bg-zinc-900/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/20 dark:border-white/5 bg-white/10 dark:bg-zinc-900/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-white/10 flex items-center justify-center shadow-sm">
                  <CoCoinIcon size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Co幣規則與使用量</h3>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">目前方案: {tier}</p>
                    {isAdmin && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 font-bold uppercase tracking-wider flex items-center gap-0.5">
                        <ShieldAlert size={10} />
                        管理員已授權 (無限)
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/30 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-8">
              {/* Usage Summary */}
              <div className="bg-white/40 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
                    <Sparkles size={16} className="text-indigo-500" />
                    剩餘 Co幣
                  </h4>
                  <div className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
                    {remainingPoints}
                    {pointsLimit !== Infinity && <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400 ml-1">/ {pointsLimit}</span>}
                  </div>
                </div>
                
                {pointsLimit !== Infinity && (
                  <div className="w-full bg-zinc-200 dark:bg-zinc-700 rounded-full h-2.5 overflow-hidden">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-500 ${percentageUsed > 90 ? 'bg-red-500' : percentageUsed > 70 ? 'bg-amber-500' : 'bg-indigo-500'}`}
                      style={{ width: `${percentageUsed}%` }}
                    />
                  </div>
                )}
                
                {pointsLimit !== Infinity && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-3 text-right">
                    已使用 {Math.round(pointsUsed)} Co幣
                  </p>
                )}

                {pointsLimit !== Infinity && (
                  <div className="mt-5 pt-4 border-t border-zinc-200/50 dark:border-zinc-700/50 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="text-left">
                      <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200">想要解鎖更多 Co 幣與超高速算力？</p>
                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light mt-0.5">升級至 Pro 或 Ultra 以解鎖無限可能與超高速處理。</p>
                    </div>
                    {onUpgradeClick && (
                      <button
                        onClick={onUpgradeClick}
                        className="w-full sm:w-auto shrink-0 px-4 py-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white rounded-xl text-xs font-semibold shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-1.5 hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                      >
                        <Sparkles size={13} className="animate-pulse" />
                        <span>立即升級方案</span>
                      </button>
                    )}
                  </div>
                )}

                {percentageUsed >= 90 && pointsLimit !== Infinity && (
                  <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800/50 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex gap-3 text-red-700 dark:text-red-400">
                      <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium mb-1">警告：Co幣即將用盡</p>
                        <p className="text-xs opacity-80 leading-relaxed">
                          {topFeatureName 
                            ? `您的「${topFeatureName}」使用量較高。升級方案將可獲得 15x 至無限次數的額度，且提升處理速度。`
                            : `您的剩餘 Co幣已低於 10%，請考慮升級方案以繼續無中斷使用服務。`}
                        </p>
                      </div>
                    </div>
                    {onUpgradeClick && (
                      <button
                        onClick={onUpgradeClick}
                        className="shrink-0 px-4 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/40 dark:hover:bg-red-900/60 text-red-700 dark:text-red-300 rounded-lg text-sm font-medium transition-colors"
                      >
                        升級方案
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Rules List */}
              <div>
                <h4 className="text-base font-medium text-zinc-900 dark:text-zinc-100 mb-4 px-1">功能 Co幣消耗表</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {rulesCategories.map((category, idx) => (
                    <div key={idx} className="bg-white/30 dark:bg-zinc-800/30 border border-zinc-200/50 dark:border-zinc-700/50 rounded-2xl p-5">
                      <div className="flex items-center gap-2 mb-4">
                        {category.icon}
                        <h5 className="font-medium text-sm text-zinc-800 dark:text-zinc-200">{category.title}</h5>
                      </div>
                      <ul className="space-y-3">
                        {category.items.map((item, i) => (
                          <li key={i} className="flex items-center justify-between text-sm">
                            <span className="text-zinc-600 dark:text-zinc-400 font-light">{item.name}</span>
                            <span className="font-mono text-xs font-semibold text-zinc-800 dark:text-zinc-200 bg-white/50 dark:bg-zinc-900/50 px-2 py-1 rounded-md shadow-sm">
                              {item.cost} Co幣
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
                <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800/50 rounded-2xl text-xs text-blue-700 dark:text-blue-300 font-light leading-relaxed">
                  <strong>注意事項：</strong> 每次成功呼叫 AI 模型時將扣除對應 Co 幣。若 Co 幣不足，請升級方案以繼續使用進階功能。若發生錯誤或未生成內容，將不會扣除 Co 幣。
                </div>
              </div>

              {/* CoCoin Aesthetic & Eco Intent Panel */}
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', damping: 20, stiffness: 100, delay: 0.3 }}
                className="bg-gradient-to-br from-indigo-50/40 via-white to-violet-50/30 dark:from-zinc-950/40 dark:via-zinc-900/40 dark:to-purple-950/10 p-6 md:p-8 rounded-3xl border border-zinc-200/60 dark:border-zinc-800/60 shadow-xs flex flex-col md:flex-row items-center gap-6 md:gap-8"
              >
                <div className="relative shrink-0 flex items-center justify-center">
                  {/* Ring glow behind the coin */}
                  <div className="absolute inset-0 bg-amber-400/20 dark:bg-violet-500/10 blur-2xl rounded-full scale-125" />
                  <motion.div
                    animate={{ 
                      rotateY: [0, 180, 360],
                      y: [0, -4, 0]
                    }}
                    transition={{ 
                      rotateY: { duration: 6, repeat: Infinity, ease: "easeInOut", repeatDelay: 4 },
                      y: { duration: 3, repeat: Infinity, ease: "easeInOut" }
                    }}
                    className="relative z-10"
                  >
                    <CoCoinIcon size={96} />
                  </motion.div>
                </div>

                <div className="flex-1 space-y-4">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-widest bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400">
                      Visual Identity
                    </span>
                    <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                      Co幣 (CoCoin) 設計美學與生態意圖
                    </h4>
                  </div>

                  <p className="text-sm text-zinc-650 dark:text-zinc-300 leading-relaxed font-light">
                    在 CoLab 協作生態系中，<strong>Co幣 (CoCoin)</strong> 不僅僅是系統背後的算力額度與呼叫次數，更是衡量「人機協同、靈感碰撞」的價值載體。每一次 AI 的點石成金，都在這個微型的算力經濟圈中流轉。
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <h5 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                        雙層金圈與深邃皇家藍
                      </h5>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        金黃色的雙重立體層次外圈象徵著「技術的鑄造」與「產品的卓越質感」，內圈採用深藍夾帶徑向金屬光澤的漸層，代表無垠的 AI 潛力與學術研究的深邃嚴謹。
                      </p>
                    </div>

                    <div className="space-y-1">
                      <h5 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                        「Co」之交響：協作與友善
                      </h5>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed">
                        黃金雕刻的大寫「C」象徵 Collaboration（協作）與 Computing（算力），其右側巧妙融合成一張「帶微笑的溫暖小文字 o」，代表科技不應冰冷，而是極具親和力與開發者友善的忠實夥伴。
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>

            <div className="p-4 border-t border-white/20 dark:border-white/5 bg-white/10 dark:bg-zinc-900/10 flex justify-end">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 rounded-xl text-sm font-medium hover:bg-black dark:hover:bg-white transition-colors shadow-sm"
              >
                了解
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
