import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Search, X, MessageSquare, ArrowRight, CornerDownLeft, Sparkles, Clock, Compass, ShieldAlert } from 'lucide-react';
import { useChatHistory } from '../contexts/ChatHistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { FEATURES, getIconComponent } from '../constants';
import { FeatureId } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFeature: (id: FeatureId) => void;
}

export default function GlobalSearchModal({ isOpen, onClose, onSelectFeature }: GlobalSearchModalProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { chatSessions, setActiveChatSessionId } = useChatHistory();
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Reset query and selection index on open
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      // Small timeout to allow transition to start before focusing
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [isOpen]);

  // Matches based on search query
  const searchResults = useMemo(() => {
    if (!query.trim()) {
      // Return suggestions or recent items when query is empty
      const isAdmin = currentUser?.email && (
        currentUser.email.toLowerCase() === 'lin076976528@gmail.com' || 
        currentUser.email.toLowerCase() === 'lin6976528@gmail.com'
      );
      
      const defaultFeatures = FEATURES
        .filter(f => f.id !== 'admin' || isAdmin)
        .slice(0, 4);

      const defaultChats = chatSessions.slice(0, 4);

      return {
        features: defaultFeatures,
        chats: defaultChats,
        isRecent: true
      };
    }

    const searchQueryLower = query.toLowerCase().trim();
    const isAdmin = currentUser?.email && (
      currentUser.email.toLowerCase() === 'lin076976528@gmail.com' || 
      currentUser.email.toLowerCase() === 'lin6976528@gmail.com'
    );

    // Filter tools/pages
    const matchedFeatures = FEATURES.filter(f => {
      if (f.id === 'admin' && !isAdmin) return false;
      
      const title = t(`features.${f.id}.title`, f.title || f.id).toLowerCase();
      const desc = t(`features.${f.id}.description`, '').toLowerCase();
      const category = f.category?.toLowerCase() || '';
      
      return title.includes(searchQueryLower) || 
             desc.includes(searchQueryLower) || 
             category.includes(searchQueryLower);
    });

    // Filter chat sessions & messages content
    const matchedChats = chatSessions.filter(session => {
      const titleMatch = (session.title || '').toLowerCase().includes(searchQueryLower);
      let messageMatch = false;
      try {
        if (session.messages) {
          const msgs = JSON.parse(session.messages);
          messageMatch = msgs.some((m: any) => (m.text || '').toLowerCase().includes(searchQueryLower));
        }
      } catch (e) {
        // Safe skip
      }
      return titleMatch || messageMatch;
    });

    return {
      features: matchedFeatures,
      chats: matchedChats,
      isRecent: false
    };
  }, [query, chatSessions, currentUser, t]);

  // Combine results into a single flat list for smooth arrow-key navigation
  const flatItems = useMemo(() => {
    const items: Array<
      | { type: 'feature'; id: FeatureId; title: string; desc: string; icon: string }
      | { type: 'chat'; id: string; title: string; featureId: string; model: string; date: string }
    > = [];

    searchResults.features.forEach(f => {
      items.push({
        type: 'feature',
        id: f.id,
        title: t(`features.${f.id}.title`, f.title || f.id),
        desc: t(`features.${f.id}.description`, ''),
        icon: f.icon
      });
    });

    searchResults.chats.forEach(c => {
      const formattedDate = c.updatedAt?.toDate 
        ? c.updatedAt.toDate().toLocaleDateString()
        : 'Recently';

      items.push({
        type: 'chat',
        id: c.id,
        title: c.title || 'Untitled Conversation',
        featureId: c.featureId,
        model: c.model,
        date: formattedDate
      });
    });

    return items;
  }, [searchResults, t]);

  // Adjust selection when flat list length changes
  useEffect(() => {
    setSelectedIndex(prev => {
      if (flatItems.length === 0) return 0;
      if (prev >= flatItems.length) return flatItems.length - 1;
      return prev;
    });
  }, [flatItems]);

  // Keyboard navigation & execution
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % Math.max(1, flatItems.length));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + flatItems.length) % Math.max(1, flatItems.length));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (flatItems[selectedIndex]) {
        handleSelectItem(flatItems[selectedIndex]);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Scroll active item into view
  useEffect(() => {
    const listElement = listRef.current;
    if (listElement && flatItems.length > 0) {
      const activeItem = listElement.querySelector(`[data-index="${selectedIndex}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex, flatItems]);

  const handleSelectItem = (item: typeof flatItems[number]) => {
    if (item.type === 'feature') {
      onSelectFeature(item.id);
    } else if (item.type === 'chat') {
      setActiveChatSessionId(item.id);
      onSelectFeature(item.featureId as FeatureId);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[10vh] px-4 overflow-hidden">
          {/* Backdrop blurring the background */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-zinc-950/40 dark:bg-zinc-950/70 backdrop-blur-md"
            onClick={onClose}
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-full max-w-2xl glass-panel rounded-[28px] flex flex-col max-h-[75vh] overflow-hidden relative z-10"
            onKeyDown={handleKeyDown}
          >
            {/* Header / Input */}
            <div className="relative border-b border-zinc-200/50 dark:border-zinc-850/50 px-6 py-5 flex items-center gap-4">
              <Search className="text-zinc-400 dark:text-zinc-500 shrink-0" size={20} />
              <input
                ref={inputRef}
                type="text"
                placeholder={t('common.searchGlobalPlaceholder', '搜尋 AI 功能、工具或聊天歷程記錄...')}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-transparent border-none text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 font-light focus:outline-none text-base pr-12"
              />
              <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 px-1.5 text-xs text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                  >
                    清除
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 text-zinc-450 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors flex items-center justify-center shrink-0"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Results */}
            <div ref={listRef} className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
              {flatItems.length === 0 ? (
                <div className="py-16 text-center flex flex-col items-center justify-center">
                  <div className="w-14 h-14 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-4">
                    <Search className="text-zinc-400 dark:text-zinc-500" size={24} />
                  </div>
                  <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 mb-1">
                    未找到與 「{query}」 相關的內容
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light">
                    請嘗試其他關鍵字，例如「聊天」、「寫歌」、「繪圖」
                  </p>
                </div>
              ) : (
                <>
                  {/* AI Tools Section */}
                  {searchResults.features.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-2 text-xxs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                        <Compass size={12} className="opacity-70" />
                        <span>{searchResults.isRecent ? '推薦 AI 工具' : 'AI 智能工具'}</span>
                      </div>
                      
                      {flatItems
                        .map((item, index) => ({ item, index }))
                        .filter(({ item }) => item.type === 'feature')
                        .map(({ item, index }) => {
                          const featureItem = item as Extract<typeof flatItems[number], { type: 'feature' }>;
                          const Icon = getIconComponent(featureItem.icon);
                          const isSelected = selectedIndex === index;

                          return (
                            <button
                              key={featureItem.id}
                              data-index={index}
                              onClick={() => handleSelectItem(featureItem)}
                              className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center gap-4 relative group ${
                                isSelected
                                  ? 'bg-zinc-900/5 dark:bg-white/10 border-l-2 border-indigo-500 pl-3.5'
                                  : 'hover:bg-zinc-905/5 dark:hover:bg-zinc-800/40 border-l-2 border-transparent'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors shrink-0 ${
                                isSelected ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300'
                              }`}>
                                <Icon size={20} strokeWidth={1.5} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                  {featureItem.title}
                                </h4>
                                <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light truncate mt-0.5">
                                  {featureItem.desc}
                                </p>
                              </div>
                              <div className={`shrink-0 transition-all ${
                                isSelected ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-2'
                              }`}>
                                <CornerDownLeft size={14} className="text-zinc-400" />
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}

                  {/* Chat Session Section */}
                  {searchResults.chats.length > 0 && (
                    <div className="space-y-1">
                      <div className="px-3 py-2 text-xxs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 flex items-center gap-2">
                        <Clock size={12} className="opacity-70" />
                        <span>{searchResults.isRecent ? '最近對話紀錄' : '匹配的對話歷程'}</span>
                      </div>

                      {flatItems
                        .map((item, index) => ({ item, index }))
                        .filter(({ item }) => item.type === 'chat')
                        .map(({ item, index }) => {
                          const chatItem = item as Extract<typeof flatItems[number], { type: 'chat' }>;
                          const isSelected = selectedIndex === index;

                          return (
                            <button
                              key={chatItem.id}
                              data-index={index}
                              onClick={() => handleSelectItem(chatItem)}
                              className={`w-full text-left px-4 py-3 rounded-2xl transition-all flex items-center gap-4 relative group ${
                                isSelected
                                  ? 'bg-zinc-900/5 dark:bg-white/10 border-l-2 border-indigo-500 pl-3.5'
                                  : 'hover:bg-zinc-905/5 dark:hover:bg-zinc-800/40 border-l-2 border-transparent'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm transition-colors shrink-0 ${
                                isSelected ? 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400' : 'bg-zinc-100 dark:bg-zinc-800/80 text-zinc-700 dark:text-zinc-300'
                              }`}>
                                <MessageSquare size={18} strokeWidth={1.5} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                                  {chatItem.title}
                                </h4>
                                <div className="flex items-center gap-2 text-xxs text-zinc-500 dark:text-zinc-400 mt-0.5 font-light">
                                  <span className="capitalize px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 font-medium">
                                    {chatItem.featureId}
                                  </span>
                                  <span>•</span>
                                  <span className="truncate">{chatItem.model}</span>
                                  <span>•</span>
                                  <span>{chatItem.date}</span>
                                </div>
                              </div>
                              <div className={`shrink-0 transition-all ${
                                isSelected ? 'opacity-100 transform translate-x-0' : 'opacity-0 transform translate-x-2'
                              }`}>
                                <CornerDownLeft size={14} className="text-zinc-400" />
                              </div>
                            </button>
                          );
                        })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Keyboard shortcuts footer */}
            <div className="px-6 py-4 bg-zinc-50 dark:bg-zinc-900/40 border-t border-zinc-200/50 dark:border-zinc-850/50 flex justify-between items-center text-xxs text-zinc-400 dark:text-zinc-550 shrink-0">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-sans shadow-sm font-medium">↑↓</kbd> 選擇
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-2.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-sans shadow-sm font-medium">Enter</kbd> 前往此項目
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 font-sans shadow-sm font-medium">Esc</kbd> 關閉
                </span>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 font-medium text-indigo-500/80">
                <Sparkles size={11} />
                <span>一處搜尋，隨處跳轉</span>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
