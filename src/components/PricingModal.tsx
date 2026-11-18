import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, Check, Zap, Crown, Star, Sparkles, Rocket, Flame, Award, Infinity as InfinityIcon, User, Briefcase } from 'lucide-react';
import { Tier } from '../types';
import { useSubscription } from '../contexts/SubscriptionContext';

interface PricingModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function PricingModal({ isOpen, onClose }: PricingModalProps) {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { tier, setTier, isTrialActive, trialTier, startTrial, cancelTrial } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const [activeCategory, setActiveCategory] = useState<'personal' | 'enterprise'>('personal');

  const plans = [
    {
      name: 'Free' as Tier,
      category: 'personal',
      price: '$0',
      period: billingCycle === 'monthly' ? (isZh ? '/ 月' : '/ mo') : (isZh ? '/ 年' : '/ yr'),
      description: isZh ? '適合日常輕量使用' : 'Ideal for casual, daily operations',
      icon: <Star className="text-zinc-400" size={24} />,
      features: [
        isZh ? '基本 300 Co幣額度' : 'Basic 300 CoCoins quota',
        isZh ? '基礎聊天與搜尋功能' : 'Basic Chat & Search capabilities',
        isZh ? '語音轉文字' : 'Speech-to-Text transcription',
        isZh ? '標準回應速度' : 'Standard Response Speed'
      ],
      color: 'zinc',
      originalPrice: null,
      yearlyTotal: null
    },
    {
      name: 'Plus' as Tier,
      category: 'personal',
      price: billingCycle === 'monthly' ? 'NT$ 135' : 'NT$ 68',
      period: isZh ? '/ 月' : '/ mo',
      description: isZh ? '增強版基礎 AI 創作體驗' : 'Enhanced basic AI creation helper',
      icon: <Sparkles className="text-indigo-500" size={24} />,
      features: [
        isZh ? '中階 1500 Co幣額度' : 'Intermediate 1500 CoCoins quota',
        isZh ? '圖片生成與分析 (限額)' : 'Image Gen & Vision (limited)',
        isZh ? '影片中生成兩次' : '2 Video Generations',
        isZh ? '圖片中生成十次' : '10 Image Generations'
      ],
      color: 'indigo',
      originalPrice: billingCycle === 'yearly' ? 'NT$ 135' : null,
      yearlyTotal: billingCycle === 'yearly' ? (isZh ? '按年計費 NT$ 810' : 'Billed annually NT$ 810') : null
    },
    {
      name: 'Go' as Tier,
      category: 'personal',
      price: billingCycle === 'monthly' ? 'NT$ 270' : 'NT$ 135',
      period: isZh ? '/ 月' : '/ mo',
      description: isZh ? '🎓 學生方案特惠・中高階 AI 算力' : '🎓 Student Special • High-Intermediate AI Compute',
      icon: <Rocket className="text-teal-500" size={24} />,
      features: [
        isZh ? '特惠 3000 Co幣額度' : 'Promo 3000 CoCoins quota',
        isZh ? '解鎖進階型助理任務代理' : 'Unlock Advanced Assistant Agents',
        isZh ? '圖片中生成20次' : '20 Image Generations',
        isZh ? '影片中生成4次' : '4 Video Generations'
      ],
      color: 'teal',
      originalPrice: billingCycle === 'yearly' ? 'NT$ 270' : null,
      yearlyTotal: billingCycle === 'yearly' ? (isZh ? '按年計費 NT$ 1620' : 'Billed annually NT$ 1620') : null
    },
    {
      name: 'Pro' as Tier,
      category: 'personal',
      price: billingCycle === 'monthly' ? 'NT$ 650' : 'NT$ 325',
      period: isZh ? '/ 月' : '/ mo',
      description: isZh ? '解鎖進階模型與圖片功能' : 'Unlock advanced models & image features',
      icon: <Zap className="text-blue-500" size={24} />,
      features: [
        isZh ? '進階 4500 Co幣額度' : 'Advanced 4500 CoCoins quota',
        isZh ? 'Gemini 3.1 Pro 進階推理' : 'Gemini 3.1 Pro Advanced Reasoning',
        isZh ? '圖片生成與分析' : 'Image Generation & Vision',
        isZh ? '影片生成 6 次' : '6 Video Generations',
        isZh ? '文字轉語音' : 'Text-to-Speech synthesis',
        isZh ? '優先回應速度' : 'Priority Response Speed'
      ],
      color: 'blue',
      originalPrice: billingCycle === 'yearly' ? 'NT$ 650' : null,
      yearlyTotal: billingCycle === 'yearly' ? (isZh ? '按年計費 NT$ 3900' : 'Billed annually NT$ 3900') : null
    },
    {
      name: 'One' as Tier,
      category: 'personal',
      price: billingCycle === 'monthly' ? 'NT$ 1280' : 'NT$ 640',
      period: isZh ? '/ 月' : '/ mo',
      description: isZh ? '⚖️ 實惠高效・全新中階算力平衡方案' : '⚖️ Efficient Balance • New Mid-tier Compute scheme',
      icon: <Sparkles className="text-indigo-500" size={24} />,
      features: [
        isZh ? '中階 5500 Co幣額度' : 'Intermediate 5500 CoCoins quota',
        isZh ? 'Imagen 3 圖片風格全解鎖' : 'Full Imagen 3 styles unlocked',
        isZh ? '2 次極速影片生成額度' : '2 High-speed Video Generations',
        isZh ? '解鎖 1 次影片分析功能' : 'Unlock 1 Video Analysis function',
        isZh ? '中高優先回應回應速度' : 'Mid-High Priority Response'
      ],
      color: 'indigo',
      originalPrice: billingCycle === 'yearly' ? 'NT$ 1280' : null,
      yearlyTotal: billingCycle === 'yearly' ? (isZh ? '按年計費 NT$ 7680' : 'Billed annually NT$ 7680') : null
    },
    {
      name: 'Advanced' as Tier,
      category: 'personal',
      price: billingCycle === 'monthly' ? 'NT$ 1970' : 'NT$ 985',
      period: isZh ? '/ 月' : '/ mo',
      description: isZh ? '🚀 高級專業・進階多媒體創作組合' : '🚀 Premium Pro • Advanced Media creation suite',
      icon: <Award className="text-violet-500" size={24} />,
      features: [
        isZh ? '高階 6500 Co幣額度' : 'High-tier 6500 CoCoins quota',
        isZh ? 'Imagen 3 圖片極速生圖' : 'Ultra Fast Imagen 3 Generations',
        isZh ? '4 次極速影片生成額度' : '4 High-speed Video Generations',
        isZh ? '解鎖 3 次影片分析功能' : 'Unlock 3 Video Analysis functions',
        isZh ? '2 次即時語音對談額度' : '2 Live Audio Voice sessions'
      ],
      color: 'violet',
      originalPrice: billingCycle === 'yearly' ? 'NT$ 1970' : null,
      yearlyTotal: billingCycle === 'yearly' ? (isZh ? '按年計費 NT$ 11820' : 'Billed annually NT$ 11820') : null
    },
    {
      name: 'Ultra' as Tier,
      category: 'personal',
      price: billingCycle === 'monthly' ? 'NT$ 3290' : 'NT$ 1645',
      period: isZh ? '/ 月' : '/ mo',
      description: isZh ? '無限制存取所有頂級功能' : 'Unlimited access to all elite tier features',
      icon: <Crown className="text-amber-500" size={24} />,
      features: [
        isZh ? '9000 Co幣額度' : '9000 CoCoins quota',
        isZh ? 'Veo 3.1 影片生成與分析' : 'Veo 3.1 Video Gen & Analysis',
        isZh ? 'Gemini Live 即時語音對話' : 'Gemini Live Realtime Dialogue',
        isZh ? '最高優先級回應速度' : 'Top-tier Response Priority',
        isZh ? '搶先體驗新功能' : 'Early access to new features'
      ],
      color: 'amber',
      originalPrice: billingCycle === 'yearly' ? 'NT$ 3290' : null,
      yearlyTotal: billingCycle === 'yearly' ? (isZh ? '按年計費 NT$ 19740' : 'Billed annually NT$ 19740') : null
    },
    {
      name: 'Max' as Tier,
      category: 'personal',
      price: billingCycle === 'monthly' ? 'NT$ 4300' : 'NT$ 2150',
      period: isZh ? '/ 月' : '/ mo',
      description: isZh ? '👑 頂規尊榮・全方位無極限方案' : '👑 Ultimate Luxury • Full limit-free scheme',
      icon: <Flame className="text-rose-500 animate-pulse" size={24} />,
      features: [
        isZh ? '巔峰 12000 Co幣額度' : 'Apex 12000 CoCoins quota',
        isZh ? '8 部 Veo 影片創作與動畫額度' : '8 Veo Videos & Animations',
        isZh ? '極致尊爵 1 對 1 專家支援' : 'Elite 1-on-1 expert support',
        isZh ? '全新 AGI 智能代理優先調度' : 'AI Agent Priority dispatching',
        isZh ? '尊榮 Max 終身客製識別徽章' : 'Max Exclusive Lifetime Badge'
      ],
      color: 'rose',
      originalPrice: billingCycle === 'yearly' ? 'NT$ 4300' : null,
      yearlyTotal: billingCycle === 'yearly' ? (isZh ? '按年計費 NT$ 25800' : 'Billed annually NT$ 25800') : null
    },
    {
      name: 'Super' as Tier,
      category: 'personal',
      price: billingCycle === 'monthly' ? 'NT$ 8910' : 'NT$ 4455',
      period: isZh ? '/ 月' : '/ mo',
      description: isZh ? '🌌 終極至尊・全能 AGI 星海方案' : '🌌 Supreme • All-capable AGI Cosmic scheme',
      icon: <Sparkles className="text-fuchsia-500 animate-pulse" size={24} />,
      features: [
        isZh ? '全功能 26050 Co幣量子無限算力' : 'All-access 26050 CoCoins unlimited power',
        isZh ? '星海級 AGI 自我優化智能代理' : 'Cosmic AGI self-optimizing agents',
        isZh ? '毫微秒級 (Zero-latency) 即時回應' : 'Zero-latency near-instant response',
        isZh ? '全宇宙 1對1 熱線專家終身支援' : 'Full Universe 1-on-1 expert support',
        isZh ? '超豪金尊爵 Super 終身識別徽章' : 'Lifetime Golden Super Badge'
      ],
      color: 'fuchsia',
      originalPrice: billingCycle === 'yearly' ? 'NT$ 8910' : null,
      yearlyTotal: billingCycle === 'yearly' ? (isZh ? '按年計費 NT$ 53460' : 'Billed annually NT$ 53460') : null
    }
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 select-none">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-7xl glass-panel rounded-[28px] overflow-hidden flex flex-col max-h-[90vh]"
          >
            <div className="flex items-center justify-between px-8 py-6 border-b border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/10">
              <div>
                <h2 className="text-2xl font-sans font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-2">
                  <Sparkles size={20} className="text-indigo-500 dark:text-indigo-400" />
                  {isZh ? '升級您的方案' : 'Upgrade Your Plan'}
                </h2>
                <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm font-medium">
                  {isZh ? '選擇最適合您的 AI 創作與協作智慧工具組合' : 'Select the perfect plan of tailored AI workspace tools'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-150 hover:bg-zinc-100 dark:hover:bg-zinc-900 rounded-full transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-8 overflow-y-auto bg-zinc-50/20 dark:bg-zinc-900/5">
              {/* Category (Personal/Enterprise) Selector */}
              <div className="flex flex-col md:flex-row items-center justify-center gap-4 mb-8">
                <div className="relative p-1 bg-zinc-100/85 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl flex items-center shadow-inner select-none">
                  <button
                    onClick={() => setActiveCategory('personal')}
                    className={`relative px-5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                      activeCategory === 'personal'
                        ? 'text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-800 shadow-sm font-bold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <User size={14} className={activeCategory === 'personal' ? 'text-indigo-500' : 'text-zinc-400'} />
                    <span>{isZh ? '個人方案 (Personal)' : 'Personal Plans'}</span>
                  </button>
                  <button
                    onClick={() => setActiveCategory('enterprise')}
                    className={`relative px-5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-2 ${
                      activeCategory === 'enterprise'
                        ? 'text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-800 shadow-sm font-bold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <Briefcase size={14} className={activeCategory === 'enterprise' ? 'text-indigo-500 animate-pulse' : 'text-zinc-400'} />
                    <span>{isZh ? '企業與團隊方案 (Enterprise)' : 'Enterprise Plans'}</span>
                  </button>
                </div>
              </div>

              {activeCategory === 'personal' && (
                <>
                  {/* 7-Day Trial Promotional Banner */}
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 rounded-2xl bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-indigo-500/20 dark:border-indigo-500/30 shadow-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-pink-500 flex items-center justify-center shrink-0 shadow-md">
                    <Sparkles className="text-white animate-pulse" size={18} />
                  </div>
                  <div>
                    <h4 className="text-xs md:text-sm font-bold text-zinc-900 dark:text-zinc-50 flex items-center gap-1.5">
                      {isZh ? '✨ 解鎖 7 天免費試用特權 (7-Day Risk-Free Trial Available)' : '✨ Unlock a 7-Day Risk-Free Trial (0 USD)'}
                    </h4>
                    <p className="text-[11px] text-zinc-555 dark:text-zinc-400 mt-0.5">
                      {isZh 
                        ? '所有付費進階算力方案均支援獨立 7 天完整特權試用！隨時可取消，試用期內 0 負擔。' 
                        : 'All premium compute plans support a full 7-day trial! Cancel anytime with zero commitment.'}
                    </p>
                  </div>
                </div>
                {isTrialActive && (
                  <div className="flex items-center gap-3 self-end md:self-auto bg-white/65 dark:bg-zinc-900/60 p-2 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40">
                    <span className="text-[11px] font-sans font-bold text-zinc-650 dark:text-zinc-300">
                      {isZh ? '目前試用方案: ' : 'Active trial plan: '}<span className="text-indigo-600 dark:text-indigo-400 font-extrabold">{trialTier}</span>{isZh ? ' (剩餘 7 天)' : ' (7 days left)'}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(isZh ? "您確定要取消目前的免費試用方案嗎？取消後將立刻恢復為免費 Free 版。" : "Are you sure you want to cancel your current free trial? You will return to the Free plan immediately.")) {
                          cancelTrial();
                        }
                      }}
                      className="text-[10px] font-sans font-extrabold text-red-600 hover:text-red-750 bg-red-50 dark:bg-red-950/40 dark:text-red-400 px-2.5 py-1 rounded-lg transition-all cursor-pointer"
                    >
                      {isZh ? '取消試用' : 'Cancel Trial'}
                    </button>
                  </div>
                )}
              </div>

              {/* Billing Cycle Selector Segment Control */}
              <div className="flex justify-center mb-8">
                <div className="relative p-1 bg-zinc-100/85 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl flex items-center shadow-inner select-none">
                  <button
                    onClick={() => setBillingCycle('monthly')}
                    className={`relative px-5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer ${
                      billingCycle === 'monthly'
                        ? 'text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-800 shadow-sm font-bold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {isZh ? '按月付款 (Monthly)' : 'Pay Monthly'}
                  </button>
                  <button
                    onClick={() => setBillingCycle('yearly')}
                    className={`relative px-5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-300 cursor-pointer flex items-center gap-1.5 ${
                      billingCycle === 'yearly'
                        ? 'text-zinc-900 dark:text-zinc-50 bg-white dark:bg-zinc-800 shadow-sm font-bold'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    <span>{isZh ? '按年付款 (Yearly)' : 'Pay Yearly'}</span>
                    <span className="bg-gradient-to-r from-red-500 to-pink-500 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-lg uppercase tracking-wide shadow-sm scale-105">
                      {isZh ? '立減 50%' : 'Save 50%'}
                    </span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 select-text">
                {plans.map((plan) => {
                  const isCurrentPlan = tier === plan.name;
                  const isPopular = plan.name === 'Pro';
                  const isPremium = plan.name === 'Ultra';
                  
                  return (
                    <div 
                      key={plan.name}
                      className={`relative flex flex-col bg-white/50 dark:bg-zinc-900/40 backdrop-blur-sm rounded-2xl border ${
                        isCurrentPlan ? 'border-zinc-900 dark:border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg' : 
                        plan.name === 'Super' ? 'border-fuchsia-200/85 dark:border-fuchsia-800/45 shadow-md hover:border-fuchsia-500 dark:hover:border-fuchsia-400 ring-1 ring-fuchsia-500/5' :
                        plan.name === 'Max' ? 'border-rose-200/80 dark:border-rose-800/40 shadow-sm hover:border-rose-450 dark:hover:border-rose-605' :
                        plan.name === 'Advanced' ? 'border-violet-200/80 dark:border-violet-800/40 shadow-sm hover:border-violet-400 ring-1 ring-violet-500/5' :
                        plan.name === 'One' ? 'border-indigo-200/80 dark:border-indigo-800/40 shadow-sm hover:border-indigo-400 ring-1 ring-indigo-500/5' :
                        plan.name === 'Go' ? 'border-teal-200/80 dark:border-teal-800/40 shadow-sm hover:border-teal-400' :
                        isPopular ? 'border-blue-200/80 dark:border-blue-800/40 shadow-sm hover:border-blue-400' : 'border-zinc-200/50 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700'
                      } p-5 transition-all duration-300 hover:shadow-lg`}
                    >
                      {isPopular && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-blue-500 to-indigo-500 text-white text-[10px] font-extrabold rounded-full tracking-wider shadow-sm uppercase">
                          {isZh ? '最受歡迎' : 'POPULAR'}
                        </div>
                      )}

                      {plan.name === 'One' && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-indigo-505 to-purple-500 text-white text-[10px] font-extrabold rounded-full tracking-wider shadow-sm whitespace-nowrap animate-pulse">
                          {isZh ? '✨ 智慧平衡' : '✨ BALANCED'}
                        </div>
                      )}
                      
                      {plan.name === 'Advanced' && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-violet-500 to-indigo-500 text-white text-[10px] font-extrabold rounded-full tracking-wider shadow-sm whitespace-nowrap">
                          {isZh ? '🚀 高階推理' : '🚀 ADVANCED'}
                        </div>
                      )}

                      {plan.name === 'Go' && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-teal-500 to-emerald-500 text-white text-[10px] font-extrabold rounded-full tracking-wider shadow-sm whitespace-nowrap">
                          {isZh ? '🎓 學生方案' : '🎓 STUDENT'}{isCurrentPlan ? (isZh ? ' (目前方案)' : ' (Current)') : ''}
                        </div>
                      )}
                      
                      {plan.name === 'Max' && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white text-[9.5px] font-extrabold rounded-full tracking-wider shadow-sm whitespace-nowrap animate-pulse">
                          {isZh ? '👑 頂規尊榮' : '👑 ULTIMATE'}
                        </div>
                      )}
                      
                      {plan.name === 'Super' && !isCurrentPlan && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-gradient-to-r from-fuchsia-500 via-purple-650 to-pink-600 text-white text-[9.5px] font-black rounded-full tracking-wider shadow-md whitespace-nowrap animate-pulse">
                          {isZh ? '🌌 究極至尊' : '🌌 COSMIC'}
                        </div>
                      )}
                      
                      {isCurrentPlan && plan.name !== 'Go' && (
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-zinc-900 dark:bg-emerald-500 text-white text-[10px] font-extrabold rounded-full tracking-wider shadow-sm uppercase">
                          {isZh ? '目前方案' : 'CURRENT'}
                        </div>
                      )}

                      <div className="flex items-center gap-3.5 mb-5 select-none">
                        <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                          plan.color === 'zinc' ? 'bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700' :
                          plan.color === 'indigo' ? 'bg-indigo-50/80 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/45' :
                          plan.color === 'teal' ? 'bg-teal-50/80 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/45' :
                          plan.color === 'blue' ? 'bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/45' :
                          plan.color === 'rose' ? 'bg-rose-50/80 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/45' :
                          plan.color === 'fuchsia' ? 'bg-fuchsia-50/80 dark:bg-fuchsia-950/30 border border-fuchsia-100 dark:border-fuchsia-900/45 animate-pulse' :
                          plan.color === 'violet' ? 'bg-violet-50/80 dark:bg-violet-950/30 border border-violet-100 dark:border-violet-900/45' :
                          'bg-amber-50/80 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/45'
                        }`}>
                          {plan.icon}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-sm font-extrabold text-zinc-900 dark:text-zinc-100 truncate flex items-center gap-1">CoLab Ai {plan.name}</h3>
                          <p className="text-[10px] text-zinc-455 dark:text-zinc-500 mt-0.5 truncate">{plan.description}</p>
                        </div>
                      </div>

                      <div className="mb-6 flex flex-col justify-end min-h-[58px]">
                        <div className="flex items-baseline gap-1 select-none">
                          {plan.originalPrice && (
                            <span className="text-base text-zinc-400 dark:text-zinc-550 line-through font-medium mr-1 decoration-red-500/60 decoration-[1.5px]">
                              {plan.originalPrice}
                            </span>
                          )}
                          <span className="text-3xl font-extrabold text-zinc-905 dark:text-zinc-50 tracking-tight">
                            {plan.price}
                          </span>
                          <span className="text-zinc-500 dark:text-zinc-400 text-xs font-bold font-sans">
                            {plan.period}
                          </span>
                        </div>
                        {plan.yearlyTotal && (
                          <div className="text-[10px] font-sans text-emerald-600 dark:text-emerald-400 font-bold mt-2 flex flex-wrap items-center gap-1.5 select-none">
                            <span>{plan.yearlyTotal}</span>
                            <span className="bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[8px] px-1 rounded-md font-extrabold tracking-wider border border-emerald-500/20 whitespace-nowrap">
                              {isZh ? '立減 50%' : 'Save 50%'}
                            </span>
                          </div>
                        )}
                        {!plan.yearlyTotal && plan.name !== 'Free' && (
                          <div className="text-[11px] text-zinc-400 dark:text-zinc-550 font-semibold mt-2 h-4 select-none">
                            {isZh ? '按月輕鬆體驗無負擔' : 'Flexible monthly billing, cancel anytime'}
                          </div>
                        )}
                        {plan.name === 'Free' && (
                          <div className="text-[11px] text-zinc-450 dark:text-zinc-500 font-semibold mt-2 h-4 select-none">
                            {isZh ? '體驗極致免費 AI 服務' : 'Experience free tier AI services'}
                          </div>
                        )}
                      </div>

                      <ul className="space-y-3 mb-8 flex-1 select-text">
                        {plan.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start gap-2 text-[11px] font-semibold text-zinc-655 dark:text-zinc-400 leading-normal">
                            <Check size={13} className={`shrink-0 mt-0.5 ${
                              plan.color === 'zinc' ? 'text-zinc-500' :
                              plan.color === 'indigo' ? 'text-indigo-500' :
                              plan.color === 'teal' ? 'text-teal-500' :
                              plan.color === 'blue' ? 'text-blue-500' :
                              plan.color === 'violet' ? 'text-violet-500 animate-pulse' :
                              plan.color === 'rose' ? 'text-rose-500 animate-pulse' :
                              plan.color === 'fuchsia' ? 'text-fuchsia-500 animate-pulse font-black' : 'text-amber-500'
                            }`} />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>

                      <button
                        onClick={() => {
                          if (plan.name === 'Free') {
                            cancelTrial();
                            setTier('Free');
                          } else {
                            startTrial(plan.name);
                          }
                          onClose();
                        }}
                        disabled={isCurrentPlan}
                        className={`w-full py-2.5 rounded-2xl text-[11px] font-bold transition-all duration-200 cursor-pointer ${
                          isCurrentPlan 
                            ? 'bg-zinc-100 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 text-zinc-400 dark:text-zinc-600 cursor-not-allowed'
                            : plan.name === 'Super'
                              ? 'bg-gradient-to-r from-fuchsia-600 via-purple-650 to-pink-600 text-white hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-fuchsia-500/10 font-black animate-pulse'
                              : plan.name === 'Max'
                                ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white hover:opacity-95 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-rose-500/10 font-bold'
                                : isPremium
                                ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-amber-500/10'
                                : plan.name === 'Advanced'
                                ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-violet-500/10'
                                : isPopular
                                  ? 'bg-gradient-to-r from-blue-600/90 to-indigo-600/90 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-blue-500/10'
                                  : plan.name === 'Go'
                                    ? 'bg-gradient-to-r from-teal-500 to-emerald-500 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-teal-500/10'
                                    : plan.name === 'One'
                                      ? 'bg-gradient-to-r from-indigo-650 to-purple-650 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-indigo-500/10'
                                    : plan.name === 'Plus'
                                      ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-indigo-500/10'
                                      : 'bg-zinc-900 dark:bg-zinc-800 text-white hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]'
                        }`}
                      >
                        {isCurrentPlan 
                          ? (isTrialActive && trialTier === plan.name ? (isZh ? '試用中 (剩餘 7 天)' : 'Trial Active (7d left)') : (isZh ? '使用中' : 'Active'))
                          : plan.name === 'Free' 
                            ? (isZh ? '使用此方案' : 'Use this plan') 
                            : (isZh ? '正式試用 7 天 (0 元)' : 'Start 7-Day Free Trial')}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="mt-16 border-t border-zinc-200/60 dark:border-zinc-800/60 pt-10 pb-4">
                <div className="text-center mb-8">
                  <h3 className="text-xl font-bold font-sans text-zinc-900 dark:text-zinc-100 flex items-center justify-center gap-2">
                    <Sparkles className="text-indigo-500" size={18} />
                    {isZh ? '完整方案權益比一比 (Detailed Side-by-Side Comparison)' : 'Detailed Side-by-Side Comparison'}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 mb-5">
                    {isZh ? '為您量身打造的算力與智能協作組合，深入了解各個方案的核心效益差異' : 'Explore premium AI compute structures to find your best workflow balance.'}
                  </p>

                  {/* Compact comparison table toggle switch */}
                  <div className="inline-flex items-center gap-2.5 p-1 bg-zinc-100/90 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl shadow-inner select-none mb-4">
                    <button
                      onClick={() => setBillingCycle('monthly')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-250 cursor-pointer ${
                        billingCycle === 'monthly'
                          ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-50 shadow-sm'
                          : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      }`}
                    >
                      {isZh ? '按月付款 (Monthly)' : 'Pay Monthly'}
                    </button>
                    <button
                      onClick={() => setBillingCycle('yearly')}
                      className={`px-3.5 py-1.5 text-xs font-bold rounded-xl transition-all duration-250 cursor-pointer flex items-center gap-1.5 ${
                        billingCycle === 'yearly'
                          ? 'bg-gradient-to-r from-red-500/10 to-pink-500/10 border border-red-500/20 text-red-650 dark:text-red-400 font-extrabold shadow-sm'
                          : 'text-zinc-400 dark:text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
                      }`}
                    >
                      <span>{isZh ? '按年付款 50% Off' : 'Pay Yearly 50% Off'}</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                    </button>
                  </div>
                </div>

                <div className="overflow-x-auto w-full select-text border border-zinc-250/20 dark:border-zinc-800/40 rounded-2xl bg-white/40 dark:bg-zinc-900/10 backdrop-blur-sm shadow-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-50/50 dark:bg-zinc-900/25">
                        <th className="p-4 text-xs font-bold text-zinc-500 dark:text-zinc-400 min-w-[160px]">
                          {isZh ? '功能與權益指標' : 'Specs & Features'}
                        </th>
                        <th className="p-4 text-xs font-extrabold text-zinc-650 dark:text-zinc-300 text-center bg-zinc-500/5">
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200/60 dark:border-zinc-700 uppercase tracking-wider scale-90">
                              {isZh ? 'Basic / 體驗' : 'Basic / Intro'}
                            </span>
                            <span>CoLab Ai Free</span>
                          </div>
                        </th>
                        <th className="p-4 text-xs font-extrabold text-indigo-655 dark:text-indigo-400 text-center bg-indigo-500/5">
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950/55 text-indigo-650 dark:text-indigo-400 border border-indigo-200/40 dark:border-indigo-900/40 uppercase tracking-wider scale-95 shadow-sm text-center font-bold">
                              {isZh ? 'Best Value / 推薦' : 'Best Value / Popular'}
                            </span>
                            <span>CoLab Ai Plus</span>
                          </div>
                        </th>
                        <th className="p-4 text-xs font-extrabold text-teal-650 dark:text-teal-400 text-center bg-teal-500/5">
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-950/50 text-teal-655 dark:text-teal-450 border border-teal-200/40 dark:border-teal-900/40 uppercase tracking-wider scale-95 shadow-sm text-center font-bold">
                              {isZh ? '🎓 Student / 學生方案' : '🎓 Student scheme'}
                            </span>
                            <span>CoLab Ai Go</span>
                          </div>
                        </th>
                        <th className="p-4 text-xs font-extrabold text-blue-605 dark:text-blue-400 text-center bg-blue-500/5">
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/50 text-blue-655 dark:text-blue-455 border border-blue-200/40 dark:border-blue-900/40 uppercase tracking-wider scale-90">
                              {isZh ? 'Power User / 創作' : 'Creator / Creator'}
                            </span>
                            <span>CoLab Ai Pro</span>
                          </div>
                        </th>
                        <th className="p-4 text-xs font-extrabold text-violet-650 dark:text-violet-400 text-center bg-violet-500/5">
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-950/50 text-violet-655 dark:text-violet-440 border border-violet-200/40 dark:border-violet-900/45 uppercase tracking-wider scale-90">
                              {isZh ? 'Advanced / 進階' : 'Advanced Plan'}
                            </span>
                            <span>CoLab Ai Advanced</span>
                          </div>
                        </th>
                        <th className="p-4 text-xs font-extrabold text-amber-655 dark:text-amber-400 text-center bg-amber-500/5">
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/50 text-amber-655 dark:text-amber-455 border border-amber-200/40 dark:border-amber-900/40 uppercase tracking-wider scale-90">
                              {isZh ? 'Flagship / 旗艦' : 'Flagship / Premium'}
                            </span>
                            <span>CoLab Ai Ultra</span>
                          </div>
                        </th>
                        <th className="p-4 text-xs font-extrabold text-rose-655 dark:text-rose-400 text-center bg-rose-500/5">
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-655 dark:text-rose-455 border border-rose-200/40 dark:border-rose-900/40 uppercase tracking-wider scale-90 animate-pulse">
                              {isZh ? 'Ultimate / 頂級' : 'Ultimate / Elite'}
                            </span>
                            <span>CoLab Ai Max</span>
                          </div>
                        </th>
                        <th className="p-4 text-xs font-extrabold text-fuchsia-655 dark:text-fuchsia-400 text-center bg-fuchsia-500/5">
                          <div className="flex flex-col items-center gap-1.5 py-1">
                            <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-fuchsia-100 dark:bg-fuchsia-950/50 text-fuchsia-655 dark:text-fuchsia-455 border border-fuchsia-200/40 dark:border-fuchsia-900/40 uppercase tracking-wider scale-90 animate-pulse">
                              {isZh ? 'Supreme / 至尊' : 'Supreme / Cosmic'}
                            </span>
                            <span>CoLab Ai Super</span>
                          </div>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30 text-xs">
                      {/* Section 1: 額度與算力 */}
                      <tr className="bg-zinc-100/30 dark:bg-zinc-900/30">
                        <td colSpan={9} className="p-3 font-bold text-zinc-800 dark:text-zinc-200 tracking-wide text-[11px] uppercase">
                          {isZh ? '⚡ 額度資費與算力調度 (Usage & Compute)' : '⚡ Usage & Compute Resources'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '方案費率小計' : 'Plan Base Rate'}</td>
                        <td className="p-4 text-center text-zinc-650 bg-zinc-500/5">
                          <div className="flex flex-col items-center justify-center">
                            <span className="font-extrabold text-sm text-zinc-600 dark:text-zinc-400">$0</span>
                            <span className="text-zinc-400 text-[10px]">{isZh ? '永久免費' : 'Always Free'}</span>
                          </div>
                        </td>
                        <td className="p-4 text-center bg-indigo-500/5">
                          <div className="flex flex-col items-center justify-center">
                            {billingCycle === 'yearly' ? (
                              <>
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="text-zinc-400 line-through text-[10px]">NT$ 135</span>
                                  <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">NT$ 68</span>
                                  <span className="text-zinc-500 text-[10px] select-none">/ 月</span>
                                </div>
                                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 px-1.5 py-0.2 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-md border border-emerald-500/10">年繳 NT$ 810 (立減50%)</span>
                              </>
                            ) : (
                              <>
                                <span className="font-extrabold text-sm text-indigo-650 dark:text-indigo-455">NT$ 135</span>
                                <span className="text-zinc-500 text-[10px]"> / 月 (按月計費)</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center bg-teal-500/5">
                          <div className="flex flex-col items-center justify-center">
                            {billingCycle === 'yearly' ? (
                              <>
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="text-zinc-400 line-through text-[10px]">NT$ 270</span>
                                  <span className="font-extrabold text-sm text-teal-600 dark:text-teal-400">NT$ 135</span>
                                  <span className="text-zinc-500 text-[10px] select-none">/ 月</span>
                                </div>
                                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 px-1.5 py-0.2 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-md border border-emerald-500/10">年繳 NT$ 1620 (立減50%)</span>
                              </>
                            ) : (
                              <>
                                <span className="font-extrabold text-sm text-teal-650 dark:text-teal-450">NT$ 270</span>
                                <span className="text-zinc-500 text-[10px]"> / 月 (按月計費)</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center bg-blue-500/5">
                          <div className="flex flex-col items-center justify-center">
                            {billingCycle === 'yearly' ? (
                              <>
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="text-zinc-400 line-through text-[10px]">NT$ 650</span>
                                  <span className="font-extrabold text-sm text-blue-600 dark:text-blue-400">NT$ 325</span>
                                  <span className="text-zinc-500 text-[10px] select-none">/ 月</span>
                                </div>
                                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 px-1.5 py-0.2 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-md border border-emerald-500/10">年繳 NT$ 3900 (立減50%)</span>
                              </>
                            ) : (
                              <>
                                <span className="font-extrabold text-sm text-blue-650 dark:text-blue-455">NT$ 650</span>
                                <span className="text-zinc-500 text-[10px]"> / 月 (按月計費)</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center bg-violet-500/5">
                          <div className="flex flex-col items-center justify-center">
                            {billingCycle === 'yearly' ? (
                              <>
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="text-zinc-400 line-through text-[10px]">NT$ 1970</span>
                                  <span className="font-extrabold text-sm text-violet-650 dark:text-violet-400">NT$ 985</span>
                                  <span className="text-zinc-500 text-[10px] select-none">/ 月</span>
                                </div>
                                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 px-1.5 py-0.2 bg-emerald-500/15 dark:bg-emerald-500/15 rounded-md border border-emerald-500/10">年繳 NT$ 11820 (立減 50%)</span>
                              </>
                            ) : (
                              <>
                                <span className="font-extrabold text-sm text-violet-650 dark:text-violet-455">NT$ 1970</span>
                                <span className="text-zinc-500 text-[10px]"> / 月 (按月計費)</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center bg-amber-500/5">
                          <div className="flex flex-col items-center justify-center">
                            {billingCycle === 'yearly' ? (
                              <>
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="text-zinc-400 line-through text-[10px]">NT$ 3290</span>
                                  <span className="font-extrabold text-sm text-amber-600 dark:text-amber-400">NT$ 1645</span>
                                  <span className="text-zinc-500 text-[10px]">/ 月</span>
                                </div>
                                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 px-1.5 py-0.2 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-md border border-emerald-500/10">年繳 NT$ 19740 (立減50%)</span>
                              </>
                            ) : (
                              <>
                                <span className="font-extrabold text-sm text-amber-650 dark:text-amber-455">NT$ 3290</span>
                                <span className="text-zinc-500 text-[10px]"> / 月 (按月計費)</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center bg-rose-500/5">
                          <div className="flex flex-col items-center justify-center">
                            {billingCycle === 'yearly' ? (
                              <>
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="text-zinc-400 line-through text-[10px]">NT$ 4300</span>
                                  <span className="font-extrabold text-sm text-rose-600 dark:text-rose-400">NT$ 2150</span>
                                  <span className="text-zinc-500 text-[10px]">/ 月</span>
                                </div>
                                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 px-1.5 py-0.2 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-md border border-emerald-500/10 whitespace-nowrap">年繳 NT$ 25800 (立減 50%)</span>
                              </>
                            ) : (
                              <>
                                <span className="font-extrabold text-sm text-rose-655 dark:text-rose-455">NT$ 4300</span>
                                <span className="text-zinc-500 text-[10px]"> / 月 (按月計費)</span>
                              </>
                            )}
                          </div>
                        </td>
                        <td className="p-4 text-center bg-fuchsia-500/5">
                          <div className="flex flex-col items-center justify-center">
                            {billingCycle === 'yearly' ? (
                              <>
                                <div className="flex items-center gap-1 justify-center">
                                  <span className="text-zinc-400 line-through text-[10px]">NT$ 8910</span>
                                  <span className="font-extrabold text-sm text-fuchsia-600 dark:text-fuchsia-400">NT$ 4455</span>
                                  <span className="text-zinc-500 text-[10px]">/ 月</span>
                                </div>
                                <span className="text-[9.5px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 px-1.5 py-0.2 bg-emerald-500/10 dark:bg-emerald-500/15 rounded-md border border-emerald-500/10 whitespace-nowrap">年繳 NT$ 53460 (立減 50%)</span>
                              </>
                            ) : (
                              <>
                                <span className="font-extrabold text-sm text-fuchsia-650 dark:text-fuchsia-455">NT$ 8910</span>
                                <span className="text-zinc-500 text-[10px]"> / 月 (按月計費)</span>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '月度 Co幣額度' : 'Monthly CoCoins Limit'}</td>
                        <td className="p-4 text-center text-zinc-650 bg-zinc-500/5">{isZh ? '300 Co幣' : '300 CoCoins'}</td>
                        <td className="p-4 text-center font-semibold text-indigo-650 dark:text-indigo-400 bg-indigo-500/5">{isZh ? '1500 Co幣' : '1500 CoCoins'}</td>
                        <td className="p-4 text-center font-semibold text-teal-650 dark:text-teal-400 bg-teal-500/5">{isZh ? '3000 Co幣' : '3000 CoCoins'}</td>
                        <td className="p-4 text-center font-bold text-blue-650 dark:text-blue-400 bg-blue-500/5">{isZh ? '4500 Co幣' : '4500 CoCoins'}</td>
                        <td className="p-4 text-center font-bold text-violet-650 dark:text-violet-400 bg-violet-500/5">{isZh ? '6500 Co幣' : '6500 CoCoins'}</td>
                        <td className="p-4 text-center font-extrabold text-amber-605 dark:text-amber-400 bg-amber-500/5">{isZh ? '9000 Co幣' : '9000 CoCoins'}</td>
                        <td className="p-4 text-center font-black text-rose-650 dark:text-rose-450 bg-rose-500/5">{isZh ? '12000 Co幣' : '12000 CoCoins'}</td>
                        <td className="p-4 text-center font-black text-fuchsia-650 dark:text-fuchsia-450 bg-fuchsia-500/5">
                          <div className="flex items-center justify-center gap-1">
                            <InfinityIcon size={14} className="text-fuchsia-500 inline shrink-0 animate-pulse font-bold" />
                            <span>{isZh ? '量子級純無限 Co幣' : 'Quantum Unlimited'}</span>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '回應速度地位' : 'Response Priority status'}</td>
                        <td className="p-4 text-center text-zinc-500 bg-zinc-500/5">{isZh ? '標準優先度' : 'Standard'}</td>
                        <td className="p-4 text-center text-zinc-600 dark:text-zinc-400 bg-indigo-500/5">{isZh ? '標準優先度' : 'Standard'}</td>
                        <td className="p-4 text-center text-teal-600 dark:text-teal-400 bg-teal-500/5">{isZh ? '中等優先度' : 'Medium Priority'}</td>
                        <td className="p-4 text-center font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/5">{isZh ? '高級優先調度' : 'High Priority'}</td>
                        <td className="p-4 text-center font-semibold text-violet-600 dark:text-violet-400 bg-violet-500/5">{isZh ? '卓越進階調度 & 快速通道' : 'Premier Dispatch & Fast-Track'}</td>
                        <td className="p-4 text-center font-bold text-amber-650 dark:text-amber-400 bg-amber-500/5">{isZh ? '最優限度 & 獨享算力' : 'Top Priority & Dedicated'}</td>
                        <td className="p-4 text-center font-extrabold text-rose-655 dark:text-rose-400 bg-rose-500/5">{isZh ? '尊爵皇家即時調度' : 'Royal Instant Dispatch'}</td>
                        <td className="p-4 text-center font-black text-fuchsia-655 dark:text-fuchsia-400 bg-fuchsia-500/5 animate-pulse">{isZh ? '🌌 毫微秒級量子專道' : '🌌 Ultra-low Quantum Lane'}</td>
                      </tr>
 
                      {/* Section 2: AI 智能核心 */}
                      <tr className="bg-zinc-100/30 dark:bg-zinc-900/30">
                        <td colSpan={9} className="p-3 font-bold text-zinc-800 dark:text-zinc-200 tracking-wide text-[11px] uppercase">
                          {isZh ? '🧠 智能核心與大模型對話 (AI Core Models)' : '🧠 AI Core Models & Chat Platforms'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '基礎 AI 聊天與智能搜尋' : 'Basic AI Chat & Intelligent Search'}</td>
                        <td className="p-4 text-center bg-zinc-500/5"><Check className="inline-block text-zinc-500" size={16} /></td>
                        <td className="p-4 text-center bg-indigo-500/5"><Check className="inline-block text-indigo-500" size={16} /></td>
                        <td className="p-4 text-center bg-teal-500/5"><Check className="inline-block text-teal-500" size={16} /></td>
                        <td className="p-4 text-center bg-blue-500/5"><Check className="inline-block text-blue-500" size={16} /></td>
                        <td className="p-4 text-center bg-violet-500/5"><Check className="inline-block text-violet-500" size={16} /></td>
                        <td className="p-4 text-center bg-amber-500/5"><Check className="inline-block text-amber-500" size={16} /></td>
                        <td className="p-4 text-center bg-rose-500/5"><Check className="inline-block text-rose-500" size={16} /></td>
                        <td className="p-4 text-center bg-fuchsia-500/5"><Check className="inline-block text-fuchsia-500 animate-pulse" size={16} /></td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? 'Gemini 3.1 Pro 進階推理' : 'Gemini 3.1 Pro Advanced Reasoning'}</td>
                        <td className="p-4 text-center text-zinc-400 bg-zinc-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-indigo-500/5">❌</td>
                        <td className="p-4 text-center text-teal-600 dark:text-teal-400 bg-teal-500/5">❌</td>
                        <td className="p-4 text-center text-blue-550 font-semibold bg-blue-500/5">{isZh ? '包含 (專屬模型)' : 'Included (Specialized)'}</td>
                        <td className="p-4 text-center text-violet-550 font-semibold bg-violet-500/5">{isZh ? '包含 (專屬高算力)' : 'Included (High Compute)'}</td>
                        <td className="p-4 text-center text-amber-550 font-bold bg-amber-500/5">{isZh ? '包含 (最速回應)' : 'Included (Top Speed)'}</td>
                        <td className="p-4 text-center text-rose-550 font-extrabold bg-rose-500/5">{isZh ? '包含 (極速無限)' : 'Included (Ultra Unlimited)'}</td>
                        <td className="p-4 text-center text-fuchsia-550 font-black bg-fuchsia-500/5 animate-pulse">{isZh ? '包含 (至尊量子推理)' : 'Included (Quantum Speed)'}</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? 'Gemini Live 即時語音' : 'Gemini Live Real-time Voice'}</td>
                        <td className="p-4 text-center text-zinc-400 bg-zinc-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-indigo-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-teal-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-blue-500/5">❌</td>
                        <td className="p-4 text-center text-violet-600 font-bold bg-violet-500/5">
                          <Check className="inline-block text-violet-500 mr-1" size={14} /> {isZh ? '包含 (極高速)' : 'Included (Ultra Fast)'}
                        </td>
                        <td className="p-4 text-center text-amber-600 font-bold bg-amber-500/5">
                          <Check className="inline-block text-amber-500 mr-1" size={14} /> {isZh ? '包含' : 'Included'}
                        </td>
                        <td className="p-4 text-center text-rose-600 font-extrabold bg-rose-500/5">
                          <Check className="inline-block text-rose-500 mr-1 animate-pulse" size={14} /> {isZh ? '包含 (無限暢聊)' : 'Included (Unlimited)'}
                        </td>
                        <td className="p-4 text-center text-fuchsia-600 font-black bg-fuchsia-500/5 animate-pulse">
                          <Check className="inline-block text-fuchsia-500 mr-1" size={14} /> {isZh ? '包含 (全時尊爵對談)' : 'Included (24/7 Royal)'}
                        </td>
                      </tr>
 
                      {/* Section 3: 多媒體創作 */}
                      <tr className="bg-zinc-100/30 dark:bg-zinc-900/30">
                        <td colSpan={9} className="p-3 font-bold text-zinc-800 dark:text-zinc-200 tracking-wide text-[11px] uppercase">
                          {isZh ? '🎨 多媒體創作與進階分析 (Creative Engine)' : '🎨 Creative Engine & Media Analysis'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '語音轉文字' : 'Speech to Text (Transcribe)'}</td>
                        <td className="p-4 text-center bg-zinc-500/5"><Check className="inline-block text-zinc-500" size={16} /></td>
                        <td className="p-4 text-center bg-indigo-500/5"><Check className="inline-block text-indigo-500" size={16} /></td>
                        <td className="p-4 text-center bg-teal-500/5"><Check className="inline-block text-teal-500" size={16} /></td>
                        <td className="p-4 text-center bg-blue-500/5"><Check className="inline-block text-blue-500" size={16} /></td>
                        <td className="p-4 text-center bg-violet-500/5"><Check className="inline-block text-violet-500" size={16} /></td>
                        <td className="p-4 text-center bg-amber-500/5"><Check className="inline-block text-amber-500" size={16} /></td>
                        <td className="p-4 text-center bg-rose-500/5"><Check className="inline-block text-rose-550" size={16} /></td>
                        <td className="p-4 text-center bg-fuchsia-500/5"><Check className="inline-block text-fuchsia-550 animate-pulse" size={16} /></td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '文字轉語音 (高擬真合成)' : 'Text to Speech (Pro Synthesis)'}</td>
                        <td className="p-4 text-center text-zinc-400 bg-zinc-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-indigo-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-teal-500/5">❌</td>
                        <td className="p-4 text-center text-blue-500 bg-blue-500/5"><Check className="inline-block text-blue-500" size={16} /></td>
                        <td className="p-4 text-center text-violet-500 bg-violet-500/5"><Check className="inline-block text-violet-500" size={16} /></td>
                        <td className="p-4 text-center text-amber-500 bg-amber-500/5"><Check className="inline-block text-amber-500" size={16} /></td>
                        <td className="p-4 text-center text-rose-500 bg-rose-500/5 font-bold"><Check className="inline-block text-rose-600 animate-pulse" size={16} /> {isZh ? '全無限制' : 'Unlimited'}</td>
                        <td className="p-4 text-center text-fuchsia-500 bg-fuchsia-500/5 font-black"><Check className="inline-block text-fuchsia-600 animate-pulse" size={16} /> {isZh ? '究極全域合成' : 'Ultimate Global Synthesizer'}</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? 'Imagen 圖片生成與分析' : 'Imagen Image Generation & Analysis'}</td>
                        <td className="p-4 text-center text-zinc-400 bg-zinc-500/5">❌</td>
                        <td className="p-4 text-center text-indigo-620 bg-indigo-500/5">{isZh ? '限額 (中等頻率)' : 'Limited (Medium)'}</td>
                        <td className="p-4 text-center text-teal-600 dark:text-teal-400 bg-teal-500/5">{isZh ? '中高頻率生成與分析' : 'Medium-high quota generation & analysis'}</td>
                        <td className="p-4 text-center text-blue-500 bg-blue-500/5"><Check className="inline-block text-blue-500" size={16} /></td>
                        <td className="p-4 text-center text-violet-500 bg-violet-500/5"><Check className="inline-block text-violet-500" size={16} /></td>
                        <td className="p-4 text-center text-amber-500 bg-amber-500/5"><Check className="inline-block text-amber-500" size={16} /></td>
                        <td className="p-4 text-center text-rose-500 bg-rose-500/5 font-extrabold"><Check className="inline-block text-rose-600 animate-pulse" size={16} /> {isZh ? '極速無限' : 'Instant & Unlimited'}</td>
                        <td className="p-4 text-center text-fuchsia-500 bg-fuchsia-500/5 font-black"><Check className="inline-block text-fuchsia-600 animate-pulse" size={16} /> {isZh ? '秒級超導無限' : 'Sub-second Quantum Unlimited'}</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? 'Veo 影片與圖片動畫生成' : 'Veo Video & Motion Generation'}</td>
                        <td className="p-4 text-center text-zinc-400 bg-zinc-500/5">❌</td>
                        <td className="p-4 text-center text-indigo-600 bg-indigo-500/5">{isZh ? '1 次/期' : '1x / billing cycle'}</td>
                        <td className="p-4 text-center text-teal-600 bg-teal-500/5">{isZh ? '2 次/期' : '2x / billing cycle'}</td>
                        <td className="p-4 text-center text-blue-620 bg-blue-500/5"><Check className="inline-block text-blue-500" size={16} /> {isZh ? '優先級' : 'High Priority'}</td>
                        <td className="p-4 text-center text-violet-620 bg-violet-500/5">{isZh ? '5 次/期' : '5x / billing cycle'}</td>
                        <td className="p-4 text-center text-amber-600 font-bold bg-amber-500/5">
                          <Check className="inline-block text-amber-500 mr-1" size={14} /> {isZh ? '最高優先 & 無極限' : 'Max Priority & Unlimited'}
                        </td>
                        <td className="p-4 text-center text-rose-600 font-extrabold bg-rose-500/5">
                          <Check className="inline-block text-rose-500 mr-1 animate-pulse" size={14} /> {isZh ? '8 次/期' : '8x / billing cycle'}
                        </td>
                        <td className="p-4 text-center text-fuchsia-600 font-black bg-fuchsia-500/5 animate-pulse">
                          <Check className="inline-block text-fuchsia-500 mr-1" size={14} /> {isZh ? '全能超級影創 & 無限' : 'Almighty Video & Unlimited'}
                        </td>
                      </tr>
 
                      {/* Section 4: 智能代理與支援 */}
                      <tr className="bg-zinc-100/30 dark:bg-zinc-900/30">
                        <td colSpan={9} className="p-3 font-bold text-zinc-800 dark:text-zinc-200 tracking-wide text-[11px] uppercase">
                          {isZh ? '⚙️ 智能代理任務與支援服務 (Agentic & Support)' : '⚙️ Autonomous Agents & Support Services'}
                        </td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '解鎖智能助理任務代理' : 'Autonomous Agentic Tasks'}</td>
                        <td className="p-4 text-center text-zinc-400 bg-zinc-500/5">❌</td>
                        <td className="p-4 text-center text-indigo-600 bg-indigo-500/5">{isZh ? '解鎖部分基礎代理' : 'Partial basic agents'}</td>
                        <td className="p-4 text-center text-teal-600 bg-teal-500/5">{isZh ? '解鎖多數進階代理' : 'Most advanced agents'}</td>
                        <td className="p-4 text-center text-blue-500 bg-blue-550/5"><Check className="inline-block text-blue-500" size={16} /> {isZh ? '全功能' : 'All Features'}</td>
                        <td className="p-4 text-center text-violet-500 bg-violet-550/5"><Check className="inline-block text-violet-500" size={16} /> {isZh ? '旗艦進階代理' : 'Flagship advanced agents'}</td>
                        <td className="p-4 text-center text-amber-500 bg-amber-500/5"><Check className="inline-block text-amber-500" size={16} /> {isZh ? '旗艦全功能' : 'Flagship all features'}</td>
                        <td className="p-4 text-center text-rose-500 bg-rose-500/5"><Check className="inline-block text-rose-600 animate-pulse" size={16} /> {isZh ? '頂規 AGI 自動代理' : 'Ultimate AGI auto-agents'}</td>
                        <td className="p-4 text-center text-fuchsia-100 bg-fuchsia-500/5"><Check className="inline-block text-fuchsia-600 animate-pulse" size={16} /> {isZh ? '星星級自動無限調試' : 'Star-grade auto-unlimited'}</td>
                      </tr>
                      <tr>
                        <td className="p-4 font-semibold text-zinc-800 dark:text-zinc-200">{isZh ? '新功能搶先體驗 / 尊榮服務' : 'Beta Features & Royal Support'}</td>
                        <td className="p-4 text-center text-zinc-400 bg-zinc-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-indigo-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-teal-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-blue-500/5">❌</td>
                        <td className="p-4 text-center text-zinc-400 bg-violet-500/5">❌</td>
                        <td className="p-4 text-center text-amber-500 bg-amber-500/5"><Check className="inline-block text-amber-500" size={16} /></td>
                        <td className="p-4 text-center text-rose-600 font-extrabold bg-rose-500/5">
                          {isZh ? '👑 專屬 1對1 / 內測首發' : '👑 Dedicated 1-on-1 / Beta Access'}
                        </td>
                        <td className="p-4 text-center text-fuchsia-600 font-black bg-fuchsia-500/5 animate-pulse">
                          {isZh ? '🪐 全球高階專家熱線 / 科科學家熱線' : '🪐 Global Expert Hotlines / Researchers'}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              </>
              )}

              {activeCategory === 'enterprise' && (
                <div className="flex flex-col items-center justify-center py-12 px-4 max-w-4xl mx-auto text-center">
                  <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 flex items-center justify-center mb-6 border border-indigo-500/20 shadow-inner">
                    <Briefcase className="text-indigo-605 dark:text-indigo-400" size={32} />
                  </div>
                  
                  <h3 className="text-2xl font-sans font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    {isZh ? '專屬企業與團隊客製解決方案' : 'Tailored Solutions for Enterprise & Teams'}
                  </h3>
                  
                  <p className="text-zinc-500 dark:text-zinc-400 mt-3 text-sm max-w-xl leading-relaxed">
                    {isZh 
                      ? '針對大規模部署、高算力需求與企業級隱私安全。我們不提供預設的固定套餐，而是由專業顧問與您直接聯繫，共同討論並量身定制最符合您組織目標的協作與系統算力方案。'
                      : 'Designed specifically for large-scale deployments, custom high-performance computational bandwidth, and strict enterprise grade privacy. Instead of showcasing standard packages, our expert consultants will contact you directly to formulate a solution perfectly fitted to your organizational requirements.'
                    }
                  </p>

                  <div className="mt-8 p-6 bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-200/50 dark:border-zinc-800/40 rounded-3xl w-full max-w-lg select-none">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3.5 text-left">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-550 shrink-0 mt-0.5">
                          <Check size={14} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{isZh ? '無限頂級算力調度' : 'Unlimited Apex Compute Bandwidth'}</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{isZh ? '獨占專屬的高優先級 GPU 伺服器通道，提供亞秒級極致回應' : 'Dedicated high-priority private GPU pipelines for sub-second responses.'}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 text-left">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-550 shrink-0 mt-0.5">
                          <Check size={14} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{isZh ? '企業級安全合規保障' : 'Enterprise Grade Security & Compliance'}</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{isZh ? '支援 SSO 單一登入、客製化資料不留存隱私協議與專屬沙盒' : 'SSO single-sign-on integration, zero data retention privacy policy, and developer sandboxes.'}</p>
                        </div>
                      </div>

                      <div className="flex items-start gap-3.5 text-left">
                        <div className="p-1.5 bg-indigo-500/10 rounded-lg text-indigo-550 shrink-0 mt-0.5">
                          <Check size={14} />
                        </div>
                        <div>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100">{isZh ? '1對1 尊崇技術顧問與整合專家支援' : '1-on-1 Dedicated Technical Solutions Expert'}</h4>
                          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">{isZh ? '全天候專屬熱線、API 定制對接與新模塊整合諮詢' : '24/7 priority line, custom API integrations, and prompt engineering support.'}</p>
                        </div>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => alert(isZh ? '感謝您的諮詢！我們的企業解決方案團隊將在 24 小時內與您聯繫。' : 'Thank you for your inquiry! Our Enterprise Solutions team will contact you within 24 hours.')}
                      className="mt-8 w-full py-3 bg-indigo-605 hover:bg-indigo-750 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-500/10 cursor-pointer hover:scale-[1.01]"
                    >
                      {isZh ? '立即聯絡企業專員，獲取客製化報價' : 'Contact Enterprise Specialist for Custom Quote'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
