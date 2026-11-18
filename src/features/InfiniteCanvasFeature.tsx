import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useHistory } from '../contexts/HistoryContext';
import {
  Move,
  Hand,
  Maximize2,
  Minimize2,
  Plus,
  PlusCircle,
  Trash2,
  Copy,
  Grid,
  Image,
  Video,
  FileText,
  Check,
  ExternalLink,
  RotateCcw,
  Users,
  Layers,
  ArrowUp,
  ArrowDown,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Link2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import Markdown from 'react-markdown';

interface CanvasNode {
  id: string;
  workspaceId: string;
  type: 'image' | 'video' | 'text';
  title: string;
  content: string;
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  creatorId: string;
  creatorName: string;
  backgroundColor?: string;
  createdAt: any;
  updatedAt: any;
}

const PRESET_COLORS = [
  { name: '淡黃 (Yellow)', value: 'bg-amber-100/90 border-amber-300 dark:bg-amber-950/40 dark:border-amber-800 text-neutral-800 dark:text-amber-200' },
  { name: '淡綠 (Green)', value: 'bg-emerald-100/90 border-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800 text-neutral-800 dark:text-emerald-200' },
  { name: '淡藍 (Blue)', value: 'bg-sky-100/90 border-sky-300 dark:bg-sky-950/40 dark:border-sky-800 text-neutral-800 dark:text-sky-200' },
  { name: '紫羅蘭 (Purple)', value: 'bg-purple-100/90 border-purple-300 dark:bg-purple-950/40 dark:border-purple-800 text-neutral-800 dark:text-purple-200' },
  { name: '微風黑 (Dark)', value: 'bg-zinc-800/95 border-zinc-700 dark:bg-zinc-900/95 dark:border-zinc-800 text-white dark:text-zinc-200' },
  { name: '玻璃白 (Glass)', value: 'bg-white/70 border-white/40 dark:bg-zinc-950/40 dark:border-zinc-800 text-neutral-800 dark:text-neutral-200' },
];

export default function InfiniteCanvasFeature() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const { history } = useHistory();

  // Workspace Configurations
  const [activeWorkspace, setActiveWorkspace] = useState(() => {
    return localStorage.getItem('co_active_canvas_workspace') || 'Default Workspace';
  });
  const [workspaceInput, setWorkspaceInput] = useState('');
  const [isSwitchingWorkspace, setIsSwitchingWorkspace] = useState(false);

  // Viewport Coordinates state
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [activeTool, setActiveTool] = useState<'select' | 'hand'>('select');
  const [isSpacePressed, setIsSpacePressed] = useState(false);

  // Firestore sync state
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Manual Note Modal/State
  const [isAddNodeOpen, setIsAddNodeOpen] = useState(false);
  const [manualNoteType, setManualNoteType] = useState<'text' | 'image' | 'video'>('text');
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualColor, setManualColor] = useState(PRESET_COLORS[0].value);

  // Sidebar history state
  const [searchHistoryTerm, setSearchHistoryTerm] = useState('');
  const [selectedHistoryCategory, setSelectedHistoryCategory] = useState<'all' | 'image' | 'video' | 'chat'>('all');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Media inspection modal
  const [inspectNode, setInspectNode] = useState<CanvasNode | null>(null);

  // Dragging states stored in refs for real-time pointer rendering performance
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; nodeX: number; nodeY: number } | null>(null);
  const resizeRef = useRef<{ id: string; startX: number; startY: number; startWidth: number; startHeight: number } | null>(null);
  const panRef = useRef<{ startX: number; startY: number; panX: number; panY: number } | null>(null);

  // Live copy action toast feedback
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Detect Spacebar for Hand/Pan tool bypass
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  // Save active workspace locally
  useEffect(() => {
    localStorage.setItem('co_active_canvas_workspace', activeWorkspace);
  }, [activeWorkspace]);

  // Synchronise Canvas nodes in real time
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'canvas_nodes'),
      where('workspaceId', '==', activeWorkspace)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedNodes: CanvasNode[] = [];
      snapshot.forEach((doc) => {
        fetchedNodes.push({ id: doc.id, ...doc.data() } as CanvasNode);
      });
      // Sort to render elements cleanly based on zIndex
      fetchedNodes.sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));
      setNodes(fetchedNodes);
    }, (error) => {
      console.error('Real-time canvas loading failure:', error);
    });

    return unsubscribe;
  }, [activeWorkspace, currentUser]);

  // Viewport coordinates center algorithm
  const getCenterCoordinates = useCallback((customWidth = 320, customHeight = 220) => {
    if (!containerRef.current) return { x: 50, y: 50 };
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    return {
      x: Math.round((centerX - panX) / zoom - customWidth / 2),
      y: Math.round((centerY - panY) / zoom - customHeight / 2)
    };
  }, [panX, panY, zoom]);

  // Add items onto the canvas DB
  const handleAddNewNode = async (
    type: 'image' | 'video' | 'text',
    title: string,
    content: string,
    bgColor?: string,
    customX?: number,
    customY?: number
  ) => {
    if (!currentUser) return;

    const spawnWidth = type === 'text' ? 280 : 320;
    const spawnHeight = type === 'text' ? 200 : 260;
    const { x, y } = (customX !== undefined && customY !== undefined)
      ? { x: customX, y: customY }
      : getCenterCoordinates(spawnWidth, spawnHeight);

    // Calculate maximum z-index to place item on top
    const maxZ = nodes.reduce((max, node) => Math.max(max, node.zIndex || 0), 0);

    try {
      await addDoc(collection(db, 'canvas_nodes'), {
        workspaceId: activeWorkspace,
        type,
        title: title || 'New Node',
        content,
        x,
        y,
        width: spawnWidth,
        height: spawnHeight,
        zIndex: maxZ + 1,
        creatorId: currentUser.uid,
        creatorName: currentUser.displayName || 'Contributor',
        backgroundColor: bgColor || (type === 'text' ? PRESET_COLORS[0].value : ''),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to create canvas node:', e);
    }
  };

  // Switch/Join workspaces
  const handleJoinWorkspace = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceInput.trim()) return;
    setActiveWorkspace(workspaceInput.trim());
    setWorkspaceInput('');
    setIsSwitchingWorkspace(false);
    setSelectedNodeId(null);
  };

  // Edit / DoubleClick text Note inline saves
  const handleSaveTextContent = async (nodeId: string, updatedText: string) => {
    try {
      const nodeRef = doc(db, 'canvas_nodes', nodeId);
      await updateDoc(nodeRef, {
        content: updatedText,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Failed to save text update:', e);
    }
  };

  // Node duplication
  const handleDuplicateNode = async (node: CanvasNode) => {
    if (!currentUser) return;
    const maxZ = nodes.reduce((max, n) => Math.max(max, n.zIndex || 0), 0);
    try {
      await addDoc(collection(db, 'canvas_nodes'), {
        ...node,
        id: undefined, // Let Firestore generate new ID
        x: node.x + 30, // Offset to make user notice duplication
        y: node.y + 30,
        zIndex: maxZ + 1,
        creatorId: currentUser.uid,
        creatorName: currentUser.displayName || 'Contributor',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Duplication failure:', e);
    }
  };

  // Node deletion
  const handleDeleteNode = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'canvas_nodes', id));
      if (selectedNodeId === id) setSelectedNodeId(null);
    } catch (e) {
      console.error('Deletion failure:', e);
    }
  };

  // Node layering (Bring to front / send to back)
  const handleModifyLayer = async (node: CanvasNode, action: 'front' | 'back') => {
    if (nodes.length <= 1) return;
    
    let nextZ = node.zIndex;
    if (action === 'front') {
      const maxZ = nodes.reduce((max, n) => n.id !== node.id ? Math.max(max, n.zIndex || 0) : max, 0);
      nextZ = maxZ + 1;
    } else {
      const minZ = nodes.reduce((min, n) => n.id !== node.id ? Math.min(min, n.zIndex || 0) : min, 0);
      nextZ = minZ - 1;
    }

    try {
      await updateDoc(doc(db, 'canvas_nodes', node.id), {
        zIndex: nextZ,
        updatedAt: serverTimestamp()
      });
    } catch (e) {
      console.error('Layer update failure:', e);
    }
  };

  // Drag and Drop from Sidebar drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    try {
      const dataStr = e.dataTransfer.getData('application/infinite-canvas-history-item');
      if (!dataStr) return;

      const item = JSON.parse(dataStr);
      let mappedType: 'text' | 'image' | 'video' = 'text';
      if (item.tool === 'image-gen' || item.tool === 'edit-image') mappedType = 'image';
      else if (item.tool === 'video-gen' || item.tool === 'animate-image' || item.tool === 'youtube-gen') mappedType = 'video';

      // Capture cursor coordinates on the Canvas Space
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const canvasX = (mouseX - panX) / zoom;
      const canvasY = (mouseY - panY) / zoom;

      const customWidth = mappedType === 'text' ? 280 : 320;
      const customHeight = mappedType === 'text' ? 200 : 260;

      handleAddNewNode(
        mappedType,
        item.prompt || 'Generated Asset',
        item.result,
        mappedType === 'text' ? PRESET_COLORS[5].value : '',
        Math.round(canvasX - customWidth / 2),
        Math.round(canvasY - customHeight / 2)
      );
    } catch (err) {
      console.error('Sidebar asset drag & drop failure:', err);
    }
  };

  // Pointer coordination handles for high fidelity drag & resize loops
  const handleCanvasPointerDown = (e: React.PointerEvent) => {
    // If we click background, clear selection
    if (e.target === containerRef.current || e.target === canvasRef.current) {
      setSelectedNodeId(null);
      // Start background panning with Spacebar or hand tool
      if (activeTool === 'hand' || isSpacePressed || e.button === 1 || e.button === 4) {
        containerRef.current?.setPointerCapture(e.pointerId);
        panRef.current = {
          startX: e.clientX,
          startY: e.clientY,
          panX,
          panY
        };
      }
    }
  };

  const handleNodePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    if (activeTool === 'hand' || isSpacePressed) return; // Ignore drag triggers if we are panning

    e.stopPropagation();
    setSelectedNodeId(node.id);

    // Capture element reference and drag origin coordinates
    const targetElement = e.currentTarget as HTMLElement;
    targetElement.setPointerCapture(e.pointerId);

    dragRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      nodeX: node.x,
      nodeY: node.y
    };
  };

  const handleResizePointerDown = (e: React.PointerEvent, node: CanvasNode) => {
    e.stopPropagation();
    e.preventDefault();

    const targetElement = e.currentTarget as HTMLElement;
    targetElement.setPointerCapture(e.pointerId);

    resizeRef.current = {
      id: node.id,
      startX: e.clientX,
      startY: e.clientY,
      startWidth: node.width || 320,
      startHeight: node.height || 220
    };
  };

  const handleGlobalPointerMove = (e: React.PointerEvent) => {
    // 1. Canvas Background Panning Loop
    if (panRef.current) {
      const dx = e.clientX - panRef.current.startX;
      const dy = e.clientY - panRef.current.startY;
      setPanX(panRef.current.panX + dx);
      setPanY(panRef.current.panY + dy);
      return;
    }

    // 2. Element Drag movement
    if (dragRef.current) {
      const dx = (e.clientX - dragRef.current.startX) / zoom;
      const dy = (e.clientY - dragRef.current.startY) / zoom;
      const targetId = dragRef.current.id;

      // Optimistic instant responsive update in UI
      setNodes((prev) =>
        prev.map((n) =>
          n.id === targetId ? { ...n, x: Math.round(dragRef.current!.nodeX + dx), y: Math.round(dragRef.current!.nodeY + dy) } : n
        )
      );
      return;
    }

    // 3. Resizer dragging loop
    if (resizeRef.current) {
      const dx = (e.clientX - resizeRef.current.startX) / zoom;
      const dy = (e.clientY - resizeRef.current.startY) / zoom;
      const targetId = resizeRef.current.id;

      // Optimistic instant responsive resize update
      setNodes((prev) =>
        prev.map((n) =>
          n.id === targetId
            ? {
                ...n,
                width: Math.max(150, Math.round(resizeRef.current!.startWidth + dx)),
                height: Math.max(120, Math.round(resizeRef.current!.startHeight + dy))
              }
            : n
        )
      );
    }
  };

  const handleGlobalPointerUp = async (e: React.PointerEvent) => {
    // 1. Terminate dragging actions and sync back final snapshot to database
    if (dragRef.current) {
      const targetNode = nodes.find((n) => n.id === dragRef.current!.id);
      if (targetNode) {
        try {
          const docRef = doc(db, 'canvas_nodes', targetNode.id);
          await updateDoc(docRef, {
            x: targetNode.x,
            y: targetNode.y,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error('Failed to sync node position after drag:', err);
        }
      }
      dragRef.current = null;
    }

    // 2. Terminate resizing elements
    if (resizeRef.current) {
      const targetNode = nodes.find((n) => n.id === resizeRef.current!.id);
      if (targetNode) {
        try {
          const docRef = doc(db, 'canvas_nodes', targetNode.id);
          await updateDoc(docRef, {
            width: targetNode.width,
            height: targetNode.height,
            updatedAt: serverTimestamp()
          });
        } catch (err) {
          console.error('Failed to sync resize bounds:', err);
        }
      }
      resizeRef.current = null;
    }

    // 3. Clear Canvas pan pointer focus
    if (panRef.current) {
      panRef.current = null;
    }
  };

  // Zoom management
  const handleZoomIn = () => setZoom((z) => Math.min(3, Math.round((z + 0.1) * 10) / 10));
  const handleZoomOut = () => setZoom((z) => Math.max(0.1, Math.round((z - 0.1) * 10) / 10));
  const handleResetCoordinates = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
  };

  // Filter history entries is useful
  const filteredHistory = history.filter((item) => {
    if (item.isError) return false;
    const matchesSearch = item.prompt.toLowerCase().includes(searchHistoryTerm.toLowerCase());
    
    if (selectedHistoryCategory === 'all') return matchesSearch;
    if (selectedHistoryCategory === 'image') return matchesSearch && (item.tool === 'image-gen' || item.tool === 'edit-image');
    if (selectedHistoryCategory === 'video') return matchesSearch && (item.tool === 'video-gen' || item.tool === 'animate-image' || item.tool === 'youtube-gen');
    if (selectedHistoryCategory === 'chat') return matchesSearch && (item.tool === 'chat' || item.tool === 'fast-chat' || item.tool === 'agent');
    return matchesSearch;
  });

  // Action helper to load history card visually
  const handleSidebarItemClick = (item: any) => {
    let mappedType: 'text' | 'image' | 'video' = 'text';
    if (item.tool === 'image-gen' || item.tool === 'edit-image') mappedType = 'image';
    else if (item.tool === 'video-gen' || item.tool === 'animate-image' || item.tool === 'youtube-gen') mappedType = 'video';

    handleAddNewNode(
      mappedType,
      item.prompt || 'Generated Asset',
      item.result,
      mappedType === 'text' ? PRESET_COLORS[5].value : ''
    );
  };

  // Clipboard copies
  const handleCopyClipboardLink = () => {
    navigator.clipboard.writeText(activeWorkspace);
    setCopiedNotification(true);
    setTimeout(() => {
      setCopiedNotification(false);
    }, 2000);
  };

  return (
    <div className="flex h-[calc(100vh-64px)] w-full overflow-hidden bg-zinc-950 text-sans select-none relative font-sans">
      
      {/* 1. COLLAPSIBLE TOOLBOX SIDEBAR (DRAWER) */}
      <AnimatePresence initial={false}>
        {isSidebarOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 340, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="h-full border-r border-zinc-800/80 bg-zinc-900/98 flex flex-col shrink-0 z-40 relative backdrop-blur-md overflow-hidden"
          >
            {/* Sidebar header */}
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-indigo-400" />
                <span className="text-sm font-semibold tracking-wide text-zinc-100">AI 協作畫布資源庫</span>
              </div>
              <button
                onClick={() => setIsSidebarOpen(false)}
                className="p-1.5 rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-all cursor-pointer"
                title="收合側欄"
              >
                <ChevronLeft size={16} />
              </button>
            </div>

            {/* Switch workspace panel */}
            <div className="p-4 bg-zinc-950/40 border-b border-zinc-800/60 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping mr-1" />
                  <span>目前協作空間：</span>
                </div>
                <button
                  onClick={() => setIsSwitchingWorkspace(!isSwitchingWorkspace)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-medium cursor-pointer"
                >
                  {isSwitchingWorkspace ? '取消' : '切換房間'}
                </button>
              </div>

              {!isSwitchingWorkspace ? (
                <div className="flex items-center justify-between p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60">
                  <span className="text-xs font-semibold text-zinc-200 truncate pr-2" title={activeWorkspace}>
                    {activeWorkspace}
                  </span>
                  <button
                    onClick={handleCopyClipboardLink}
                    className="flex items-center gap-1 py-1 px-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-400 hover:text-white transition cursor-pointer"
                    title="複製協作代碼"
                  >
                    {copiedNotification ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    <span>{copiedNotification ? '已複製' : '複製代碼'}</span>
                  </button>
                </div>
              ) : (
                <form onSubmit={handleJoinWorkspace} className="flex gap-1.5">
                  <input
                    type="text"
                    value={workspaceInput}
                    onChange={(e) => setWorkspaceInput(e.target.value)}
                    placeholder="請輸入協作空間代碼..."
                    maxLength={50}
                    className="flex-1 px-2.5 py-1.5 border border-indigo-700/60 rounded-xl bg-zinc-900 text-xs text-zinc-150 focus:ring-1 focus:ring-indigo-500 outline-none"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition cursor-pointer"
                  >
                    加入
                  </button>
                </form>
              )}
            </div>

            {/* Preset Action toolbox */}
            <div className="p-4 border-b border-zinc-850 space-y-2">
              <p className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">快捷元素面板</p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => {
                    setManualNoteType('text');
                    setManualTitle('便利貼');
                    setManualContent('在這裡雙擊或自行編輯文字備忘錄...');
                    setIsAddNodeOpen(true);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-700 hover:text-white transition cursor-pointer text-xs"
                >
                  <FileText size={14} className="text-amber-400" />
                  <span>新增便利貼</span>
                </button>
                <button
                  onClick={async () => {
                    if (!currentUser) return;
                    handleAddNewNode('text', 'AI 思考總結 (Double click to edit)', '### 🧠 集思廣益\n- 點擊此處進行編輯。可以使用 Markdown 語法格式化內容！', PRESET_COLORS[1].value);
                  }}
                  className="flex items-center gap-2 p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/40 text-zinc-300 hover:bg-zinc-800/50 hover:border-zinc-700 hover:text-white transition cursor-pointer text-xs"
                >
                  <Sparkles size={14} className="text-indigo-400" />
                  <span>範例 Markdown</span>
                </button>
              </div>
            </div>

            {/* Generated asset logs tracker */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="p-4 border-b border-zinc-850 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-zinc-400 tracking-wider uppercase">個人 AI 歷史存檔</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
                    {filteredHistory.length} 筆
                  </span>
                </div>
                <input
                  type="text"
                  placeholder="搜尋提示詞..."
                  value={searchHistoryTerm}
                  onChange={(e) => setSearchHistoryTerm(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-700"
                />

                {/* Sub-categories */}
                <div className="flex gap-1">
                  {(['all', 'image', 'video', 'chat'] as const).map((category) => (
                    <button
                      key={category}
                      onClick={() => setSelectedHistoryCategory(category)}
                      className={`text-[10px] px-2 py-1 rounded-lg border transition-all cursor-pointer ${
                        selectedHistoryCategory === category
                          ? 'bg-zinc-100 text-zinc-900 border-zinc-100 font-medium'
                          : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                      }`}
                    >
                      {category === 'all' && '全部'}
                      {category === 'image' && '圖片'}
                      {category === 'video' && '影片'}
                      {category === 'chat' && '對話'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Asset list */}
              <div className="flex-1 p-4 overflow-y-auto space-y-3 custom-scrollbar">
                {filteredHistory.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-8 text-center text-zinc-650 h-full">
                    <Grid size={24} className="mb-2 stroke-[1.5]" />
                    <span className="text-xs font-medium">查無歷史生成資料</span>
                    <p className="text-[10px] mt-1 max-w-[180px]">
                      您可以先前往其他 AI 生成分頁，成功生成後便可在這裡拖曳貼入畫布！
                    </p>
                  </div>
                ) : (
                  filteredHistory.map((item) => (
                    <div
                      key={item.id}
                      draggable={true}
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/infinite-canvas-history-item', JSON.stringify(item));
                      }}
                      onClick={() => handleSidebarItemClick(item)}
                      className="group p-3 border border-zinc-800/60 bg-zinc-950/65 rounded-xl hover:border-zinc-600 hover:bg-zinc-800/40 relative cursor-pointer active:scale-98 transition duration-200"
                      title="點擊匯入，或將此方塊拖曳至畫布任何角落"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-zinc-800/80 text-zinc-400 border border-zinc-750 truncate max-w-[120px]">
                          {item.tool}
                        </span>
                        <span className="text-[9px] text-zinc-600 font-light truncate">
                          {item.createdAt ? new Date(item.createdAt.seconds * 1000).toLocaleString() : 'Just now'}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-zinc-200 line-clamp-2 leading-snug mb-2 group-hover:text-amber-300">
                        {item.prompt}
                      </p>

                      {/* Display preview based on tool outputs */}
                      {(item.tool === 'image-gen' || item.tool === 'edit-image') && (
                        <div className="w-full h-24 overflow-hidden rounded-lg bg-black border border-zinc-950 relative">
                          <img
                            src={item.result}
                            alt={item.prompt}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                          />
                        </div>
                      )}

                      {(item.tool === 'video-gen' || item.tool === 'animate-image' || item.tool === 'youtube-gen') && (
                        <div className="w-full h-24 overflow-hidden rounded-lg bg-neutral-900 border border-zinc-800/80 flex items-center justify-center relative">
                          <Video size={16} className="text-zinc-500 absolute top-2 right-2" />
                          <video
                            src={item.result}
                            className="w-full h-full object-cover"
                            muted
                            playsInline
                          />
                        </div>
                      )}

                      {(item.tool === 'chat' || item.tool === 'fast-chat' || item.tool === 'agent') && (
                        <div className="p-2 border border-dashed border-zinc-800/50 bg-zinc-950 rounded text-[11px] text-zinc-400 line-clamp-3 leading-relaxed font-mono">
                          {item.result}
                        </div>
                      )}

                      {/* Drag hover overlay signal */}
                      <div className="absolute right-2 bottom-2 bg-zinc-900 border border-zinc-700/60 rounded-lg p-1.5 opacity-0 group-hover:opacity-100 transition shadow cursor-grab active:cursor-grabbing">
                        <Move size={12} className="text-zinc-400 hover:text-white" />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 2. MAIN INFINITE CANVAS ENGINE WORKSPACE */}
      <div
        id="canv_container"
        ref={containerRef}
        onPointerDown={handleCanvasPointerDown}
        onPointerMove={handleGlobalPointerMove}
        onPointerUp={handleGlobalPointerUp}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex-1 h-full relative overflow-hidden outline-none ${
          isSpacePressed || activeTool === 'hand'
            ? 'cursor-grab active:cursor-grabbing'
            : 'cursor-default'
        }`}
      >
        {/* Repeating dot pattern background layered internally and scaled with panX, panY, zoom */}
        <div
          id="canv_stage"
          ref={canvasRef}
          style={{
            transform: `translate3d(${panX}px, ${panY}px, 0) scale(${zoom})`,
            transformOrigin: '0 0',
          }}
          className="absolute inset-0 w-full h-full pointer-events-none z-10"
        >
          {/* Repeating coordinate lines visual grid */}
          <div
            style={{
              position: 'absolute',
              width: '100000px',
              height: '100000px',
              left: '-50000px',
              top: '-50000px',
              backgroundImage: 'radial-gradient(circle, rgba(255, 255, 255, 0.08) 1.5px, transparent 1.5px)',
              backgroundSize: '28px 28px',
            }}
          />

          {/* RENDERING INDIVIDUAL NODES */}
          {nodes.map((node) => {
            const isSelected = selectedNodeId === node.id;
            return (
              <div
                key={node.id}
                onPointerDown={(e) => handleNodePointerDown(e, node)}
                style={{
                  position: 'absolute',
                  left: `${node.x}px`,
                  top: `${node.y}px`,
                  width: `${node.width || 320}px`,
                  height: `${node.height || 220}px`,
                  zIndex: node.zIndex || 1,
                  pointerEvents: 'auto',
                }}
                className={`group/node flex flex-col rounded-2xl border transition-[shadow] transition-colors duration-150 shadow-lg ${
                  isSelected
                    ? 'ring-2 ring-indigo-500 ring-offset-2 ring-offset-zinc-950 border-transparent shadow-xl shadow-indigo-500/10'
                    : 'border-zinc-800/80 hover:border-zinc-650'
                } ${node.backgroundColor || 'bg-zinc-900/90 dark:bg-zinc-950/90 border-zinc-800 text-zinc-100'}`}
              >
                {/* Node Title header (Grab area) */}
                <div className="px-3.5 py-2.5 border-b border-white/5 dark:border-white/5 flex items-center justify-between pointer-events-none bg-black/10 select-none rounded-t-2xl">
                  <div className="flex items-center gap-1.5 truncate max-w-[180px]">
                    {node.type === 'image' && <Image size={13} className="text-emerald-400 shrink-0" />}
                    {node.type === 'video' && <Video size={13} className="text-rose-450 shrink-0" />}
                    {node.type === 'text' && <FileText size={13} className="text-amber-400 shrink-0" />}
                    <span className="text-[11px] font-semibold tracking-wide truncate">
                      {node.title || 'Untitled Node'}
                    </span>
                  </div>
                  <span className="text-[8px] font-mono shrink-0 px-1 py-0.5 rounded bg-black/25 text-zinc-400 opacity-60 group-hover/node:opacity-100 transition-opacity">
                    {node.creatorName || 'Member'}
                  </span>
                </div>

                {/* Node Main content rendering container */}
                <div className="flex-1 overflow-hidden p-3 relative flex flex-col justify-between">
                  {node.type === 'image' ? (
                    <div className="w-full h-full overflow-hidden rounded-xl bg-black/60 relative border border-white/5 group">
                      <img
                        src={node.content}
                        alt={node.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-contain cursor-zoom-in"
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectNode(node);
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition duration-200 flex items-end p-2 pointer-events-none">
                        <p className="text-[10px] text-zinc-300 leading-normal line-clamp-2">
                          {node.title}
                        </p>
                      </div>
                    </div>
                  ) : node.type === 'video' ? (
                    <div className="w-full h-full overflow-hidden rounded-xl bg-neutral-950 flex items-center justify-center relative border border-white/5">
                      <video
                        src={node.content}
                        className="w-full h-full object-contain"
                        controls
                        muted
                        playsInline
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setInspectNode(node);
                        }}
                        className="absolute top-2 right-2 p-1 rounded-lg bg-black/60 border border-zinc-800 text-zinc-300 hover:text-white hover:scale-105 transition cursor-pointer"
                        title="全螢幕檢視"
                      >
                        <ExternalLink size={11} />
                      </button>
                    </div>
                  ) : (
                    <div className="w-full h-full overflow-y-auto custom-scrollbar select-text pr-1">
                      {/* Interactive inline editing for text convenient items */}
                      {isSelected ? (
                        <textarea
                          value={node.content}
                          onPointerDown={(e) => e.stopPropagation()} // Prevent drag triggering
                          onChange={(e) => handleSaveTextContent(node.id, e.target.value)}
                          className="w-full h-full p-1.5 border-0 bg-transparent text-xs text-inherit font-light leading-relaxed outline-none resize-none font-mono focus:ring-0 focus:ring-offset-0 placeholder:text-zinc-500"
                          placeholder="在此處寫入內容..."
                        />
                      ) : (
                        <div className="markdown-body text-xs font-light tracking-wide leading-relaxed prose prose-invert max-w-none">
                          <Markdown>{node.content}</Markdown>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* LAYOUT CONTEXT CONTROLS - Displayed ONLY when item card is selected */}
                {isSelected && (
                  <div
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -top-11 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-1 bg-zinc-900/98 border border-zinc-800 rounded-xl shadow-xl z-50 pointer-events-auto"
                  >
                    <button
                      onClick={() => handleModifyLayer(node, 'front')}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                      title="置於最上層"
                    >
                      <ArrowUp size={13} />
                    </button>
                    <button
                      onClick={() => handleModifyLayer(node, 'back')}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
                      title="置於最下層"
                    >
                      <ArrowDown size={13} />
                    </button>
                    <div className="w-px h-4 bg-zinc-800" />
                    <button
                      onClick={() => handleDuplicateNode(node)}
                      className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-400 hover:bg-zinc-800 transition cursor-pointer"
                      title="複製此節點"
                    >
                      <Copy size={13} />
                    </button>

                    {/* Change Note Color Options (For notes) */}
                    {node.type === 'text' && (
                      <div className="flex gap-1 px-1">
                        {PRESET_COLORS.slice(0, 4).map((c, idx) => (
                          <button
                            key={idx}
                            onClick={async () => {
                              try {
                                await updateDoc(doc(db, 'canvas_nodes', node.id), {
                                  backgroundColor: c.value,
                                  updatedAt: serverTimestamp()
                                });
                              } catch (e) {
                                console.error(e);
                              }
                            }}
                            className={`w-3.5 h-3.5 rounded-full border border-black/35 cursor-pointer ${c.value.split(' ')[0]}`}
                            title={c.name}
                          />
                        ))}
                      </div>
                    )}

                    <div className="w-px h-4 bg-zinc-800" />
                    <button
                      onClick={() => handleDeleteNode(node.id)}
                      className="p-1.5 rounded-lg text-zinc-450 hover:text-rose-500 hover:bg-zinc-800 transition cursor-pointer"
                      title="刪除"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                )}

                {/* Bottom Right Resize Handle (Shown ONLY when item block is selected) */}
                {isSelected && (
                  <div
                    onPointerDown={(e) => handleResizePointerDown(e, node)}
                    className="absolute bottom-0 right-0 w-6 h-6 cursor-se-resize flex items-end justify-end p-0.5 rounded-br-2xl pointer-events-auto group/resize"
                    title="拖拽調整大小"
                  >
                    <svg
                      width="8px"
                      height="8px"
                      viewBox="0 0 100 100"
                      className="fill-zinc-500 group-hover/resize:fill-indigo-400 mr-1 mb-1 transition duration-150"
                    >
                      <polygon points="100,0 0,100 100,100" />
                    </svg>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* 3. FLOAT TRAY HUD INTERACTION PANELS */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-30 pointer-events-auto">
          {/* Sidebar Toggle handle */}
          {!isSidebarOpen && (
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 border border-zinc-800 bg-zinc-900/95 backdrop-blur-sm rounded-xl text-xs font-semibold text-zinc-300 hover:text-white transition shadow duration-150 cursor-pointer"
            >
              <ChevronRight size={14} className="text-zinc-400" />
              <span>打開面板資源庫</span>
            </button>
          )}

          {/* Quick HUD controls */}
          <div className="flex items-center gap-1.5 p-1 border border-zinc-800 bg-zinc-900/90 backdrop-blur-md rounded-2xl shadow-xl">
            {/* Tool selectors */}
            <button
              onClick={() => setActiveTool('select')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                activeTool === 'select' && !isSpacePressed
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="選擇與編輯 (V)"
            >
              <Move size={15} />
            </button>
            <button
              onClick={() => setActiveTool('hand')}
              className={`p-2 rounded-xl transition cursor-pointer ${
                activeTool === 'hand' || isSpacePressed
                  ? 'bg-zinc-100 text-zinc-900'
                  : 'text-zinc-400 hover:text-white'
              }`}
              title="手形拖曳視角 (H)"
            >
              <Hand size={15} />
            </button>

            <div className="w-px h-5 bg-zinc-800" />

            {/* Scale operations */}
            <button
              onClick={handleZoomOut}
              className="p-2 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
              title="縮小"
            >
              <Minimize2 size={14} />
            </button>
            <span className="text-[10px] font-mono text-zinc-300 px-1 select-none font-semibold">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={handleZoomIn}
              className="p-2 rounded-xl text-zinc-400 hover:text-white transition cursor-pointer"
              title="放大"
            >
              <Maximize2 size={14} />
            </button>

            <div className="w-px h-5 bg-zinc-800" />

            <button
              onClick={handleResetCoordinates}
              className="p-2 rounded-xl text-zinc-400 hover:text-white transition hover:text-amber-400 cursor-pointer"
              title="重設並居中視角 (R)"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {/* 4. CANVAS POSITION MAPPERS CORNER BAR */}
        <div className="absolute bottom-4 left-4 z-30 pointer-events-none text-zinc-550 font-mono text-[10px] select-none">
          <span>X: {panX} | Y: {panY}</span>
          <span className="ml-3 hidden sm:inline">・ 提示: 按住 Spacebar 可隨時拖曳地圖</span>
        </div>

        {/* 5. ADD CONVENIENT STICKY NOTE MODAL COMPONENT */}
        <AnimatePresence>
          {isAddNodeOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 border border-zinc-800/20"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="w-full max-w-md border border-zinc-805 bg-zinc-900 rounded-3xl overflow-hidden shadow-2xl flex flex-col p-6 space-y-4"
              >
                <div className="flex justify-between items-center pb-2 border-b border-zinc-800">
                  <span className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                    <PlusCircle size={16} className="text-indigo-400" />
                    <span>手動新增外部元素</span>
                  </span>
                  <button
                    onClick={() => setIsAddNodeOpen(false)}
                    className="text-xs text-zinc-500 hover:text-zinc-200 cursor-pointer"
                  >
                    取消
                  </button>
                </div>

                {/* Sub type selects */}
                <div className="flex gap-1.5 p-1 bg-zinc-950 rounded-xl">
                  {(['text', 'image', 'video'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => setManualNoteType(type)}
                      className={`flex-1 py-1.5 text-xs text-center rounded-lg font-medium transition duration-200 cursor-pointer ${
                        manualNoteType === type
                          ? 'bg-zinc-850 text-white shadow'
                          : 'text-zinc-450 hover:text-zinc-200'
                      }`}
                    >
                      {type === 'text' && '備忘與 Markdown'}
                      {type === 'image' && '圖片連結'}
                      {type === 'video' && '影片連結'}
                    </button>
                  ))}
                </div>

                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">標題欄位</label>
                    <input
                      type="text"
                      placeholder="請輸入短節點標題 (選填)..."
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-medium text-zinc-400">
                      {manualNoteType === 'text' ? '備忘錄內容' : '連結 URL 網址'}
                    </label>
                    <textarea
                      placeholder={
                        manualNoteType === 'text'
                          ? '支援完整 Markdown 寫法。雙擊畫布項目也可即時修改內容...'
                          : '請貼上合法的靜態媒體 URL：如 https://images.../abc.png'
                      }
                      value={manualContent}
                      onChange={(e) => setManualContent(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-zinc-800 bg-zinc-950 text-xs text-zinc-200 outline-none focus:ring-1 focus:ring-indigo-500 h-28 resize-none"
                    />
                  </div>

                  {/* Preset Colors select for convenient items */}
                  {manualNoteType === 'text' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-zinc-400">便利貼背景顏色</label>
                      <div className="grid grid-cols-3 gap-2">
                        {PRESET_COLORS.map((c) => (
                          <button
                            key={c.name}
                            type="button"
                            onClick={() => setManualColor(c.value)}
                            className={`flex items-center justify-center p-2 rounded-xl border text-[10px] truncate transition duration-150 cursor-pointer ${
                              manualColor === c.value
                                ? 'ring-2 ring-indigo-500 border-white text-zinc-100 shadow'
                                : 'border-zinc-800 hover:border-zinc-700 text-zinc-400'
                            }`}
                          >
                            <span className={`w-2.5 h-2.5 rounded-full mr-1.5 shadow-sm ${c.value.split(' ')[0]}`} />
                            <span className="truncate">{c.name.split(' ')[0]}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (!manualContent.trim()) return;
                    handleAddNewNode(manualNoteType, manualTitle || 'New Element', manualContent.trim(), manualColor);
                    setIsAddNodeOpen(false);
                    setManualTitle('');
                    setManualContent('');
                  }}
                  disabled={!manualContent.trim()}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition shadow disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.01] active:scale-95 duration-150 cursor-pointer"
                >
                  新增到協作空間
                </button>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 6. FULLSIZE SPECIFIC MEDIA VIEW DIALOG */}
        <AnimatePresence>
          {inspectNode && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setInspectNode(null)}
              className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-4 z-50"
            >
              <div className="absolute top-4 right-4 flex items-center gap-3 z-50">
                <span className="text-xs font-semibold text-zinc-200 bg-zinc-900 border border-zinc-800 px-3 py-1.5 rounded-xl">
                  {inspectNode.title}
                </span>
                <button
                  onClick={() => setInspectNode(null)}
                  className="px-3.5 py-1.5 rounded-xl bg-zinc-100 text-zinc-950 font-bold hover:bg-white text-xs transition cursor-pointer"
                >
                  返回畫布
                </button>
              </div>

              <div className="w-full max-w-4xl max-h-[80vh] flex items-center justify-center rounded-2xl overflow-hidden shadow-2xl relative border border-zinc-800 bg-neutral-950">
                {inspectNode.type === 'image' ? (
                  <img
                    src={inspectNode.content}
                    alt={inspectNode.title}
                    referrerPolicy="no-referrer"
                    className="max-w-full max-h-[75vh] object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <video
                    src={inspectNode.content}
                    className="max-w-full max-h-[75vh] object-contain"
                    controls
                    autoPlay
                    playsInline
                    onClick={(e) => e.stopPropagation()}
                  />
                )}
              </div>

              {inspectNode.title && (
                <p className="mt-4 text-xs font-light text-zinc-450 text-center max-w-xl line-clamp-3 leading-relaxed">
                  提示詞 Prompt: <span className="text-zinc-300 font-mono italic">{inspectNode.title}</span>
                </p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
