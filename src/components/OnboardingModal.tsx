import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, LayoutDashboard, Key, History, ChevronRight, X, Layers, Zap } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useTutorial } from '../contexts/TutorialContext';

const steps = [
  {
    id: 'welcome',
    icon: Sparkles,
    titleKey: 'onboarding.welcome.title',
    defaultTitle: 'Welcome to CoLab',
    descKey: 'onboarding.welcome.desc',
    defaultDesc: "Your all-in-one workspace for exploring Google's latest AI models. Let's take a quick tour to get you started.",
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50',
  },
  {
    id: 'tools',
    icon: LayoutDashboard,
    titleKey: 'onboarding.tools.title',
    defaultTitle: 'Explore the Tools',
    descKey: 'onboarding.tools.desc',
    defaultDesc: 'Use the sidebar to navigate between different features like Chat, Video Generation, Image Editing, and more.',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-50',
  },
  {
    id: 'canvas',
    icon: Layers,
    titleKey: 'onboarding.canvas.title',
    defaultTitle: 'Infinite Creative Canvas',
    descKey: 'onboarding.canvas.desc',
    defaultDesc: 'Our newest flagship feature! Solidify notes, drag previously generated images & videos onto an infinite board, and connect the dots in real-time collaboration rooms.',
    color: 'text-violet-600',
    bgColor: 'bg-violet-50',
  },
  {
    id: 'coins',
    icon: Zap,
    titleKey: 'onboarding.coins.title',
    defaultTitle: 'CoCoins Economic Circuit',
    descKey: 'onboarding.coins.desc',
    defaultDesc: 'AI generations use CoCoins to register on-demand cloud compute. Track points on your dashboard, check limits, and boost your daily allowance!',
    color: 'text-amber-500',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'keys',
    icon: Key,
    titleKey: 'onboarding.keys.title',
    defaultTitle: 'Secure Your API Keys',
    descKey: 'onboarding.keys.desc',
    defaultDesc: 'Some advanced features require a Google Cloud API key. You can set this up securely in the Settings menu (gear icon) under Secrets.',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50',
  },
  {
    id: 'history',
    icon: History,
    titleKey: 'onboarding.history.title',
    defaultTitle: 'Never Lose Your Work',
    descKey: 'onboarding.history.desc',
    defaultDesc: 'Your generated content and chat conversations are automatically saved to your History, so you can always pick up where you left off.',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
  },
];

export default function OnboardingModal() {
  const { t } = useTranslation();
  const { startTutorial } = useTutorial();
  const [isOpen, setIsOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const hasSeenOnboarding = localStorage.getItem('hasSeenOnboarding');
    if (!hasSeenOnboarding) {
      // Small delay to let the app load first
      const timer = setTimeout(() => setIsOpen(true), 150);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    const handleTrigger = () => {
      setCurrentStep(0);
      setIsOpen(true);
    };
    window.addEventListener('trigger-onboarding', handleTrigger);
    return () => window.removeEventListener('trigger-onboarding', handleTrigger);
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    localStorage.setItem('hasSeenOnboarding', 'true');
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleClose();
    }
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const Icon = step.icon;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={handleClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="relative w-full max-w-md glass-panel rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            {/* Close Button */}
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 hover:bg-white/30 rounded-full transition-colors z-10"
            >
              <X size={20} />
            </button>

            {/* Content Area */}
            <div className="p-8 pt-10 flex-1 flex flex-col items-center text-center">
              <motion.div
                key={step.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className={`w-20 h-20 rounded-2xl ${step.bgColor} ${step.color} flex items-center justify-center mb-6 shadow-sm`}>
                  <Icon size={40} strokeWidth={1.5} />
                </div>
                
                <h3 className="text-2xl font-serif font-medium text-zinc-900 mb-3 tracking-tight">
                  {t(step.titleKey, step.defaultTitle)}
                </h3>
                
                <p className="text-zinc-500 leading-relaxed font-light">
                  {t(step.descKey, step.defaultDesc)}
                </p>
              </motion.div>
            </div>

            {/* Footer Area */}
            <div className="p-6 bg-white/10 border-t border-white/20 flex flex-col gap-4">
              {/* Progress Dots */}
              <div className="flex justify-center gap-2 mb-2">
                {steps.map((_, idx) => (
                  <div
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      idx === currentStep ? 'w-6 bg-zinc-800' : 'w-1.5 bg-zinc-300'
                    }`}
                  />
                ))}
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm font-medium text-zinc-500 hover:text-zinc-800 transition-colors cursor-pointer"
                >
                  {t('common.skip', 'Skip')}
                </button>
                
                <button
                  onClick={() => {
                    handleClose();
                    startTutorial();
                  }}
                  className="flex items-center gap-1.5 px-4.5 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-sm font-semibold rounded-2xl transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  <Sparkles size={14} className="text-indigo-500 animate-pulse animate-duration-1000" />
                  <span>實作導覽</span>
                </button>
                
                <button
                  onClick={handleNext}
                  className="flex items-center gap-2 px-6 py-2.5 bg-black/80 backdrop-blur-md hover:bg-black text-white text-sm font-medium rounded-2xl transition-all active:scale-95 shadow-sm cursor-pointer"
                >
                  {currentStep === steps.length - 1 
                    ? t('onboarding.getStarted', 'Get Started') 
                    : t('common.next', 'Next')}
                  {currentStep < steps.length - 1 && <ChevronRight size={16} />}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
