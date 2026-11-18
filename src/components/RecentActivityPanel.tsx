import React from 'react';
import { motion } from 'motion/react';
import { Clock, MessageSquare, HardDrive, FileText, Image, FileCode, PlaySquare, Music, ChevronRight, Zap } from 'lucide-react';
import { RecentActivityItem } from '../contexts/RecentActivityContext';
import { FeatureId } from '../types';

interface RecentActivityPanelProps {
  activities: RecentActivityItem[];
  onSelectFeature: (id: FeatureId) => void;
  setActiveChatSessionId: (id: string) => void;
  setActivePreviewActivity: (act: RecentActivityItem) => void;
}

export const RecentActivityPanel: React.FC<RecentActivityPanelProps> = React.memo(({
  activities,
  onSelectFeature,
  setActiveChatSessionId,
  setActivePreviewActivity
}) => {
  const elapsedFormatter = (time: number) => {
    const diff = Date.now() - time;
    if (diff < 60000) return '剛剛';
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} 分鐘前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} 小時前`;
    return `${Math.floor(hrs / 24)} 天前`;
  };

  const getIcon = (act: RecentActivityItem) => {
    if (act.type === 'chat') return <MessageSquare size={14} />;
    if (act.type === 'task') {
      if (act.featureId === 'video-gen') return <PlaySquare size={14} className="text-amber-500" />;
      if (act.featureId === 'image-gen') return <Image size={14} className="text-emerald-500" />;
      if (act.featureId === 'music-gen') return <Music size={14} className="text-indigo-500" />;
      return <Zap size={14} className="text-purple-500" />;
    }
    
    // File icons
    if (act.icon === 'HardDrive') return <HardDrive size={14} className="text-blue-500" />;
    if (act.icon === 'Image') return <Image size={14} className="text-emerald-500" />;
    if (act.icon === 'FileCode') return <FileCode size={14} className="text-amber-500" />;
    return <FileText size={14} />;
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case 'chat': return 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400';
      case 'task': return 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400';
      default: return 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400';
    }
  };

  const getBadgeLabel = (type: string) => {
    switch (type) {
      case 'chat': return '對話';
      case 'task': return '任務';
      default: return '檔案';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.1 }}
      className="rounded-3xl border border-zinc-200/60 dark:border-zinc-800/85 bg-white/45 dark:bg-zinc-900/25 backdrop-blur-md p-6 relative overflow-hidden flex flex-col gap-5 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <Clock size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-sans">最近活動 (Recent Activity)</h3>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-light mt-0.5">您最近互動過的 AI 任務、文件及聊天紀錄</p>
          </div>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center gap-2.5 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/20 dark:bg-zinc-950/20">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
            <Clock size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">目前暫無任何活動紀錄</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 max-w-[280px]">這是一個動態展示模組！當您開始對話、生成圖片或載入文件後，即可在此追蹤。</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {activities.slice(0, 5).map((act) => {
            const isChat = act.type === 'chat';
            const isTask = act.type === 'task';
            
            return (
              <motion.div
                key={`${act.type}-${act.id}`}
                whileHover={{ y: -3, scale: 1.015 }}
                whileTap={{ scale: 0.985 }}
                transition={{ duration: 0.2, ease: 'easeOut' }}
                onClick={() => {
                  if (act.type === 'chat' || act.type === 'task') {
                    if (act.id && act.type === 'chat') setActiveChatSessionId(act.id);
                    onSelectFeature((act.featureId || 'chat') as FeatureId);
                  } else {
                    setActivePreviewActivity(act);
                  }
                }}
                className="p-4 rounded-2xl border border-zinc-150/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-350 dark:hover:border-zinc-700 transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group relative select-none hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/15"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border border-zinc-200/50 dark:border-zinc-800/50 ${
                      isChat ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400' : 
                      isTask ? 'bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400' :
                      'bg-emerald-50 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400'
                    }`}>
                      {getIcon(act)}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {act.name}
                      </h4>
                      <span className="text-[10px] text-zinc-450 dark:text-zinc-500 leading-none mt-1 block font-mono truncate">
                        {act.detail || (isChat ? 'AI 對話歷史' : isTask ? 'AI 任務' : '文件')}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between text-[10px] text-zinc-400 dark:text-zinc-500 font-light pt-1.5 border-t border-zinc-100 dark:border-zinc-900">
                  <span className={`font-mono px-1.5 py-0.5 rounded-md font-semibold text-[9px] uppercase tracking-wider scale-95 origin-left ${getBadgeColor(act.type)}`}>
                    {getBadgeLabel(act.type)}
                  </span>
                  <div className="flex items-center gap-1">
                    <span>{elapsedFormatter(act.timestamp)}</span>
                    <ChevronRight size={10} className="text-zinc-300 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </motion.div>
  );
});
