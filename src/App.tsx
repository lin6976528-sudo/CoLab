import React, { useState, useCallback, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { MotionConfig } from 'motion/react';
import Layout from './components/Layout';
import { FeatureId } from './types';

// Lazy loaded features to optimize bundle size and prevent giant build artifacts
const DashboardFeature = lazy(() => import('./features/DashboardFeature'));
const ChatFeature = lazy(() => import('./features/ChatFeature'));
const ImageGenFeature = lazy(() => import('./features/ImageGenFeature'));
const ImageUnderstandFeature = lazy(() => import('./features/ImageUnderstandFeature'));
const EditImageFeature = lazy(() => import('./features/EditImageFeature'));
const VideoGenFeature = lazy(() => import('./features/VideoGenFeature'));
const MusicGenFeature = lazy(() => import('./features/MusicGenFeature'));
const YouTubeGenFeature = lazy(() => import('./features/YouTubeGenFeature'));
const BatchProcessFeature = lazy(() => import('./features/BatchProcessFeature'));
const AgentFeature = lazy(() => import('./features/AgentFeature'));
const TTSFeature = lazy(() => import('./features/TTSFeature'));
const AnimateImageFeature = lazy(() => import('./features/AnimateImageFeature'));
const TranscribeFeature = lazy(() => import('./features/TranscribeFeature'));
const VideoUnderstandFeature = lazy(() => import('./features/VideoUnderstandFeature'));
const LiveAudioFeature = lazy(() => import('./features/LiveAudioFeature'));
const RemindersFeature = lazy(() => import('./features/RemindersFeature'));
const AdminDashboardFeature = lazy(() => import('./features/AdminDashboardFeature'));
const AboutPage = lazy(() => import('./features/AboutPage'));
const AnalyticsFeature = lazy(() => import('./features/AnalyticsFeature'));
const InfiniteCanvasFeature = lazy(() => import('./features/InfiniteCanvasFeature'));
const ThreeDSceneFeature = lazy(() => import('./features/ThreeDSceneFeature'));

import { AuthProvider, useAuth } from './contexts/AuthContext';
import { HistoryProvider } from './contexts/HistoryContext';
import { ChatHistoryProvider } from './contexts/ChatHistoryContext';
import { SubscriptionProvider } from './contexts/SubscriptionContext';
import { RecentActivityProvider } from './contexts/RecentActivityContext';
import { PerformanceProvider, usePerformance } from './contexts/PerformanceContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import OnboardingModal from './components/OnboardingModal';
import LoginPromptModal from './components/LoginPromptModal';
import { TutorialProvider } from './contexts/TutorialContext';
import InteractiveTutorialOverlay from './components/InteractiveTutorialOverlay';

function AppMotionShell({ children }: { children: React.ReactNode }) {
  const { isTurboMode } = usePerformance();
  return (
    <MotionConfig reducedMotion={isTurboMode ? 'always' : 'user'}>
      {children}
    </MotionConfig>
  );
}

function AppContent() {
  const { t } = useTranslation();
  const { currentUser } = useAuth();
  const [activeFeature, setActiveFeature] = useState<FeatureId>('dashboard');
  const [isLoginPromptOpen, setIsLoginPromptOpen] = useState(false);

  const handleSelectFeature = useCallback((id: FeatureId) => {
    setActiveFeature((id as string) === 'all-in-one' ? 'chat' : id);
  }, []);

  const renderFeature = () => {
    switch (activeFeature) {
      case 'dashboard':
        return <DashboardFeature onSelectFeature={handleSelectFeature} />;
      case 'chat':
        return (
          <ChatFeature
            featureId="chat"
            modelName="gemini-3.1-pro-preview"
            title={t('features.chat.title')}
            description={t('features.chat.description')}
            thinkingLevel="HIGH"
          />
        );
      case 'agent':
        return <AgentFeature />;
      case 'batch-process':
        return (
          <BatchProcessFeature
            modelName="gemini-3.1-pro-preview"
            title={t('features.batch-process.title', 'Batch Processing')}
            description={t('features.batch-process.description', 'Process multiple files or prompts simultaneously')}
          />
        );
      case 'fast-chat':
        return (
          <ChatFeature
            featureId="fast-chat"
            modelName="gemini-3.1-flash-lite-preview"
            title={t('features.fast-chat.title')}
            description={t('features.fast-chat.description')}
          />
        );
      case 'search':
        return (
          <ChatFeature
            featureId="search"
            modelName="gemini-3-flash-preview"
            title={t('features.search.title')}
            description={t('features.search.description')}
            useSearch={true}
          />
        );
      case 'maps':
        return (
          <ChatFeature
            featureId="maps"
            modelName="gemini-3-flash-preview"
            title={t('features.maps.title')}
            description={t('features.maps.description')}
            useMaps={true}
          />
        );
      case 'image-understand':
        return (
          <ImageUnderstandFeature
            modelName="gemini-3.1-pro-preview"
            title={t('features.image-understand.title')}
            description={t('features.image-understand.description')}
          />
        );
      case 'image-gen':
        return (
          <ImageGenFeature
            modelName="gemini-3-pro-image-preview"
            title={t('features.image-gen.title')}
            description={t('features.image-gen.description')}
            allowImageSize={true}
            allowAspectRatio={true}
          />
        );
      case 'edit-image':
        return (
          <EditImageFeature
            modelName="gemini-3.1-flash-image-preview"
            title={t('features.edit-image.title')}
            description={t('features.edit-image.description')}
          />
        );
      case 'video-gen':
        return (
          <VideoGenFeature
            modelName="veo-3.1-fast-generate-preview"
            title={t('features.video-gen.title')}
            description={t('features.video-gen.description')}
          />
        );
      case 'music-gen':
        return (
          <MusicGenFeature
            modelName="lyria-3-clip-preview"
            title={t('features.music-gen.title', 'Music Generation')}
            description={t('features.music-gen.description', 'Generate music from text prompts')}
          />
        );
      case 'youtube-gen':
        return (
          <YouTubeGenFeature
            modelName="veo-3.1-fast-generate-preview"
            title={t('features.youtube-gen.title', 'YouTube Video Generation')}
            description={t('features.youtube-gen.description', 'Create tailored videos for YouTube')}
          />
        );
      case 'animate-image':
        return (
          <AnimateImageFeature
            modelName="veo-3.1-fast-generate-preview"
            title={t('features.animate-image.title')}
            description={t('features.animate-image.description')}
          />
        );
      case 'video-understand':
        return (
          <VideoUnderstandFeature
            modelName="gemini-3.1-pro-preview"
            title={t('features.video-understand.title')}
            description={t('features.video-understand.description')}
          />
        );
      case 'tts':
        return (
          <TTSFeature
            modelName="gemini-2.5-flash-preview-tts"
            title={t('features.tts.title')}
            description={t('features.tts.description')}
          />
        );
      case 'transcribe':
        return (
          <TranscribeFeature
            modelName="gemini-3-flash-preview"
            title={t('features.transcribe.title')}
            description={t('features.transcribe.description')}
          />
        );
      case 'live-audio':
        return (
          <LiveAudioFeature
            modelName="gemini-2.5-flash-native-audio-preview-12-2025"
            title={t('features.live-audio.title')}
            description={t('features.live-audio.description')}
          />
        );
      case 'reminders':
        return <RemindersFeature />;
      case 'admin':
        return <AdminDashboardFeature />;
      case 'about':
        return <AboutPage />;
      case 'infinite-canvas':
        return <InfiniteCanvasFeature />;
      case 'three-d-studio':
        return <ThreeDSceneFeature />;
      case 'analytics':
        return <AnalyticsFeature />;
      default:
        return (
          <div className="flex items-center justify-center h-full text-neutral-500">
            {t('common.building')}
          </div>
        );
    }
  };

  return (
    <>
      <Layout activeFeature={activeFeature} onSelectFeature={handleSelectFeature}>
        <Suspense fallback={
          <div className="flex items-center justify-center h-full text-zinc-500 font-sans p-12">
            <div className="flex flex-col items-center gap-3">
              <div className="w-8 h-8 border-4 border-zinc-200 border-t-indigo-600 rounded-full animate-spin"></div>
              <span className="text-xs font-semibold tracking-wide text-zinc-400">載入模組中...</span>
            </div>
          </div>
        }>
          {renderFeature()}
        </Suspense>
      </Layout>
      <InteractiveTutorialOverlay activeFeature={activeFeature} onSelectFeature={handleSelectFeature} />
      <LoginPromptModal isOpen={isLoginPromptOpen} onClose={() => setIsLoginPromptOpen(false)} />
    </>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <PerformanceProvider>
        <AppMotionShell>
          <AuthProvider>
            <SubscriptionProvider>
              <RecentActivityProvider>
                <HistoryProvider>
                  <ChatHistoryProvider>
                    <TutorialProvider>
                      <AppContent />
                      <OnboardingModal />
                    </TutorialProvider>
                  </ChatHistoryProvider>
                </HistoryProvider>
              </RecentActivityProvider>
            </SubscriptionProvider>
          </AuthProvider>
        </AppMotionShell>
      </PerformanceProvider>
    </ErrorBoundary>
  );
}
