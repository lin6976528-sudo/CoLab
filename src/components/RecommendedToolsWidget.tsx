import React from 'react';
import { motion } from 'motion/react';
import { useTranslation } from 'react-i18next';
import { Sparkles, ArrowRight, Star, BrainCircuit, MessageSquare, Image, Film, Music, Layers, Search, Compass, ShieldAlert, Wand2, RefreshCw } from 'lucide-react';
import { useHistory } from '../contexts/HistoryContext';
import { FEATURES, getIconComponent } from '../constants';
import { FeatureId } from '../types';

interface RecommendedToolsWidgetProps {
  onSelectFeature: (id: FeatureId) => void;
}

interface RecommendationRule {
  triggerTools: string[];
  recommendedId: FeatureId;
  reasonZh: string;
  reasonEn: string;
}

const RECOMMENDATION_RULES: RecommendationRule[] = [
  {
    triggerTools: ['chat', 'fast-chat'],
    recommendedId: 'agent',
    reasonZh: '您經常進行對話互動。推薦您試試 AI Agent，它能自動化執行更複雜的多步驟任務，成為您的虛擬助理！',
    reasonEn: 'You frequently engage in conversational chats. Try AI Agent to automate complex multi-step tasks with a smart copilot!',
  },
  {
    triggerTools: ['chat', 'fast-chat', 'search'],
    recommendedId: 'batch-process',
    reasonZh: '您頻繁處理文字與檢索。批次處理能幫助您同時對多個提示詞或大量文件進行一鍵處理，翻倍提升效率！',
    reasonEn: 'You frequently process text and search queries. Batch Process lets you run prompts on multiple files or items simultaneously!',
  },
  {
    triggerTools: ['image-gen', 'edit-image'],
    recommendedId: 'animate-image',
    reasonZh: '您熱衷於圖片創作與編修。試試圖片動畫功能，將您的精緻靜態圖像一鍵渲染成流暢、令人驚豔的動態短影！',
    reasonEn: 'You love creating and editing images. Try Animate Image to turn your static generated masterpieces into cinematic motion videos with one click!',
  },
  {
    triggerTools: ['image-gen'],
    recommendedId: 'edit-image',
    reasonZh: '您近期生成了許多精美圖片。圖片編輯功能可讓您使用簡單的文字提示對局部進行微調（如換底、加物），省去重新生圖的繁複！',
    reasonEn: 'You have generated several beautiful images. Use Edit Image to modify local details or swap backgrounds using natural language prompts!',
  },
  {
    triggerTools: ['video-gen', 'animate-image', 'youtube-gen'],
    recommendedId: 'music-gen',
    reasonZh: '您是位動態影音創作者。使用音樂生成功能，即可為您的動畫短片或 YouTube 影片量身打造原創、無版權疑慮的專屬背景音樂！',
    reasonEn: 'You are a dynamic video and animation creator. Use Music Gen to easily craft tailored, royalty-free audio tracks for your video masterpieces!',
  },
  {
    triggerTools: ['video-gen', 'animate-image'],
    recommendedId: 'transcribe',
    reasonZh: '頻繁進行影片創作的您，可結合語音轉文字（語音聽寫）功能，智慧辨識、提取口白文本，加速影片字幕產製！',
    reasonEn: 'Since you frequently create videos, pair them with Speech-to-Text Transcription to painlessly export spoken dialogue for automatic subtitle creation!',
  },
  {
    triggerTools: ['search', 'maps'],
    recommendedId: 'chat',
    reasonZh: '因為您看重最新資訊與景點定位，推薦使用強悍的 AI 聊天機器人（Gemini 1.5 Pro）來為繁雜的檢索資料進行深度拆解與規劃！',
    reasonEn: 'You frequently query real-time updates and locations. Take standard Chat (Gemini 1.5 Pro) for a spin to deeply analyze and index complex search results!',
  },
  {
    triggerTools: ['music-gen', 'transcribe'],
    recommendedId: 'video-gen',
    reasonZh: '基於您的音訊與語意偏好，推薦您使用 Veo 影片生成大腦，為您的原創音軌或聽寫對白量身烘托一段絕美品味的視覺動態！',
    reasonEn: 'Based on your audio preferences, try Veo Video Gen to pair your custom music tracks with majestic cinematic visuals!',
  }
];

export const RecommendedToolsWidget: React.FC<RecommendedToolsWidgetProps> = React.memo(({ onSelectFeature }) => {
  const { t, i18n } = useTranslation();
  const isZh = i18n.language === 'zh';
  const { history } = useHistory();

  // Compute tool usage frequency from user history
  const recommendations = React.useMemo(() => {
    if (!history || history.length === 0) {
      // Return default onboarding recommendations for empty state
      return [
        {
          feature: FEATURES.find(f => f.id === 'chat'),
          reason: isZh 
            ? '新手上路首選！使用高階 Gemini 1.5 Pro 推理，可深度解決複雜程式、企劃與撰稿任務。' 
            : 'The perfect starting point! Powered by Gemini 1.5 Pro for full-scale analytical logic and long-form coding.',
          badge: isZh ? '人氣王者' : 'Most Popular',
          score: 100
        },
        {
          feature: FEATURES.find(f => f.id === 'image-gen'),
          reason: isZh
            ? '具備強烈視覺震撼。依您文字輸入即刻繪製超精細寫實、動漫等各維度藝術分鏡圖片！'
            : 'Stunning visual creativity on demand. Craft anime, 3D renderings, and ultra-high-definition canvas with text.',
          badge: isZh ? '視覺必備' : 'Creative Star',
          score: 95
        }
      ].filter(r => r.feature !== undefined);
    }

    // Count tools
    const counts: Record<string, number> = {};
    history.forEach((item) => {
      if (item.tool) {
        counts[item.tool] = (counts[item.tool] || 0) + 1;
      }
    });

    // Find custom matches based on rules
    const matchedRecommendations: Array<{
      feature: typeof FEATURES[0];
      reason: string;
      badge: string;
      score: number;
    }> = [];

    // Evaluate each rule
    RECOMMENDATION_RULES.forEach((rule) => {
      // Calculate how many times user triggered the trigger tools of this rule
      let triggerCount = 0;
      rule.triggerTools.forEach((tId) => {
        triggerCount += (counts[tId] || 0);
      });

      if (triggerCount > 0) {
        const feature = FEATURES.find(f => f.id === rule.recommendedId);
        if (feature) {
          matchedRecommendations.push({
            feature,
            reason: isZh ? rule.reasonZh : rule.reasonEn,
            badge: isZh ? '智慧適配' : 'Smart Fit',
            score: triggerCount * 1.5 // weighting
          });
        }
      }
    });

    // Avoid duplicate recommended features (taking the one with higher score)
    const uniqueMap = new Map<string, typeof matchedRecommendations[0]>();
    matchedRecommendations.forEach((rec) => {
      const existing = uniqueMap.get(rec.feature.id);
      if (!existing || existing.score < rec.score) {
        uniqueMap.set(rec.feature.id, rec);
      }
    });

    let finalRecs = Array.from(uniqueMap.values());

    // Sort by score
    finalRecs.sort((a, b) => b.score - a.score);

    // If we have fewer than 2 recommendations, backfill with default premium tools that aren't the top used ones
    if (finalRecs.length < 2) {
      const popularBackfills = ['agent', 'video-gen', 'three-d-studio'];
      for (const id of popularBackfills) {
        if (finalRecs.length >= 2) break;
        if (finalRecs.some(r => r.feature.id === id)) continue;
        
        // Ensure it's not the user's #1 most used tool to ensure interesting suggestions
        const userTopTool = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
        if (userTopTool === id) continue;

        const feature = FEATURES.find(f => f.id === id);
        if (feature) {
          finalRecs.push({
            feature,
            reason: isZh 
              ? `升級您的 AI 工作流。點擊試試 ${feature.title} 一站式整合體驗！`
              : `Level up your AI automation. Experience next-generation capabilities with ${feature.title}!`,
            badge: isZh ? '潛力推薦' : 'Trending',
            score: 10
          });
        }
      }
    }

    return finalRecs.slice(0, 2);
  }, [history, isZh]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="rounded-3xl border border-zinc-200/60 dark:border-zinc-800/85 bg-white/45 dark:bg-zinc-900/25 backdrop-blur-md p-6 relative overflow-hidden flex flex-col gap-5 shadow-sm"
    >
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <BrainCircuit size={16} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-50 tracking-tight font-sans">
              {isZh ? '智慧推薦 AI 工具' : 'Recommended AI Tools'}
            </h3>
            <p className="text-[11px] text-zinc-400 dark:text-zinc-500 font-light mt-0.5">
              {isZh 
                ? '系統透過演算法深度分析您日常習慣與愛用工具，即時為您配對可大幅升級工作流的高階特徵。' 
                : 'Algorithms analyze your daily work habits to recommend synergistic premium modules to boost output.'}
            </p>
          </div>
        </div>

        {history && history.length > 0 && (
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-850 border border-zinc-200/40 dark:border-zinc-800/50">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 select-none">
              {isZh ? '已適配您的個人偏好' : 'Adapted to preferences'}
            </span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {recommendations.map((rec) => {
          if (!rec.feature) return null;
          const Icon = getIconComponent(rec.feature.icon);

          return (
            <motion.div
              key={`recommendation-${rec.feature.id}`}
              whileHover={{ y: -4, scale: 1.018 }}
              whileTap={{ scale: 0.985 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
              onClick={() => onSelectFeature(rec.feature!.id as FeatureId)}
              className="group p-5 rounded-2xl border border-zinc-200/50 dark:border-zinc-850/60 bg-white/85 dark:bg-zinc-900/45 hover:bg-white dark:hover:bg-zinc-850/60 cursor-pointer transition-all duration-300 relative flex flex-col justify-between overflow-hidden hover:shadow-xl hover:shadow-indigo-500/12 dark:hover:shadow-indigo-500/20"
            >
              {/* Top background accent subtle glow */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-linear-to-bl from-indigo-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />

              <div className="space-y-3.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-indigo-500/5 dark:bg-indigo-400/5 border border-indigo-500/10 dark:border-indigo-400/15 flex items-center justify-center text-indigo-500 group-hover:scale-105 group-hover:bg-indigo-505/10 transition-all duration-300 shrink-0">
                      <Icon size={18} strokeWidth={1.8} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-zinc-850 dark:text-zinc-150 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {isZh ? rec.feature.title : rec.feature.id}
                      </h4>
                      <p className="text-[10px] text-zinc-450 dark:text-zinc-500">
                        {isZh ? t(`common.categories.${rec.feature.category}`) : rec.feature.category}
                      </p>
                    </div>
                  </div>

                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-indigo-50/70 border border-indigo-150/50 text-indigo-600 dark:bg-indigo-950/20 dark:border-indigo-900/30 dark:text-indigo-400">
                    {rec.badge}
                  </span>
                </div>

                <p className="text-xs text-zinc-600 dark:text-zinc-350 leading-relaxed font-light min-h-[50px]">
                  {rec.reason}
                </p>
              </div>

              <div className="mt-4 pt-3.5 border-t border-zinc-100 dark:border-zinc-850/60 flex items-center justify-between text-[11px] font-bold text-indigo-600 dark:text-indigo-400 group-hover:text-indigo-700 dark:group-hover:text-indigo-300">
                <span className="flex items-center gap-1">
                  <Sparkles size={11} className="animate-pulse" />
                  {isZh ? '開啟此強大工具' : 'Launch Recommended Feature'}
                </span>
                <ArrowRight size={13} className="transform transition-transform duration-300 group-hover:translate-x-1" />
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.div>
  );
});
