import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, HardDrive, Image, FileCode, Check, Send, Download } from 'lucide-react';
import { RecentActivityItem } from '../contexts/RecentActivityContext';

interface RecentActivityPreviewModalProps {
  activity: RecentActivityItem | null;
  onClose: () => void;
  onImportToChat: (activity: RecentActivityItem) => void;
}

export default function RecentActivityPreviewModal({
  activity,
  onClose,
  onImportToChat,
}: RecentActivityPreviewModalProps) {
  const [copied, setCopied] = React.useState(false);

  if (!activity) return null;

  const getActivityIcon = () => {
    switch (activity.icon) {
      case 'HardDrive':
        return <HardDrive size={24} className="text-blue-500" />;
      case 'Image':
        return <Image size={24} className="text-emerald-500" />;
      case 'FileCode':
        return <FileCode size={24} className="text-amber-500" />;
      default:
        return <FileText size={24} className="text-zinc-500" />;
    }
  };

  const handleCopyText = () => {
    if (!activity.content) return;
    navigator.clipboard.writeText(activity.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="relative w-full max-w-2xl bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-[2rem] p-6 shadow-2xl z-50 flex flex-col max-h-[85vh]"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 pb-4 border-b border-zinc-200/60 dark:border-zinc-800/60">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800 flex items-center justify-center shrink-0 shadow-sm">
                {getActivityIcon()}
              </div>
              <div>
                <span className="text-[10px] tracking-widest font-mono font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 px-2 py-0.5 rounded-md uppercase">
                  活動檔案預覽 (File Preview)
                </span>
                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-50 tracking-tight mt-1 line-clamp-1">
                  {activity.name}
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-0.5">
                  {activity.detail || '無格式詳情'} • {new Date(activity.timestamp).toLocaleString()}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          {/* Body Content */}
          <div className="flex-1 overflow-y-auto py-5 space-y-4">
            {activity.content ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-zinc-650 dark:text-zinc-450">
                    檔案文字內容提取 ({activity.content.length} 字元)
                  </span>
                  <button
                    onClick={handleCopyText}
                    className="px-3 py-1.5 rounded-lg border border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-900 text-xs text-zinc-650 dark:text-zinc-350 font-semibold cursor-pointer transition-colors"
                  >
                    {copied ? '✓ 已複製' : '📋 複製常規文字'}
                  </button>
                </div>
                <div className="w-full text-xs font-mono bg-zinc-50 dark:bg-zinc-900 p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/80 leading-relaxed text-zinc-750 dark:text-zinc-300 max-h-80 overflow-y-auto whitespace-pre-wrap">
                  {activity.content}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-14 h-14 rounded-full bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-center text-zinc-400 mb-3">
                  {getActivityIcon()}
                </div>
                <p className="text-sm font-bold text-zinc-850 dark:text-zinc-150">此檔案不支援純文字預覽</p>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 max-w-xs leading-relaxed">
                  該檔案為多媒體資源或圖片上傳，不提供直接的上下文文字解析。
                </p>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="pt-4 border-t border-zinc-200/60 dark:border-zinc-800/60 flex items-center justify-between gap-3">
            <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-medium">
              最近活動智慧串接技術
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
                className="px-4.5 py-2.5 rounded-xl text-xs font-bold text-zinc-650 dark:text-zinc-350 hover:bg-zinc-100 dark:hover:bg-zinc-900 cursor-pointer transition-colors"
              >
                關閉
              </button>
              {activity.content && (
                <button
                  onClick={() => onImportToChat(activity)}
                  className="px-5 py-2.5 bg-indigo-600 dark:bg-purple-600 hover:bg-indigo-700 dark:hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] shadow-md shadow-indigo-500/10"
                >
                  <Send size={13} />
                  <span>💬 匯入至 AI 聊天對話區</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
