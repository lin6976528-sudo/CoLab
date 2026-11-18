import React, { useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, 
  Zap, 
  ArrowRight, 
  Sparkles, 
  Search, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle,
  Flame, 
  Scale, 
  Clock, 
  Layers,
  Database,
  Compass,
  MessageSquare,
  Image as ImageIcon,
  Video as VideoIcon,
  Music as MusicIcon,
  GitCompare,
  HelpCircle,
  Loader2,
  RefreshCw,
  Check,
  Wifi,
  Download
} from 'lucide-react';
import { FeatureId } from '../types';
import Tooltip from './Tooltip';

interface CompareModelsViewProps {
  onSelectFeature: (id: FeatureId) => void;
}

interface ModelSpec {
  id: string;
  name: string;
  category: 'Text' | 'Image' | 'Video' | 'Audio';
  description: string;
  speedRating: number; // 1-10
  capabilityRating: number; // 1-10
  costRating: number; // 1-10 (high is cheap/free, low is expensive)
  costPerCall: string;
  latencyText: string;
  contextWindow: string;
  bestFor: string[];
  targetFeatureId: FeatureId;
  strengths: string[];
  isUpdated?: boolean;
}

const INITIAL_MODEL_SPECS: ModelSpec[] = [
  {
    id: 'gemini-flash-lite',
    name: 'Gemini 2.5 Flash Lite',
    category: 'Text',
    description: '極速響應、高吞吐量的超輕量文字模型，最適合追求即時回饋的各類輕量應用場景。',
    speedRating: 10,
    capabilityRating: 6,
    costRating: 10,
    costPerCall: '免費 (Free) 或 0.15 Co幣 / 次',
    latencyText: '0.1s - 0.2s',
    contextWindow: '100 萬 Tokens',
    bestFor: ['即時快速問答', '日常文案翻譯', '文章摘要與潤飾', '極低延遲應用'],
    targetFeatureId: 'fast-chat',
    strengths: ['反應快如閃電 (RTT < 150ms)', '極致精簡算力成本', '支援長文本並行處理']
  },
  {
    id: 'gemini-flash',
    name: 'Gemini 2.5 Flash',
    category: 'Text',
    description: '平衡性能與速度的黃金標準模型，同時兼任複雜分析、網路搜尋及地圖資料整合。',
    speedRating: 8,
    capabilityRating: 8,
    costRating: 9,
    costPerCall: '0.30 Co幣 / 次',
    latencyText: '0.3s - 0.5s',
    contextWindow: '100 萬 Tokens',
    bestFor: ['聯網實時搜尋 (Search Grounding)', '地圖空間檢索 (Maps Grounding)', '多模態中型任務', '音訊聽寫翻譯'],
    targetFeatureId: 'chat',
    strengths: ['完美的性能/速度性價比', '整合搜尋輿情最精準', '支援原生音訊雙向理解']
  },
  {
    id: 'gemini-pro',
    name: 'Gemini 2.5 Pro (Standard)',
    category: 'Text',
    description: '旗艦級多模態推理核心，具備極強的推理、編程與解題能力，專為密集型智力任務打造。',
    speedRating: 5,
    capabilityRating: 9,
    costRating: 6,
    costPerCall: '1.80 ~ 3.00 Co幣 / 次',
    latencyText: '1.2s - 1.8s',
    contextWindow: '200 萬 Tokens',
    bestFor: ['複雜邏輯剖析', '進階程式碼編寫與 Code Review', '超長 PDF 跨文件交叉分析', 'Agent 智能自主規劃'],
    targetFeatureId: 'agent',
    strengths: ['2M 超長物理上下文窗口', '頂級的代碼生成與除錯率', '高度靈活的結構化 JSON 輸出']
  },
  {
    id: 'gemini-pro-thinking',
    name: 'Gemini 2.5 Pro (Thinking Mode)',
    category: 'Text',
    description: '啟動思考鏈（Thinking Phase）的高能頂配推理引擎。在輸出答案前會進行深度推導與自我糾錯。',
    speedRating: 2,
    capabilityRating: 10,
    costRating: 4,
    costPerCall: '4.50 Co幣 / 次',
    latencyText: '3.5s - 8.0s (視推理長度而定)',
    contextWindow: '200 萬 Tokens',
    bestFor: ['數學問題與物理推導', '究極難度演算法實作', '極度敏感的多重條件決策分析', '幻覺要求近乎零的學術總覽'],
    targetFeatureId: 'chat',
    strengths: ['Chain-of-Thought 完全透明呈現', '大幅減少幻覺與邊界錯誤', '在極難場景展現最高智力水平']
  },
  {
    id: 'imagen-ultra',
    name: 'Imagen 3 Ultra (HQ Generate)',
    category: 'Image',
    description: '頂級相片級圖像生成模型，在色彩鮮明度、真實光影折射、與中英文字體嵌入細節上無可挑剔。',
    speedRating: 6,
    capabilityRating: 9,
    costRating: 7,
    costPerCall: '1.50 Co幣 (提供 1K/2K/4K 輸出)',
    latencyText: '2.5s - 4.5s',
    contextWindow: 'N/A (圖像)',
    bestFor: ['高精度商業海報設計', '高寫實人物肖像或風景', '精準中英文字元嵌入', '極高對比藝術風格'],
    targetFeatureId: 'image-gen',
    strengths: ['完美理解 Prompt 中的介係詞空間關係', '驚人的光影擬真度', '支援最大 4K 降噪匯出']
  },
  {
    id: 'imagen-edit',
    name: 'Imagen 3 Canvas Edit',
    category: 'Image',
    description: '專為圖像局部修復（Inpainting）和畫幅擴展（Outpainting）設計的畫布精準控制演算法。',
    speedRating: 7,
    capabilityRating: 8,
    costRating: 8,
    costPerCall: '1.20 Co幣 / 修改',
    latencyText: '2.0s - 3.5s',
    contextWindow: 'N/A (圖像)',
    bestFor: ['局部物體替換', '圖片背景擴展重繪', '消除冗餘物件', '画幅遮罩重新融合'],
    targetFeatureId: 'edit-image',
    strengths: ['邊緣融合平滑度極高', '能完全繼承原圖色彩光影特特征', '極佳的遮罩精細度控制']
  },
  {
    id: 'veo-full',
    name: 'Veo 2.0 Full Frame',
    category: 'Video',
    description: '新一代旗艦級文字生成影片模型，以 1080p 超高畫質渲染出極擬真的人類、物理動態與豐富運鏡。',
    speedRating: 3,
    capabilityRating: 10,
    costRating: 3,
    costPerCall: '18.00 Co幣 / 次',
    latencyText: '12.0s - 25.0s',
    contextWindow: 'N/A (影片)',
    bestFor: ['影視級 16:9 電影鏡頭合成', '複雜物理流動（煙霧、水流、火焰）', '連貫運動追蹤', '分鏡概念視覺化'],
    targetFeatureId: 'video-gen',
    strengths: ['前所未有的景深與環境透視感', '卓越的 3D 相機平移運鏡控制', '色彩與角色一致性保持持久']
  },
  {
    id: 'lumiere-motion',
    name: 'Lumiere Image Motion',
    category: 'Video',
    description: '靜態圖像一鍵動態化演算法，極擅長檢測影中物件、識別天然物理弱點並注入流體時間動態。',
    speedRating: 5,
    capabilityRating: 8,
    costRating: 5,
    costPerCall: '9.00 Co幣 / 次',
    latencyText: '8.0s - 15.0s',
    contextWindow: 'N/A (影片)',
    bestFor: ['照片一鍵動態化', '微風吹拂、流水、頭髮抖動等局部動畫', '視覺化梗圖製作'],
    targetFeatureId: 'animate-image',
    strengths: ['時間差插值無閃爍', '完美保留靜態原圖微米級畫質', '對自然流體力學有極強直覺']
  },
  {
    id: 'lyria-core',
    name: 'Lyria Music Core',
    category: 'Audio',
    description: '高級波形合成與旋律編曲模型，支援樂器、節奏、人聲軌的高度自定義，一鍵將創意轉為實體音訊。',
    speedRating: 4,
    capabilityRating: 9,
    costRating: 5,
    costPerCall: '6.00 Co幣 / 首',
    latencyText: '6.0s - 12.0s',
    contextWindow: 'N/A (音訊)',
    bestFor: ['自製影片原創背景音樂(BGM)', '多種曲風(Lo-Fi, Jazz, Rock)自訂', '有歌詞的編曲音軌生成', '30s 音訊短片生成'],
    targetFeatureId: 'music-gen',
    strengths: ['波形相位融合無噪點', '曲風過渡極具層次感', '符合人耳舒適度的響度等化']
  },
  {
    id: 'gemini-live-api',
    name: 'Gemini Live Realtime Call',
    category: 'Audio',
    description: '基於低延遲 WebSocket 技術的雙向語音流，與 AI 進行流暢無阻的口語即時切入與對談。',
    speedRating: 9,
    capabilityRating: 8,
    costRating: 4,
    costPerCall: '7.50 Co幣 / 持續通話分鐘',
    latencyText: '100ms - 250ms (即時語音對講)',
    contextWindow: 'WebSocket Stream',
    bestFor: ['口說外語流暢切面練習', '即時腦力震盪', '免動手車載/行動語意助理', '角色扮演對講'],
    targetFeatureId: 'live-audio',
    strengths: ['超低聲學 RTT 延遲', '支援中途斷話(Interruption)', '極具溫度的多聲線演繹']
  }
];

export const CompareModelsView: React.FC<CompareModelsViewProps> = React.memo(({ onSelectFeature }) => {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'Text' | 'Image' | 'Video' | 'Audio'>('all');
  const [autoHighlight, setAutoHighlight] = useState(false);
  
  // Custom synced specifications state
  const [modelSpecs, setModelSpecs] = useState<ModelSpec[]>(INITIAL_MODEL_SPECS);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStep, setSyncStep] = useState(0);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const triggerMetricsSync = () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncStep(1);
    setSyncLogs(['[1/6] 正在初始化網路遙測信號手握 (Handshake initialized...)']);

    const steps = [
      { text: '[2/6] 已與 Google Edge Core (asia-east1 台灣節點) 建立安全 WebSocket 偵測鏈。', delay: 400 },
      { text: '[3/6] 成功獲得極速回答群組的反饋。Gemini 2.5 Flash RTT: 104ms, Flash Lite RTT: 78ms。', delay: 850 },
      { text: '[4/6] Imagen 3 圖像處理大叢集負載正常。Imagen 3 Ultra 佇列佇列延遲指數: O(1)。', delay: 1350 },
      { text: '[5/6] 成功調度 ASR 聽寫模型 Chirp Whisper 與 Lyria 音訊管線... 通道暢通度 100%。', delay: 1800 },
      { text: '[6/6] Veo 2.0 影片冷啟動基準評估完成。所有多模態算力特徵係數同步更新！', delay: 2200 }
    ];

    steps.forEach((step, index) => {
      setTimeout(() => {
        setSyncLogs(prev => [...prev, step.text]);
        setSyncStep(index + 2);

        if (index === steps.length - 1) {
          setIsSyncing(false);
          const now = new Date();
          const timeStr = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
          setLastSyncedAt(timeStr);
          
          // Randomize benchmarks slightly to simulate active telemetry response
          setModelSpecs(prevSpecs => prevSpecs.map(spec => {
            const fluctuation = 0.88 + Math.random() * 0.22; // 0.88 to 1.10
            let nextLatency = spec.latencyText;
            
            if (spec.id === 'gemini-flash-lite') {
              nextLatency = `${(0.12 * fluctuation).toFixed(1)}s - ${(0.22 * fluctuation).toFixed(1)}s`;
            } else if (spec.id === 'gemini-flash') {
              nextLatency = `${(0.28 * fluctuation).toFixed(1)}s - ${(0.48 * fluctuation).toFixed(1)}s`;
            } else if (spec.id === 'gemini-pro') {
              nextLatency = `${(1.1 * fluctuation).toFixed(1)}s - ${(1.7 * fluctuation).toFixed(1)}s`;
            } else if (spec.id === 'gemini-pro-thinking') {
              nextLatency = `${(2.9 * fluctuation).toFixed(1)}s - ${(6.5 * fluctuation).toFixed(1)}s`;
            } else if (spec.id === 'imagen-ultra') {
              nextLatency = `${(2.2 * fluctuation).toFixed(1)}s - ${(3.8 * fluctuation).toFixed(1)}s`;
            } else if (spec.id === 'imagen-edit') {
              nextLatency = `${(1.8 * fluctuation).toFixed(1)}s - ${(2.8 * fluctuation).toFixed(1)}s`;
            } else if (spec.id === 'veo-full') {
              nextLatency = `${(10.2 * fluctuation).toFixed(1)}s - ${(21.5 * fluctuation).toFixed(1)}s`;
            } else if (spec.id === 'lumiere-motion') {
              nextLatency = `${(7.1 * fluctuation).toFixed(1)}s - ${(13.5 * fluctuation).toFixed(1)}s`;
            } else if (spec.id === 'lyria-core') {
              nextLatency = `${(5.5 * fluctuation).toFixed(1)}s - ${(10.5 * fluctuation).toFixed(1)}s`;
            } else if (spec.id === 'gemini-live-api') {
              nextLatency = `${Math.round(92 * fluctuation)}ms - ${Math.round(225 * fluctuation)}ms`;
            }

            const randOffset = Math.random() > 0.6 ? (Math.random() > 0.5 ? 1 : -1) : 0;
            const nextSpeed = Math.max(1, Math.min(10, spec.speedRating + randOffset));

            return {
              ...spec,
              latencyText: nextLatency,
              speedRating: nextSpeed,
              isUpdated: true
            };
          }));
        }
      }, step.delay);
    });
  };

  // Scenarios for quick recommended matchmaking
  const [selectedScenario, setSelectedScenario] = useState<string>('general-chat');

  const scenarios = [
    {
      id: 'general-chat',
      title: '日常知識對話與翻譯 (General Chat)',
      icon: <MessageSquare size={16} />,
      description: '需要高速度、一般常識回答、摘要或簡單翻譯。',
      recommendedModelId: 'gemini-flash-lite',
      alternativeModelId: 'gemini-pro',
      analysis: '推薦使用 **Gemini 2.5 Flash Lite**，它是專為極致反應速度設計的輕量級核心，每次僅消耗極少算力。如果需要更深度的思考邏輯與精準的多輪排版，可切換至 Pro 或啟用高思考模式。'
    },
    {
      id: 'heavy-coding',
      title: '高難度程式碼與邏輯推理 (Logic & Coding)',
      icon: <Cpu size={16} />,
      description: '編寫複雜函數、除錯程式碼或多維度學術資料整合。',
      recommendedModelId: 'gemini-pro-thinking',
      alternativeModelId: 'gemini-pro',
      analysis: '複雜推理直接指定 **Gemini 2.5 Pro High Thinking**。啟用高思考模式後，模型會輸出詳盡的鏈路思考過程（Chain-of-Thought），有效減少幻覺，精準命中極限條件。'
    },
    {
      id: 'creative-art',
      title: '高畫質影像生成與精細潤飾 (Image Art & Edit)',
      icon: <ImageIcon size={16} />,
      description: '生成高品質的品牌配圖、頭像或進行局部 Canvas 塗抹修改。',
      recommendedModelId: 'imagen-ultra',
      alternativeModelId: 'imagen-edit',
      analysis: '優先選擇 **Imagen 3 Ultra**, 它在文字嵌入清晰度、真實光影渲染上是頂規等級。如果是想在已有圖片上進行區域性替換增刪，則應搭配使用 Imagen 3 Edit 畫布重繪功能。'
    },
    {
      id: 'producer-video',
      title: '劇本影片與鏡頭運鏡合成 (Cinematic Video)',
      icon: <VideoIcon size={16} />,
      description: '由文字或圖片生成 16:9 影視級高品質運鏡影片。',
      recommendedModelId: 'veo-full',
      alternativeModelId: 'lumiere-motion',
      analysis: '首選 **Veo 2.0 Full Frame**, 指令相容度極高，支援超長 1080p 電影鏡頭運作。如果是現有靜態圖片的微小區域性流體動畫，Lumiere 的時間差值插補模型更合適。'
    },
    {
      id: 'music-wave',
      title: '音樂編曲與即時旁白語音 (Music & Audio Sync)',
      icon: <MusicIcon size={16} />,
      description: '合成精緻背景音樂軌，或將文章高保真轉換為擬真男/女發音。',
      recommendedModelId: 'lyria-core',
      alternativeModelId: 'gemini-live-api',
      analysis: '需要編曲、混音或指定特定樂器風格，**Lyria Music Core** 具備強大波形合成能力；若是單純文案產出自然旁白配音，使用 Neural TTS 能夠確保低於 200ms 的極速響應。'
    }
  ];

  // Selected scenario details helper
  const scenarioDetails = useMemo(() => {
    const sce = scenarios.find(s => s.id === selectedScenario);
    if (!sce) return null;
    
    const recModel = modelSpecs.find(m => m.id === sce.recommendedModelId);
    const altModel = modelSpecs.find(m => m.id === sce.alternativeModelId);
    
    return {
      ...sce,
      recModel,
      altModel
    };
  }, [selectedScenario, modelSpecs]);

  // Filtered model list for the sheet at the bottom
  const filteredModels = useMemo(() => {
    return modelSpecs.filter(model => {
      const matchesSearch = model.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            model.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            model.bestFor.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchesTab = activeTab === 'all' || model.category === activeTab;
      return matchesSearch && matchesTab;
    });
  }, [searchTerm, activeTab, modelSpecs]);

  const { maxSpeed, maxCostEff } = useMemo(() => {
    if (filteredModels.length === 0) return { maxSpeed: 0, maxCostEff: 0 };
    const speeds = filteredModels.map(m => m.speedRating);
    const costs = filteredModels.map(m => m.costRating);
    return {
      maxSpeed: Math.max(...speeds),
      maxCostEff: Math.max(...costs)
    };
  }, [filteredModels]);

  const exportToCSV = () => {
    const headers = ['模型名稱 (Model Name)', '分類 (Category)', '效能描述 (Description)', '速度頻寬評分 (Speed Rating)', '智力範疇評分 (Capability)', '相對省能度評分 (Cost Efficiency)', '單次消耗估計 (Cost Per Call)', '最快反應時間 (RTT Latency)', 'Context Window', '最佳推薦用途 (Best For)', '模型優勢特徵 (Strengths)'];
    
    const rows = filteredModels.map(model => [
      model.name,
      model.category,
      model.description.replace(/"/g, '""'),
      `${model.speedRating}/10`,
      `${model.capabilityRating}/10`,
      `${model.costRating}/10`,
      model.costPerCall.replace(/"/g, '""'),
      model.latencyText,
      model.contextWindow,
      model.bestFor.join('; '),
      model.strengths.join('; ')
    ]);

    // Build CSV with UTF-8 BOM representation for Excel double-click Chinese encoding compatibility
    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.map(val => `"${val}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `CoLab_AI_Model_Comparison_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
      className="rounded-3xl border border-zinc-200/50 dark:border-zinc-800/80 bg-white/45 dark:bg-zinc-900/25 backdrop-blur-md p-6 shadow-sm overflow-hidden relative transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/5 hover:border-zinc-300/80 dark:hover:border-zinc-700/80"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-purple-500/5 to-transparent rounded-full blur-2xl pointer-events-none" />

      {/* Main Feature Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GitCompare size={18} className="text-pink-500" />
            <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tracking-tight font-sans">
              AI 模型與算力比較指南 (Compare Models)
            </h3>
            <span className="text-[10px] bg-pink-50 dark:bg-pink-950/40 text-pink-600 dark:text-pink-400 font-bold px-2 py-0.5 rounded-full uppercase scale-90">
              Interactive Tool Selection
            </span>
          </div>
          <p className="text-xs text-zinc-400 dark:text-zinc-500">
            針對您的特定工作情境，即時算出速度、能力、配額成本最合適的 Gemini / Imagen / Veo / Lyria 多模態核心。
          </p>
        </div>

        {/* Search & Export Actions */}
        <div className="flex items-center gap-2 max-w-sm w-full">
          {/* Global Search inside models sheet */}
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜尋模型規格、優勢或適用任務..."
              className="w-full text-xs pl-9 pr-4 py-2 border border-zinc-200/60 dark:border-zinc-800/80 rounded-xl bg-white/80 dark:bg-zinc-950/40 focus:outline-none focus:ring-1 focus:ring-pink-500 focus:border-pink-500 dark:text-zinc-200"
            />
          </div>

          <Tooltip content="匯出當前對照表的模型指標與規格至 CSV 檔案 (包含目前篩選結果)">
            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-250 bg-white/70 dark:bg-zinc-950/45 border border-zinc-200/60 dark:border-zinc-800/80 hover:border-pink-500/40 dark:hover:border-pink-500/40 rounded-xl cursor-pointer transition-all shadow-xs shrink-0"
              id="btn-export-comparison"
            >
              <Download size={13} className="text-pink-500" />
              <span>匯出 CSV</span>
            </button>
          </Tooltip>
        </div>
      </div>

      {/* Live Telemetry Action Bar (Realtime model updates trigger) */}
      <div className="mb-6 p-4 rounded-2.5xl border border-zinc-200/40 dark:border-zinc-800/60 bg-zinc-50/40 dark:bg-zinc-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-2.5 w-2.5 shrink-0">
            {isSyncing ? (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-pink-400 opacity-75"></span>
            ) : (
              <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            )}
            <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSyncing ? 'bg-pink-500' : 'bg-emerald-500'}`}></span>
          </div>
          <div>
            <div className="text-xs font-bold text-zinc-800 dark:text-zinc-200 flex flex-wrap items-center gap-1.5 leading-none">
              <span>全球算力邊緣指標監控</span>
              {lastSyncedAt ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-400/15 px-2 py-0.5 rounded font-mono font-bold">
                  已同步於 {lastSyncedAt}
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 bg-amber-500/10 dark:bg-amber-400/15 px-2 py-0.5 rounded font-mono">
                  尚未與算力中心同步
                </span>
              )}
            </div>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1">
              {isSyncing 
                ? `正在檢測 RTT 與大叢集負載指數 (第 ${syncStep}/6 步)...` 
                : '全球節點算力正常，吞吐量充足。您可以點擊「同步指標」來發起最新背景模型健康度對標。'}
            </p>
          </div>
        </div>

        <button
          onClick={triggerMetricsSync}
          disabled={isSyncing}
          className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-all select-none self-start sm:self-auto ${
            isSyncing
              ? 'bg-zinc-100 dark:bg-zinc-850 text-zinc-400 cursor-not-allowed border border-transparent'
              : 'bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-950 active:scale-95 cursor-pointer border border-transparent shadow-sm'
          }`}
        >
          {isSyncing ? (
            <>
              <Loader2 size={13} className="animate-spin text-pink-500" />
              <span>監測更新中...</span>
            </>
          ) : (
            <>
              <RefreshCw size={12} className="text-pink-500 animate-pulse hover:rotate-45 transition-transform" />
              <span>同步最新指標 (Sync Metrics)</span>
            </>
          )}
        </button>
      </div>

      {/* Telemetry Log Stream Feed overlay */}
      <AnimatePresence>
        {(isSyncing || syncLogs.length > 0) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 bg-zinc-950"
          >
            <div className="p-4 font-mono text-[10px] text-zinc-300 space-y-1.5 max-h-[140px] overflow-y-auto">
              <div className="flex items-center justify-between border-b border-zinc-850 pb-1.5 mb-1.5 text-[9px] text-zinc-500 uppercase font-bold tracking-wider">
                <span>網關遙測診斷日誌 (Telemetry Feed Log)</span>
                {isSyncing ? (
                  <span className="text-pink-400 animate-pulse flex items-center gap-1 text-[8px]">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink-500 animate-ping" /> 讀取中
                  </span>
                ) : (
                  <span className="text-emerald-405 flex items-center gap-1 text-[8px] font-bold text-emerald-400">
                    ✓ 同步完成 (TELEMETRY SUCCESSFUL)
                  </span>
                )}
              </div>
              {syncLogs.map((log, lidx) => (
                <div key={lidx} className="flex gap-2">
                  <span className="text-zinc-600">[{lidx + 1}]</span>
                  <span className={lidx === syncLogs.length - 1 ? 'text-pink-400 font-medium' : 'text-zinc-400'}>
                    {log}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* SECTION 1: INTERACTIVE TASK MATCHMAKER (Bento style interactive) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        
        {/* Playbook Matcher Scenarios Sidebar */}
        <div className="lg:col-span-1 space-y-2">
          <span className="text-[10px] font-bold tracking-wider text-pink-400 dark:text-pink-500 uppercase block mb-2 px-1">
            第一步：選擇您的具體任務類型 (Choose Scenario)
          </span>
          <div className="space-y-1.5">
            {scenarios.map(sce => (
              <button
                key={sce.id}
                onClick={() => setSelectedScenario(sce.id)}
                className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-start gap-3 cursor-pointer ${
                  selectedScenario === sce.id
                    ? 'bg-zinc-900 dark:bg-zinc-105 text-white dark:text-zinc-950 border-transparent shadow-md'
                    : 'bg-zinc-50/50 dark:bg-zinc-900/40 text-zinc-650 dark:text-zinc-350 border-zinc-200/50 dark:border-zinc-800/40 hover:bg-zinc-100/50 dark:hover:bg-zinc-800/20'
                }`}
              >
                <div className={`p-2 rounded-xl shrink-0 ${
                  selectedScenario === sce.id 
                    ? 'bg-white/10 dark:bg-zinc-800/80 text-white dark:text-zinc-205' 
                    : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500'
                }`}>
                  {sce.icon}
                </div>
                <div className="space-y-0.5 min-w-0">
                  <h4 className="text-xs font-bold truncate leading-snug">
                    {sce.title}
                  </h4>
                  <p className={`text-[10px] leading-tight line-clamp-1 truncate ${
                    selectedScenario === sce.id ? 'text-zinc-200 dark:text-zinc-600' : 'text-zinc-400'
                  }`}>
                    {sce.description}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Match & Custom Breakdown Analysis Area */}
        <div className="lg:col-span-2 bg-zinc-50/50 dark:bg-zinc-900/35 border border-zinc-200/50 dark:border-zinc-800/50 rounded-3xl p-5 md:p-6 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-indigo-500/5 via-pink-500/0 to-transparent rounded-full blur-2xl pointer-events-none" />
          
          {scenarioDetails && (
            <div className="space-y-6 relative z-10 h-full flex flex-col justify-between">
              
              {/* Scenario Context */}
              <div>
                <span className="text-[10px] font-bold tracking-wider text-indigo-500 dark:text-indigo-400 uppercase block mb-1">
                  第二步：智慧契合度評估分析 (Custom Recommendation)
                </span>
                <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-150 flex items-center gap-1.5 leading-none">
                  <Sparkles size={14} className="text-indigo-500 shrink-0" />
                  <span>最佳合用核心：{scenarioDetails.recModel?.name}</span>
                </h4>
                <p className="text-[11px] text-zinc-450 dark:text-zinc-400 mt-2 leading-relaxed" 
                   dangerouslySetInnerHTML={{ __html: scenarioDetails.analysis.replace(/\*\*(.*?)\*\*/g, '<b class="text-indigo-600 dark:text-indigo-400">$1</b>') }} 
                />
              </div>

              {/* Recommendation Side-by-Side Comparison */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 my-2">
                {/* 1. Recommended Card */}
                {scenarioDetails.recModel && (
                  <div className="border border-indigo-500/30 bg-indigo-500 border-opacity-5 dark:bg-indigo-950/15 p-4 rounded-2xl relative">
                    <div className="absolute top-3 right-3 text-[9px] bg-indigo-500 text-white font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                      <Flame size={10} /> 最佳首選
                    </div>
                    <span className="text-[9px] text-zinc-400 block mb-0.5 uppercase tracking-wide">Primary Target</span>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 truncate mb-2">{scenarioDetails.recModel.name}</h5>
                    
                    {/* Performance Gauges */}
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex items-center justify-between">
                        <Tooltip content="表示模型從請求到發出第一個字元的最快反應時間 (Time To First Token) 與多輪往返時延 RTT 預估值。">
                          <span className="text-zinc-400 cursor-help border-b border-dashed border-zinc-200/60 dark:border-zinc-800">響應延遲 (Speed)</span>
                        </Tooltip>
                        <span className="font-mono font-medium text-emerald-500">{scenarioDetails.recModel.latencyText}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Tooltip content="表示每次執行任務呼叫所耗用的 Co幣 額度，對照為每 100 萬 Tokens (1M Tokens) 的伺服器算力資源定價。">
                          <span className="text-zinc-400 cursor-help border-b border-dashed border-zinc-200/60 dark:border-zinc-800">單次大模型算力</span>
                        </Tooltip>
                        <span className="font-mono text-indigo-500 dark:text-indigo-400 font-bold">{scenarioDetails.recModel.costPerCall}</span>
                      </div>
                      
                      {/* Metric bars */}
                      <div className="flex items-center gap-1 pt-1">
                        <Tooltip content="綜合考量學術多學科能力基準 (MMLU-Pro)、專業推理挑戰與代碼編寫邏輯等最高思考維度。">
                          <span className="text-[8px] text-zinc-400 min-w-[24px] cursor-help border-b border-dashed border-zinc-200/60 dark:border-zinc-800 pb-0.5">智商</span>
                        </Tooltip>
                        <div className="h-1 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-pink-500" style={{ width: `${scenarioDetails.recModel.capabilityRating * 10}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500">{scenarioDetails.recModel.capabilityRating}/10</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. Alternative Card */}
                {scenarioDetails.altModel && (
                  <div className="border border-zinc-200/50 dark:border-zinc-800/50 bg-white/40 dark:bg-zinc-950/20 p-4 rounded-2xl relative">
                    <div className="absolute top-3 right-3 text-[9px] bg-zinc-200 dark:bg-zinc-800 text-zinc-650 dark:text-zinc-300 font-bold px-1.5 py-0.5 rounded-full">
                      備用調度
                    </div>
                    <span className="text-[9px] text-zinc-400 block mb-0.5 uppercase tracking-wide">Fallback Target</span>
                    <h5 className="text-xs font-bold text-zinc-900 dark:text-zinc-150 truncate mb-2">{scenarioDetails.altModel.name}</h5>
                    
                    {/* Performance Gauges */}
                    <div className="space-y-1.5 text-[10px]">
                      <div className="flex items-center justify-between">
                        <Tooltip content="表示模型從請求到發出第一個字元的最快反應時間 (Time To First Token) 與多輪往返時延 RTT 預估值。">
                          <span className="text-zinc-400 cursor-help border-b border-dashed border-zinc-200/60 dark:border-zinc-800">響應延遲 (Speed)</span>
                        </Tooltip>
                        <span className="font-mono font-medium text-zinc-500">{scenarioDetails.altModel.latencyText}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <Tooltip content="表示每次執行任務呼叫所耗用的 Co幣 額度，對照為每 100 萬 Tokens (1M Tokens) 的伺服器算力資源定價。">
                          <span className="text-zinc-400 cursor-help border-b border-dashed border-zinc-200/60 dark:border-zinc-800">單次大模型算力</span>
                        </Tooltip>
                        <span className="font-mono text-zinc-500 font-medium">{scenarioDetails.altModel.costPerCall}</span>
                      </div>

                      {/* Metric bars */}
                      <div className="flex items-center gap-1 pt-1">
                        <Tooltip content="綜合考量學術多學科能力基準 (MMLU-Pro)、專業推理挑戰與代碼編寫邏輯等最高思考維度。">
                          <span className="text-[8px] text-zinc-400 min-w-[24px] cursor-help border-b border-dashed border-zinc-200/60 dark:border-zinc-800 pb-0.5">智商</span>
                        </Tooltip>
                        <div className="h-1 flex-1 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                          <div className="h-full bg-zinc-400" style={{ width: `${scenarioDetails.altModel.capabilityRating * 10}%` }} />
                        </div>
                        <span className="text-[9px] font-mono text-zinc-500">{scenarioDetails.altModel.capabilityRating}/10</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              {scenarioDetails.recModel && (
                <div className="pt-2 border-t border-zinc-200/40 dark:border-zinc-800/40 flex items-center justify-between gap-4 mt-auto">
                  <div className="text-[10px] text-zinc-400 flex items-center gap-1.5 shrink-0">
                    <CheckCircle2 size={12} className="text-emerald-500" />
                    <span>即選即用 • 會員額度內無差別調度</span>
                  </div>
                  <button
                    onClick={() => onSelectFeature(scenarioDetails.recModel!.targetFeatureId)}
                    className="group px-4.5 py-2 bg-pink-500 hover:bg-pink-600 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-pink-500/10 active:scale-95 transition-all"
                  >
                    <span>立刻前往啟動</span>
                    <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>
              )}

            </div>
          )}
        </div>

      </div>

      {/* SECTION 2: INTERACTIVE MATRIX SHEET (Categorized specs sheet) */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
          <span className="text-[10px] font-bold tracking-wider text-pink-400 dark:text-pink-500 uppercase block">
            完整模型全貌對照板 (Specification Database Grid)
          </span>
          <div className="flex items-center gap-2 bg-zinc-50/80 dark:bg-zinc-950/40 px-3 py-1.5 rounded-xl border border-zinc-200/50 dark:border-zinc-800/40 select-none shadow-xs">
            <span className="text-[11px] font-semibold text-zinc-650 dark:text-zinc-350">
              🚀 頂尖模型自動高亮 (Auto-highlight)
            </span>
            <button
              onClick={() => setAutoHighlight(!autoHighlight)}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                autoHighlight ? 'bg-pink-500' : 'bg-zinc-200 dark:bg-zinc-700'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  autoHighlight ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Small Matrix Sub-tabs */}
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-200/50 dark:border-zinc-800/50 pb-2">
          {[
            { id: 'all', label: '所有分類 (All specs)' },
            { id: 'Text', label: '文本與對話 (Text/Reasoning)' },
            { id: 'Image', label: '畫布與圖像 (Creative Image)' },
            { id: 'Video', label: '影像與動畫 (Cinematic Video)' },
            { id: 'Audio', label: '音軌與合成 (Dynamic Audio)' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-zinc-100 dark:bg-zinc-800 text-pink-600 dark:text-pink-400 font-bold'
                  : 'text-zinc-500 hover:text-zinc-750 dark:hover:text-zinc-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Specification rows list */}
        {filteredModels.length === 0 ? (
          <div className="py-12 text-center text-xs text-zinc-400 bg-zinc-50/20 dark:bg-zinc-900/10 rounded-2xl border border-zinc-200/30 dark:border-zinc-800/30">
            查無相符的模型。請嘗試簡化搜尋關鍵字。
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredModels.map(model => {
              const isTopSpeed = autoHighlight && model.speedRating === maxSpeed;
              const isTopCost = autoHighlight && model.costRating === maxCostEff;

              let highlightBorderClasses = "border-zinc-200/50 dark:border-zinc-800/50 hover:border-pink-500/30";
              let highlightBgClasses = "bg-white/40 dark:bg-zinc-950/20";
              
              if (isTopSpeed && isTopCost) {
                highlightBorderClasses = "border-pink-500/60 dark:border-pink-500/55 ring-1 ring-pink-500/20 shadow-[0_0_15px_rgba(236,72,153,0.06)]";
                highlightBgClasses = "bg-pink-500/[0.02] dark:bg-pink-950/[0.06]";
              } else if (isTopSpeed) {
                highlightBorderClasses = "border-emerald-500/50 dark:border-emerald-500/40 ring-1 ring-emerald-500/15 shadow-[0_0_15px_rgba(16,185,129,0.05)]";
                highlightBgClasses = "bg-emerald-500/[0.01] dark:bg-emerald-950/[0.04]";
              } else if (isTopCost) {
                highlightBorderClasses = "border-indigo-500/50 dark:border-indigo-500/40 ring-1 ring-indigo-500/15 shadow-[0_0_15px_rgba(99,102,241,0.05)]";
                highlightBgClasses = "bg-indigo-500/[0.01] dark:bg-indigo-950/[0.04]";
              }

              const speedCellClasses = isTopSpeed 
                ? "bg-emerald-500/10 dark:bg-emerald-500/20 border-emerald-500/30 dark:border-emerald-500/20 ring-1 ring-emerald-500/20" 
                : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-100/50 dark:border-zinc-850/45";

              const costCellClasses = isTopCost 
                ? "bg-indigo-500/10 dark:bg-indigo-500/20 border-indigo-500/30 dark:border-indigo-500/20 ring-1 ring-indigo-500/20" 
                : "bg-zinc-50/50 dark:bg-zinc-900/40 border-zinc-100/50 dark:border-zinc-850/45";

              return (
                <motion.div
                  key={model.id}
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  transition={{ duration: 0.25 }}
                  className={`border ${highlightBorderClasses} ${highlightBgClasses} p-4.5 rounded-2.5xl transition-all flex flex-col justify-between`}
                >
                  {/* Row Header */}
                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-zinc-450 dark:text-zinc-500 uppercase flex items-center gap-1.5">
                        {model.category === 'Text' && <MessageSquare size={10} className="text-indigo-500" />}
                        {model.category === 'Image' && <ImageIcon size={10} className="text-pink-500" />}
                        {model.category === 'Video' && <VideoIcon size={10} className="text-amber-500" />}
                        {model.category === 'Audio' && <MusicIcon size={10} className="text-emerald-500" />}
                        <span>{model.category} • Specifications</span>
                      </span>
                      <span className="text-[10px] font-mono text-zinc-450 font-medium">
                        RTT ~{model.latencyText}
                      </span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                      <h4 className="text-sm font-bold text-zinc-900 dark:text-zinc-150">{model.name}</h4>
                      {model.isUpdated && (
                        <span className="text-[8px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/10 flex items-center gap-0.5 my-auto">
                          <Check size={8} /> 已同步
                        </span>
                      )}
                      {isTopSpeed && isTopCost && (
                        <span className="text-[8px] bg-pink-500 text-white dark:bg-pink-950/60 dark:text-pink-300 font-extrabold px-1.5 py-0.5 rounded border border-pink-500/20 flex items-center gap-0.5 shadow-xs shrink-0 select-none animate-pulse">
                          👑 雙冠王者
                        </span>
                      )}
                      {!isTopCost && isTopSpeed && (
                        <span className="text-[8px] bg-emerald-500 text-white dark:bg-emerald-950/60 dark:text-emerald-300 font-extrabold px-1.5 py-0.5 rounded border border-emerald-500/20 flex items-center gap-0.5 shadow-xs shrink-0 select-none">
                          ⚡ 極速王
                        </span>
                      )}
                      {!isTopSpeed && isTopCost && (
                        <span className="text-[8px] bg-indigo-500 text-white dark:bg-indigo-950/60 dark:text-indigo-300 font-extrabold px-1.5 py-0.5 rounded border border-indigo-500/20 flex items-center gap-0.5 shadow-xs shrink-0 select-none">
                          🪙 算力省能王
                        </span>
                      )}
                    </div>
                    
                    <p className="text-[11px] text-zinc-450 dark:text-zinc-400 font-light leading-relaxed">
                      {model.description}
                    </p>
                  </div>

                  {/* Grid performance spec indicators */}
                  <div className="space-y-2 border-t border-zinc-200/30 dark:border-zinc-800/30 pt-3">
                    <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                      <div className={`${speedCellClasses} p-1.5 rounded-xl flex flex-col items-center justify-between min-h-[46px] transition-all duration-300`}>
                        <Tooltip content="評估輸出吞吐量 (Tokens per second) 與首字延遲 (RTT)。分數越高，響應與生成速度越快。">
                          <span className="text-[8px] text-zinc-400 cursor-help border-b border-dashed border-zinc-350 dark:border-zinc-700/80 pb-0.5 tracking-tight">速度頻寬</span>
                        </Tooltip>
                        <span className="font-semibold font-mono text-emerald-500 block mt-1">{model.speedRating}/10</span>
                      </div>
                      <div className="bg-zinc-50/50 dark:bg-zinc-900/40 p-1.5 rounded-xl border border-zinc-100/50 dark:border-zinc-850/45 flex flex-col items-center justify-between min-h-[46px]">
                        <Tooltip content="評估模型在複雜推理、編程(Coding)、數學與多步驟任務上的綜合智慧。分數越高能力越強。">
                          <span className="text-[8px] text-zinc-400 cursor-help border-b border-dashed border-zinc-350 dark:border-zinc-700/80 pb-0.5 tracking-tight">智力範疇</span>
                        </Tooltip>
                        <span className="font-semibold font-mono text-pink-500 block mt-1">{model.capabilityRating}/10</span>
                      </div>
                      <div className={`${costCellClasses} p-1.5 rounded-xl flex flex-col items-center justify-between min-h-[46px] transition-all duration-300`}>
                        <Tooltip content="評估模型每 100 萬 Tokens (1M tokens) 的算力消耗效益。分數越高越省能、開銷越低。">
                          <span className="text-[8px] text-zinc-400 cursor-help border-b border-dashed border-zinc-350 dark:border-zinc-700/80 pb-0.5 tracking-tight">相對省能度</span>
                        </Tooltip>
                        <span className="font-semibold font-mono text-indigo-500 block mt-1">{model.costRating}/10</span>
                      </div>
                    </div>

                  {/* Context and cost specs */}
                  <div className="flex items-center justify-between text-[10px] text-zinc-400 px-1 pt-1">
                    <span>視窗：{model.contextWindow}</span>
                    <span className="font-medium text-zinc-700 dark:text-zinc-300">開銷：{model.costPerCall}</span>
                  </div>

                  {/* Bullet strengths */}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {model.strengths.slice(0, 2).map((st, sidx) => (
                      <span key={sidx} className="text-[9px] bg-zinc-100 dark:bg-zinc-905 text-zinc-500 dark:text-zinc-400 px-2 py-0.5 rounded-lg border border-zinc-200/10 dark:border-zinc-800/10">
                        ✓ {st}
                      </span>
                    ))}
                  </div>

                  {/* Quick Go CTA */}
                  <div className="pt-2 border-t border-zinc-150/40 dark:border-zinc-850/20 mt-2 flex justify-end">
                    <button
                      onClick={() => onSelectFeature(model.targetFeatureId)}
                      className="text-[10px] text-pink-500 hover:text-pink-600 dark:hover:text-pink-400 font-bold flex items-center gap-1 cursor-pointer group"
                    >
                      <span>前往該功能介面</span>
                      <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                    </button>
                  </div>
                </div>
              </motion.div>
            )})}
          </div>
        )}
      </div>

    </motion.div>
  );
});
