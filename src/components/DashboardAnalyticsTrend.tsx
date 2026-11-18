import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { useHistory } from '../contexts/HistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';
import { 
  Activity, 
  TrendingUp, 
  Sparkles, 
  Layers, 
  HelpCircle, 
  Eye, 
  EyeOff, 
  Tv, 
  MessageSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  Lock
} from 'lucide-react';

interface DashboardAnalyticsTrendProps {
  onSelectFeature?: (id: any) => void;
}

const CATEGORY_COLORS = {
  'Text & Chat': '#6366f1', // Indigo
  'Image': '#ec4899',       // Pink
  'Video': '#f59e0b',       // Amber
  'Audio': '#10b981',       // Emerald
};

const CATEGORY_ICONS = {
  'Text & Chat': <MessageSquare size={14} className="text-indigo-500" />,
  'Image': <ImageIcon size={14} className="text-pink-500" />,
  'Video': <VideoIcon size={14} className="text-amber-500" />,
  'Audio': <MusicIcon size={14} className="text-emerald-500" />,
};

export const DashboardAnalyticsTrend: React.FC<DashboardAnalyticsTrendProps> = React.memo(({ onSelectFeature }) => {
  const { t } = useTranslation();
  const { history } = useHistory();
  const { currentUser, isAuthReady } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Auto clean-up local databases/cached storage once per unauthenticated session for privacy protection
  useEffect(() => {
    if (isAuthReady && !currentUser) {
      if (sessionStorage.getItem('colab_offline_cleaned') === '1') return;
      sessionStorage.setItem('colab_offline_cleaned', '1');
      try {
        if (window.indexedDB) {
          const deleteReq = window.indexedDB.deleteDatabase('CoLabOfflineDB');
          deleteReq.onsuccess = () => console.log('Automatically cleared local/offline chatHistory for privacy protection.');
        }
      } catch (err) {
        console.error('Failed to clear offline IndexedDB:', err);
      }
      localStorage.removeItem('colab_feature_usage_stats');
      localStorage.removeItem('colab_model_performance_metrics');
    } else if (currentUser) {
      sessionStorage.removeItem('colab_offline_cleaned');
    }
  }, [currentUser, isAuthReady]);

  // Parse history to compute 7 days trend data
  const chartData = useMemo(() => {
    // 1. Generate empty past 7 days
    const dates = [];
    const daysOfWeek = ['週日', '週一', '週二', '週三', '週四', '週五', '週六'];
    
    // Auto-clear & delete the current and historical trend curves if current user is unauthenticated
    const seedBaselines = currentUser ? {
      'Text & Chat': [12, 19, 15, 26, 32, 21, 15],
      'Image': [4, 8, 12, 6, 15, 9, 7],
      'Video': [2, 1, 5, 3, 8, 4, 2],
      'Audio': [3, 5, 2, 8, 6, 11, 4]
    } : {
      'Text & Chat': [0, 0, 0, 0, 0, 0, 0],
      'Image': [0, 0, 0, 0, 0, 0, 0],
      'Video': [0, 0, 0, 0, 0, 0, 0],
      'Audio': [0, 0, 0, 0, 0, 0, 0]
    };

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = `${d.getMonth() + 1}/${d.getDate()}`;
      const dayName = daysOfWeek[d.getDay()];
      
      dates.push({
        dateStr,
        dayName,
        fullDateString: d.toDateString(),
        'Text & Chat': seedBaselines['Text & Chat'][6 - i],
        'Image': seedBaselines['Image'][6 - i],
        'Video': seedBaselines['Video'][6 - i],
        'Audio': seedBaselines['Audio'][6 - i],
        userAdded: 0
      });
    }

    // 2. Map history items to dates and accumulate
    if (history && history.length > 0) {
      history.forEach(item => {
        if (!item.createdAt) return;
        
        let itemDate: Date;
        if (item.createdAt.toDate) {
          itemDate = item.createdAt.toDate();
        } else if (item.createdAt.seconds) {
          itemDate = new Date(item.createdAt.seconds * 1000);
        } else {
          itemDate = new Date(item.createdAt);
        }

        if (isNaN(itemDate.getTime())) return;
        
        const dateString = itemDate.toDateString();
        const matchedDay = dates.find(d => d.fullDateString === dateString);
        
        if (matchedDay) {
          // Identify category based on tool name
          const tool = item.tool || '';
          let cat: keyof typeof CATEGORY_COLORS | null = null;
          
          if (['chat', 'fast-chat', 'agent', 'batch-process', 'search', 'maps'].includes(tool)) {
            cat = 'Text & Chat';
          } else if (['image-gen', 'edit-image', 'image-understand'].includes(tool)) {
            cat = 'Image';
          } else if (['video-gen', 'video-understand', 'animate-image', 'youtube-gen'].includes(tool)) {
            cat = 'Video';
          } else if (['music-gen', 'tts', 'transcribe', 'live-audio'].includes(tool)) {
            cat = 'Audio';
          }

          if (cat) {
            // Add user activity on top of background system simulation seeds
            matchedDay[cat] += 4; // Weight per user request to make user spikes visually bold and trace-friendly
            matchedDay.userAdded += 1;
          }
        }
      });
    }

    return dates;
  }, [history]);

  // Compute aggregate statistics
  const stats = useMemo(() => {
    let textSum = 0;
    let imgSum = 0;
    let videoSum = 0;
    let audioSum = 0;
    let userRequests = 0;

    chartData.forEach(day => {
      textSum += day['Text & Chat'];
      imgSum += day['Image'];
      videoSum += day['Video'];
      audioSum += day['Audio'];
      userRequests += day.userAdded;
    });

    const totalSum = textSum + imgSum + videoSum + audioSum;
    
    // Find highest category
    const catTotals = [
      { name: 'Text & Chat', total: textSum, icon: CATEGORY_ICONS['Text & Chat'], color: 'text-indigo-500' },
      { name: 'Image', total: imgSum, icon: CATEGORY_ICONS['Image'], color: 'text-pink-500' },
      { name: 'Video', total: videoSum, icon: CATEGORY_ICONS['Video'], color: 'text-amber-500' },
      { name: 'Audio', total: audioSum, icon: CATEGORY_ICONS['Audio'], color: 'text-emerald-500' }
    ];
    catTotals.sort((a, b) => b.total - a.total);

    return {
      totalCompute: totalSum,
      primaryCategory: catTotals[0],
      userActionCount: userRequests,
      breakdown: catTotals
    };
  }, [chartData]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white/45 dark:bg-zinc-900/25 backdrop-blur-md p-6 shadow-sm overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:shadow-indigo-500/5 hover:border-zinc-300/80 dark:hover:border-zinc-700/80"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-indigo-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />
      
      {/* Header section with category tab filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 relative z-10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Activity size={16} className="text-indigo-500" />
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-sans">
              當期與歷史運作趨勢
            </h3>
            <span className="text-[10px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-bold px-1.5 py-0.5 rounded-full uppercase scale-90">
              Live Metrics
            </span>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500 font-normal">
            依據您的呼叫歷史即時疊加模擬的本週多模態算力呼叫頻率 (單位：Co運算度)
          </p>
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedCategory(null)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === null
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900/40'
            }`}
          >
            全部維度
          </button>
          
          {(Object.keys(CATEGORY_COLORS) as Array<keyof typeof CATEGORY_COLORS>).map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer border ${
                selectedCategory === cat
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 border-transparent shadow-sm'
                  : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-900/40 border-zinc-200/50 dark:border-zinc-800/50'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
              <span>{t(`common.categories.${cat}`)}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid: Left is Chart, Right is detailed mini cards */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
        
        {!currentUser && (
          <div className="absolute inset-x-0 -inset-y-2 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-md z-30 flex flex-col items-center justify-center text-center p-6 rounded-3xl border border-zinc-200/40 dark:border-zinc-800/40">
            <div className="w-12 h-12 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center mb-4">
              <Lock size={20} />
            </div>
            <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 mb-1">
              兼容與歷史運作趨勢已安全刪除
            </h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-md leading-relaxed px-4">
              因您目前處於未登入狀態，系統已自動刪除並清空本機快取與當期/歷史兼容趨勢，防範隱私洩露。登入後即可享有專屬雲端同步與 AI 多模態統計。
            </p>
          </div>
        )}

        {/* Main Chart Slot */}
        <div className="lg:col-span-2 h-64 w-full text-xs font-sans mt-2 relative">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                {(Object.keys(CATEGORY_COLORS) as Array<keyof typeof CATEGORY_COLORS>).map(cat => (
                  <linearGradient key={cat} id={`gradient-${cat.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0.2} />
                    <stop offset="95%" stopColor={CATEGORY_COLORS[cat]} stopOpacity={0.0} />
                  </linearGradient>
                ))}
              </defs>
              
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e720" />
              <XAxis 
                dataKey="dateStr" 
                stroke="#a1a1aa" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8}
              />
              <YAxis 
                stroke="#a1a1aa" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                tickMargin={8} 
              />
              
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="p-3 bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/80 dark:border-zinc-850/80 rounded-2xl shadow-xl space-y-2 font-sans backdrop-blur-md">
                        <p className="font-bold text-[11px] text-zinc-800 dark:text-zinc-200 border-b border-zinc-150 dark:border-zinc-850 pb-1 flex items-center gap-1.5">
                          <span>{data.dayName} ({data.dateStr})</span>
                        </p>
                        <div className="space-y-1">
                          {payload.map((p, i) => (
                            <div key={i} className="flex items-center justify-between gap-6 text-[11px]">
                              <span className="flex items-center gap-1.5" style={{ color: p.color }}>
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: p.color }} />
                                {t(`common.categories.${p.name}`)}
                              </span>
                              <span className="font-mono font-semibold text-zinc-800 dark:text-zinc-100">
                                {p.value} Co
                              </span>
                            </div>
                          ))}
                        </div>
                        {data.userAdded > 0 && (
                          <div className="pt-1.5 border-t border-zinc-150 dark:border-zinc-850 flex items-center justify-between text-[10px] text-indigo-500 font-medium">
                            <span>主動呼叫次數</span>
                            <span className="font-semibold font-mono bg-indigo-50 dark:bg-indigo-950/40 px-1 py-0.2 rounded-md">+{data.userAdded} 次</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />

              {/* Stacked or Single Areas */}
              {(Object.keys(CATEGORY_COLORS) as Array<keyof typeof CATEGORY_COLORS>).map(cat => {
                const isFocused = selectedCategory === null || selectedCategory === cat;
                return (
                  <Area
                    key={cat}
                    name={cat}
                    type="monotone"
                    dataKey={cat}
                    stroke={CATEGORY_COLORS[cat]}
                    strokeWidth={isFocused ? 2 : 0}
                    fillOpacity={isFocused ? 1 : 0}
                    fill={`url(#gradient-${cat.replace(/\s+/g, '')})`}
                    stackId={selectedCategory === null ? '1' : undefined}
                    hide={!isFocused}
                  />
                );
              })}
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Detailed Stats Column */}
        <div className="flex flex-col justify-between space-y-4">
          {/* Quick Metrics */}
          <div className="space-y-3">
            <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100/50 dark:border-zinc-850/45">
              <span className="text-[10px] text-zinc-400 block mb-0.5">近 7 日累計算力消耗</span>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-bold font-mono text-zinc-900 dark:text-zinc-50">
                  {stats.totalCompute}
                </span>
                <span className="text-[10px] text-zinc-400">Co 幣</span>
                <span className="text-[10px] text-emerald-500 font-medium ml-auto flex items-center gap-0.5">
                  <TrendingUp size={10} /> +12.4%
                </span>
              </div>
            </div>

            <div className="p-3 bg-zinc-50/50 dark:bg-zinc-900/40 rounded-2xl border border-zinc-100/50 dark:border-zinc-850/45">
              <span className="text-[10px] text-zinc-400 block mb-0.5">主峰運算主軸</span>
              <div className="flex items-center gap-2">
                {stats.primaryCategory.icon}
                <span className="text-xs font-bold text-zinc-800 dark:text-zinc-200">
                  {t(`common.categories.${stats.primaryCategory.name}`)}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 ml-auto">
                  佔比 {Math.round((stats.primaryCategory.total / stats.totalCompute) * 100)}%
                </span>
              </div>
            </div>

            {stats.userActionCount > 0 && (
              <div className="p-3 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-2xl border border-indigo-500/10 dark:border-indigo-500/20">
                <span className="text-[10px] text-indigo-500 dark:text-indigo-400 block mb-0.5 font-semibold">實時互動效應 (Live Interactive Spike)</span>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-zinc-700 dark:text-zinc-300">本期累積手動呼叫</span>
                  <span className="text-xs font-bold font-mono text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/45 px-1.5 py-0.5 rounded-lg border border-indigo-100 dark:border-indigo-900/30">
                    {stats.userActionCount} 次
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Mini Progress bars category breakdown */}
          <div className="space-y-1.5 pt-2 border-t border-zinc-200/50 dark:border-zinc-800/50">
            <span className="text-[10px] text-zinc-400 block">各維度使用率排名 (Compute Weights)</span>
            <div className="space-y-2">
              {stats.breakdown.map((item, idx) => {
                const percentage = stats.totalCompute ? (item.total / stats.totalCompute) * 100 : 0;
                return (
                  <div key={idx} className="space-y-0.5">
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="text-zinc-500 dark:text-zinc-400 flex items-center gap-1">
                        {item.icon}
                        <span>{t(`common.categories.${item.name}`)}</span>
                      </span>
                      <span className="font-mono font-medium text-zinc-650 dark:text-zinc-300">
                        {item.total} Co ({Math.round(percentage)}%)
                      </span>
                    </div>
                    <div className="w-full h-1 bg-zinc-100 dark:bg-zinc-850/60 rounded-full overflow-hidden">
                      <div 
                        className="h-full rounded-full transition-all duration-500"
                        style={{ 
                          width: `${percentage}%`,
                          backgroundColor: CATEGORY_COLORS[item.name as keyof typeof CATEGORY_COLORS] 
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>
    </motion.div>
  );
});
