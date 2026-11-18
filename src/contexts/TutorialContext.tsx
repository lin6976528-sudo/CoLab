import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

export type TutorialStepId = 
  | 'idle'
  | 'welcome'        // Invitation step
  | 'click_chat'     // Guide user to click Chat on the sidebar
  | 'enter_prompt'   // Guide user to prompt text input
  | 'click_send'     // Guide user to click the send button
  | 'await_response' // Awaiting Gemini response
  | 'try_feedback'   // Guide user to evaluate satisfaction using thumbs up/down
  | 'completed';     // Congratulations modal

interface TutorialContextProps {
  currentStep: TutorialStepId;
  isActive: boolean;
  startTutorial: () => void;
  nextStep: () => void;
  prevStep: () => void;
  setStep: (step: TutorialStepId) => void;
  completeTutorial: () => void;
  showWelcomeOverlay: boolean;
  setShowWelcomeOverlay: (show: boolean) => void;
  autofillPrompt: string;
}

const TutorialContext = createContext<TutorialContextProps | undefined>(undefined);

export function TutorialProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState<TutorialStepId>('idle');
  const [isActive, setIsActive] = useState(false);
  const [showWelcomeOverlay, setShowWelcomeOverlay] = useState(false);

  // Suggested autofill prompt to make the first interaction effortless
  const autofillPrompt = t('tutorial.autofill_prompt', '說一個跟人工智慧(AI)有關的冷笑話，並用幽默的自嘲作結！');

  useEffect(() => {
    // Check if they need a tutorial on first visit
    const onboardingSeen = localStorage.getItem('hasSeenOnboarding');
    const tutorialCompleted = localStorage.getItem('hasCompletedInteractiveTutorial');
    
    if (onboardingSeen && !tutorialCompleted) {
      // If they've seen the onboarding but haven't taken the interactive tutorial, suggest it!
      const timer = setTimeout(() => {
        setShowWelcomeOverlay(true);
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const completeTutorial = useCallback(() => {
    setIsActive(false);
    setCurrentStep('idle');
    localStorage.setItem('hasCompletedInteractiveTutorial', 'true');
    localStorage.setItem('hasSeenOnboarding', 'true');
  }, []);

  const startTutorial = useCallback(() => {
    setIsActive(true);
    setCurrentStep('click_chat');
    setShowWelcomeOverlay(false);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStep((prev) => {
      switch (prev) {
        case 'click_chat':
          return 'enter_prompt';
        case 'enter_prompt':
          return 'click_send';
        case 'click_send':
          return 'await_response';
        case 'await_response':
          return 'try_feedback';
        case 'try_feedback':
          return 'completed';
        case 'completed':
          completeTutorial();
          return 'idle';
        default:
          return prev;
      }
    });
  }, [completeTutorial]);

  const prevStep = useCallback(() => {
    setCurrentStep((prev) => {
      switch (prev) {
        case 'enter_prompt':
          return 'click_chat';
        case 'click_send':
          return 'enter_prompt';
        case 'try_feedback':
          return 'await_response';
        default:
          return prev;
      }
    });
  }, []);

  const setStep = useCallback((step: TutorialStepId) => {
    setCurrentStep(step);
    setIsActive(step !== 'idle');
  }, []);

  const contextValue = useMemo(() => ({
    currentStep,
    isActive,
    startTutorial,
    nextStep,
    prevStep,
    setStep,
    completeTutorial,
    showWelcomeOverlay,
    setShowWelcomeOverlay,
    autofillPrompt
  }), [
    currentStep,
    isActive,
    startTutorial,
    nextStep,
    prevStep,
    setStep,
    completeTutorial,
    showWelcomeOverlay,
    autofillPrompt
  ]);

  return (
    <TutorialContext.Provider value={contextValue}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
