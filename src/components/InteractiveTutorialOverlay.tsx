import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, ArrowRight, Zap, GraduationCap, X, CheckCircle, ThumbsUp, Send, Printer } from 'lucide-react';
import { useTutorial } from '../contexts/TutorialContext';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

interface InteractiveTutorialOverlayProps {
  activeFeature: string;
  onSelectFeature: (id: any) => void;
}

export default function InteractiveTutorialOverlay({
  activeFeature,
  onSelectFeature
}: InteractiveTutorialOverlayProps) {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const {
    currentStep,
    isActive,
    setStep,
    nextStep,
    completeTutorial,
    showWelcomeOverlay,
    setShowWelcomeOverlay,
    startTutorial,
    autofillPrompt
  } = useTutorial();

  const [coords, setCoords] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  // Position helper to track and highlight target elements dynamically
  useEffect(() => {
    if (!isActive || currentStep === 'idle' || currentStep === 'completed') {
      setCoords(null);
      return;
    }

    const getTargetSelector = () => {
      switch (currentStep) {
        case 'click_chat':
          // Desktop or mobile sidebar item for chat
          return '#sidebar-feature-chat, button[title*="Chat"], button[title*="對話"]';
        case 'enter_prompt':
          return 'textarea[placeholder*="Gemini"], textarea[placeholder*="問問"]';
        case 'click_send':
          return 'button[type="submit"]:has(svg), button:has(svg.lucide-send)';
        case 'try_feedback':
          // Newly added ThumbsUp or Rating feedback container
          return '.rating-feedback-container, button[title*="列印"], button[title*="Print"]';
        default:
          return null;
      }
    };

    const updatePosition = () => {
      const selector = getTargetSelector();
      if (!selector) {
        setCoords(null);
        return;
      }

      const element = document.querySelector(selector) as HTMLElement;
      if (element) {
        const rect = element.getBoundingClientRect();
        setCoords({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });
      } else {
        // If element is not in view yet (e.g. chat page loading), keep coords null to center card safely
        setCoords(null);
      }
    };

    // Run immediately and setup listeners
    updatePosition();
    const interval = setInterval(updatePosition, 500); // Poll slightly to handle loading updates
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isActive, currentStep, activeFeature]);

  // Reactive step transitions to make the walkthrough feel buttery smooth and intelligent
  useEffect(() => {
    if (!isActive) return;

    if (currentStep === 'click_chat' && activeFeature === 'chat') {
      // User successfully navigated to chat, trigger entering prompt
      setTimeout(() => {
        nextStep();
      }, 600);
    }
  }, [activeFeature, currentStep, isActive]);

  // Listen to input and autofill helper events
  const handleAutofill = () => {
    const textarea = document.querySelector('textarea[placeholder*="Gemini"], textarea[placeholder*="問問"]') as HTMLTextAreaElement;
    if (textarea) {
      // Simulate real React value change
      const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value")?.set;
      nativeInputValueSetter?.call(textarea, autofillPrompt);
      
      const event = new Event('input', { bubbles: true });
      textarea.dispatchEvent(event);
      textarea.focus();

      // Proceed immediately to pointing at the Send button
      setTimeout(() => {
        setStep('click_send');
      }, 450);
    }
  };

  if (!isActive) {
    // Render the beautiful start-tutorial suggestion card when requested
    return (
      <AnimatePresence>
        {showWelcomeOverlay && (
          <div className="fixed bottom-6 right-6 z-50 max-w-sm w-full p-1">
            <motion.div
              initial={{ opacity: 0, y: 30, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 30, scale: 0.9 }}
              className="bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-md rounded-2xl border border-white/20 p-5 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl -z-10" />
              
              <button
                onClick={() => setShowWelcomeOverlay(false)}
                className="absolute top-3 right-3 text-zinc-400 hover:text-white transition-colors"
                title="關閉"
              >
                <X size={15} />
              </button>

              <div className="flex gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30">
                  <GraduationCap size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-white tracking-wide flex items-center gap-1.5">
                    {t('tutorial.suggest.title', '探索實作教學')}
                    <span className="px-1.5 py-0.5 rounded bg-amber-400/15 text-amber-300 border border-amber-400/20 text-[9px] font-bold leading-none">
                      {t('tutorial.suggest.badge', '首訪推薦')}
                    </span>
                  </h4>
                  <p className="text-xs text-zinc-450 mt-1 leading-relaxed">
                    {t('tutorial.suggest.desc', '只需 30 秒，帶您體驗首次的 AI 對話、功能控制，以及最棒的滿意度回饋追蹤！')}
                  </p>
                  <div className="flex gap-2.5 mt-4">
                    <button
                      onClick={startTutorial}
                      className="px-3.5 py-1.5 rounded-lg bg-indigo-500 hover:bg-indigo-600 text-white text-[11px] font-semibold transition-all hover:scale-105 active:scale-95 shadow-md flex items-center gap-1 cursor-pointer"
                    >
                      <span>{t('tutorial.btn.start', '立即出發')}</span>
                      <ArrowRight size={12} />
                    </button>
                    <button
                      onClick={() => setShowWelcomeOverlay(false)}
                      className="px-2.5 py-1.5 rounded-lg hover:bg-white/10 text-zinc-400 hover:text-zinc-200 text-[11px] font-medium transition-colors cursor-pointer"
                    >
                      {t('tutorial.btn.later', '稍後再說')}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    );
  }

  // Render overlay background and highlight ring safely
  return (
    <div className="fixed inset-0 z-50 pointer-events-none">
      {/* Dynamic focus highlight box if coords are found */}
      {coords && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{
            opacity: 1,
            top: coords.top - 6,
            left: coords.left - 6,
            width: coords.width + 12,
            height: coords.height + 12,
          }}
          className="absolute rounded-xl border-2 border-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.5)] z-40 transition-all pointer-events-none"
          transition={{ type: 'spring', damping: 20, stiffness: 250 }}
        >
          <span className="absolute -top-1.5 -right-1.5 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-indigo-500"></span>
          </span>
        </motion.div>
      )}

      {/* Floating Tutorial dialog card */}
      <div className="absolute inset-x-4 bottom-6 md:inset-x-auto md:right-8 md:top-24 z-50 max-w-sm pointer-events-auto">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, y: 15, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.95 }}
            className="bg-zinc-900 text-white rounded-2.5xl p-6 shadow-2xl border border-white/10 flex flex-col relative overflow-hidden"
          >
            {/* Ambient Background decoration */}
            <div className="absolute -top-10 -left-10 w-24 h-24 bg-indigo-500/10 rounded-full blur-xl pointer-events-none" />
            
            {/* Step header */}
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
              <div className="flex items-center gap-1.5 text-indigo-400 font-mono text-xs font-semibold uppercase tracking-wider">
                <Sparkles size={13} className="animate-pulse" />
                <span>實作導覽 · Step {
                  currentStep === 'click_chat' ? '1/4' :
                  currentStep === 'enter_prompt' ? '2/4' :
                  currentStep === 'click_send' ? '3/4' : '4/4'
                }</span>
              </div>
              <button
                onClick={completeTutorial}
                className="text-zinc-500 hover:text-white transition-colors cursor-pointer"
                title={t('common.skip', '略過教學')}
              >
                <X size={15} />
              </button>
            </div>

            {/* Step description */}
            {currentStep === 'click_chat' && (
              <div>
                <h3 className="font-serif font-medium text-base text-zinc-100 leading-normal">
                  {t('tutorial.step1.title', '第一步：前往智慧對話 💬')}
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-light">
                  {t('tutorial.step1.desc', '請點擊左側導覽列的「Chat (對話)」按鈕，或者點擊下方按鈕直接為您跳轉，展開第一次的高智慧交流。')}
                </p>
                <button
                  type="button"
                  onClick={() => onSelectFeature('chat')}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs font-medium border border-indigo-500/20 transition-all cursor-pointer"
                >
                  <span>{t('tutorial.btn.jump', '直接幫我跳轉')}</span>
                  <ArrowRight size={13} />
                </button>
              </div>
            )}

            {currentStep === 'enter_prompt' && (
              <div>
                <h3 className="font-serif font-medium text-base text-zinc-100 leading-normal">
                  {t('tutorial.step2.title', '第二步：擬定任務 prompt 📝')}
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-light">
                  {t('tutorial.step2.desc', '在輸入框輸入你想委派給 AI 的指令。點擊下方按鈕可以為您自動代入一個有趣的幽默測試！')}
                </p>
                <button
                  type="button"
                  onClick={handleAutofill}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-all hover:scale-102 active:scale-98 shadow-sm cursor-pointer"
                >
                  <Zap size={13} className="text-indigo-400 fill-indigo-400/20" />
                  <span>{t('tutorial.btn.autofill', '自動幫我代入範本')}</span>
                </button>
              </div>
            )}

            {currentStep === 'click_send' && (
              <div>
                <h3 className="font-serif font-medium text-base text-zinc-100 leading-normal">
                  {t('tutorial.step3.title', '第三步：傳送並執行使命 🚀')}
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-light">
                  {t('tutorial.step3.desc', '點擊輸入框右方的 Send 按鈕，或者按下鍵盤的 Enter 鍵。這時 AI 將會迅速解析並開始為您產生內容。')}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    const form = document.querySelector('form') as HTMLFormElement;
                    if (form) {
                      form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
                      nextStep();
                    } else {
                      nextStep();
                    }
                  }}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-medium transition-all cursor-pointer"
                >
                  <span>{t('common.send', '傳送訊息')}</span>
                  <Send size={12} />
                </button>
              </div>
            )}

            {currentStep === 'await_response' && (
              <div className="flex flex-col items-center py-2 text-center">
                <div className="w-10 h-10 border-2 border-indigo-500/20 border-t-indigo-400 rounded-full animate-spin mb-3"></div>
                <h3 className="font-serif font-medium text-sm text-zinc-100">
                  {t('tutorial.step_await.title', '模型思考與回應中')}
                </h3>
                <p className="text-[11px] text-zinc-400 mt-1 leading-normal max-w-xs font-light">
                  {t('tutorial.step_await.desc', '強大的 Gemini 引擎正在構思最完美的內容，請稍等片刻... 當它完成後將自動跳轉到下一個關鍵步驟！')}
                </p>
                <button
                  onClick={() => setStep('try_feedback')}
                  className="mt-4.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-400 hover:text-white text-[10px] transition-colors cursor-pointer"
                >
                  {t('tutorial.btn.nextStep', '直接進入下一步')}
                </button>
              </div>
            )}

            {currentStep === 'try_feedback' && (
              <div>
                <h3 className="font-serif font-medium text-base text-zinc-100 leading-normal">
                  {t('tutorial.step4.title', '第四步：品質回饋與列印 ⚖️')}
                </h3>
                <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed font-light">
                  {t('tutorial.step4.desc', '在 AI 的每一條回應或是生成的卡片底下，我們精心設計了「優質 / 不慢意」滿意度評價與「列印」對話按鈕。')}
                </p>
                <div className="mt-3.5 flex items-center gap-3 border border-white/5 bg-white/5 p-2 rounded-xl">
                  <div className="flex gap-1">
                    <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/10"><ThumbsUp size={12} /></span>
                    <span className="p-1.5 rounded-lg bg-white/5 text-zinc-400"><Printer size={12} /></span>
                  </div>
                  <span className="text-[10px] text-zinc-300 font-light">{t('tutorial.feedbackHint', '回饋能協助系統更加理解您的偏好與期望！')}</span>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('completed')}
                  className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold transition-all hover:scale-102 active:scale-98 shadow-md cursor-pointer"
                >
                  <span>{t('tutorial.btn.claim', '結束並領取獎勵 🌟')}</span>
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Completion Modal */}
      <AnimatePresence>
        {currentStep === 'completed' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs pointer-events-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-zinc-900 text-white text-center max-w-sm w-full p-8 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
              
              <div className="mx-auto w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-5 border border-emerald-500/20 shadow-lg shadow-emerald-500/5">
                <CheckCircle size={36} />
              </div>

              <h2 className="text-2xl font-serif font-semibold text-white tracking-tight">
                {t('tutorial.complete.title', '恭喜完成基礎特訓！')}
              </h2>
              
              <p className="text-xs text-zinc-400 mt-2.5 leading-relaxed font-light">
                {t('tutorial.complete.desc', '您已掌握了 CoLab AI Studio 最核心的操作 mechanics！')}
              </p>

              <div className="my-5 p-3.5 rounded-xl border border-white/5 bg-white/5 text-zinc-305 flex flex-col gap-1 text-center">
                <div className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase">{t('tutorial.complete.rewardTitle', '解鎖特許獎勵')}</div>
                <div className="text-md font-bold text-amber-400 flex items-center justify-center gap-1">
                  <span>{t('tutorial.complete.rewardDesc', '+50 免費 Co-Coins 配額已生效')}</span>
                </div>
              </div>

              <button
                onClick={completeTutorial}
                className="w-full py-3 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-600 hover:to-violet-600 text-white text-sm font-semibold transition-all hover:scale-102 active:scale-98 shadow-lg shadow-indigo-500/10 cursor-pointer"
              >
                {t('tutorial.btn.done', '開始遨遊 AI 世界')}
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
