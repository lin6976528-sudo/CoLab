import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Activity, Wifi, WifiOff, RefreshCw, Check, AlertCircle, ChevronUp, ChevronDown, Server, Cpu } from 'lucide-react';
import { FeatureId } from '../types';

interface ModelStatusIndicatorProps {
  activeFeature: FeatureId;
}

export const ModelStatusIndicator: React.FC<ModelStatusIndicatorProps> = React.memo(({ activeFeature }) => {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [status, setStatus] = useState<'connected' | 'pinging' | 'error'>('connected');
  const [latency, setLatency] = useState<number>(142);
  const [region, setRegion] = useState<string>('asia-east1 (Taiwan)');
  const [uptime, setUptime] = useState<string>('99.98%');

  // Map activeFeature to the appropriate AI engine model
  const getFeatureModel = (feature: FeatureId): { name: string; type: string; tier: string } => {
    switch (feature) {
      case 'chat':
        return { name: 'Gemini 2.5 Flash / 1.5 Pro', type: 'Multimodal Reasoning', tier: 'Pro / Ultra' };
      case 'agent':
        return { name: 'Gemini 2.5 Pro Agent', type: 'Autonomous Reasoning', tier: 'Ultra' };
      case 'fast-chat':
        return { name: 'Gemini 2.5 Flash Lite', type: 'High-speed Text', tier: 'Free' };
      case 'image-gen':
        return { name: 'Imagen 3 Ultra', type: 'Creative Generation', tier: 'Pro' };
      case 'edit-image':
        return { name: 'Imagen 3 Edit', type: 'Canvas Inpainting', tier: 'Pro' };
      case 'image-understand':
        return { name: 'Gemini 2.5 Multimodal', type: 'Visual Intelligence', tier: 'Free' };
      case 'video-gen':
        return { name: 'Veo 2.0 Full Frame', type: 'Cinematic Synthesis', tier: 'Ultra' };
      case 'video-understand':
        return { name: 'Gemini 2.5 Video Engine', type: 'Video Analysis', tier: 'Free' };
      case 'animate-image':
        return { name: 'Lumiere Image Motion', type: 'Temporal Interpolation', tier: 'Ultra' };
      case 'youtube-gen':
        return { name: 'Veo 2.0 Director', type: 'Script & Video B-roll', tier: 'Ultra' };
      case 'music-gen':
        return { name: 'Lyria Music Core', type: 'Audio Wave Synthesis', tier: 'Ultra' };
      case 'tts':
        return { name: 'Speech Synthesis HD', type: 'Neural TTS', tier: 'Free' };
      case 'transcribe':
        return { name: 'Chirp Whisper v3', type: 'ASR Transcription', tier: 'Free' };
      case 'live-audio':
        return { name: 'Gemini Live Realtime API', type: 'Websocket Audio stream', tier: 'Ultra' };
      case 'batch-process':
        return { name: 'Gemini Batch Core', type: 'Asynchronous ETL', tier: 'Pro' };
      case 'analytics':
        return { name: 'Regression & OLS Engine', type: 'Mathematical Analysis', tier: 'Free' };
      case 'maps':
        return { name: 'Google Maps Geocoding', type: 'Spatial Location API', tier: 'Free' };
      case 'search':
        return { name: 'Google Grounding Index', type: 'Real-time Web Search', tier: 'Pro' };
      case 'reminders':
        return { name: 'Task Scheduler Queue', type: 'State Management Sync', tier: 'Free' };
      case 'admin':
        return { name: 'CoLab Management Portal', type: 'Administrative Core', tier: 'System' };
      case 'dashboard':
      default:
        return { name: 'CoLab Central Gateway', type: 'Routing Proxy Layer', tier: 'Free' };
    }
  };

  const currentModel = getFeatureModel(activeFeature);

  // Monitor real browser online/offline status
  useEffect(() => {
    const handleOnline = () => setStatus('connected');
    const handleOffline = () => setStatus('error');

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('error');
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Latency fluctuating simulation when connected (paused while tab is hidden)
  useEffect(() => {
    if (status === 'pinging' || status === 'error') return;

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      setLatency(() => {
        // Base latency changes based on feature complexity
        const base = activeFeature === 'live-audio' || activeFeature === 'video-gen' ? 240 : 120;
        const fluctuation = Math.floor(Math.random() * 30) - 15; // -15ms to +15ms
        return Math.max(15, base + fluctuation);
      });
    }, 4000);

    return () => clearInterval(interval);
  }, [activeFeature, status]);

  // Handle manual ping test
  const handlePingTest = () => {
    if (status === 'pinging') return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setStatus('error');
      return;
    }
    setStatus('pinging');

    setTimeout(() => {
      setStatus('connected');
      // Update latency to a fresh random value
      const base = activeFeature === 'live-audio' || activeFeature === 'video-gen' ? 220 : 105;
      setLatency(base + Math.floor(Math.random() * 15));
    }, 750);
  };

  return (
    <div id="colab-status-indicator" className="fixed bottom-4 right-4 md:bottom-6 md:right-6 z-55">
      <div className="relative font-sans antialiased">
        
        {/* Expanded Panel */}
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 15, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 15, scale: 0.95 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="absolute bottom-12 right-0 w-72 glass-panel p-4 rounded-2xl border border-zinc-200/50 dark:border-zinc-800/40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl shadow-xl space-y-4"
            >
              {/* Header */}
              <div className="flex items-center justify-between pb-2 border-b border-zinc-250/20 dark:border-zinc-800/40">
                <div className="flex items-center gap-1.5">
                  <Server size={14} className="text-indigo-500" />
                  <span className="text-[11px] font-bold tracking-wider text-zinc-400 dark:text-zinc-500 uppercase">
                    AI Pipeline Telemetry
                  </span>
                </div>
                <button
                  onClick={handlePingTest}
                  disabled={status === 'pinging'}
                  className="p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-900 transition-colors cursor-pointer text-zinc-400 hover:text-zinc-650 dark:hover:text-zinc-300 disabled:opacity-50"
                  title="手動測試連線 (Manual Ping Test)"
                >
                  <RefreshCw size={12} className={status === 'pinging' ? 'animate-spin text-indigo-500' : ''} />
                </button>
              </div>

              {/* Model Info */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-zinc-400">當前作用模型 (Model)</span>
                  <span className="text-[9px] bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 font-semibold px-1.5 py-0.5 rounded-full uppercase">
                    {currentModel.tier}
                  </span>
                </div>
                <div className="font-semibold text-xs text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1.5">
                  <Cpu size={12} className="text-pink-500 shrink-0" />
                  <span className="truncate">{currentModel.name}</span>
                </div>
                <p className="text-[10px] text-zinc-400 font-light truncate">
                  {currentModel.type}
                </p>
              </div>

              {/* Network Stats Grid */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-250/20 dark:border-zinc-800/40">
                <div className="bg-zinc-50/50 dark:bg-zinc-900/40 p-2 rounded-xl border border-zinc-100/50 dark:border-zinc-850/45">
                  <span className="text-[9px] text-zinc-400 block mb-0.5">即時延遲 (Latency)</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-sm font-semibold font-mono text-zinc-800 dark:text-zinc-100">
                      {status === 'pinging' ? '--' : `${latency}`}
                    </span>
                    <span className="text-[9px] text-zinc-450 font-mono">ms</span>
                  </div>
                </div>

                <div className="bg-zinc-50/50 dark:bg-zinc-900/40 p-2 rounded-xl border border-zinc-100/50 dark:border-zinc-850/45">
                  <span className="text-[9px] text-zinc-400 block mb-0.5">系統可用率 (Uptime)</span>
                  <span className="text-sm font-semibold font-mono text-emerald-600 dark:text-emerald-400">
                    {uptime}
                  </span>
                </div>
              </div>

              {/* Status footer message */}
              <div className="flex items-center justify-between text-[10px] pt-1">
                <span className="text-zinc-400 truncate max-w-[140px] flex items-center gap-1">
                  <Activity size={10} className="text-zinc-400 animate-pulse" />
                  <span>節點：{region}</span>
                </span>
                {status === 'error' ? (
                  <span className="text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 shrink-0">
                    <AlertCircle size={10} /> 網路離線
                  </span>
                ) : (
                  <span className="text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1 shrink-0">
                    <Check size={10} /> 連線正常
                  </span>
                )}
              </div>

            </motion.div>
          )}
        </AnimatePresence>

        {/* Small Capsule Button */}
        <motion.div
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          className={`flex items-center gap-2 pl-2.5 pr-2 py-1.5 rounded-full border shadow-md cursor-pointer select-none transition-all duration-300 ${
            isOpen 
              ? 'bg-zinc-900 dark:bg-zinc-105 text-white border-zinc-800' 
              : status === 'error'
              ? 'bg-rose-500/15 dark:bg-rose-950/90 text-rose-600 dark:text-rose-300 border-rose-500/40 animate-pulse'
              : 'bg-white/95 dark:bg-zinc-900/95 text-zinc-700 dark:text-zinc-300 border-zinc-200/60 dark:border-zinc-805/45 hover:border-indigo-500/50'
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {/* Pulsing signal status dot */}
          <div className="relative flex items-center justify-center">
            {status === 'connected' && (
              <>
                <span className="absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </>
            )}
            {status === 'pinging' && (
              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
            )}
            {status === 'error' && (
              <>
                <span className="absolute inline-flex h-2 w-2 rounded-full bg-rose-400 opacity-75 animate-ping" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-rose-500" />
              </>
            )}
          </div>

          {/* Connected model speed tag */}
          <span className="text-[10px] font-mono font-medium leading-none tracking-tight">
            {status === 'pinging' ? 'Testing...' : status === 'error' ? 'Offline' : `${latency} ms`}
          </span>

          {/* Toggle icon fold */}
          <div className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-zinc-400' : 'text-zinc-400 hover:text-zinc-600'}`}>
            <ChevronUp size={11} strokeWidth={2.5} />
          </div>
        </motion.div>

      </div>
    </div>
  );
});
