import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Check, X, Sparkles, Zap, Award, Crown, HelpCircle, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useSubscription } from '../contexts/SubscriptionContext';

interface SubscriptionComparisonProps {
  onSelectPlan?: (planName: string) => void;
  currentPlan?: string;
}

export default function SubscriptionComparison({ onSelectPlan, currentPlan = 'Free' }: SubscriptionComparisonProps) {
  const { t } = useTranslation();
  const { startTrial, cancelTrial, isTrialActive, trialTier } = useSubscription();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  // Focus only on the requested five tiers
  const compareTiers = [
    {
      id: 'Free',
      name: 'Basic / Free',
      description: '適合日常輕量體驗與基礎練習',
      priceMonthly: 0,
      priceYearly: 0,
      icon: <Sparkles className="text-zinc-400" size={20} />,
      color: 'zinc',
      badge: '體驗方案',
      themeClass: 'from-zinc-500/5 to-zinc-500/10 dark:from-zinc-500/10 dark:to-zinc-500/20 border-zinc-200 dark:border-zinc-800',
      textAccent: 'text-zinc-600 dark:text-zinc-400',
      bgAccent: 'bg-zinc-100 dark:bg-zinc-800'
    },
    {
      id: 'Pro',
      name: 'Pro',
      description: '創作者與進階應用的首選核心方案',
      priceMonthly: 650,
      priceYearly: 325,
      icon: <Zap className="text-blue-500 animate-pulse" size={20} />,
      color: 'blue',
      badge: '最受歡迎 (Most Popular)',
      themeClass: 'from-blue-500/5 to-blue-500/10 dark:from-blue-500/10 dark:to-blue-500/20 border-blue-200 dark:border-blue-800',
      textAccent: 'text-blue-600 dark:text-blue-400 text-shadow-sm',
      bgAccent: 'bg-blue-100/80 dark:bg-blue-950/40'
    },
    {
      id: 'One',
      name: 'CoLab One',
      description: '全新平衡方案，兼具強大算力與極致性價比',
      priceMonthly: 1280,
      priceYearly: 640,
      icon: <Sparkles className="text-indigo-505 animate-pulse" size={20} />,
      color: 'indigo',
      badge: '強平衡方案 (Balanced Choice)',
      themeClass: 'from-indigo-500/5 to-indigo-500/10 dark:from-indigo-500/10 dark:to-indigo-500/20 border-indigo-200 dark:border-indigo-800',
      textAccent: 'text-indigo-600 dark:text-indigo-400 text-shadow-sm',
      bgAccent: 'bg-indigo-100/80 dark:bg-indigo-950/40'
    },
    {
      id: 'Advanced',
      name: 'Advanced',
      description: '全面解鎖頂規超長文本與多媒體模型力',
      priceMonthly: 1970,
      priceYearly: 985,
      icon: <Award className="text-violet-500" size={20} />,
      color: 'violet',
      badge: '專業創作者',
      themeClass: 'from-violet-500/5 to-violet-500/10 dark:from-violet-500/10 dark:to-violet-500/20 border-violet-200 dark:border-violet-800',
      textAccent: 'text-violet-600 dark:text-violet-400',
      bgAccent: 'bg-violet-100/80 dark:bg-violet-950/40'
    },
    {
      id: 'Ultra',
      name: 'Ultra',
      description: '至極旗艦無限算力，搶先部署未來技術',
      priceMonthly: 3290,
      priceYearly: 1645,
      icon: <Crown className="text-amber-500" size={20} />,
      color: 'amber',
      badge: '旗艦頂級',
      themeClass: 'from-amber-500/5 to-amber-500/10 dark:from-amber-500/10 dark:to-amber-500/20 border-amber-200 dark:border-amber-800',
      textAccent: 'text-amber-600 dark:text-amber-400',
      bgAccent: 'bg-amber-100/80 dark:bg-amber-950/40'
    }
  ];

  const categories = [
    {
      title: '⚡ 額度資費與算力調度 (Usage & Compute)',
      features: [
        {
          name: '月度 Co幣額度',
          desc: '每期配發的核心功能點數消耗額度',
          values: {
            Free: '300 Co幣',
            Pro: '4500 Co幣',
            One: '5500 Co幣',
            Advanced: '6500 Co幣',
            Ultra: '9000 Co幣'
          }
        },
        {
          name: '算力調度優先度',
          desc: '在高峰期間，系統為您的生成任務排定的調度優先順序',
          values: {
            Free: '標準排序速度',
            Pro: '優先回應調度',
            One: '中高優先調度',
            Advanced: '進階調度 & 快速通道',
            Ultra: '最優排序 & 獨享算力'
          }
        }
      ]
    },
    {
      title: '🧠 智能核心與模型對話 (AI Core Models)',
      features: [
        {
          name: 'Gemini 3.1 Flash / Lite',
          desc: '快如閃電的高效多模態主力對話模型',
          values: {
            Free: '包含 (每日限制)',
            Pro: '✅ 暢享高頻存取',
            One: '✅ 暢享高頻存取',
            Advanced: '✅ 雙倍並行處理',
            Ultra: '✅ 最速無限次數配額'
          }
        },
        {
          name: 'Gemini 3.1 Pro 進階推理',
          desc: '精準處理數百萬字脈絡，解答世界級程式碼、數學邏輯、跨領域深度分析',
          values: {
            Free: '❌ 不支援',
            Pro: '✅ 包含 (標準調度)',
            One: '✅ 包含 (標準調度)',
            Advanced: '✅ 包含 (超大脈絡區塊)',
            Ultra: '✅ 全功能 (無限存取)'
          }
        },
        {
          name: 'Gemini Live 即時語音',
          desc: '與高算力雲端核心進行全擬真雙向交互對談',
          values: {
            Free: '❌ 僅限試用',
            Pro: '❌ 僅限試用',
            One: '✅ 包含 (1 次即時對談)',
            Advanced: '✅ 包含 (2 次即時對談)',
            Ultra: '✅ 包含 (無任何限制)'
          }
        }
      ]
    },
    {
      title: '🎨 多媒體創作與進階分析 (Creative Engine)',
      features: [
        {
          name: '圖片生成與多重分析',
          desc: '使用高解析 Imagen 3 引擎渲染大師級 8K 圖片、物件風格修改、草稿渲染、多模態識圖',
          values: {
            Free: '限額 (低頻率)',
            Pro: '✅ 包含 (標準生成)',
            One: '✅ 包含 (標準生成)',
            Advanced: '✅ 包含 ( Imagen 3 極速生圖 )',
            Ultra: '✅ 包含 (全時尊爵對談)'
          }
        },
        {
          name: '極速影片生成額度 (Veo)',
          desc: '使用頂尖 Google Veo 3.1 動態影像生成引擎，支援多格率、文字與圖片指令生短影片',
          values: {
            Free: '❌ 不支援',
            Pro: '✅ 每期 6 次極速生成',
            One: '✅ 每期 2 次極速生成',
            Advanced: '✅ 每期 4 次極速生成',
            Ultra: '✅ 每期 10 次以上 + 搶先內測'
          }
        },
        {
          name: '多模態影片分析分析功能',
          desc: '自動抽取影片關鍵幀、分析剪輯腳本與語意摘要能力',
          values: {
            Free: '❌ 不支援',
            Pro: '❌ 不支援',
            One: '✅ 每期 1 次分析額度',
            Advanced: '✅ 每期 3 次分析額度',
            Ultra: '✅ 包含 (全無限制)'
          }
        }
      ]
    },
    {
      title: '⚙️ 智能代理與支援服務 (Agentic & Support)',
      features: [
        {
          name: '智能助理任務代理 (AGI Agent)',
          desc: '自主規劃多步驟程式開發、多維度主題整合爬蟲、資訊彙整與自動化任務部署',
          values: {
            Free: '❌ 僅基本助理',
            Pro: '✅ 除錯與基本流程部署',
            One: '✅ 進階決策與自動除錯',
            Advanced: '✅ 支援複雜進階代理任務',
            Ultra: '✅ 頂規 AGI 跨功能自主代理'
          }
        },
        {
          name: '專屬 1對1 熱線與尊榮特權',
          desc: '享有獨立的高階專家排隊線路與內測版本功能搶先體驗特權',
          values: {
            Free: '❌ 自助社群問答',
            Pro: '❌ 標準電子郵件服務',
            One: '❌ 標準電子郵件服務',
            Advanced: '✅ 高級客服優先管道',
            Ultra: '👑 頂端尊爵 1 對 1 與搶先測試'
          }
        }
      ]
    }
  ];

  const advancedCategory = {
    title: '🔑 進階開發與 API 串接 (Advanced API Access)',
    features: [
      {
        name: '專屬 API 服務金鑰',
        desc: '允許自訂應用、外部伺服器或本機指令碼直接存取核心 AGI 算力通道',
        values: {
          Free: '❌ 不支援',
          Pro: '✅ 包含 (每月限制 1000 次)',
          One: '✅ 包含 (每月限制 3000 次)',
          Advanced: '✅ 包含 (每月限制 10000 次)',
          Ultra: '✅ 全功能 (無限存取 & 最高優先極速頻道)'
        }
      },
      {
        name: '自訂 Webhooks 整合',
        desc: '觸發非同步多模態處理，完成時可自動通知自訂伺服器端點進行工作流串聯',
        values: {
          Free: '❌ 不支援',
          Pro: '❌ 不支援',
          One: '✅ 可自訂 1 組端點',
          Advanced: '✅ 可自訂 3 組端點',
          Ultra: '✅ 全功能 (最多可設置 50 組端點)'
        }
      },
      {
        name: '跨來源資源共用 (CORS) & 安全代理',
        desc: '設定專屬信任網域頭欄，提升本機瀏覽器跨網域安全請求能級與代理防護',
        values: {
          Free: '❌ 不支援',
          Pro: '❌ 不支援',
          One: '❌ 不支援',
          Advanced: '❌ 不支援',
          Ultra: '✅ 包含 (全無限制 & 金鑰輪滾防護)'
        }
      }
    ]
  };

  const allCategories = isExpanded ? [...categories, advancedCategory] : categories;

  return (
    <div className="w-full flex flex-col gap-8 select-none">
      {/* Title Header with Modern Editorial Aesthetic */}
      <div className="text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight dark:text-zinc-100 flex items-center justify-center gap-2">
          <span>{t('components.comparison.title', '訂閱方案權益對比')}</span>
        </h2>
        <p className="text-zinc-500 text-sm mt-2 leading-relaxed dark:text-zinc-400">
          {t('components.comparison.subtitle', '全透明功能矩陣：快速看懂 Free、Pro、Advanced、Ultra 方案的專屬優勢與算力定位，選擇最合適您的創意引擎。')}
        </p>
      </div>

      {/* Elegant Billing Cycles Selector */}
      <div className="flex justify-center mb-4">
        <div className="inline-flex items-center p-1.5 bg-zinc-100 dark:bg-zinc-900/60 rounded-2xl border border-zinc-200/40 dark:border-zinc-800/40 shadow-xs relative">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
              billingCycle === 'monthly'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            按月計費
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-5 py-2 rounded-xl text-xs font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
              billingCycle === 'yearly'
                ? 'bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-xs'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300'
            }`}
          >
            <span>按年繳費</span>
            <span className="flex items-center justify-center px-1.5 py-0.2 text-[9px] font-black text-rose-500 dark:text-rose-450 bg-rose-50 dark:bg-rose-950/40 rounded-md border border-rose-100 dark:border-rose-900/30">
              50% OFF
            </span>
          </button>
        </div>
      </div>

      {/* Responsive Comparison Container */}
      <div className="w-full relative overflow-x-auto select-text border border-zinc-200/45 dark:border-zinc-800/40 rounded-3xl bg-white/40 dark:bg-zinc-950/10 backdrop-blur-md shadow-sm">
        <table className="w-full text-left border-collapse table-fixed min-w-[800px]">
          {/* Header Row */}
          <thead>
            <tr className="border-b border-zinc-250/20 dark:border-zinc-800/30 bg-zinc-50/50 dark:bg-zinc-900/10">
              {/* Features Label Column Header */}
              <th className="p-6 text-xs font-bold text-zinc-500 dark:text-zinc-400 w-[240px]">
                功能與權益指標
              </th>

              {/* Tiers Column Headers */}
              {compareTiers.map((plan, index) => {
                const isSelected = currentPlan.toLowerCase() === plan.id.toLowerCase();
                const isHovered = hoveredColumn === plan.id;
                
                return (
                  <th
                    key={plan.id}
                    onMouseEnter={() => setHoveredColumn(plan.id)}
                    onMouseLeave={() => setHoveredColumn(null)}
                    className={`p-6 text-center transition-all duration-300 relative ${
                      plan.id === 'Pro' 
                        ? 'bg-blue-500/5 dark:bg-blue-500/10 border-x border-t border-blue-500/30 dark:border-blue-500/40 neural-card-pulse' 
                        : plan.id === 'One' ? 'bg-indigo-500/2 border-x border-t border-indigo-500/10 dark:border-indigo-500/20' 
                        : plan.id === 'Advanced' ? 'bg-violet-500/2' 
                        : plan.id === 'Ultra' ? 'bg-amber-500/0.5' 
                        : 'bg-transparent'
                    } ${isHovered ? 'scale-[1.01] bg-zinc-100/10 dark:bg-zinc-800/5 shadow-xs' : ''}`}
                  >
                    <motion.div 
                      initial={{ opacity: 0, y: 15 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.55, delay: index * 0.12, ease: [0.16, 1, 0.3, 1] }}
                      className="flex flex-col items-center gap-1.5 py-2"
                    >
                      {plan.id === 'Pro' ? (
                        <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full select-none font-sans bg-gradient-to-r from-blue-600 to-indigo-600 text-white border border-blue-500 shadow-md animate-pulse">
                          🔥 {plan.badge}
                        </span>
                      ) : (
                        <span className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full select-none font-sans bg-zinc-100/80 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                          {plan.badge}
                        </span>
                      )}

                      {(plan.id === 'Free' || plan.id === 'Pro' || plan.id === 'One') && (
                        <span className="text-[9px] font-sans font-black tracking-wide uppercase px-2 py-0.5 rounded-md bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 border border-indigo-500/15 dark:border-indigo-500/25 shadow-xs select-none">
                          ✨ 7-Day Free Trial
                        </span>
                      )}
                      
                      <div className="flex items-center gap-1.5 mt-1">
                        {plan.icon}
                        <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100 font-sans">
                          {plan.name}
                        </span>
                      </div>

                      <div className="flex items-baseline gap-0.5 mt-2">
                        <span className="text-lg font-extrabold text-zinc-900 dark:text-zinc-100 font-sans">
                          {billingCycle === 'yearly' ? `NT$ ${plan.priceYearly}` : plan.priceMonthly === 0 ? '$0' : `NT$ ${plan.priceMonthly}`}
                        </span>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400">/ 月</span>
                      </div>

                      {billingCycle === 'yearly' && plan.priceMonthly > 0 && (
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-450 mt-1.5 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/45 rounded-md border border-emerald-100/50 dark:border-emerald-900/30 whitespace-nowrap">
                          年繳共 NT$ {plan.priceYearly * 12} (立省 50%)
                        </span>
                      )}

                      <p className="text-[10px] text-zinc-400 dark:text-zinc-400 mt-2 font-normal max-w-[130px] leading-tight text-center">
                        {plan.description}
                      </p>

                       <button
                        onClick={() => {
                          if (plan.id === 'Free') {
                            cancelTrial();
                            onSelectPlan?.('Free');
                          } else {
                            startTrial(plan.id as any);
                            onSelectPlan?.(plan.id);
                          }
                        }}
                        className={`w-full mt-4 py-2 text-[11px] font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1 cursor-pointer select-none active:scale-[0.98] ${
                          plan.id === 'Free'
                            ? 'bg-zinc-100 hover:bg-zinc-200/80 text-zinc-700 dark:bg-zinc-900 dark:hover:bg-zinc-850 dark:text-zinc-300'
                            : plan.id === 'Pro'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white dark:bg-blue-500 dark:hover:bg-blue-400'
                            : plan.id === 'One'
                            ? 'bg-indigo-600 hover:bg-indigo-500 text-white dark:bg-indigo-500 dark:hover:bg-indigo-400'
                            : plan.id === 'Advanced'
                            ? 'bg-violet-600 hover:bg-violet-500 text-white dark:bg-violet-500 dark:hover:bg-violet-400'
                            : 'bg-amber-500 hover:bg-amber-400 text-zinc-900'
                        }`}
                      >
                        {isSelected 
                          ? (isTrialActive && trialTier === plan.id ? '試用中 (剩餘 7 天)' : '您目前方案') 
                          : plan.id === 'Free' 
                            ? '使用此方案' 
                            : '開始 7 天免費試用'}
                      </button>
                    </motion.div>
                  </th>
                );
              })}
            </tr>
          </thead>

          {/* Comparison Body */}
          <tbody className="divide-y divide-zinc-200/30 dark:divide-zinc-800/30 text-xs font-sans">
            {allCategories.map((category, catIdx) => (
              <React.Fragment key={catIdx}>
                {/* Category Separator Header */}
                <tr className="bg-zinc-50/50 dark:bg-zinc-900/15">
                  <td
                    colSpan={6}
                    className="p-4 font-bold text-zinc-900 dark:text-zinc-150 tracking-wide text-[11px] uppercase border-y border-zinc-200/30 dark:border-zinc-850/30"
                  >
                    {category.title}
                  </td>
                </tr>

                {/* Features within Category */}
                {category.features.map((feature, featIdx) => (
                  <tr
                    key={featIdx}
                    className="hover:bg-zinc-50/20 dark:hover:bg-zinc-850/5 transition-colors group"
                  >
                    {/* Feature Information Details */}
                    <td className="p-4 align-top border-r border-zinc-200/10 dark:border-zinc-850/20">
                      <div className="flex flex-col gap-0.5 max-w-[200px]">
                        <span className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {feature.name}
                        </span>
                        <span className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-normal font-light">
                          {feature.desc}
                        </span>
                      </div>
                    </td>

                    {/* Values per Tier Columns */}
                    {compareTiers.map((plan) => {
                      const value = feature.values[plan.id as keyof typeof feature.values];
                      const isHovered = hoveredColumn === plan.id;
                      const isUnSupported = value.includes('❌');
                      const isSuccess = value.includes('✅') || value.includes('👑');

                      return (
                        <td
                          key={plan.id}
                          className={`p-4 text-center align-middle transition-all duration-300 font-medium ${
                            plan.id === 'Pro' 
                              ? 'bg-blue-500/5 dark:bg-blue-500/10 border-x border-blue-500/15 dark:border-blue-500/25' 
                              : plan.id === 'One' ? 'bg-indigo-500/2 border-x border-indigo-500/10 dark:border-indigo-500/15'
                              : plan.id === 'Advanced' ? 'bg-violet-500/2' 
                              : plan.id === 'Ultra' ? 'bg-amber-500/0.5' 
                              : 'bg-transparent'
                          } ${isHovered ? 'bg-zinc-50/30 dark:bg-zinc-800/10' : ''}`}
                        >
                          <div className="flex flex-col items-center justify-center gap-1.5">
                            {isUnSupported ? (
                              <div className="flex items-center gap-1 text-zinc-400 dark:text-zinc-650 opacity-60">
                                <X size={14} className="stroke-[2.5]" />
                                <span className="text-[11px] font-normal">{value.replace('❌', '').trim() || '未包含'}</span>
                              </div>
                            ) : isSuccess ? (
                              <div className={`flex items-center gap-1 justify-center ${
                                plan.id === 'Pro' ? 'text-blue-600 dark:text-blue-400' :
                                plan.id === 'One' ? 'text-indigo-600 dark:text-indigo-400' :
                                plan.id === 'Advanced' ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'
                              } font-bold`}>
                                <Check size={14} className="stroke-[3]" />
                                <span className="text-[11px]">{value.replace('✅', '').replace('👑', '').trim()}</span>
                              </div>
                            ) : (
                              <span className="text-zinc-700 dark:text-zinc-300 text-[11px] font-medium leading-relaxed">
                                {value}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* Compare All Button to Expand Advanced API Access details */}
      <div className="flex justify-center -mt-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-zinc-100 to-zinc-200/80 hover:from-zinc-200 hover:to-zinc-300 dark:from-zinc-900/90 dark:to-zinc-850/90 dark:hover:from-zinc-850/95 dark:hover:to-zinc-800/95 border border-zinc-200/60 dark:border-zinc-800/80 rounded-2xl text-[11px] font-extrabold text-zinc-700 dark:text-zinc-300 transition-all cursor-pointer shadow-xs select-none active:scale-[0.98] inline-flex items-center group"
        >
          <span>{isExpanded ? '收起 API 進階對比 (Show Less)' : '展開 API 進階對比 (Compare All Details)'}</span>
          {isExpanded ? (
            <ChevronUp size={14} className="text-zinc-500 group-hover:-translate-y-0.5 transition-transform" />
          ) : (
            <ChevronDown size={14} className="text-indigo-600 dark:text-indigo-400 group-hover:translate-y-0.5 transition-transform" />
          )}
        </button>
      </div>

      {/* Decorative High Quality Note Footer targeting conversion confidence without artificial log indicators */}
      <div className="rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200/40 dark:border-zinc-800/40 p-4 flex flex-col sm:flex-row items-center gap-3.5 max-w-3xl mx-auto mt-2">
        <HelpCircle className="text-zinc-400 shrink-0 select-none hidden sm:block" size={24} />
        <div className="text-center sm:text-left">
          <h4 className="text-xs font-bold text-zinc-800 dark:text-zinc-300">💡 關於算力配發與按年切換說明</h4>
          <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-light leading-normal mt-0.5">
            1. 所有計畫的 Co幣 額度皆會在每月帳期生效時自動重置更替。
            2. 年繳方案（50% 折扣已計入）在簽約時將一次性收取一整年度費用，月均成本立省一半，且算力分配保證卓越穩定。
          </p>
        </div>
      </div>
    </div>
  );
}
