import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { HelpCircle, X, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { FEATURES } from '../constants';
import Tooltip from './Tooltip';

interface HelpButtonProps {
  featureId: string;
}

export default function HelpButton({ featureId }: HelpButtonProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const feature = FEATURES.find(f => f.id === featureId);
  const tutorial = feature?.tutorial;

  const renderStep = (text: string) => {
    if (featureId !== 'image-gen') return text;
    
    const highlights = [
      { key: '提示詞輸入框', tooltip: '在此輸入您想生成的圖片描述' },
      { key: '長寬比', tooltip: '選擇圖片的比例，如 1:1 或 16:9' },
      { key: '圖片解析度大小', tooltip: '選擇圖片的畫質大小' },
      { key: '「生成圖片」按鈕', tooltip: '點擊此按鈕開始生成' },
      { key: 'Prompt Input', tooltip: 'Enter your image description here' },
      { key: 'Aspect Ratio', tooltip: 'Choose the proportion of the image' },
      { key: 'Image Size', tooltip: 'Choose the resolution of the image' },
      { key: 'Generate Image', tooltip: 'Click to start generating' },
    ];

    let parts: (string | React.ReactNode)[] = [text];

    highlights.forEach(({ key, tooltip }) => {
      parts = parts.flatMap((part, index) => {
        if (typeof part !== 'string') return [part];
        const split = part.split(key);
        if (split.length === 1) return [part];
        
        const result: (string | React.ReactNode)[] = [];
        split.forEach((s, i) => {
          result.push(s);
          if (i < split.length - 1) {
            result.push(
              <Tooltip key={`${key}-${index}-${i}`} content={tooltip}>
                <span className="text-indigo-600 font-medium border-b border-indigo-600/30 border-dashed cursor-help">{key}</span>
              </Tooltip>
            );
          }
        });
        return result;
      });
    });

    return <>{parts}</>;
  };

  if (!tutorial) return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-12 h-12 bg-black/80 backdrop-blur-md text-white rounded-full flex items-center justify-center shadow-lg hover:bg-black hover:scale-105 active:scale-95 transition-all"
        title={t('common.tutorial')}
      >
        <HelpCircle size={24} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg glass-panel rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-white/20 bg-white/10">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/50 border border-white/20 flex items-center justify-center shadow-sm">
                    <HelpCircle size={20} className="text-zinc-700" />
                  </div>
                  <h3 className="text-lg font-medium text-zinc-900">{t(`features.${featureId}.tutorial.title`)}</h3>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 text-zinc-400 hover:text-zinc-900 hover:bg-white/30 rounded-full transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto">
                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider">{t('common.steps')}</h4>
                    <ol className="space-y-3">
                      {tutorial.steps.map((_, index) => (
                        <li key={index} className="flex gap-3 text-zinc-600 font-light leading-relaxed">
                          <span className="flex-shrink-0 w-6 h-6 rounded-full bg-zinc-100 text-zinc-600 flex items-center justify-center text-xs font-medium mt-0.5">
                            {index + 1}
                          </span>
                          <span>{renderStep(t(`features.${featureId}.tutorial.steps.${index}`, { defaultValue: tutorial.steps[index] }))}</span>
                        </li>
                      ))}
                    </ol>
                  </div>
                  
                  {tutorial.tips && tutorial.tips.length > 0 && (
                    <div>
                      <h4 className="text-sm font-semibold text-zinc-900 mb-3 uppercase tracking-wider flex items-center gap-2">
                        <Info size={16} className="text-blue-500" />
                        {t('common.tips')}
                      </h4>
                      <ul className="space-y-2">
                        {tutorial.tips.map((_, index) => (
                          <li key={index} className="flex gap-3 text-zinc-600 font-light leading-relaxed bg-blue-50/50 p-3 rounded-xl border border-blue-100/50">
                            <span>{t(`features.${featureId}.tutorial.tips.${index}`)}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="p-4 border-t border-white/20 bg-white/10 flex justify-end">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-6 py-2.5 bg-black/80 backdrop-blur-md text-white rounded-xl text-sm font-medium hover:bg-black transition-colors shadow-sm"
                >
                  {t('common.gotIt')}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
