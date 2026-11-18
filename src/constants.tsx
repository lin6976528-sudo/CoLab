import {
  MessageSquare,
  Volume2,
  Mic,
  Video,
  Zap,
  Image as ImageIcon,
  ImagePlus,
  Film,
  MapPin,
  Search,
  PlaySquare,
  Headphones,
  Wand2,
  LayoutDashboard,
  Youtube,
  Layers,
  Bell,
  Music,
  TrendingUp,
  Box,
} from 'lucide-react';
import { Feature } from './types';

export const FEATURES: Feature[] = [
  {
    id: 'dashboard',
    title: '總覽儀表板',
    icon: 'LayoutDashboard',
    description: '查看所有可用的 AI 工具',
    category: 'Overview',
    requiredTier: 'Free',
    tutorial: {
      title: '如何使用 CoLab',
      steps: [
        '從左側導覽列選擇您想使用的 AI 工具。',
        '您可以使用鍵盤快捷鍵 Cmd+K (或 Ctrl+K) 快速搜尋工具。',
        '點擊工具卡片即可開始使用。'
      ],
      tips: ['CoLab 整合了多種強大的 Gemini 模型，涵蓋文字、圖片、影片與語音處理。']
    }
  },
  {
    id: 'infinite-canvas',
    title: '無限協作畫布',
    icon: 'Layers',
    description: '拖入生成的圖片、影片與對話備忘，共享創意畫布',
    category: 'Overview',
    requiredTier: 'Free',
    tutorial: {
      title: '如何使用無限協作畫布',
      steps: [
        '點擊「打開面板資源庫」，可挑選您先前在其他工具（如 AI 聊天、畫圖等）生成的項目。',
        '按住滑鼠左鍵可直接將素材卡片「拖曳並釋放」置入到畫布的對應位置。',
        '點擊已放置的卡片即可啟用選單，包括調整前後塗層 (Z-Index)、複製或刪除。',
        '在客製「便利貼」或「Markdown」內容上進行雙擊，即可直接編輯和同步更新內容。',
        '按住 Spacebar 空白鍵並移動滑鼠，能在無限地圖空間中自由探索平移。'
      ],
      tips: [
        '右上角整合了精準的滑輪縮放 (Zoom) 以及重設居中功能，不慎迷路時點擊順時針按鈕即可回到原點。',
        '您也可以在側欄輸入特別的房間代碼 (如 Project-2026)，立即加入專屬同學或同事的即時多人協作會議！'
      ]
    }
  },
  {
    id: 'three-d-studio',
    title: '3D 互動場景實驗室',
    icon: 'Box',
    description: '即時 PBR 光照渲染、機械爆炸視圖與雲端場景預設保存',
    category: 'Overview',
    requiredTier: 'Free',
    tutorial: {
      title: '如何使用 3D 互動場景實驗室',
      steps: [
        '在下方控制列切換「精密天體儀」、「光之建築亭」或「航太渦輪扇」等複合程式化模型。',
        '拖曳視窗可自由環繞 (Orbit) 與縮放視角；點擊模型組件可檢視材質與零件規格。',
        '滑動「爆炸拆解」拉桿可平滑展開各組件位置，也可切換材質塗層與攝影棚光影氛圍。',
        '點擊「預設集」即可將目前的視角、材質、燈光與拆解進度即時儲存至雲端。'
      ],
      tips: [
        '按下鍵盤 H 鍵可快速收折/展開控制列，享受純淨的無干擾 3D 展示空間。'
      ]
    }
  },
  {
    id: 'chat',
    title: 'AI 聊天機器人',
    icon: 'MessageSquare',
    description: '進階推理與 Gemini Pro',
    category: 'Text & Chat',
    requiredTier: 'Pro',
    tutorial: {
      title: '使用 AI 聊天機器人',
      steps: [
        '在下方輸入框輸入您的問題或指令。',
        '點擊左下角的圖片圖示可以上傳圖片，讓 AI 進行多模態分析。',
        '按下 Enter 鍵或點擊發送按鈕送出訊息。'
      ],
      tips: [
        '此工具使用 Gemini 3.1 Pro 模型，具備強大的邏輯推理能力，適合處理複雜任務。',
        '支援多輪對話，AI 會記住您之前的對話內容。'
      ]
    }
  },
  {
    id: 'agent',
    title: 'AI Agent',
    icon: 'Wand2',
    description: '自動化執行多步驟任務',
    category: 'Text & Chat',
    requiredTier: 'Pro',
    tutorial: {
      title: '使用 AI Agent',
      steps: [
        '輸入您想完成的複雜任務。',
        'Agent 會自動呼叫合適的工具（如圖片生成、影片生成、網頁搜尋）來完成任務。',
        '您可以隨時與 Agent 對話，調整任務細節。'
      ],
      tips: ['Agent 可以記住您的偏好，並根據上下文自動選擇最佳工具。']
    }
  },
  {
    id: 'batch-process',
    title: '批次處理',
    icon: 'Layers',
    description: '同時處理多個檔案或提示詞',
    category: 'Text & Chat',
    requiredTier: 'Pro',
    tutorial: {
      title: '使用批次處理',
      steps: [
        '輸入適用於所有項目的全域提示詞。',
        '新增文字項目或上傳圖片。',
        '點擊「執行批次」自動處理所有項目。',
        '完成後可將結果匯出為 CSV 檔案。'
      ],
      tips: [
        '您可以在同一個批次中混合文字和圖片項目。',
        '系統會依序處理以確保穩定性。'
      ]
    }
  },
  {
    id: 'fast-chat',
    title: '快速回覆',
    icon: 'Zap',
    description: '使用 Flash Lite 快速解答',
    category: 'Text & Chat',
    requiredTier: 'Free',
    tutorial: {
      title: '使用快速回覆',
      steps: [
        '輸入您的問題並發送。',
        'AI 會以極快的速度為您提供解答。'
      ],
      tips: ['使用 Gemini 3.1 Flash Lite 模型，專為低延遲與高效率設計，適合簡單的問答與日常對話。']
    }
  },
  {
    id: 'search',
    title: '搜尋增強',
    icon: 'Search',
    description: '提供最新的網路解答',
    category: 'Text & Chat',
    requiredTier: 'Free',
    tutorial: {
      title: '使用搜尋增強',
      steps: [
        '輸入您想查詢的最新資訊或時事問題。',
        'AI 會自動透過 Google 搜尋獲取最新資料，並整理成回答。',
        '回答下方會附上參考來源連結，您可以點擊查看原始網頁。'
      ],
      tips: ['適合用來查詢天氣、新聞、體育賽事結果等需要即時資訊的問題。']
    }
  },
  {
    id: 'maps',
    title: '地圖增強',
    icon: 'MapPin',
    description: '基於位置的智慧功能',
    category: 'Text & Chat',
    requiredTier: 'Free',
    tutorial: {
      title: '使用地圖增強',
      steps: [
        '若瀏覽器詢問位置權限，請允許存取以獲得最佳體驗。',
        '詢問與地點相關的問題，例如「附近有什麼好吃的義大利餐廳？」或「規劃台北一日遊」。',
        'AI 會結合 Google Maps 資料提供精準的地點建議與評論摘要。'
      ],
      tips: ['回答中會包含 Google Maps 的地點連結，方便您直接導航或查看詳細資訊。']
    }
  },
  {
    id: 'image-understand',
    title: '圖片分析',
    icon: 'ImageIcon',
    description: '使用 Pro 理解照片內容',
    category: 'Image',
    requiredTier: 'Pro',
    tutorial: {
      title: '使用圖片分析',
      steps: [
        '點擊上傳區域或拖曳圖片至該區域。',
        '在提示詞輸入框中，告訴 AI 您想了解圖片的什麼資訊（例如：「這張圖片裡有什麼？」或「幫我翻譯圖片中的文字」）。',
        '點擊「分析圖片」按鈕。'
      ],
      tips: ['支援高解析度圖片分析，適合用來辨識物體、讀取圖表數據或提取文字。']
    }
  },
  {
    id: 'image-gen',
    title: '圖片生成',
    icon: 'ImagePlus',
    description: '使用 Nano Banana Pro 創作',
    category: 'Image',
    requiredTier: 'Pro',
    tutorial: {
      title: '使用圖片生成',
      steps: [
        '在提示詞輸入框中，詳細描述您想生成的圖片畫面（例如：「一隻戴著墨鏡的貓咪在海灘上衝浪，賽博龐克風格」）。',
        '選擇您想要的長寬比（如 1:1, 16:9）與圖片解析度大小。',
        '點擊「生成圖片」按鈕。'
      ],
      tips: [
        '提示詞越詳細，生成的圖片越符合您的期望。可以加入風格、光線、視角等描述。',
        '此功能需要設定付費的 Google Cloud API 金鑰。'
      ]
    }
  },
  {
    id: 'edit-image',
    title: '圖片編輯',
    icon: 'Wand2',
    description: '使用文字提示修改照片',
    category: 'Image',
    requiredTier: 'Pro',
    tutorial: {
      title: '使用圖片編輯',
      steps: [
        '上傳一張您想要編輯的原始圖片。',
        '在提示詞中輸入您想進行的修改（例如：「把背景換成星空」或「在桌上加一個蘋果」）。',
        '點擊「編輯圖片」按鈕。'
      ],
      tips: ['AI 會根據您的提示詞智慧地修改圖片，同時盡量保持原始圖片的其他部分不變。']
    }
  },
  {
    id: 'video-understand',
    title: '影片分析',
    icon: 'Video',
    description: '從影片中提取洞察',
    category: 'Video',
    requiredTier: 'Ultra',
    tutorial: {
      title: '使用影片分析',
      steps: [
        '上傳一段影片檔案（支援 mp4 等常見格式）。',
        '輸入您想詢問關於這段影片的問題（例如：「影片中發生了什麼事？」或「總結這段演講的重點」）。',
        '點擊「分析影片」按鈕。'
      ],
      tips: ['AI 能夠理解影片的畫面與聲音內容，適合用來快速總結長影片或尋找特定片段。']
    }
  },
  {
    id: 'video-gen',
    title: '影片生成',
    icon: 'Film',
    description: '透過提示詞建立影片',
    category: 'Video',
    requiredTier: 'Ultra',
    tutorial: {
      title: '使用影片生成',
      steps: [
        '輸入詳細的提示詞，描述您想生成的影片場景與動作。',
        '（選填）您可以上傳一張圖片作為影片的起始畫面（首圖）。',
        '點擊「生成影片」按鈕。影片生成可能需要幾分鐘的時間，請耐心等候。'
      ],
      tips: [
        '使用 Veo 3.1 模型，能夠生成高品質、流暢的動態影片。',
        '此功能需要設定付費的 Google Cloud API 金鑰。'
      ]
    }
  },
  {
    id: 'youtube-gen',
    title: 'YouTube影片生成',
    icon: 'Youtube',
    description: '為 YouTube 建立專屬影片',
    category: 'Video',
    requiredTier: 'Ultra',
    tutorial: {
      title: '使用 YouTube影片生成',
      steps: [
        '輸入詳細的提示詞，描述您想生成的 YouTube影片內容。',
        '選擇影片格式（標準 16:9 或 Shorts 9:16）。',
        '選擇影片長度（5秒 或 12秒）。',
        '點擊「生成 YouTube影片」按鈕。'
      ],
      tips: [
        '12秒的影片需要進行兩次生成，因此需要較長的等待時間。',
        '此功能需要設定付費的 Google Cloud API 金鑰。'
      ]
    }
  },
  {
    id: 'animate-image',
    title: '圖片動畫',
    icon: 'PlaySquare',
    description: '將照片轉換為影片',
    category: 'Video',
    requiredTier: 'Ultra',
    tutorial: {
      title: '使用圖片動畫',
      steps: [
        '上傳一張靜態圖片。',
        '輸入提示詞描述您希望圖片如何動起來（例如：「雲朵飄動，水面波光粼粼」）。',
        '點擊「生成動畫」按鈕。'
      ],
      tips: ['適合用來為靜態照片增添生命力，創造出微動態攝影（Cinemagraph）的效果。']
    }
  },
  {
    id: 'music-gen',
    title: '音樂生成',
    icon: 'Music',
    description: '透過文字提示生成音樂',
    category: 'Audio',
    requiredTier: 'Ultra',
    tutorial: {
      title: '使用音樂生成',
      steps: [
        '輸入詳細的提示詞，描述您想生成的音樂風格與內容。',
        '（選填）您可以上傳一張圖片作為音樂的靈感來源。',
        '點擊「生成音樂」按鈕。'
      ],
      tips: [
        '使用 Lyria 3 模型，能夠生成高品質的音樂與人聲。',
        '此功能需要設定付費的 Google Cloud API 金鑰。'
      ]
    }
  },
  {
    id: 'tts',
    title: '文字轉語音',
    icon: 'Volume2',
    description: '生成自然語音',
    category: 'Audio',
    requiredTier: 'Pro',
    tutorial: {
      title: '使用文字轉語音',
      steps: [
        '在文字框中輸入您想要轉換為語音的文字。',
        '選擇一個您喜歡的語音聲音（例如：Puck, Kore 等）。',
        '點擊「生成語音」按鈕。生成完成後即可播放或下載音訊檔。'
      ],
      tips: ['支援多種語言，生成的語音自然流暢，帶有豐富的情感與語氣。']
    }
  },
  {
    id: 'transcribe',
    title: '語音轉文字',
    icon: 'Mic',
    description: '將語音轉換為文字',
    category: 'Audio',
    requiredTier: 'Free',
    tutorial: {
      title: '使用語音轉文字',
      steps: [
        '您可以點擊麥克風圖示直接錄製語音，或點擊上傳圖示選擇電腦中的音訊檔案。',
        '錄音或上傳完成後，點擊「語音轉文字」按鈕。',
        'AI 會將音訊內容轉錄為文字並顯示在右側。'
      ],
      tips: ['使用 Gemini 3 Flash 模型，能夠快速且準確地辨識多種語言的語音內容。']
    }
  },
  {
    id: 'live-audio',
    title: '即時對話',
    icon: 'Headphones',
    description: '即時語音互動',
    category: 'Audio',
    requiredTier: 'Ultra',
    tutorial: {
      title: '使用即時對話',
      steps: [
        '點擊「開始對話」按鈕並允許麥克風權限。',
        '直接對著麥克風說話，AI 會即時聆聽並用語音回應您。',
        '您可以隨時打斷 AI 的說話，就像與真人交談一樣。'
      ],
      tips: ['使用 Gemini Live API，提供極低延遲的語音互動體驗，非常適合用來練習外語或進行腦力激盪。']
    }
  },
  {
    id: 'reminders',
    title: '管理通知',
    icon: 'Bell',
    description: '設定即將到來的活動或新內容提醒',
    category: 'Overview',
    requiredTier: 'Free',
    tutorial: {
      title: '使用管理通知',
      steps: [
        '點擊「啟用通知」以允許瀏覽器發送通知。',
        '輸入提醒標題、延遲時間與類型，然後點擊「新增提醒」。',
        '時間到時，您將會收到推播通知。'
      ],
      tips: ['確保您的瀏覽器與作業系統允許接收通知。']
    }
  },
  {
    id: 'admin',
    title: '管理員面板',
    icon: 'Layers',
    description: '使用者權限配置與系統級 API Co幣百分比消耗監控',
    category: 'Overview',
    requiredTier: 'Free',
  },
  {
    id: 'analytics',
    title: '用量與算力分析',
    icon: 'TrendingUp',
    description: '查看您的 Co 幣消耗與 AI 功能使用統計趨勢圖',
    category: 'Overview',
    requiredTier: 'Free',
  },
];

export const getIconComponent = (iconName: string) => {
  switch (iconName) {
    case 'MessageSquare': return MessageSquare;
    case 'Zap': return Zap;
    case 'Search': return Search;
    case 'MapPin': return MapPin;
    case 'ImageIcon': return ImageIcon;
    case 'ImagePlus': return ImagePlus;
    case 'Wand2': return Wand2;
    case 'Video': return Video;
    case 'Film': return Film;
    case 'Youtube': return Youtube;
    case 'PlaySquare': return PlaySquare;
    case 'Volume2': return Volume2;
    case 'Mic': return Mic;
    case 'Headphones': return Headphones;
    case 'LayoutDashboard': return LayoutDashboard;
    case 'Layers': return Layers;
    case 'Bell': return Bell;
    case 'Music': return Music;
    case 'TrendingUp': return TrendingUp;
    case 'Box': return Box;
    default: return MessageSquare;
  }
};
