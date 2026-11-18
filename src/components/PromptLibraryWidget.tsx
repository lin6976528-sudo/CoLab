import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, Search, Plus, Copy, Check, Zap, PlaySquare, Image, 
  Music, MessageSquare, ChevronRight, BookOpen, Trash2, X, Eye, EyeOff
} from 'lucide-react';
import { FeatureId } from '../types';

interface SavedPrompt {
  id: string;
  title: string;
  content: string;
  targetFeature: FeatureId;
  category: 'chat' | 'image' | 'video-audio' | 'business';
  isCustom?: boolean;
}

interface PromptLibraryWidgetProps {
  onSelectFeature: (id: FeatureId) => void;
}

const DEFAULT_PROMPTS: SavedPrompt[] = [
  {
    id: 'p-chat-gantt',
    title: '專案甘特圖時空最佳化建議',
    content: '請扮演資深專案經理。我目前有一個網頁開發專案，請針對以下流程與時間限制，提供一個同時考慮時效、資源與產出品質的三重平衡甘特圖最佳化分析：\n\n- 開發期：3 週\n- 團隊規模：2 位前端工程師、1 位後端工程師、1 位設計師\n- 關鍵交付里程碑：設計稿、API 串接完成、Beta 測試、正式上線\n- 限制：後端 API 開發落後預期 1 週',
    targetFeature: 'chat',
    category: 'chat'
  },
  {
    id: 'p-img-cinematic',
    title: '未來景觀極簡主義電影鏡頭',
    content: 'A high-fidelity minimalist cinematic photo of a futuristic architectural studio with large panoramic glass windows, soft twilight atmospheric lighting, lush indoor trees, heavy shadow contrasts, cozy workspace table, ultra-detailed, 8k resolution, photorealistic, shot on 35mm lens.',
    targetFeature: 'image-gen',
    category: 'image'
  },
  {
    id: 'p-vid-epic',
    title: '史詩級黃金漫遊景像',
    content: 'An epic slow-motion drone pan shot of an ancient cliffside mountain monastery during the autumn golden hour, deep crimson trees whispering in the wind, dramatic mist crawling between peaks, highly cinematic.',
    targetFeature: 'video-gen',
    category: 'video-audio'
  },
  {
    id: 'p-mus-lofi',
    title: '慵懶雨聲背景 Lo-Fi 音軌',
    content: 'A chilled lo-fi study beat with cozy fireplace crackle and ambient soft rain, warm electric piano chords, smooth vinyl noise, relaxed tempo around 80 bpm, highly focused vibes.',
    targetFeature: 'music-gen',
    category: 'video-audio'
  },
  {
    id: 'p-yt-hook',
    title: '吸睛短影音廣告廣告詞發想',
    content: '請為一門全新的「AI 實戰提效：上班族自動化神器」線上課程發想 3 個高吸睛度、帶有強烈衝突感或 Hook（開頭 3 秒）的短影音廣告企劃。包含視覺畫面描述、旁白文案（繁體中文），以及契合的背景音樂氛圍。',
    targetFeature: 'youtube-gen',
    category: 'business'
  },
  {
    id: 'p-batch-funnel',
    title: '數據指標轉換率漏洞分析',
    content: '請扮演資深商業數據分析師。我有一批週行銷漏斗指標數據，包含：曝光（100,000）、註冊（8,000）、試用（3,000）、正式付費（450）。請幫我計算各層級轉換率、指出流失最嚴重的關鍵節點，並提供 3 個提高最終付費轉換率的最佳化實踐建議。',
    targetFeature: 'batch-process',
    category: 'business'
  }
];

export const PromptLibraryWidget: React.FC<PromptLibraryWidgetProps> = React.memo(({ onSelectFeature }) => {
  const [prompts, setPrompts] = useState<SavedPrompt[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'chat' | 'image' | 'video-audio' | 'business'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Custom Modal Form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');
  const [newFeature, setNewFeature] = useState<FeatureId>('chat');
  const [newCategory, setNewCategory] = useState<'chat' | 'image' | 'video-audio' | 'business'>('chat');
  
  // Interaction feed feedback state
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activePreviewId, setActivePreviewId] = useState<string | null>(null);

  // Initialize prompts from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('colab_custom_prompts');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Combine defaults and custom saved prompts
        setPrompts([...DEFAULT_PROMPTS, ...parsed]);
      } catch (e) {
        console.error("Failed to parse custom prompts:", e);
        setPrompts(DEFAULT_PROMPTS);
      }
    } else {
      setPrompts(DEFAULT_PROMPTS);
    }
  }, []);

  const saveCustomPrompts = (updatedPrompts: SavedPrompt[]) => {
    const customs = updatedPrompts.filter(p => p.isCustom);
    localStorage.setItem('colab_custom_prompts', JSON.stringify(customs));
  };

  const handleAddPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newPrompt: SavedPrompt = {
      id: `custom-${Date.now()}`,
      title: newTitle.trim(),
      content: newContent.trim(),
      targetFeature: newFeature,
      category: newCategory,
      isCustom: true
    };

    const nextPrompts = [newPrompt, ...prompts];
    setPrompts(nextPrompts);
    saveCustomPrompts(nextPrompts);

    // Reset Form
    setNewTitle('');
    setNewContent('');
    setIsFormOpen(false);
  };

  const handleDeletePrompt = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextPrompts = prompts.filter(p => p.id !== id);
    setPrompts(nextPrompts);
    saveCustomPrompts(nextPrompts);
    if (activePreviewId === id) setActivePreviewId(null);
  };

  const handleCopyPrompt = (prompt: SavedPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(prompt.content);
    setCopiedId(prompt.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleTriggerPrompt = (prompt: SavedPrompt, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // Stage the prompt to be automatically populated in the target feature
    const stageObj = {
      featureId: prompt.targetFeature,
      content: prompt.content
    };
    localStorage.setItem('co_staged_prompt', JSON.stringify(stageObj));
    
    // Redirect the user
    onSelectFeature(prompt.targetFeature);
  };

  const getFeatureLabel = (feature: FeatureId) => {
    switch (feature) {
      case 'chat': return '對談';
      case 'image-gen': return '圖生文';
      case 'video-gen': return '影片生成';
      case 'music-gen': return '音樂生成';
      case 'animate-image': return '圖生影片';
      case 'youtube-gen': return '行銷文案';
      case 'batch-process': return '批次處理';
      case 'edit-image': return '圖像編輯';
      case 'image-understand': return '看圖分析';
      case 'video-understand': return '影片分析';
      default: return 'AI 工具';
    }
  };

  const getFeatureIcon = (feature: FeatureId) => {
    switch (feature) {
      case 'chat': return <MessageSquare size={13} className="text-blue-500" />;
      case 'image-gen': return <Image size={13} className="text-emerald-500" />;
      case 'video-gen': 
      case 'animate-image': return <PlaySquare size={13} className="text-amber-500" />;
      case 'music-gen': return <Music size={13} className="text-indigo-500" />;
      default: return <Sparkles size={13} className="text-purple-500" />;
    }
  };

  // Filter prompts based on search and tab
  const filteredPrompts = prompts.filter(p => {
    const matchesCategory = activeCategory === 'all' || p.category === activeCategory;
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.content.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-3xl border border-zinc-200/60 dark:border-zinc-800/85 bg-white/45 dark:bg-zinc-900/25 backdrop-blur-md p-6 relative overflow-hidden flex flex-col gap-5 shadow-sm"
    >
      {/* Widget Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-600 dark:text-orange-400">
            <BookOpen size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-sans">
              AI 提示詞庫 (Prompt Library)
            </h3>
            <p className="text-[11px] text-zinc-450 dark:text-zinc-500 font-light mt-0.5">
              儲存、搜尋並一鍵啟動您專屬的常用 AI 提示詞架構
            </p>
          </div>
        </div>

        {/* Search & Actions Bar */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" size={13} />
            <input
              type="text"
              placeholder="搜尋提示詞..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 w-44 md:w-56 text-xs bg-zinc-100/60 dark:bg-zinc-900/40 border border-zinc-200/50 dark:border-zinc-800/60 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/30 font-sans text-zinc-850 dark:text-zinc-200 placeholder-zinc-400"
            />
          </div>
          
          <button
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-all shadow-sm font-semibold cursor-pointer shrink-0"
          >
            <Plus size={13} />
            <span>新增提示</span>
          </button>
        </div>
      </div>

      {/* Categories Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mx-2 px-2 no-scrollbar">
        {[
          { key: 'all', label: '全部' },
          { key: 'chat', label: '💬 的對話助理' },
          { key: 'image', label: '🎨 創意圖像' },
          { key: 'video-audio', label: '🎬 影片與音樂' },
          { key: 'business', label: '📊 數據及行銷' }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveCategory(tab.key as any)}
            className={`px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeCategory === tab.key 
                ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xs' 
                : 'bg-zinc-100/50 dark:bg-zinc-900/40 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Prompts Cards Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="py-10 text-center flex flex-col items-center justify-center gap-2.5 border border-dashed border-zinc-200 dark:border-zinc-800 rounded-2xl bg-zinc-50/20 dark:bg-zinc-950/20">
          <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center text-zinc-400">
            <BookOpen size={16} />
          </div>
          <div>
            <p className="text-xs font-semibold text-zinc-750 dark:text-zinc-300">目前無匹配的提示詞</p>
            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 mt-0.5 max-w-[280px]">
              您創立的自訂提示詞或篩選條件可能無相符項目，可試著清除搜尋或按「新增提示」建立！
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredPrompts.map((prompt) => (
            <motion.div
              layout
              key={prompt.id}
              whileHover={{ y: -3, scale: 1.015 }}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              onClick={() => setActivePreviewId(activePreviewId === prompt.id ? null : prompt.id)}
              className={`p-4 rounded-2xl border transition-all duration-200 cursor-pointer flex flex-col justify-between gap-3 group relative select-none hover:shadow-lg hover:shadow-indigo-500/10 dark:hover:shadow-indigo-500/15 ${
                activePreviewId === prompt.id 
                  ? 'border-indigo-500 dark:border-indigo-500 bg-indigo-50/10 dark:bg-indigo-950/10 shadow-md' 
                  : 'border-zinc-150/80 dark:border-zinc-800 bg-white/60 dark:bg-zinc-950/50 hover:bg-white dark:hover:bg-zinc-900 hover:border-zinc-350 dark:hover:border-zinc-700'
              }`}
            >
              {/* Card Meta & Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex flex-col gap-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="flex items-center gap-1 px-1.5 py-0.5 roundedbg bg-zinc-100 dark:bg-zinc-900 text-[9px] font-semibold text-zinc-500 dark:text-zinc-400 border border-zinc-200/40 dark:border-zinc-850/40 uppercase tracking-wide">
                      {getFeatureIcon(prompt.targetFeature)}
                      <span className="ml-0.5">{getFeatureLabel(prompt.targetFeature)}</span>
                    </span>
                    {prompt.isCustom && (
                      <span className="px-1.5 py-0.5 roundedbg bg-indigo-100 dark:bg-indigo-950/40 text-[9px] font-bold text-indigo-600 dark:text-indigo-400 border border-indigo-200/20">
                        自訂
                      </span>
                    )}
                  </div>
                  <h4 className="text-xs font-extrabold text-zinc-900 dark:text-zinc-50 tracking-tight leading-tight group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {prompt.title}
                  </h4>
                </div>
              </div>

              {/* Collapsed / Expanded Content view */}
              <div className="text-xs text-zinc-500 dark:text-zinc-400 leading-relaxed font-light font-sans break-all">
                {activePreviewId === prompt.id ? (
                  <pre className="whitespace-pre-wrap font-sans break-words bg-zinc-50/50 dark:bg-zinc-950/50 p-2.5 rounded-lg border border-zinc-200/30 dark:border-zinc-800/40 text-[11px] max-h-40 overflow-y-auto">
                    {prompt.content}
                  </pre>
                ) : (
                  <p className="line-clamp-2 leading-tight">
                    {prompt.content}
                  </p>
                )}
              </div>

              {/* Floating Action Button Bar */}
              <div className="flex items-center justify-between pt-2.5 border-t border-zinc-100 dark:border-zinc-900">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActivePreviewId(activePreviewId === prompt.id ? null : prompt.id);
                  }}
                  className="flex items-center gap-1 text-[10px] text-zinc-400 dark:text-zinc-500 hover:text-indigo-500 transition-colors"
                >
                  {activePreviewId === prompt.id ? (
                    <>
                      <EyeOff size={11} />
                      <span>長篇收起</span>
                    </>
                  ) : (
                    <>
                      <Eye size={11} />
                      <span>點擊預覽</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-1.5">
                  {prompt.isCustom && (
                    <button
                      onClick={(e) => handleDeletePrompt(prompt.id, e)}
                      title="刪除提示詞"
                      className="p-1 px-1.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/70 text-zinc-400 hover:text-red-500 hover:bg-red-500/5 transition-colors cursor-pointer"
                    >
                      <Trash2 size={11} />
                    </button>
                  )}
                  
                  <button
                    onClick={(e) => handleCopyPrompt(prompt, e)}
                    title="複製提示詞內容"
                    className="flex items-center gap-1 p-1 px-2.5 rounded-lg border border-zinc-200/50 dark:border-zinc-800/70 text-zinc-500 dark:text-zinc-450 hover:text-zinc-850 dark:hover:text-zinc-100 hover:bg-zinc-100/50 dark:hover:bg-zinc-900/50 transition-all cursor-pointer font-semibold text-[10px]"
                  >
                    {copiedId === prompt.id ? (
                      <>
                        <Check size={11} className="text-emerald-500 stroke-[3]" />
                        <span className="text-emerald-500">已複製</span>
                      </>
                    ) : (
                      <>
                        <Copy size={11} />
                        <span>複製</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={(e) => handleTriggerPrompt(prompt, e)}
                    className="flex items-center gap-1 px-2.5 py-1 text-[10px] text-white bg-indigo-600 hover:bg-indigo-500 hover:scale-[1.02] active:scale-[0.98] rounded-lg transition-all shadow-xs font-semibold cursor-pointer"
                  >
                    <Zap size={10} className="fill-white" />
                    <span>一鍵啟用</span>
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Save Custom Prompt Modal Form */}
      <AnimatePresence>
        {isFormOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/40 backdrop-blur-xs select-text">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-zinc-900 rounded-3xl border border-zinc-200 dark:border-zinc-800 w-full max-w-lg p-6 shadow-2xl relative flex flex-col gap-5 text-left"
            >
              <button
                onClick={() => setIsFormOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 cursor-pointer"
              >
                <X size={16} />
              </button>

              <div>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight flex items-center gap-1.5">
                  <BookOpen size={16} className="text-indigo-500" />
                  新增自訂提示詞物件
                </h4>
                <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                  定義您的預設架構，點選後系統會自動為您填充對應工具並快速引導
                </p>
              </div>

              <form onSubmit={handleAddPrompt} className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">提示詞名稱 (Title)*</label>
                  <input
                    type="text"
                    required
                    maxLength={40}
                    placeholder="例如：英文文案深度修飾架構"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    className="px-3.5 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">對應 AI 特色工具 (Trigger Tool)</label>
                    <select
                      value={newFeature}
                      onChange={e => setNewFeature(e.target.value as FeatureId)}
                      className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-sans cursor-pointer font-medium"
                    >
                      <option value="chat">Intelligent Chat / 對話</option>
                      <option value="image-gen">Imagen 3 / 圖像生成</option>
                      <option value="video-gen">Veo / 影片生成</option>
                      <option value="music-gen">Lyria / 音樂生成</option>
                      <option value="animate-image">圖生影片 (Animate Image)</option>
                      <option value="youtube-gen">行銷文案大師 (Creative Copy)</option>
                      <option value="batch-process">智慧批次處理 (Batch Analyzer)</option>
                    </select>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">庫存分類標籤 (Category Tab)</label>
                    <select
                      value={newCategory}
                      onChange={e => setNewCategory(e.target.value as any)}
                      className="px-3 py-2 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-sans cursor-pointer font-medium"
                    >
                      <option value="chat">💬 的對話助理</option>
                      <option value="image">🎨 創意圖像</option>
                      <option value="video-audio">🎬 影片與音樂</option>
                      <option value="business">📊 數據及行銷</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-zinc-700 dark:text-zinc-300">提示詞詳細內文 (Prompt Content)*</label>
                  <textarea
                    required
                    rows={5}
                    placeholder="請在此貼上完整的 AI 提示詞架構，或可留空變數讓使用者填入..."
                    value={newContent}
                    onChange={e => setNewContent(e.target.value)}
                    className="px-3.5 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500/40 font-sans resize-none leading-relaxed"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsFormOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-xs font-bold text-white bg-indigo-650 hover:bg-indigo-600 rounded-xl transition-all shadow-sm cursor-pointer"
                  >
                    確認儲存
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
});
