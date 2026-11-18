import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { X, Keyboard, Command, Compass, MessageSquare, Layers, Video, Image, History, Settings, Trash2, ArrowUpRight, HardDrive } from 'lucide-react';
import { FeatureId } from '../types';

interface KeyboardShortcutsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectFeature: (id: FeatureId) => void;
  onToggleHistory: () => void;
  onToggleSettings: () => void;
}

export default function KeyboardShortcutsModal({
  isOpen,
  onClose,
  onSelectFeature,
  onToggleHistory,
  onToggleSettings,
}: KeyboardShortcutsModalProps) {
  const { t } = useTranslation();
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsMac(/Macintosh|MacIntel|iPad|iPhone|iPod/.test(navigator.userAgent));
    }
  }, []);

  const categories = [
    {
      title: t('shortcuts.catUniversal', '通用控制 / Global Control'),
      items: [
        {
          keys: [isMac ? '⌘' : 'Ctrl', 'K'],
          action: t('shortcuts.search', '開啟全站智慧搜尋 / Open Global Search'),
          description: t('shortcuts.searchDesc', '隨時隨地，即刻搜尋 AI 算力工具與相關文檔。'),
          icon: Command,
          simulate: 'search',
        },
        {
          keys: [isMac ? '⌘' : 'Ctrl', '/'],
          action: t('shortcuts.toggleShortcuts', '開啟此快捷鍵說明 / Toggle Shortcuts Help'),
          description: t('shortcuts.toggleShortcutsDesc', '快速查看與檢索當前應用的實用快捷指令。'),
          icon: Keyboard,
          simulate: 'shortcuts',
        },
        {
          keys: ['Alt', 'P'],
          action: t('shortcuts.togglePerformance', '開啟效能與快取優化 / Toggle Performance Optimizer'),
          description: t('shortcuts.togglePerformanceDesc', '即時監控 FPS 幀率並一鍵釋放記憶體與快取。'),
          icon: Settings,
          simulate: 'performance',
        },
        {
          keys: ['Alt', 'G'],
          action: t('shortcuts.toggleDrive', '開啟 Google Drive 雲端檔案庫 / Google Drive Storage'),
          description: t('shortcuts.toggleDriveDesc', '連接 Google Drive 以備份 AI Studio 工作區域快照與雲端檔案。'),
          icon: HardDrive,
          simulate: 'drive',
        },
        {
          keys: ['Esc'],
          action: t('shortcuts.closeModal', '關閉目前彈出視窗 / Close Modals'),
          description: t('shortcuts.closeModalDesc', '快速關閉主選單、備份歷史或設置窗格。'),
          icon: X,
          simulate: 'esc',
        },
      ],
    },
    {
      title: t('shortcuts.catNavigation', '功能導覽 / Feature Hub Navigation'),
      items: [
        {
          keys: [isMac ? '⌥' : 'Alt', 'D'],
          action: t('shortcuts.navDashboard', '導覽至 儀表板首頁 / Dashboard Home'),
          description: t('shortcuts.navDashboardDesc', '返回總覽，檢視算力消耗與精選功能快速啟動。'),
          icon: Compass,
          simulate: 'dashboard',
        },
        {
          keys: [isMac ? '⌥' : 'Alt', 'C'],
          action: t('shortcuts.navChat', '導覽至 AI 對話功能 / Chatbot Agent'),
          description: t('shortcuts.navChatDesc', '啟動強大的智慧助理，支持多國語言與編碼解答。'),
          icon: MessageSquare,
          simulate: 'chat',
        },
        {
          keys: [isMac ? '⌥' : 'Alt', 'I'],
          action: t('shortcuts.navCanvas', '功能捷徑: 協作協同畫布 / Infinite Canvas'),
          description: t('shortcuts.navCanvasDesc', '載入主創想協作畫布，享受拖曳排版與便利貼空間。'),
          icon: Layers,
          simulate: 'infinite-canvas',
        },
        {
          keys: [isMac ? '⌥' : 'Alt', 'V'],
          action: t('shortcuts.navVideo', '快速移動: AI 影片生成 / Video Generator'),
          description: t('shortcuts.navVideoDesc', '輸入描述或拖入參考圖片，快捷開啟影格渲染面板。'),
          icon: Video,
          simulate: 'video-gen',
        },
        {
          keys: [isMac ? '⌥' : 'Alt', 'G'],
          action: t('shortcuts.navImage', '快速移動: 精緻圖像生成 / Image Generator'),
          description: t('shortcuts.navImageDesc', '快捷啟用多款卓越圖像，包含美學渲染模式。'),
          icon: Image,
          simulate: 'image-gen',
        },
      ],
    },
    {
      title: t('shortcuts.catPanels', '面板與設置 / Panels & System Control'),
      items: [
        {
          keys: [isMac ? '⌥' : 'Alt', 'H'],
          action: t('shortcuts.toggleHistory', '展開或收攏歷史備份 / Toggle History Panel'),
          description: t('shortcuts.toggleHistoryDesc', '開啟右側歷史記錄面板，查詢您先前的創作存檔。'),
          icon: History,
          simulate: 'history',
        },
        {
          keys: [isMac ? '⌥' : 'Alt', 'S'],
          action: t('shortcuts.toggleSettings', '呼叫使用者帳戶設定 / Open Profile Settings'),
          description: t('shortcuts.toggleSettingsDesc', '配置首選 AI 模型、色彩主題與資料同步狀態。'),
          icon: Settings,
          simulate: 'settings',
        },
      ],
    },
    {
      title: t('shortcuts.catSpecialized', '精選特定狀態 / Canvas Controls'),
      items: [
        {
          keys: ['Spacebar'],
          action: t('shortcuts.spacePan', '鍵盤空白鍵：畫布漫遊抓手 / Infinite canvas pan tool'),
          description: t('shortcuts.spacePanDesc', '在協作畫布中按住空白鍵時，滑鼠將切換至抓手模式。'),
          icon: Compass,
          simulate: 'canvas-pan',
        },
      ],
    },
  ];

  const handleSimulateAction = (actionType: string) => {
    onClose();
    setTimeout(() => {
      switch (actionType) {
        case 'dashboard':
        case 'chat':
        case 'infinite-canvas':
        case 'video-gen':
        case 'image-gen':
          onSelectFeature(actionType as FeatureId);
          break;
        case 'search':
          window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: 'k' }));
          break;
        case 'history':
          onToggleHistory();
          break;
        case 'settings':
          onToggleSettings();
          break;
        case 'shortcuts':
          // reopen since we closed it
          window.dispatchEvent(new KeyboardEvent('keydown', { ctrlKey: true, key: '/' }));
          break;
        default:
          break;
      }
    }, 150);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-950/60 backdrop-blur-md"
            onClick={onClose}
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white/95 dark:bg-zinc-900/95 border border-zinc-200/80 dark:border-zinc-800/80 backdrop-blur-md rounded-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-150 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-sm border border-indigo-100/30">
                  <Keyboard size={20} className="animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                    {t('shortcuts.modalTitle', '快捷鍵極速操作面板')}
                    <span className="text-[10px] bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 font-mono font-medium px-2 py-0.5 rounded-full border border-indigo-200/30">
                      v1.4.2
                    </span>
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    {t('shortcuts.modalDesc', '善用鍵盤組合鍵快速跨功能瞬移，提升 200% 人機協作效率。')}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* List */}
            <div className="p-6 overflow-y-auto space-y-6">
              {categories.map((category, catIdx) => (
                <div key={catIdx} className="space-y-3">
                  <h4 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-widest font-mono flex items-center gap-2">
                    <span>{category.title}</span>
                    <span className="h-px flex-1 bg-zinc-150 dark:bg-zinc-800/80"></span>
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {category.items.map((item, itemIdx) => {
                      const IconComponent = item.icon;
                      return (
                        <div
                          key={itemIdx}
                          onClick={() => handleSimulateAction(item.simulate)}
                          className="group relative flex flex-col justify-between p-3 bg-white dark:bg-zinc-950 border border-zinc-150 dark:border-zinc-850 hover:border-indigo-200 dark:hover:border-indigo-900/50 hover:shadow-xs rounded-2xl transition-all cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            <div className="p-1.5 rounded-lg bg-zinc-100/50 dark:bg-zinc-900 text-zinc-500 dark:text-zinc-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                              <IconComponent size={14} />
                            </div>
                            <div className="space-y-0.5">
                              <h5 className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors flex items-center gap-1">
                                {item.action}
                                <ArrowUpRight size={10} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all text-indigo-400" />
                              </h5>
                              <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-light leading-snug">
                                {item.description}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center justify-end mt-2.5 pt-2 border-t border-dashed border-zinc-100 dark:border-zinc-900">
                            <span className="text-[9px] text-zinc-400 font-mono tracking-wide uppercase mr-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              {t('shortcuts.clickToTrigger', '點擊直接模擬發送')}
                            </span>
                            <div className="flex items-center gap-1">
                              {item.keys.map((key, kIdx) => (
                                <React.Fragment key={kIdx}>
                                  <kbd className="min-w-[20px] h-5 px-1.5 flex items-center justify-center text-[10px] font-bold font-mono text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 shadow-[0_1.5px_0_rgba(0,0,0,0.06)] dark:shadow-[0_1.5px_0_rgba(255,255,255,0.04)] rounded-md">
                                    {key}
                                  </kbd>
                                  {kIdx < item.keys.length - 1 && (
                                    <span className="text-zinc-300 dark:text-zinc-600 text-[9px] font-mono">+</span>
                                  )}
                                </React.Fragment>
                              ))}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950/20 border-t border-zinc-150 dark:border-zinc-800 flex items-center justify-between text-[11px] text-zinc-400">
              <span className="flex items-center gap-1">
                <Command size={12} />
                <span>{t('shortcuts.tips', '提示：點選任何快捷卡片，可直接瞬移切換對應功能。')}</span>
              </span>
              <span className="font-mono">{isMac ? 'Macintosh' : 'Windows'} Layout</span>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
