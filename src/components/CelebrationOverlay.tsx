import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Zap, Award, Crown, Check, Star } from 'lucide-react';
import { Tier } from '../types';

interface CelebrationOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  tier: Tier | null;
}

// Custom confetti particle definition
interface ConfettiParticle {
  id: number;
  cx: string;
  cy: string;
  color: string;
  size: number;
  rotation: number;
  delay: number;
  duration: number;
  xOffset: number;
  yOffset: number;
}

export default function CelebrationOverlay({ isOpen, onClose, tier }: CelebrationOverlayProps) {
  const [particles, setParticles] = useState<ConfettiParticle[]>([]);

  // Generate deterministic-looking random particles on mount / open
  useEffect(() => {
    if (isOpen) {
      const colors = [
        'bg-indigo-500', 
        'bg-pink-500', 
        'bg-purple-500', 
        'bg-amber-400', 
        'bg-emerald-400', 
        'bg-blue-400', 
        'bg-rose-500', 
        'bg-fuchsia-500'
      ];
      
      const newParticles = Array.from({ length: 45 }).map((_, i) => ({
        id: i,
        cx: `${10 + Math.random() * 80}%`, // Start horizontally distributed
        cy: '110%', // Start off-screen at bottom
        color: colors[i % colors.length],
        size: 8 + Math.random() * 14,
        rotation: Math.random() * 360,
        delay: Math.random() * 0.4,
        duration: 2.2 + Math.random() * 1.8,
        xOffset: (Math.random() - 0.5) * 260, // Fly slightly left/right
        yOffset: -(600 + Math.random() * 300), // Shoot upwards
      }));
      setParticles(newParticles);
    }
  }, [isOpen]);

  if (!isOpen || !tier) return null;

  // Visual meta definitions per Tier for customization
  const tierConfig = {
    Plus: {
      title: 'CoLab Ai Plus',
      theme: 'from-indigo-600 via-purple-600 to-pink-600',
      shadow: 'shadow-indigo-500/20',
      accent: 'text-indigo-500',
      icon: <Sparkles className="text-white animate-pulse" size={28} />,
      benefits: ['多充 1500 Co幣額度可用算力', '享受極致流暢中階圖片與分析支援', '影片中生成兩次', '圖片中生成十次', '回應管道優先排序提升效率', '體驗優化，降低生成等待時長'],
    },
    Go: {
      title: 'CoLab Ai Go',
      theme: 'from-teal-600 via-emerald-600 to-cyan-600',
      shadow: 'shadow-teal-500/20',
      accent: 'text-teal-500',
      icon: <Sparkles className="text-white animate-pulse" size={28} />,
      benefits: ['解鎖高達 3000 Co幣學霸特享額度', '完整支援高階圖片風格與多維度辨識', '圖片中生成20次', '影片中生成4次', '解鎖 AGI 進階助理任務自主代理', '包含 2 次 Veo 影片及動畫極速創作力'],
    },
    Pro: {
      title: 'CoLab Ai Pro',
      theme: 'from-blue-600 via-indigo-600 to-sky-600',
      shadow: 'shadow-blue-500/20',
      accent: 'text-blue-500',
      icon: <Zap className="text-white animate-bounce" size={28} />,
      benefits: ['超高 4500 Co幣主力模型核心額度', 'Gemini 3.1 Pro 超大字數百萬級推理', '影片生成 6 次', '文字轉擬真語音與即時文案精修', '極速調度回應，拒絕因繁忙排隊'],
    },
    One: {
      title: 'CoLab Ai One',
      theme: 'from-indigo-600 via-purple-600 to-pink-500',
      shadow: 'shadow-indigo-500/20',
      accent: 'text-indigo-500',
      icon: <Sparkles className="text-white animate-pulse" size={28} />,
      benefits: ['中高階 5500 Co幣全方位算力額度', '強悍 Imagen 3 圖片創作與多模態分析', '極速調度回應，大幅提升並行效率', '包含 2 次 Veo 動畫與短影極速渲染能力'],
    },
    Advanced: {
      title: 'CoLab Ai Advanced',
      theme: 'from-violet-600 via-purple-600 to-fuchsia-600',
      shadow: 'shadow-violet-500/20',
      accent: 'text-violet-500',
      icon: <Award className="text-white animate-bounce" size={28} />,
      benefits: ['大幅配載 6500 Co幣多媒體算力額度', 'Imagen 3 高級生圖引擎全幅支援', '包含 4 次頂尖 Google Veo 短影生成', '享尊榮級客戶 1對1 熱線支援與測試版預約'],
    },
    Ultra: {
      title: 'CoLab Ai Ultra',
      theme: 'from-amber-500 via-orange-500 to-red-500',
      shadow: 'shadow-amber-500/20',
      accent: 'text-amber-500',
      icon: <Crown className="text-white" size={28} />,
      benefits: ['至尊 9000 Co幣超量旗艦配發', '無限模型交互 + 搶先體驗最新測試版', 'Veo 3.1 毫秒級高影格生影片與多影片分析', '終極高優先級通道，算力永遠至強最速'],
    },
    Max: {
      title: 'CoLab Ai Max',
      theme: 'from-rose-500 via-pink-500 to-purple-600',
      shadow: 'shadow-rose-500/20',
      accent: 'text-rose-500',
      icon: <Star className="text-white animate-spin-slow" size={28} />,
      benefits: ['極致 12000 Co幣巨無霸智能額度', '尊榮 Max 終身獨創識別徽章與外觀配飾', '高達 8 次 Veo 高影格短影片創作額度', 'AGI 任務自主智能代理最高調配頻寬協作'],
    },
    Super: {
      title: 'CoLab Ai Super',
      theme: 'from-fuchsia-600 via-purple-700 to-pink-600',
      shadow: 'shadow-fuchsia-500/20',
      accent: 'text-fuchsia-500',
      icon: <Sparkles className="text-white animate-pulse" size={28} />,
      benefits: ['滿格 26000 Co幣量子神力加持', '星海級自我演算 AGI 完全體智能代理', '全宇宙 1 對 1 最頂級私人管家特權', '超豪金尊爵 Super 終身榮譽識別徽章'],
    },
    Free: {
      title: 'CoLab Ai Free',
      theme: 'from-zinc-600 to-zinc-800',
      shadow: 'shadow-zinc-500/25',
      accent: 'text-zinc-500',
      icon: <Sparkles className="text-white" size={28} />,
      benefits: ['提供 300 Co幣日常學習實練額度', '高品質 AI 聊天與智能多輪對話', '免費多功實用體驗，啟發靈感'],
    }
  };

  const currentConfig = tierConfig[tier as keyof typeof tierConfig] || tierConfig.Free;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-100 flex items-center justify-center p-4 overflow-hidden select-none">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 bg-zinc-950/75 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Dynamic Flying Confetti Elements with Framer Motion */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {particles.map((p) => {
            const isCircle = p.id % 2 === 0;
            return (
              <motion.div
                key={p.id}
                initial={{ 
                  opacity: 0, 
                  x: 0, 
                  y: 0, 
                  scale: 0.4,
                  rotate: p.rotation 
                }}
                animate={{ 
                  opacity: [0, 1, 1, 0.8, 0],
                  x: p.xOffset, 
                  y: p.yOffset,
                  scale: [0.4, 1.2, 1, 0.8, 0.6],
                  rotate: p.rotation + (p.id % 2 === 0 ? 360 : -360)
                }}
                transition={{ 
                  duration: p.duration, 
                  delay: p.delay, 
                  ease: [0.1, 0.8, 0.3, 1] 
                }}
                className={`absolute ${p.color} ${p.size} ${isCircle ? 'rounded-full' : 'rounded-xs'}`}
                style={{
                  left: p.cx,
                  bottom: '10px',
                  width: `${p.size}px`,
                  height: `${p.size}px`,
                }}
              />
            );
          })}
        </div>

        {/* Celebratory Display Card Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.82, y: 70 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 40 }}
          transition={{ 
            type: 'spring', 
            damping: 24, 
            stiffness: 140, 
            delay: 0.1 
          }}
          className={`relative w-full max-w-lg overflow-hidden rounded-3xl bg-white dark:bg-zinc-950 border border-zinc-200/50 dark:border-zinc-800/60 shadow-2xl ${currentConfig.shadow} p-1 text-center`}
        >
          {/* Top Elegant Gradient Glow Banner */}
          <div className={`h-40 bg-gradient-to-r ${currentConfig.theme} flex flex-col items-center justify-center relative p-6`}>
            {/* Ambient Background Decorative Grid Pattern */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff10_1px,transparent_1px),linear-gradient(to_bottom,#ffffff10_1px,transparent_1px)] bg-[size:14px_24px] opacity-35" />
            
            {/* Spinning Golden Sparkles */}
            <div className="absolute top-4 right-6 text-yellow-350 opacity-55 animate-pulse">
              <Star size={16} fill="currentColor" />
            </div>
            <div className="absolute bottom-4 left-6 text-yellow-350 opacity-45 animate-bounce">
              <Star size={12} fill="currentColor" />
            </div>

            {/* Glowing Icon Sphere */}
            <motion.div
              initial={{ scale: 0.4, rotate: -45, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', delay: 0.3, damping: 12 }}
              className="w-16 h-16 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center border border-white/20 shadow-lg"
            >
              {currentConfig.icon}
            </motion.div>

            <motion.h3 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.45 }}
              className="mt-3 text-lg font-bold text-white font-sans tracking-wide"
            >
              🎉 方案啟動成功！恭喜解鎖 ✨
            </motion.h3>
          </div>

          {/* Premium Body Content details */}
          <div className="p-7">
            {/* Dynamic Welcome Title */}
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.55 }}
            >
              <h1 className={`text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r ${currentConfig.theme} tracking-tight`}>
                {currentConfig.title} 試用特權
              </h1>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs font-semibold leading-normal mt-1.5 max-w-sm mx-auto">
                您的全新付費高階智腦配額已立刻準備就緒。
                在接下來的 7 天試用中，您可以盡情體驗最頂尖的算力支持與自訂代理！
              </p>
            </motion.div>

            {/* Benefit Highlights List */}
            <div className="mt-6 bg-zinc-50/70 dark:bg-zinc-900/40 border border-zinc-200/45 dark:border-zinc-800/45 rounded-2xl p-4 text-left select-text">
              <h4 className="text-[11px] font-extrabold uppercase tracking-widest text-zinc-400 dark:text-zinc-500 mb-3 text-center">
                🎁 您的專屬升級全新特權
              </h4>
              <ul className="space-y-2.5">
                {currentConfig.benefits.map((b, idx) => (
                  <motion.li
                    key={idx}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.65 + idx * 0.08 }}
                    className="flex items-start gap-2.5 text-[11px] font-medium text-zinc-700 dark:text-zinc-350"
                  >
                    <div className={`w-4 h-4 rounded-full ${currentConfig.accent} bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center shrink-0 mt-0.5 border border-zinc-200/60 dark:border-zinc-805/40`}>
                      <Check size={9} className="stroke-[3]" />
                    </div>
                    <span>{b}</span>
                  </motion.li>
                ))}
              </ul>
            </div>

            {/* Action button */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1 }}
              className="mt-6"
            >
              <button
                onClick={onClose}
                className={`w-full py-3 rounded-2xl bg-gradient-to-r ${currentConfig.theme} text-white text-xs font-bold font-sans hover:opacity-95 shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all cursor-pointer select-none`}
              >
                立刻開啟智能之旅 (Start Creating)
              </button>
              <p className="text-[9.5px] text-zinc-400 dark:text-zinc-500 font-light mt-2">
                試用期內隨時可在訂閱中心一鍵取消退訂，0 負擔，24 小時為您的創作效率護航。
              </p>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
