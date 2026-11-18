import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';

export interface TutorialStep {
  targetId: string;
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

interface TutorialOverlayProps {
  steps: TutorialStep[];
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
}

export default function TutorialOverlay({ steps, isOpen, onClose, featureId }: TutorialOverlayProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (!isOpen) {
      setCurrentStep(0);
      setTargetRect(null);
      return;
    }

    const updateRect = () => {
      const target = document.getElementById(steps[currentStep].targetId);
      if (target) {
        setTargetRect(target.getBoundingClientRect());
        target.classList.add('tutorial-highlight');
      }
    };

    updateRect();
    window.addEventListener('resize', updateRect);
    
    // Cleanup previous highlight
    return () => {
      window.removeEventListener('resize', updateRect);
      const prevTarget = document.getElementById(steps[currentStep].targetId);
      if (prevTarget) {
        prevTarget.classList.remove('tutorial-highlight');
      }
    };
  }, [isOpen, currentStep, steps]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const step = steps[currentStep];

  // Calculate tooltip position
  let tooltipStyle: React.CSSProperties = {};
  if (targetRect) {
    const spacing = 16;
    const position = step.position || 'bottom';
    
    switch (position) {
      case 'bottom':
        tooltipStyle = {
          top: targetRect.bottom + spacing,
          left: Math.max(16, targetRect.left + (targetRect.width / 2) - 160),
        };
        break;
      case 'top':
        tooltipStyle = {
          bottom: window.innerHeight - targetRect.top + spacing,
          left: Math.max(16, targetRect.left + (targetRect.width / 2) - 160),
        };
        break;
      case 'right':
        tooltipStyle = {
          top: Math.max(16, targetRect.top + (targetRect.height / 2) - 100),
          left: targetRect.right + spacing,
        };
        break;
      case 'left':
        tooltipStyle = {
          top: Math.max(16, targetRect.top + (targetRect.height / 2) - 100),
          right: window.innerWidth - targetRect.left + spacing,
        };
        break;
    }
  } else {
    // Center if target not found
    tooltipStyle = {
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)'
    };
  }

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-[2px] pointer-events-auto"
        onClick={onClose}
      />

      {/* Highlight Cutout (Simulated with box-shadow on a div) */}
      {targetRect && (
        <motion.div
          className="absolute rounded-xl pointer-events-none transition-all duration-300 ease-in-out"
          initial={false}
          animate={{
            top: targetRect.top - 8,
            left: targetRect.left - 8,
            width: targetRect.width + 16,
            height: targetRect.height + 16,
          }}
          style={{
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.5)',
            zIndex: 101
          }}
        />
      )}

      {/* Tooltip */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentStep}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="absolute w-80 bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-5 pointer-events-auto z-[102]"
          style={tooltipStyle}
        >
          <div className="flex justify-between items-start mb-3">
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">{step.title}</h3>
            <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
              <X size={16} />
            </button>
          </div>
          
          <p className="text-sm text-zinc-600 dark:text-zinc-400 mb-6 leading-relaxed">
            {step.content}
          </p>
          
          <div className="flex items-center justify-between">
            <div className="flex gap-1">
              {steps.map((_, i) => (
                <div 
                  key={i} 
                  className={`h-1.5 rounded-full transition-all ${i === currentStep ? 'w-4 bg-zinc-900 dark:bg-zinc-100' : 'w-1.5 bg-zinc-200 dark:bg-zinc-800'}`}
                />
              ))}
            </div>
            
            <div className="flex gap-2">
              {currentStep > 0 && (
                <button 
                  onClick={handlePrev}
                  className="p-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <button 
                onClick={handleNext}
                className="flex items-center gap-1 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-800 dark:hover:bg-zinc-200 transition-colors"
              >
                {currentStep < steps.length - 1 ? (
                  <>Next <ChevronRight size={16} /></>
                ) : (
                  <>Finish <Check size={16} /></>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
