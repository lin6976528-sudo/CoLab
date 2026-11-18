import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trash2, Clock, Image as ImageIcon, Video, MessageSquare, Mic, Filter, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHistory } from '../contexts/HistoryContext';

interface HistoryPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HistoryPanel({ isOpen, onClose }: HistoryPanelProps) {
  const { t } = useTranslation();
  const { history, clearHistory, deleteHistoryItem } = useHistory();
  const [filter, setFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const getIcon = (tool: string) => {
    if (tool.includes('image')) return <ImageIcon size={16} />;
    if (tool.includes('video')) return <Video size={16} />;
    if (tool.includes('audio') || tool.includes('tts') || tool.includes('transcribe')) return <Mic size={16} />;
    return <MessageSquare size={16} />;
  };

  const getCategory = (tool: string) => {
    if (tool.includes('image')) return 'image';
    if (tool.includes('video')) return 'video';
    if (tool.includes('audio') || tool.includes('tts') || tool.includes('transcribe')) return 'audio';
    return 'text';
  };

  const filteredHistory = useMemo(() => {
    let result = history;
    
    if (filter !== 'all') {
      result = result.filter((item) => getCategory(item.tool) === filter);
    }
    
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((item) => {
        const promptMatch = item.prompt?.toLowerCase().includes(query);
        const resultMatch = typeof item.result === 'string' && 
                            !item.result.startsWith('http') && 
                            !item.result.startsWith('data:') && 
                            item.result.toLowerCase().includes(query);
        const toolMatch = item.tool.toLowerCase().includes(query);
        return promptMatch || resultMatch || toolMatch;
      });
    }
    
    return result;
  }, [history, filter, searchQuery]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-900/20 backdrop-blur-sm z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 glass-panel dark:bg-zinc-900/90 shadow-2xl z-50 flex flex-col border-l border-white/20 dark:border-white/5"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/10 dark:border-white/5 bg-white/5 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/50 dark:bg-zinc-800/50 border border-white/20 dark:border-white/10 flex items-center justify-center shadow-sm">
                  <Clock size={20} className="text-zinc-700 dark:text-zinc-300" />
                </div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{t('common.history')}</h3>
              </div>
              <div className="flex items-center gap-2">
                {history.length > 0 && (
                  <button
                    onClick={() => {
                      if (window.confirm(t('common.confirmClearHistory', 'Are you sure you want to permanently delete all history?'))) {
                        clearHistory();
                      }
                    }}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                    title={t('common.clearHistory')}
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/30 dark:hover:bg-white/10 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {history.length > 0 && (
              <div className="flex flex-col border-b border-white/10 dark:border-white/5 bg-white/10 dark:bg-zinc-900/10">
                <div className="px-4 py-3 border-b border-white/5 dark:border-white/5">
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder={t('common.searchHistory')}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="glass-input w-full pl-9 pr-8 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900/10 dark:focus:ring-zinc-100/10 focus:border-white/40 dark:focus:border-white/20 transition-all dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                    />
                    {searchQuery && (
                      <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 p-0.5 rounded-full hover:bg-white/30 dark:hover:bg-white/10"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="px-4 py-3 flex items-center gap-2 overflow-x-auto no-scrollbar">
                  <Filter size={14} className="text-zinc-400 shrink-0 mr-1" />
                  <button
                    onClick={() => setFilter('all')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      filter === 'all' ? 'bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900' : 'bg-white/30 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    {t('common.all')}
                  </button>
                  <button
                    onClick={() => setFilter('text')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                      filter === 'text' ? 'bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900' : 'bg-white/30 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    <MessageSquare size={12} />
                    {t('categories.Text & Chat')}
                  </button>
                  <button
                    onClick={() => setFilter('image')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                      filter === 'image' ? 'bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900' : 'bg-white/30 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    <ImageIcon size={12} />
                    {t('categories.Image')}
                  </button>
                  <button
                    onClick={() => setFilter('video')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                      filter === 'video' ? 'bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900' : 'bg-white/30 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    <Video size={12} />
                    {t('categories.Video')}
                  </button>
                  <button
                    onClick={() => setFilter('audio')}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1 ${
                      filter === 'audio' ? 'bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900' : 'bg-white/30 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-400 hover:bg-white/50 dark:hover:bg-zinc-700/50'
                    }`}
                  >
                    <Mic size={12} />
                    {t('categories.Audio')}
                  </button>
                </div>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {filteredHistory.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-500 space-y-4">
                  <Clock size={48} className="opacity-20" />
                  <p className="text-sm font-medium">
                    {history.length === 0 
                      ? t('common.noHistory') 
                      : searchQuery 
                        ? t('common.noSearchResults') 
                        : t('common.noHistoryFilter')}
                  </p>
                </div>
              ) : (
                filteredHistory.map((item) => (
                  <div key={item.id} className="bg-white/40 dark:bg-zinc-900/40 border border-white/20 dark:border-white/5 rounded-xl p-4 shadow-sm relative group backdrop-blur-sm">
                    <div className="flex items-center gap-2 mb-2 text-zinc-500 dark:text-zinc-400">
                      {getIcon(item.tool)}
                      <span className="text-xs font-medium uppercase tracking-wider">{item.tool}</span>
                      <span className="text-xs ml-auto">
                        {item.createdAt?.toDate ? item.createdAt.toDate().toLocaleDateString() : ''}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-900 dark:text-zinc-100 font-medium mb-2 line-clamp-2">{item.prompt}</p>
                    {item.result && (
                      <div className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-3 bg-white/50 dark:bg-zinc-800/50 p-2 rounded-lg border border-white/20 dark:border-white/5">
                        {item.result.startsWith('http') || item.result.startsWith('data:') ? (
                          <img src={item.result} alt="Result" className="w-full h-24 object-cover rounded-md" />
                        ) : (
                          item.result
                        )}
                      </div>
                    )}
                    <button
                      onClick={() => {
                        if (window.confirm(t('common.confirmDelete', 'Are you sure you want to permanently delete this item?'))) {
                          deleteHistoryItem(item.id);
                        }
                      }}
                      className="absolute top-2 right-2 p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-900/30 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
