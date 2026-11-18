import React, { useState, useEffect } from 'react';
import { Joyride, STATUS, Step } from 'react-joyride';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';

interface FeatureTutorialProps {
  featureId: string;
  steps: Step[];
  run?: boolean;
}

export default function FeatureTutorial({ featureId, steps, run = true }: FeatureTutorialProps) {
  const { theme } = useTheme();
  const { t } = useTranslation();
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem(`tutorial_seen_${featureId}`);
    if (!hasSeenTutorial && run) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => setIsRunning(true), 500);
      return () => clearTimeout(timer);
    }
  }, [featureId, run]);

  const handleJoyrideCallback = (data: any) => {
    const { status } = data;
    const finishedStatuses: string[] = [STATUS.FINISHED, STATUS.SKIPPED];

    if (finishedStatuses.includes(status)) {
      setIsRunning(false);
      localStorage.setItem(`tutorial_seen_${featureId}`, 'true');
    }
  };

  return (
    <Joyride
      steps={steps}
      run={isRunning}
      continuous={true}
      onEvent={handleJoyrideCallback}
      locale={{
        back: t('common.back', 'Back'),
        close: t('common.close', 'Close'),
        last: t('common.last', 'Last'),
        next: t('common.next', 'Next'),
        open: t('common.open', 'Open'),
        skip: t('common.skip', 'Skip'),
      }}
      options={{
        showProgress: true,
        buttons: ['back', 'close', 'primary', 'skip'],
        primaryColor: theme === 'dark' ? '#fff' : '#18181b',
        textColor: theme === 'dark' ? '#e4e4e7' : '#3f3f46',
        backgroundColor: theme === 'dark' ? '#18181b' : '#fff',
        arrowColor: theme === 'dark' ? '#18181b' : '#fff',
        overlayColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      }}
      styles={{
        tooltipContainer: {
          textAlign: 'left',
        },
        buttonPrimary: {
          backgroundColor: theme === 'dark' ? '#fff' : '#18181b',
          color: theme === 'dark' ? '#18181b' : '#fff',
          borderRadius: '8px',
          padding: '8px 16px',
        },
        buttonBack: {
          color: theme === 'dark' ? '#a1a1aa' : '#71717a',
          marginRight: '8px',
        },
        buttonSkip: {
          color: theme === 'dark' ? '#a1a1aa' : '#71717a',
        }
      }}
    />
  );
}
