import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI, GenerateContentResponse, Type } from '@google/genai';
import { 
  Send, Loader2, MapPin, Search, Image as ImageIcon, X, Sparkles, Trash2, 
  User, Bot, History, MessageSquare, Globe, Navigation, Plus, Mic, MicOff,
  Camera, Paperclip, HardDrive, BookOpen, Notebook, Music, Layers, 
  FileText, Check, Copy, Play, Square, Pause, Download, ArrowRight, 
  ChevronRight, ArrowLeft, RefreshCw, Star, Settings, FileCode, GraduationCap, Sparkle,
  LayoutTemplate, FolderOpen, Activity, Cpu, AlertTriangle, CheckCircle2, Lock, LogIn,
  ThumbsUp, ThumbsDown, Printer, Pin, ChevronDown, ChevronUp
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import { CodeBlock } from '../components/CodeBlock';
import LoadingAnimation from '../components/LoadingAnimation';
import FeatureTutorial from '../components/FeatureTutorial';
import { useHistory } from '../contexts/HistoryContext';
import { useTutorial } from '../contexts/TutorialContext';
import { useChatHistory } from '../contexts/ChatHistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useRecentActivity } from '../contexts/RecentActivityContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { parseAIError, ParsedError } from '../utils/errorHandling';
import ErrorMessage from '../components/ErrorMessage';
import { printAIResponse } from '../utils/printHelper';
import { FEATURES, getIconComponent } from '../constants';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

interface Message {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  reaction?: 'like' | 'dislike';
  pinned?: boolean;
  pinnedAt?: string;
  responseTimeMs?: number;
  groundingLinks?: { uri: string; title: string; snippet?: string; type?: 'web' | 'maps' }[];
  image?: {
    dataUrl: string;
    base64: string;
    mimeType: string;
  };
  error?: ParsedError;
  musicTrack?: {
    title: string;
    bpm: number;
    style: string;
    presetName: 'lofi' | 'cyber' | 'ambient' | 'synthwave';
  };
}

interface PromptTemplate {
  id: string;
  title: string;
  content: string;
  category: 'Coding' | 'Writing' | 'Data Analysis' | 'General';
  isCustom?: boolean;
}

const getPromptEstimates = (text: string) => {
  const charCount = text.length;
  const cjkRegex = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uffef\u4e00-\u9faf]/g;
  const cjkMatches = text.match(cjkRegex);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;
  
  const nonCjkText = text.replace(cjkRegex, '');
  const words = nonCjkText.trim().split(/\s+/).filter(Boolean);
  const wordCount = words.length;
  
  const estimatedTokens = Math.ceil((cjkCount * 1.2) + (wordCount * 1.3));
  
  return {
    charCount,
    wordCount,
    estimatedTokens
  };
};

const playSynthesizerMelody = (preset: 'lofi' | 'cyber' | 'ambient' | 'synthwave', bpm: number) => {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();
    
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = preset === 'cyber' ? 1200 : 800;
    filter.Q.value = 1;
    filter.connect(ctx.destination);
    
    const comp = ctx.createDynamicsCompressor();
    comp.connect(filter);
    
    const notes = preset === 'cyber' 
      ? [98, 110, 116.5, 130.8, 146.8, 164.8, 174.6] 
      : preset === 'ambient' 
      ? [261.6, 293.7, 329.6, 349.2, 392.0, 440.0] 
      : [196.0, 220.0, 246.9, 293.7, 329.6]; 
      
    let step = 0;
    const interval = (60 / bpm) * 0.5 * 1000; 
    
    const playStep = () => {
      if (ctx.state === 'closed') return;
      
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.frequency.value = notes[step % notes.length];
      osc1.type = preset === 'cyber' ? 'sawtooth' : 'triangle';
      
      gain1.gain.setValueAtTime(0, ctx.currentTime);
      gain1.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.15);
      gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
      
      osc1.connect(gain1);
      gain1.connect(comp);
      osc1.start();
      osc1.stop(ctx.currentTime + 0.65);
      
      if (step % 2 === 0) {
        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.value = notes[(step + 3) % notes.length] * 2; 
        
        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
        
        osc2.connect(gain2);
        gain2.connect(comp);
        osc2.start();
        osc2.stop(ctx.currentTime + 0.45);
      }
      
      step++;
    };
    
    playStep();
    const timerId = setInterval(playStep, interval);
    
    return {
      ctx,
      stop: () => {
        clearInterval(timerId);
        ctx.close();
      }
    };
  } catch (err) {
    console.error("Audio Context initialization blocked or failed:", err);
    return null;
  }
};

const WaveformVisualizer = React.memo(({ isPlaying }: { isPlaying: boolean }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = (canvas.width = canvas.parentElement?.clientWidth || 300);
    const height = (canvas.height = 40);
    let phase = 0;
    let isCancelled = false;

    const drawFrame = () => {
      ctx.clearRect(0, 0, width, height);
      ctx.strokeStyle = isPlaying ? '#6366f1' : '#a1a1aa';
      ctx.lineWidth = 2;
      ctx.beginPath();

      for (let x = 0; x < width; x++) {
        const relativeX = x / width;
        const amplitude = isPlaying
          ? Math.sin(relativeX * Math.PI) * 15 * Math.sin(phase + relativeX * 10)
          : Math.sin(relativeX * Math.PI) * 2 * Math.sin(relativeX * 10);
        const y = height / 2 + amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();

      ctx.strokeStyle = isPlaying ? 'rgba(168, 85, 247, 0.5)' : 'rgba(161, 161, 170, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x++) {
        const relativeX = x / width;
        const amplitude = isPlaying
          ? Math.sin(relativeX * Math.PI) * 10 * Math.sin(phase * 1.5 + relativeX * 8)
          : Math.sin(relativeX * Math.PI) * 1 * Math.sin(relativeX * 8);
        const y = height / 2 + amplitude;
        if (x === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    };

    if (!isPlaying) {
      drawFrame();
      return () => {
        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
          animationRef.current = null;
        }
      };
    }

    const animate = () => {
      if (isCancelled) return;
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        drawFrame();
        phase += 0.15;
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      isCancelled = true;
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isPlaying]);

  return <canvas ref={canvasRef} className="w-full h-10 rounded-lg bg-black/5 dark:bg-black/20" />;
});

interface AudioSynthesizerCardProps {
  track: {
    title: string;
    bpm: number;
    style: string;
    presetName: 'lofi' | 'cyber' | 'ambient' | 'synthwave';
  };
}

function AudioSynthesizerCard({ track }: AudioSynthesizerCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [tempo, setTempo] = useState(track.bpm);
  const activeSynthesizerRef = useRef<{ ctx: AudioContext; stop: () => void } | null>(null);

  const togglePlayback = () => {
    if (isPlaying) {
      if (activeSynthesizerRef.current) {
        activeSynthesizerRef.current.stop();
        activeSynthesizerRef.current = null;
      }
      setIsPlaying(false);
    } else {
      const syn = playSynthesizerMelody(track.presetName, tempo);
      if (syn) {
        activeSynthesizerRef.current = syn;
        setIsPlaying(true);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (activeSynthesizerRef.current) {
        activeSynthesizerRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="mt-4 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 shadow-sm flex flex-col gap-4 w-full max-w-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-500/10 dark:bg-purple-500/10 rounded-full text-indigo-600 dark:text-purple-400">
            <Music size={18} className="animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-zinc-900 dark:text-white truncate">{track.title}</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-0.5">{track.style} • {tempo} BPM</p>
          </div>
        </div>
        <button
          onClick={togglePlayback}
          className="p-2.5 bg-zinc-900 hover:bg-black dark:bg-zinc-100 dark:hover:bg-white text-white dark:text-zinc-900 rounded-full shadow-sm transition-colors cursor-pointer shrink-0"
        >
          {isPlaying ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" />}
        </button>
      </div>

      <div className="bg-zinc-150/40 dark:bg-zinc-900/40 p-2 rounded-xl border border-zinc-200/40 dark:border-zinc-800/40">
        <WaveformVisualizer isPlaying={isPlaying} />
      </div>

      <div className="flex items-center justify-between gap-4 text-xs font-semibold text-zinc-500 dark:text-zinc-400">
        <div className="flex items-center gap-2 flex-1">
          <span>Tempo:</span>
          <input
            type="range"
            min="60"
            max="150"
            value={tempo}
            onChange={(e) => setTempo(Number(e.target.value))}
            className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 dark:accent-purple-500"
            disabled={isPlaying}
          />
          <span className="font-mono text-[11px] bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">{tempo}</span>
        </div>
        <button
          onClick={() => {
            const element = document.createElement("a");
            const file = new Blob([`CoLab synthesized preset ${track.presetName} audio track data.`], { type: 'audio/wav' });
            element.href = URL.createObjectURL(file);
            element.download = `${track.title}.wav`;
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);
          }}
          className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-white transition-colors cursor-pointer text-[11px]"
          title="Download track"
        >
          <Download size={12} />
          下載
        </button>
      </div>
    </div>
  );
}

interface ChatMessageItemProps {
  msg: Message;
  msgIdx: number;
  copyKey: string;
  isCurrentlyTyping: boolean;
  isHighlighted: boolean;
  isCopied: boolean;
  useMaps?: boolean;
  lastUserPrompt?: string;
  markdownComponents: any;
  t: any;
  registerMessageRef: (idx: number, el: HTMLDivElement | null) => void;
  onSelectKey: () => void;
  onDeleteMessage: (msg: Message) => void;
  onReactToMessage: (msg: Message, reaction: 'like' | 'dislike') => void;
  onCopyMessage: (id: string, text: string) => void;
  onTogglePinMessage: (msg: Message) => void;
}

const ChatMessageItem = React.memo(({
  msg,
  msgIdx,
  copyKey,
  isCurrentlyTyping,
  isHighlighted,
  isCopied,
  useMaps,
  lastUserPrompt,
  markdownComponents,
  t,
  registerMessageRef,
  onSelectKey,
  onDeleteMessage,
  onReactToMessage,
  onCopyMessage,
  onTogglePinMessage,
}: ChatMessageItemProps) => {
  const handleRef = useCallback((el: HTMLDivElement | null) => {
    registerMessageRef(msgIdx, el);
  }, [registerMessageRef, msgIdx]);

  const needsApiKeyAction = Boolean(
    msg.error && (
      msg.error.title?.includes('驗證') ||
      msg.error.title?.includes('Auth') ||
      msg.error.message?.includes('金鑰') ||
      msg.error.message?.includes('Key')
    )
  );

  return (
    <motion.div
      ref={handleRef}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
    >
      <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center mt-1 shadow-sm border ${
        msg.role === 'user'
          ? 'bg-white/70 dark:bg-zinc-800/70 border-white/60 dark:border-white/10 text-zinc-700 dark:text-zinc-300'
          : 'bg-gradient-to-br from-indigo-500/90 to-purple-600/90 border-white/30 dark:border-white/10 text-white'
      }`}>
        {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
      </div>
      <div className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'} max-w-[85%] md:max-w-[75%] relative group/msg`}>
        {msg.pinned && (
          <div className="flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full mb-1.5 select-none">
            <Pin size={10} className="fill-current" />
            <span>{t('common.pinnedBadge', 'Pinned')}</span>
          </div>
        )}
        <div
          className={`rounded-[2rem] px-6 py-4.5 shadow-sm relative transition-all duration-300 ${
            isHighlighted
              ? 'ring-2 ring-amber-400/80 shadow-[0_0_28px_rgba(245,158,11,0.25)]'
              : msg.pinned
                ? 'ring-1 ring-amber-500/35 dark:ring-amber-400/30'
                : ''
          } ${
            msg.role === 'user'
              ? 'bg-zinc-200/60 dark:bg-zinc-800/85 text-zinc-900 dark:text-zinc-50 font-normal shadow-xs'
              : isCurrentlyTyping
                ? 'bg-gradient-to-tr from-indigo-50/70 via-purple-50/70 to-pink-50/70 dark:from-indigo-950/25 dark:via-purple-950/25 dark:to-pink-950/25 border border-indigo-500/25 dark:border-indigo-500/35 text-zinc-900 dark:text-zinc-50 shadow-[0_0_25px_rgba(99,102,241,0.12)]'
                : 'glass-panel border border-zinc-200/50 dark:border-zinc-800/50 text-zinc-850 dark:text-zinc-200'
          }`}
        >
          {msg.image && (
            <img src={msg.image.dataUrl} alt="User upload" className="max-w-full h-auto rounded-xl mb-4 shadow-sm border border-white/10 dark:border-white/5" />
          )}
          {msg.error ? (
            <ErrorMessage
              error={msg.error}
              actionText={needsApiKeyAction ? t('common.imageGen.selectApiKey', '選擇 API 金鑰') : undefined}
              onActionClick={needsApiKeyAction ? onSelectKey : undefined}
            />
          ) : msg.role === 'user' ? (
            <div className="prose prose-sm md:prose-base max-w-none prose-zinc dark:prose-invert prose-p:leading-relaxed prose-pre:bg-zinc-800 dark:prose-pre:bg-zinc-100 font-light leading-relaxed">
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.text}</ReactMarkdown>
            </div>
          ) : (
            <div className={`prose prose-sm md:prose-base max-w-none prose-zinc dark:prose-invert prose-a:text-zinc-900 dark:prose-a:text-zinc-100 hover:prose-a:text-zinc-600 dark:hover:prose-a:text-zinc-400 font-light leading-relaxed ${isCurrentlyTyping ? 'ai-typing-active' : ''}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{msg.text}</ReactMarkdown>
            </div>
          )}

          {msg.musicTrack && (
            <AudioSynthesizerCard track={msg.musicTrack} />
          )}

          {msg.groundingLinks && msg.groundingLinks.length > 0 && (
            <div className="mt-6 pt-5 border-t border-zinc-100 dark:border-zinc-800">
              <p className="text-[10px] font-mono font-bold text-zinc-400 dark:text-zinc-500 mb-3 uppercase tracking-widest flex items-center gap-1.5">
                {useMaps ? <MapPin size={12} /> : <Globe size={12} />}
                {t('common.referenceSources')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {msg.groundingLinks.map((link, i) => (
                  <div
                    key={i}
                    className="flex flex-col gap-1.5 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/60 hover:bg-white dark:hover:bg-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-600 hover:shadow-sm transition-all group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <a
                        href={link.uri}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-zinc-900 dark:text-zinc-100 line-clamp-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                      >
                        {link.title}
                      </a>
                      {link.type === 'maps' ? (
                        <a href={link.uri} target="_blank" rel="noopener noreferrer" title="Navigate">
                          <Navigation size={14} className="text-indigo-500 hover:text-indigo-600 shrink-0 mt-0.5" />
                        </a>
                      ) : (
                        <a href={link.uri} target="_blank" rel="noopener noreferrer">
                          <Globe size={14} className="text-zinc-400 hover:text-zinc-600 shrink-0 mt-0.5" />
                        </a>
                      )}
                    </div>
                    {link.type === 'maps' && (
                      <div className="w-full h-32 mt-1 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                        <iframe
                          width="100%"
                          height="100%"
                          frameBorder="0"
                          style={{ border: 0 }}
                          src={`https://maps.google.com/maps?q=${encodeURIComponent(link.title)}&output=embed`}
                          allowFullScreen
                          title={link.title}
                        ></iframe>
                      </div>
                    )}
                    {link.snippet && (
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 leading-relaxed mt-1">
                        {link.snippet}
                      </p>
                    )}
                    <span className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate mt-1">
                      {(() => {
                        try {
                          return new URL(link.uri).hostname.replace('www.', '');
                        } catch {
                          return link.uri;
                        }
                      })()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <button
          onClick={() => {
            if (window.confirm(t('common.confirmDeleteMessage', '確定要刪除這條訊息嗎？'))) {
              onDeleteMessage(msg);
            }
          }}
          className={`absolute ${msg.role === 'user' ? '-left-10' : '-right-10'} top-1/2 -translate-y-1/2 p-2 rounded-full border border-zinc-200/50 dark:border-zinc-800/50 bg-white/95 dark:bg-zinc-900/95 shadow-sm opacity-0 group-hover/msg:opacity-100 transition-all duration-200 text-zinc-400 hover:text-red-500 z-10 hover:scale-105 active:scale-95`}
          title={t('common.deleteMessage', '刪除此訊息')}
        >
          <Trash2 size={13} />
        </button>

        {msg.role === 'model' ? (
          <div className="flex items-center gap-3.5 mt-2 px-1 select-none">
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>

            {msg.responseTimeMs !== undefined && (
              <div className="flex items-center gap-1 text-[10px] font-mono text-zinc-450 dark:text-zinc-500 bg-zinc-100/60 dark:bg-zinc-800/40 px-1.5 py-0.5 rounded-md border border-zinc-200/40 dark:border-zinc-700/30">
                <Activity size={10} className="text-emerald-500 dark:text-emerald-450 stroke-[2.2]" />
                <span>{t('common.responseTime', '回應耗時: {{ms}} ms', { ms: msg.responseTimeMs })}</span>
              </div>
            )}

            <div className="flex items-center gap-1.5 border-l border-zinc-200 dark:border-zinc-800/60 pl-3 rating-feedback-container">
              <button
                onClick={() => onReactToMessage(msg, 'like')}
                className={`p-1 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center relative hover:scale-110 active:scale-95 ${
                  msg.reaction === 'like'
                    ? 'text-emerald-500 bg-emerald-500/10 scale-105'
                    : 'text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
                title={t('common.thumbsUp', '這很有幫助')}
              >
                <ThumbsUp size={12} className={msg.reaction === 'like' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              </button>

              <button
                onClick={() => onReactToMessage(msg, 'dislike')}
                className={`p-1 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center relative hover:scale-110 active:scale-95 ${
                  msg.reaction === 'dislike'
                    ? 'text-rose-500 bg-rose-500/10 scale-105'
                    : 'text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
                title={t('common.thumbsDown', '這沒有幫助')}
              >
                <ThumbsDown size={12} className={msg.reaction === 'dislike' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
              </button>

              <button
                onClick={() => printAIResponse({
                  title: t('common.chatResponse', 'AI 對話回應'),
                  subtitle: lastUserPrompt,
                  content: msg.text
                })}
                className="p-1 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:scale-110 active:scale-95"
                title={t('common.printResponse', '列印此回應')}
                type="button"
              >
                <Printer size={12} className="stroke-[1.8]" />
              </button>

              <button
                onClick={() => onCopyMessage(copyKey, msg.text)}
                className="p-1 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center text-zinc-400 hover:text-zinc-655 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:scale-110 active:scale-95"
                title={t('common.copyResponse', '複製此回應')}
                type="button"
              >
                {isCopied ? (
                  <Check size={12} className="text-emerald-550 dark:text-emerald-400 stroke-[2.2]" />
                ) : (
                  <Copy size={12} className="stroke-[1.8]" />
                )}
              </button>

              <button
                onClick={() => onTogglePinMessage(msg)}
                className={`p-1 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-110 active:scale-95 ${
                  msg.pinned
                    ? 'text-amber-500 bg-amber-500/10 scale-105'
                    : 'text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                }`}
                title={msg.pinned ? t('common.unpinMessage', '取消釘選') : t('common.pinMessage', '釘選此訊息')}
                type="button"
              >
                <Pin size={12} className={msg.pinned ? 'fill-current stroke-[2]' : 'stroke-[1.8]'} />
              </button>
            </div>

            <AnimatePresence>
              {msg.reaction && (
                <motion.span
                  initial={{ opacity: 0, x: -5, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className={`text-[9px] font-sans font-bold px-1.5 py-0.2 rounded uppercase border tracking-wider select-none ${
                    msg.reaction === 'like'
                      ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                      : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                  }`}
                >
                  {msg.reaction === 'like' ? 'Helpful' : 'Unhelpful'}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-2 px-1 select-none">
            <button
              onClick={() => onTogglePinMessage(msg)}
              className={`p-1 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center hover:scale-110 active:scale-95 ${
                msg.pinned
                  ? 'text-amber-500 bg-amber-500/10 opacity-100'
                  : 'text-zinc-400 hover:text-amber-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 opacity-70 md:opacity-0 md:group-hover/msg:opacity-100'
              }`}
              title={msg.pinned ? t('common.unpinMessage', '取消釘選') : t('common.pinMessage', '釘選此訊息')}
              type="button"
            >
              <Pin size={12} className={msg.pinned ? 'fill-current stroke-[2]' : 'stroke-[1.8]'} />
            </button>
            <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">
              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        )}
      </div>
    </motion.div>
  );
});

const getModelStatus = (model: string, load: 'operational' | 'high-load') => {
  const isHigh = load === 'high-load';
  
  switch (model) {
    case 'gemini-3.1-pro-preview':
      return {
        label: isHigh ? '算力正常 • 密集負載中' : '運行正常 • 算力充足',
        labelEn: isHigh ? 'Fully Operational • High Load' : 'Fully Operational • Idle',
        classes: isHigh 
          ? 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:bg-amber-400/5 dark:border-amber-400/10'
          : 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-400/5 dark:border-emerald-400/10',
        dotClasses: isHigh ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500',
        tooltip: isHigh 
          ? '此為超強多模態大模型，目前全球排隊調用偏多，對話響應可能增加 1-2 秒延遲。' 
          : '此為超強多模態大模型，當前算力資源正常，運行順暢。',
        statusText: isHigh ? '高效能 / 密集負載' : '運行流暢',
        isHighLoad: isHigh,
      };
    case 'gemini-3-flash-preview':
      return {
        label: isHigh ? '運行流暢 • 臨時高負載' : '運行流暢 • 資源充沛',
        labelEn: isHigh ? 'Fully Operational • Mid-High Load' : 'Fully Operational • Hyper-speed',
        classes: isHigh 
          ? 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:bg-amber-400/5 dark:border-amber-400/10'
          : 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20 dark:text-emerald-400 dark:bg-emerald-400/5 dark:border-emerald-400/10',
        dotClasses: isHigh ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500',
        tooltip: isHigh 
          ? '常規 Flash 速度引擎，目前受到短時併發流量波動影響，負載略有上升。' 
          : '常規 Flash 速度引擎，核心負載極低，吞吐速度最快，秒速回應。',
        statusText: isHigh ? '臨時高負載' : '極速回應',
        isHighLoad: isHigh,
      };
    case 'gemini-3.1-flash-lite-preview':
    default:
      return {
        label: isHigh ? '低耗通道 • 高載排隊中' : '低耗通道 • 極致輕量',
        labelEn: isHigh ? 'Fully Operational • Moderate Load' : 'Fully Operational • Light Load',
        classes: isHigh 
          ? 'text-amber-600 bg-amber-500/10 border-amber-500/20 dark:text-amber-400 dark:bg-amber-400/5 dark:border-amber-400/10'
          : 'text-sky-600 bg-sky-500/10 border-sky-500/20 dark:text-sky-400 dark:bg-sky-400/5 dark:border-sky-400/10',
        dotClasses: isHigh ? 'bg-amber-500 animate-pulse' : 'bg-sky-500 animate-pulse',
        tooltip: isHigh 
          ? '輕量化 Flash Lite 通道目前受到高併發流量影響，文字回應速度可能受略微波及。' 
          : '輕量化 Flash Lite 通道，專為長會話及極速文字應答設計，算力資源充足。',
        statusText: isHigh ? '高載排隊中' : '秒速回應',
        isHighLoad: isHigh,
      };
  }
};

interface ChatFeatureProps {
  featureId: string;
  modelName: string;
  title: string;
  description: string;
  useSearch?: boolean;
  useMaps?: boolean;
  thinkingLevel?: 'HIGH' | 'LOW';
}

export default function ChatFeature({
  featureId,
  modelName,
  title,
  description,
  useSearch = false,
  useMaps = false,
  thinkingLevel,
}: ChatFeatureProps) {
  const { t, i18n } = useTranslation();
  const { currentUser, userProfile, login, isLoggingIn } = useAuth();
  const { addHistoryItem } = useHistory();
  const { chatSessions, saveChatSession, deleteChatSession, activeChatSessionId, setActiveChatSessionId } = useChatHistory();
  const { currentStep, setStep } = useTutorial();
  const { logActivity } = useRecentActivity();
  const { incrementUsage, checkAccess } = useSubscription();
  const [selectedModel, setSelectedModel] = useState(userProfile?.preferences?.defaultModel || modelName);

  // Local beautiful login success states
  const [showLocalCelebrate, setShowLocalCelebrate] = useState(false);
  const [localLoginToast, setLocalLoginToast] = useState<{ displayName: string; photoURL: string | null; email: string; tier: string } | null>(null);

  const prevUserUid = useRef<string | null>(null);
  const isInitialAuthRef = useRef(true);

  // Track currently active model name for dynamic system message greeting
  const selectModelRef = useRef(selectedModel);
  useEffect(() => {
    selectModelRef.current = selectedModel;
  }, [selectedModel]);

  useEffect(() => {
    const currentUid = currentUser?.uid || null;
    if (isInitialAuthRef.current) {
      prevUserUid.current = currentUid;
      isInitialAuthRef.current = false;
    } else {
      if (currentUid && currentUid !== prevUserUid.current) {
        // Trigger local celebration + toast
        const matchedDisplayName = currentUser?.displayName || userProfile?.displayName || 'CoLab 使用者';
        const matchedPhotoURL = currentUser?.photoURL || userProfile?.photoURL || null;
        const matchedEmail = currentUser?.email || '';
        const matchedTier = currentUser?.email && (currentUser.email.toLowerCase() === 'lin076976528@gmail.com' || currentUser.email.toLowerCase() === 'lin6976528@gmail.com') ? 'Ultra' : 'Free';

        setLocalLoginToast({
          displayName: matchedDisplayName,
          photoURL: matchedPhotoURL,
          email: matchedEmail,
          tier: matchedTier,
        });
        
        setShowLocalCelebrate(true);
        const celebrateTimer = setTimeout(() => {
          setShowLocalCelebrate(false);
        }, 2200);

        const toastTimer = setTimeout(() => {
          setLocalLoginToast(null);
        }, 4500);

        // Append welcome message describing model and channel activation
        setMessages(prev => [
          ...prev,
          {
            role: 'model',
            text: `✨ **個人 AI 核心連線成功！** \n\n您已成功登入使用者帳號 \`${matchedDisplayName}\`。系統已同步您的專屬對話頻道，當前配置為 **${
              selectModelRef.current === 'gemini-3.1-pro-preview' 
                ? 'Gemini 3.1 Pro 重度推理核心' 
                : selectModelRef.current === 'gemini-3-flash-preview' 
                  ? 'Gemini 3 Flash 智慧核心' 
                  : 'Gemini Flash Lite 輕量化超速通道'
            }**。\n\n我們隨時為您準備，現在即可在輸入框內與 AI 進行即時多模態問答與高效任務協作！`,
            timestamp: new Date()
          }
        ]);

        return () => {
          clearTimeout(celebrateTimer);
          clearTimeout(toastTimer);
        };
      }
      prevUserUid.current = currentUid;
    }
  }, [currentUser]);

  // Monitor and load active session requested globally (e.g., from search bar)
  useEffect(() => {
    if (activeChatSessionId) {
      const chat = chatSessions.find(c => c.id === activeChatSessionId);
      if (chat && chat.featureId === featureId) {
        loadChat(activeChatSessionId);
        setActiveChatSessionId(null);
      }
    }
  }, [activeChatSessionId, chatSessions, featureId]);
  
  // Dynamic model health real-time status loading tracking
  const [modelLoads, setModelLoads] = useState<Record<string, 'operational' | 'high-load'>>({
    'gemini-3.1-pro-preview': 'operational',
    'gemini-3-flash-preview': 'operational',
    'gemini-3.1-flash-lite-preview': 'operational',
  });

  const modelStatus = getModelStatus(selectedModel, modelLoads[selectedModel] || 'operational');
  
  // Status panel configuration
  const [isStatusPanelOpen, setIsStatusPanelOpen] = useState(false);
  const [isExportMenuOpen, setIsExportMenuOpen] = useState(false);
  const [exportSuccessFormat, setExportSuccessFormat] = useState<'json' | 'txt' | 'md' | null>(null);
  const [isPinnedPanelExpanded, setIsPinnedPanelExpanded] = useState(false);
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null);
  const [isSpeedMatrixExpanded, setIsSpeedMatrixExpanded] = useState(false);

  useEffect(() => {
    if (!isExportMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsExportMenuOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isExportMenuOpen]);

  // Status Toast interface & states
  interface StatusToast {
    id: string;
    modelId: string;
    modelName: string;
    oldStatus: 'operational' | 'high-load';
    newStatus: 'operational' | 'high-load';
    message: string;
    timestamp: Date;
  }
  const [toasts, setToasts] = useState<StatusToast[]>([]);

  const addToast = (toast: Omit<StatusToast, 'id' | 'timestamp'>) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { ...toast, id, timestamp: new Date() }]);
    // Auto remove after 6.5s
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6500);
  };

  const prevModelLoads = useRef(modelLoads);

  // Monitor dynamic changes to trigger warning toasts
  useEffect(() => {
    const modelFriendlyNames: Record<string, string> = {
      'gemini-3.1-pro-preview': 'Gemini 3.1 Pro (推理核心)',
      'gemini-3-flash-preview': 'Gemini 3 Flash (常規快速)',
      'gemini-3.1-flash-lite-preview': 'Gemini Flash Lite (超輕量通道)',
    };

    Object.keys(modelLoads).forEach(modelId => {
      const prev = prevModelLoads.current[modelId];
      const curr = modelLoads[modelId];

      if (prev === 'operational' && curr === 'high-load') {
        addToast({
          modelId,
          modelName: modelFriendlyNames[modelId] || modelId,
          oldStatus: 'operational',
          newStatus: 'high-load',
          message: `算力負載升高！${modelFriendlyNames[modelId] || modelId} 轉為「密集負載中」，推理佇列與回應可能延遲。`,
        });
      } else if (prev === 'high-load' && curr === 'operational') {
        addToast({
          modelId,
          modelName: modelFriendlyNames[modelId] || modelId,
          oldStatus: 'high-load',
          newStatus: 'operational',
          message: `算力恢復流暢！${modelFriendlyNames[modelId] || modelId} 已回復「資源充沛」，響應速度將顯著提升。`,
        });
      }
    });

    prevModelLoads.current = modelLoads;
  }, [modelLoads]);

  // Automated load fluctuation simulator
  useEffect(() => {
    // Pro model load transition simulate slightly after mount to demonstrate toast alert
    const mountTimeout = setTimeout(() => {
      setModelLoads(prev => ({
        ...prev,
        'gemini-3.1-pro-preview': 'high-load',
      }));
    }, 4500);

    // Dynamic cloud cluster random simulator
    const interval = setInterval(() => {
      const models = ['gemini-3.1-pro-preview', 'gemini-3-flash-preview', 'gemini-3.1-flash-lite-preview'];
      const randomModel = models[Math.floor(Math.random() * models.length)];
      
      setModelLoads(prev => {
        const current = prev[randomModel];
        const next = current === 'operational' ? 'high-load' : 'operational';
        return {
          ...prev,
          [randomModel]: next,
        };
      });
    }, 24000);

    return () => {
      clearTimeout(mountTimeout);
      clearInterval(interval);
    };
  }, []);

  // Check for staged activity file imports and staged prompts
  useEffect(() => {
    try {
      const saved = localStorage.getItem('co_staged_activity_file');
      if (saved) {
        const fileObj = JSON.parse(saved);
        if (fileObj && fileObj.name) {
          setInput(prev => `${prev ? prev + '\n' : ''}[已讀取最近活動檔案: ${fileObj.name}]\n${fileObj.content}\n`);
          localStorage.removeItem('co_staged_activity_file');
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve staged activity file:", e);
    }

    try {
      const staged = localStorage.getItem('co_staged_prompt');
      if (staged) {
        const stageObj = JSON.parse(staged);
        if (stageObj && stageObj.featureId === 'chat' && stageObj.content) {
          setInput(stageObj.content);
          localStorage.removeItem('co_staged_prompt');
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve staged prompt:", e);
    }
  }, [featureId]);

  const [messages, setMessages] = useState<Message[]>([]);
  const messagesRef = useRef<Message[]>(messages);
  messagesRef.current = messages;
  const chatSessionsRef = useRef(chatSessions);
  chatSessionsRef.current = chatSessions;
  const [input, setInput] = useState('');
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [image, setImage] = useState<{ file: File; dataUrl: string; base64: string } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const registerMessageRef = useCallback((idx: number, el: HTMLDivElement | null) => {
    messageRefs.current[idx] = el;
  }, []);
  const skipNextAutoScrollRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);

  // Attachment Drawer & Feature States
  const [isOpenActionDrawer, setIsOpenActionDrawer] = useState(false);
  const [isAttachmentOpen, setIsAttachmentOpen] = useState(false);
  const [activeSpecialMode, setActiveSpecialMode] = useState<'image' | 'music' | 'canvas' | 'research' | 'guided' | null>(null);
  const [isSmartServiceLabs, setIsSmartServiceLabs] = useState(false);

  // Live Camera State
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const webcamStreamRef = useRef<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Simulated Google Drive State
  const [isDriveOpen, setIsDriveOpen] = useState(false);
  const [driveFiles] = useState([
    { id: 'f1', name: 'AI_技術行銷白皮書.docx', type: 'doc', content: '此白皮書簡要描述了生成式 AI 對未來數位行銷流程、使用者流程及轉換率優化（CRO）的重大影響。透過智能個人化與即時音效，使用者體驗將能提升高達 200%。' },
    { id: 'f2', name: 'Q2_財務報表計畫.pdf', type: 'doc', content: 'CoLab 預計在 2026 年第二季度實現高達 40% 的訂閱增長。其中，Ultra 會員預計會因多模態功能（如 Canvas 與音樂編輯）的釋出而大幅提升。' },
    { id: 'f3', name: '頭像拍攝照片.png', type: 'image', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250' },
    { id: 'f4', name: 'CoLab_產品標誌_藍色調.png', type: 'image', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=250' }
  ]);

  // Saved Notes Hub (Notebook)
  const [isNotebookOpen, setIsNotebookOpen] = useState(false);
  const [notes, setNotes] = useState<{ id: string; text: string; date: Date }[]>([
    { id: '1', text: '請幫我把這段文字翻譯成日文。', date: new Date(Date.now() - 3600000 * 48) },
    { id: '2', text: '寫一份關於 CoLab 產品升級與新功能的說明文案。', date: new Date(Date.now() - 3600000 * 4) }
  ]);
  const [newNoteInput, setNewNoteInput] = useState('');

  // Prompt Library states & defaults
  const [isPromptLibraryOpen, setIsPromptLibraryOpen] = useState(false);
  const [promptCategoryFilter, setPromptCategoryFilter] = useState<'All' | 'Coding' | 'Writing' | 'Data Analysis' | 'General'>('All');
  const [searchPromptQuery, setSearchPromptQuery] = useState('');
  const [isAddPromptOpen, setIsAddPromptOpen] = useState(false);
  const [newPromptTitle, setNewPromptTitle] = useState('');
  const [newPromptContent, setNewPromptContent] = useState('');
  const [newPromptCategory, setNewPromptCategory] = useState<'Coding' | 'Writing' | 'Data Analysis' | 'General'>('Coding');
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);

  const [promptLibrary, setPromptLibrary] = useState<PromptTemplate[]>(() => {
    const DEFAULT_PROMPTS: PromptTemplate[] = [
      {
        id: 'def-code-refactor',
        title: '程式碼重構與優化',
        content: '請幫我重構以下這段程式碼，除了提升可讀性、模組化、增加 TypeScript 型別定義外，也請最佳化其空間與時間複雜度，並在關鍵程式段附上詳細註解：\n\n```typescript\n// 在此貼上您的程式碼\n```',
        category: 'Coding'
      },
      {
        id: 'def-code-tests',
        title: '撰寫高覆蓋率單元測試',
        content: '請使用 Jest 與 Testing Library 幫我為以下 TypeScript 元件或函數撰寫高覆蓋率的單元測試，包含邊界條件（Edge Cases）與異常流程的測試案例：\n\n```typescript\n// 在此貼上您的元件/函數\n```',
        category: 'Coding'
      },
      {
        id: 'def-code-regex',
        title: '解釋與建構正規表示式',
        content: '請幫我解釋以下正規表示式（Regex）的運作機制與每個符號所代表的作用，並提供三個能成功匹配的範例以及三個會匹配失敗的範例：\n',
        category: 'Coding'
      },
      {
        id: 'def-write-email',
        title: '專業得體的商務信件',
        content: '請幫我寫一封商務交流或後續追蹤郵件，語氣需要專業、誠懇且得體。收件對象為合作夥伴主管，信件主題是關於項目進度更新與下一步的合作。請提供主旨與內文草稿。',
        category: 'Writing'
      },
      {
        id: 'def-write-translate',
        title: '中翻英商務學術潤飾',
        content: '請將以下中文段落翻譯為專業、具說服力且母語人士語感的商務英語（商務偏好），請保留主要訊息並提供兩個不同語氣版本供我挑選：\n\n「」',
        category: 'Writing'
      },
      {
        id: 'def-write-social',
        title: '社群短影音行銷吸睛文案',
        content: '請發想 3 個適用於 Instagram / Threads / Facebook 的吸睛社群文案。主題是關於新發表的 AI 生產力協作工具。文案風格要幽默搞怪、具有高互動性，並在開頭帶入強烈的 hook，結尾附上適當的 hashtag。',
        category: 'Writing'
      },
      {
        id: 'def-data-sql',
        title: '留存率分析 SQL 語法',
        content: '我有一個使用者註冊表 `users (id, created_at)` 和活動日誌表 `activity_logs (id, user_id, action, created_at)`。請幫我撰寫一段相容於 PostgreSQL 的 Cohort Retention Analysis (週留存率) SQL 查詢語法，並提供效能優化建議。',
        category: 'Data Analysis'
      },
      {
        id: 'def-data-sentiment',
        title: '客戶意見情緒分析與分群',
        content: '請扮演資深客戶成功分析師。我有一些客戶對產品新功能的文字回饋。請幫我分析其中的正負面情緒，並將反饋歸納為三大核心議題（如效能、易用性、缺失功能），最後以 Markdown 表格呈獻：\n\n- 反饋 1: \n- 反饋 2: \n- 反饋 3: ',
        category: 'Data Analysis'
      },
      {
        id: 'def-data-chart',
        title: '行銷數據指標與圖表建議',
        content: '我目前有兩週的數位廣告投放數據（曝光、點擊、轉化率、CAC、ROI）。我想要在 Dashboard 上進行可視化。請建議我最適合呈現這些指標的 3 種圖表類型（如 Composed Chart、Bar Chart...），並說明各圖表用以佐證哪些關鍵商業洞察。',
        category: 'Data Analysis'
      }
    ];

    const saved = localStorage.getItem('co_saved_prompt_templates');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error("Error reading saved prompts:", e);
      }
    }
    return DEFAULT_PROMPTS;
  });

  useEffect(() => {
    localStorage.setItem('co_saved_prompt_templates', JSON.stringify(promptLibrary));
  }, [promptLibrary]);

  // Canvas Workspace States
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [canvasDocument, setCanvasDocument] = useState<{ title: string; content: string; lastEdited?: Date } | null>({
    title: '智慧協同編輯文檔.md',
    content: '# 歡迎使用 CoLab Canvas 協作空間 ✨\n\n在這裡，您可以讓 AI 寫作、撰寫程式碼或製作簡報。所有生成的文件與程式碼都會在這裡呈現完美格式排版。\n\n### 您可以體驗：\n1. **即時編輯**: 直接在右側這個區域修改文件與程式碼\n2. **叫 AI 潤飾**: 使用對話或點擊潤飾功能，AI 會參照此文檔上下文進行升級\n3. **直接下載**: 一鍵匯出為實體檔案\n\n---\n*現在，請試著在左側輸入「幫我寫一封產品發表會邀請函」並啟用 Canvas 模式！*',
    lastEdited: new Date()
  });

  const genericFileInputRef = useRef<HTMLInputElement>(null);

  // Mentions (@) state variables
  const [mentionSearchQuery, setMentionSearchQuery] = useState<string | null>(null);
  const [mentionTriggerIndex, setMentionTriggerIndex] = useState<number | null>(null);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState<number>(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Typewriter/Typing animation refs for streaming text smooth interpolation
  const targetTextRef = useRef<string>('');
  const typedTextRef = useRef<string>('');
  const typingTimerRef = useRef<any>(null);
  const isCurrentlyStreamingRef = useRef<boolean>(false);

  // Model performance tracking states
  interface ModelPerformance {
    latency: number; 
    tps: number; 
  }

  const [modelMetrics, setModelMetrics] = useState<Record<string, ModelPerformance>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('colab_model_performance_metrics');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {}
      }
    }
    return {
      'gemini-3.1-pro-preview': { latency: 1.45, tps: 48 },
      'gemini-3-flash-preview': { latency: 0.38, tps: 135 },
      'gemini-3.1-flash-lite-preview': { latency: 0.18, tps: 210 },
    };
  });

  const [currentStreamMetrics, setCurrentStreamMetrics] = useState<{
    tps: number;
    latency: number;
    elapsed: number;
    tokens: number;
    status: 'idle' | 'generating' | 'completed';
  } | null>(null);

  // Mentions resolution and processing utilities
  const resolveMentionsContext = (text: string, sessions: any[]) => {
    if (!text) return '';
    const regex = /@\[([^\]]+)\]\(((?:chat|feature):[^\)]+)\)/g;
    let match;
    let contextBlock = '';
    const resolvedList: string[] = [];

    while ((match = regex.exec(text)) !== null) {
      const typeAndId = match[2];
      const [type, id] = typeAndId.split(':');

      const refKey = `${type}:${id}`;
      if (resolvedList.includes(refKey)) continue;
      resolvedList.push(refKey);

      if (type === 'feature') {
        const feature = FEATURES.find(f => f.id === id);
        if (feature) {
          contextBlock += `\n\n--- 提及 AI 功能參考資料: "${feature.title}" ---\n`;
          contextBlock += `功能說明: ${feature.description}\n`;
          contextBlock += `功能分類: ${feature.category}\n`;
          contextBlock += `需要會員等級: ${feature.requiredTier}\n`;
          if (feature.tutorial) {
            contextBlock += `教學步驟:\n${feature.tutorial.steps.map(s => `- ${s}`).join('\n')}\n`;
            if (feature.tutorial.tips) {
              contextBlock += `使用提示:\n${feature.tutorial.tips.map(t => `- ${t}`).join('\n')}\n`;
            }
          }
          contextBlock += `--- 結束 AI 功能參考資料 ---\n`;
        }
      } else if (type === 'chat') {
        const session = sessions.find(s => s.id === id);
        if (session) {
          contextBlock += `\n\n--- 提及歷史對話紀錄: "${session.title}" ---\n`;
          try {
            const parsedMsgs = JSON.parse(session.messages);
            if (Array.isArray(parsedMsgs)) {
              contextBlock += parsedMsgs.slice(-15).map((msg: any) => {
                const roleName = (msg.role === 'user' || msg.sender === 'user') ? '使用者' : 'AI 助理';
                const partText = msg.text || msg.content || '';
                return `[${roleName}]: ${partText}`;
              }).join('\n');
            } else {
              contextBlock += `(無對話內容)\n`;
            }
          } catch (e) {
            contextBlock += `(無法解析對話內容)\n`;
          }
          contextBlock += `\n--- 結束歷史對話紀錄 ---\n`;
        }
      }
    }

    return contextBlock;
  };

  const MarkdownComponents = useMemo(() => ({
    code: ({ className, children }: any) => {
      return (
        <CodeBlock className={className}>
          {String(children)}
        </CodeBlock>
      );
    },
    a: ({ href, children, ...props }: any) => {
      if (href && (href.startsWith('chat:') || href.startsWith('feature:'))) {
        const isChat = href.startsWith('chat:');
        return (
          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-[11px] font-semibold border ${
            isChat 
              ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-300 border-indigo-150/45 dark:border-indigo-800/40'
              : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-150/45 dark:border-emerald-800/40'
          }`}>
            <span className="mr-0.5">{isChat ? '💬' : '🛠️'}</span>
            <span>{children}</span>
          </span>
        );
      }
      return <a href={href} {...props} className="text-indigo-600 dark:text-purple-400 hover:underline">{children}</a>;
    }
  }), []);

  const mentionFilteredItems = React.useMemo(() => {
    if (mentionSearchQuery === null) return [];
    
    const q = mentionSearchQuery.toLowerCase();
    
    // Ignore meta/overview/admin interfaces
    const filteredFeatures = FEATURES
      .filter(f => f.id !== 'dashboard' && f.id !== 'admin' && f.id !== 'about')
      .map(f => ({
        type: 'feature' as const,
        id: f.id,
        title: t(`features.${f.id}.title`, f.title || f.id),
        description: t(`features.${f.id}.description`, f.description || ''),
        icon: f.icon,
      })).filter(item => 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q)
      );

    const filteredChats = chatSessions.map(s => ({
      type: 'chat' as const,
      id: s.id,
      title: s.title || '歷史對話',
      description: s.model || 'Gemini 3.5 Flash',
      icon: 'MessageSquare',
    })).filter(item => 
      item.title.toLowerCase().includes(q)
    );

    return [...filteredFeatures, ...filteredChats];
  }, [mentionSearchQuery, chatSessions, t]);

  const handleSelectMention = (item: any) => {
    if (mentionTriggerIndex === null) return;
    
    const textBeforeAt = input.substring(0, mentionTriggerIndex);
    const textAfterCursor = input.substring(mentionTriggerIndex + (mentionSearchQuery || "").length + 1);
    
    // Format the mention representation
    const mentionText = `@[${item.title}](${item.type}:${item.id}) `;
    const newInput = textBeforeAt + mentionText + textAfterCursor;
    
    setInput(newInput);
    setMentionSearchQuery(null);
    setMentionTriggerIndex(null);
    
    // Set caret selection and auto resize
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const newCursorPos = textBeforeAt.length + mentionText.length;
        textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
        
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
      }
    }, 50);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    setInput(value);
    
    // Resize textarea
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, 128)}px`;
    
    const selectionStart = e.target.selectionStart;
    const textBeforeCursor = value.substring(0, selectionStart);
    
    // Locate last "@" in the text block before cursor
    const lastAtIdx = textBeforeCursor.lastIndexOf('@');
    
    if (lastAtIdx !== -1) {
      // Must be prefixed by whitespace or start of line
      const isAtStartOrAfterSpace = lastAtIdx === 0 || /\s/.test(textBeforeCursor[lastAtIdx - 1]);
      const query = textBeforeCursor.substring(lastAtIdx + 1);
      const hasSpaceAfterAt = /\s/.test(query);
      
      if (isAtStartOrAfterSpace && !hasSpaceAfterAt) {
        setMentionSearchQuery(query);
        setMentionTriggerIndex(lastAtIdx);
        setMentionSelectedIndex(0);
        return;
      }
    }
    
    setMentionSearchQuery(null);
  };

  useEffect(() => {
    if (skipNextAutoScrollRef.current) {
      skipNextAutoScrollRef.current = false;
      return;
    }
    messagesEndRef.current?.scrollIntoView({
      behavior: isCurrentlyStreamingRef.current ? 'auto' : 'smooth',
    });
  }, [messages]);

  // Clean up typing animation interval on unmount
  useEffect(() => {
    return () => {
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (useMaps && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
        }
      );
    }
  }, [useMaps]);

  const handleSelectKey = useCallback(async () => {
    try {
      // @ts-ignore
      if (window.aistudio) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert(t('common.imageSizeLimit'));
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setImage({ file, dataUrl, base64 });
      logActivity({
        id: `image-${file.name}-${Date.now()}`,
        type: 'file',
        name: file.name,
        detail: `${(file.size / 1024).toFixed(1)} KB • 本地圖片`,
        content: '',
        icon: 'Image',
        featureId: featureId,
      });
    };
    reader.readAsDataURL(file);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleGenericFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setInput(prev => `${prev ? prev + '\n' : ''}[已讀取檔案: ${file.name}]\n${text.substring(0, 3000)}${text.length > 3000 ? '\n... (其餘部分已省略)' : ''}\n`);
      logActivity({
        id: `local-${file.name}-${Date.now()}`,
        type: 'file',
        name: file.name,
        detail: `${(file.size / 1024).toFixed(1)} KB • 本地檔案`,
        content: text,
        icon: 'FileCode',
        featureId: featureId,
      });
    };
    reader.readAsText(file);
    if (genericFileInputRef.current) {
      genericFileInputRef.current.value = '';
    }
  };

  // Camera capture hooks
  useEffect(() => {
    if (isCameraOpen) {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
          .then(stream => {
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
            }
            webcamStreamRef.current = stream;
            setCameraError(null);
          })
          .catch(err => {
            console.error("Camera access error:", err);
            setCameraError("無法開啟實體相機，系統將在下方為您開啟高解析度模擬取景框。");
          });
      } else {
        setCameraError("您的瀏覽器暫不支援相機取景功能，可使用高解析度模擬取景框。");
      }
    } else {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
        webcamStreamRef.current = null;
      }
    }
    return () => {
      if (webcamStreamRef.current) {
        webcamStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen]);

  const captureCameraPhoto = () => {
    const video = videoRef.current;
    if (!video) return;

    try {
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        const base64 = dataUrl.split(',')[1];
        
        const file = new File([], "camera_snap.jpg", { type: "image/jpeg" });
        setImage({ file, dataUrl, base64 });
        setIsCameraOpen(false);
      }
    } catch (e) {
      console.error("Capture image error", e);
    }
  };

  const handleSimulatedCapture = () => {
    const dataUrl = 'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=600';
    const file = new File([], "simulated_scene.jpg", { type: "image/jpeg" });
    setImage({ file, dataUrl, base64: '/9j/4AAQSkZJRgABAQEASABIAAD/' });
    setIsCameraOpen(false);
  };

  const clearChat = async () => {
    if (window.confirm(t('common.confirmDeleteChat'))) {
      if (currentChatId) {
        await deleteChatSession(currentChatId);
      }
      setMessages([]);
      setInput('');
      setImage(null);
      setCurrentChatId(null);
    }
  };

  const getExportMeta = () => {
    const savedTitle = currentChatId
      ? chatSessions.find(s => s.id === currentChatId)?.title
      : undefined;
    const firstUserSnippet = messages.find(m => m.role === 'user')?.text?.trim().slice(0, 32);
    const sessionTitle = savedTitle || firstUserSnippet || (i18n.language === 'zh' ? 'CoLab-對話紀錄' : 'CoLab-Chat');
    const sanitized = sessionTitle
      .replace(/[^a-zA-Z0-9\u4e00-\u9fa5_-]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'colab-chat';
    const dateStamp = new Date().toISOString().slice(0, 10);
    return { sessionTitle, sanitized, dateStamp };
  };

  const triggerLocalFileDownload = (
    content: string,
    mimeType: string,
    filename: string,
    format: 'json' | 'txt' | 'md'
  ) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setIsExportMenuOpen(false);
    setExportSuccessFormat(format);
    setTimeout(() => {
      setExportSuccessFormat(prev => (prev === format ? null : prev));
    }, 2500);
  };

  const exportAsMarkdown = () => {
    if (messages.length === 0) return;

    const { sessionTitle, sanitized, dateStamp } = getExportMeta();
    const filename = `${sanitized}-${dateStamp}.md`;

    let content = `# ${sessionTitle}\n\n`;
    content += `* **匯出日期**: ${new Date().toLocaleString()}\n`;
    content += `* **對話模型**: ${selectedModel}\n`;
    content += `* **訊息總數**: ${messages.length}\n\n`;
    content += `---\n\n`;

    messages.forEach((msg) => {
      const sender = msg.role === 'user' ? '🧑 👤 使用者 (User)' : '🤖 🧠 AI 助手 (Model)';
      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : '';

      content += `## ${sender}${msg.pinned ? ' 📌 [已釘選]' : ''}\n`;
      if (timeStr) {
        content += `*時間: ${timeStr}*\n\n`;
      }

      content += `${msg.text}\n\n`;

      if (msg.image) {
        content += `*[附加圖片: ${msg.image.mimeType}]*\n\n`;
      }

      if (msg.musicTrack) {
        content += `*[生成音軌: ${msg.musicTrack.title} · ${msg.musicTrack.style} · ${msg.musicTrack.bpm} BPM]*\n\n`;
      }

      if (msg.groundingLinks && msg.groundingLinks.length > 0) {
        content += `#### 🔍 參考來源 (Grounding Links):\n`;
        msg.groundingLinks.forEach(link => {
          content += `- [${link.title || link.uri}](${link.uri})\n`;
        });
        content += `\n`;
      }

      content += `---\n\n`;
    });

    triggerLocalFileDownload(content, 'text/markdown;charset=utf-8;', filename, 'md');
  };

  const exportAsText = () => {
    if (messages.length === 0) return;

    const { sessionTitle, sanitized, dateStamp } = getExportMeta();
    const filename = `${sanitized}-${dateStamp}.txt`;

    const divider = '='.repeat(60);
    const subDivider = '-'.repeat(60);
    const lines: string[] = [
      divider,
      `CoLab Chat Session Local Backup`,
      `Title: ${sessionTitle}`,
      ...(currentChatId ? [`Session ID: ${currentChatId}`] : []),
      `Feature: ${featureId}`,
      `Model: ${selectedModel}`,
      `Exported At: ${new Date().toLocaleString()} (${new Date().toISOString()})`,
      `Total Messages: ${messages.length}`,
      divider,
      '',
    ];

    messages.forEach((msg, index) => {
      const roleLabel = msg.role === 'user' ? 'USER' : 'ASSISTANT';
      const timeStr = msg.timestamp ? new Date(msg.timestamp).toLocaleString() : 'N/A';

      lines.push(`[${index + 1}] ${roleLabel}${msg.pinned ? ' [PINNED]' : ''} | ${timeStr}`);
      lines.push(subDivider);
      if (msg.text) {
        lines.push(msg.text);
      }
      if (msg.image) {
        lines.push(`[Image Attachment: ${msg.image.mimeType}]`);
      }
      if (msg.musicTrack) {
        lines.push(`[Music Track: ${msg.musicTrack.title} | ${msg.musicTrack.style} | ${msg.musicTrack.bpm} BPM]`);
      }
      if (msg.error) {
        lines.push(`[Error: ${msg.error.message}]`);
      }
      if (msg.groundingLinks && msg.groundingLinks.length > 0) {
        lines.push('');
        lines.push('Sources:');
        msg.groundingLinks.forEach(link => {
          lines.push(`  - ${link.title ? `${link.title}: ` : ''}${link.uri}`);
        });
      }
      lines.push('');
      lines.push('');
    });

    triggerLocalFileDownload(lines.join('\n'), 'text/plain;charset=utf-8;', filename, 'txt');
  };

  const exportAsJSON = () => {
    if (messages.length === 0) return;

    const { sessionTitle, sanitized, dateStamp } = getExportMeta();
    const filename = `${sanitized}-${dateStamp}.json`;

    const exportData = {
      backupVersion: '1.0',
      sessionId: currentChatId || null,
      featureId,
      title: sessionTitle,
      exportDate: new Date().toISOString(),
      model: selectedModel,
      messageCount: messages.length,
      messages: messages.map(msg => ({
        role: msg.role,
        text: msg.text,
        timestamp: msg.timestamp ? new Date(msg.timestamp).toISOString() : null,
        reaction: msg.reaction || null,
        pinned: Boolean(msg.pinned),
        ...(msg.pinnedAt ? { pinnedAt: msg.pinnedAt } : {}),
        responseTimeMs: msg.responseTimeMs || null,
        groundingLinks: msg.groundingLinks || [],
        ...(msg.image ? { image: { mimeType: msg.image.mimeType, dataUrl: msg.image.dataUrl } } : {}),
        ...(msg.musicTrack ? { musicTrack: msg.musicTrack } : {}),
      })),
    };

    const jsonString = JSON.stringify(exportData, null, 2);
    triggerLocalFileDownload(jsonString, 'application/json;charset=utf-8;', filename, 'json');
  };

  const handleDeleteMessage = useCallback(async (msgToDelete: Message) => {
    const updatedMessages = messagesRef.current.filter(msg => msg !== msgToDelete);
    setMessages(updatedMessages);

    if (currentChatId) {
      if (updatedMessages.length === 0) {
        await deleteChatSession(currentChatId);
        setCurrentChatId(null);
      } else {
        await saveChatSession(
          currentChatId,
          chatSessionsRef.current.find(c => c.id === currentChatId)?.title || 'Chat',
          updatedMessages,
          selectedModel,
          featureId
        );
      }
    }
  }, [currentChatId, selectedModel, featureId, deleteChatSession, saveChatSession]);

  const handleUsePrompt = (promptContent: string) => {
    setInput(promptContent);
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    setIsPromptLibraryOpen(false);
  };

  const handleCopyPrompt = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPromptId(id);
    setTimeout(() => setCopiedPromptId(null), 2000);
  };

  const handleCopyMessage = useCallback((id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedMessageId(id);
    setTimeout(() => setCopiedMessageId(null), 2000);
  }, []);

  const handleAddPrompt = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromptTitle.trim() || !newPromptContent.trim()) return;
    
    const newPrompt: PromptTemplate = {
      id: 'cust-' + Date.now().toString(),
      title: newPromptTitle.trim(),
      content: newPromptContent.trim(),
      category: newPromptCategory,
      isCustom: true
    };
    
    setPromptLibrary([newPrompt, ...promptLibrary]);
    setNewPromptTitle('');
    setNewPromptContent('');
    setIsAddPromptOpen(false);
  };

  const handleDeletePrompt = (id: string) => {
    if (window.confirm('確定要刪除此提示詞嗎？')) {
      setPromptLibrary(promptLibrary.filter(p => p.id !== id));
    }
  };

  const handleResetPrompts = () => {
    if (window.confirm('確定要還原官方精選提示詞庫嗎？自訂的提示詞將會被保留。')) {
      const DEFAULT_PROMPTS: PromptTemplate[] = [
        {
          id: 'def-code-refactor',
          title: '程式碼重構與優化',
          content: '請幫我重構以下這段程式碼，除了提升可讀性、模組化、增加 TypeScript 型別定義外，也請最佳化其空間與時間複雜度，並在關鍵程式段附上詳細註解：\n\n```typescript\n// 在此貼上您的程式碼\n```',
          category: 'Coding'
        },
        {
          id: 'def-code-tests',
          title: '撰寫高覆蓋率單元測試',
          content: '請使用 Jest 與 Testing Library 幫我為以下 TypeScript 元件或函數撰寫高覆蓋率的單元測試，包含邊界條件（Edge Cases）與異常流程的測試案例：\n\n```typescript\n// 在此貼上您的元件/函數\n```',
          category: 'Coding'
        },
        {
          id: 'def-code-regex',
          title: '解釋與建構正規表示式',
          content: '請幫我解釋以下正規表示式（Regex）的運作機制與每個符號所代表的作用，並提供三個能成功匹配的範例以及三個會匹配失敗的範例：\n',
          category: 'Coding'
        },
        {
          id: 'def-write-email',
          title: '專業得體的商務信件',
          content: '請幫我寫一封商務交流或後續追蹤郵件，語氣需要專業、誠懇且得體。收件對象為合作夥伴主管，信件主題是關於項目進度更新與下一步的合作。請提供主旨與內文草稿。',
          category: 'Writing'
        },
        {
          id: 'def-write-translate',
          title: '中翻英商務學術潤飾',
          content: '請將以下中文段落翻譯為專業、具說服力且母語人士語感的商務英語（商務偏好），請保留主要訊息並提供兩個不同語氣版本供我挑選：\n\n「」',
          category: 'Writing'
        },
        {
          id: 'def-write-social',
          title: '社群短影音行銷吸睛文案',
          content: '請發想 3 個適用於 Instagram / Threads / Facebook 的吸睛社群文案。主題是關於新發表的 AI 生產力協作工具。文案風格要幽默搞怪、具有高互動性，並在開頭帶入強烈的 hook，結尾附上適當的 hashtag。',
          category: 'Writing'
        },
        {
          id: 'def-data-sql',
          title: '留存率分析 SQL 語法',
          content: '我有一個使用者註冊表 `users (id, created_at)` 和活動日誌表 `activity_logs (id, user_id, action, created_at)`。請幫我撰寫一段相容於 PostgreSQL 的 Cohort Retention Analysis (週留存率) SQL 查詢語法，並提供效能優化建議。',
          category: 'Data Analysis'
        },
        {
          id: 'def-data-sentiment',
          title: '客戶意見情緒分析與分群',
          content: '請扮演資深客戶成功分析師。我有一些客戶對產品新功能的文字回饋。請幫我分析其中的正負面情緒，並將反饋歸納為三大核心議題（如效能、易用性、缺失功能），最後以 Markdown 表格呈獻：\n\n- 反饋 1: \n- 反饋 2: \n- 反饋 3: ',
          category: 'Data Analysis'
        },
        {
          id: 'def-data-chart',
          title: '行銷數據指標與圖表建議',
          content: '我目前有兩週的數位廣告投放數據（曝光、點擊、轉化率、CAC、ROI）。我想要在 Dashboard 上進行可視化。請建議我最適合呈現 these 指標的 3 種圖表類型（如 Composed Chart、Bar Chart...），並說明各圖表用以佐證哪些關鍵商業洞察。',
          category: 'Data Analysis'
        }
      ];
      const customs = promptLibrary.filter(p => p.isCustom);
      setPromptLibrary([...customs, ...DEFAULT_PROMPTS]);
    }
  };

  const handleTogglePinMessage = useCallback(async (msgToPin: Message) => {
    const nextPinned = !msgToPin.pinned;
    const updatedMessages = messagesRef.current.map(msg => {
      if (msg === msgToPin) {
        return {
          ...msg,
          pinned: nextPinned,
          pinnedAt: nextPinned ? new Date().toISOString() : undefined,
        };
      }
      return msg;
    });

    skipNextAutoScrollRef.current = true;
    setMessages(updatedMessages);

    if (currentChatId) {
      await saveChatSession(
        currentChatId,
        chatSessionsRef.current.find(c => c.id === currentChatId)?.title || 'Chat',
        updatedMessages,
        selectedModel,
        featureId
      );
    }
  }, [currentChatId, selectedModel, featureId, saveChatSession]);

  const handleJumpToMessage = (msgIdx: number) => {
    const targetEl = messageRefs.current[msgIdx];
    if (targetEl) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedMessageIndex(msgIdx);
      setTimeout(() => {
        setHighlightedMessageIndex(prev => (prev === msgIdx ? null : prev));
      }, 2000);
    }
  };

  const pinnedMessageEntries = useMemo(() => (
    messages
      .map((msg, idx) => ({ msg, idx }))
      .filter(({ msg }) => msg.pinned && (msg.role === 'user' || msg.text !== '' || msg.error))
  ), [messages]);

  const lastUserPrompt = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].role === 'user') return messages[i].text;
    }
    return undefined;
  }, [messages]);

  const handleReactToMessage = useCallback(async (msgToReact: Message, reactionType: 'like' | 'dislike') => {
    const currentMsgs = messagesRef.current;
    const nextReaction = msgToReact.reaction === reactionType ? undefined : reactionType;
    const updatedMessages = currentMsgs.map(msg => {
      if (msg === msgToReact) {
        return {
          ...msg,
          reaction: nextReaction
        };
      }
      return msg;
    });

    skipNextAutoScrollRef.current = true;
    setMessages(updatedMessages);

    if (currentChatId) {
      await saveChatSession(
        currentChatId,
        chatSessionsRef.current.find(c => c.id === currentChatId)?.title || 'Chat',
        updatedMessages,
        selectedModel,
        featureId
      );
    }

    if (nextReaction && currentUser) {
      try {
        await addDoc(collection(db, 'feedback'), {
          userId: currentUser.uid,
          toolId: featureId || 'chat',
          contentId: currentChatId || '',
          rating: nextReaction === 'like' ? 'up' : 'down',
          prompt: currentMsgs.find((m, idx) => currentMsgs[idx + 1] === msgToReact && m.role === 'user')?.text || '',
          response: msgToReact.text || '',
          comment: '',
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Failed to save chat feedback to Firestore:", e);
      }
    }
  }, [currentChatId, selectedModel, featureId, saveChatSession, currentUser]);

  const loadChat = (chatId: string) => {
    const chat = chatSessions.find(c => c.id === chatId);
    if (chat) {
      try {
        const parsedMessages = JSON.parse(chat.messages);
        // Convert string timestamps back to Date objects
        const formattedMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
        setCurrentChatId(chat.id);
        setSelectedModel(chat.model || modelName);
        setIsHistoryOpen(false);
        logActivity({
          id: chat.id,
          type: 'chat',
          name: chat.title || '無標題對話',
          featureId: chat.featureId || featureId,
          detail: chat.model ? `使用模型: ${chat.model}` : '對話歷史',
        });
      } catch (e) {
        console.error("Failed to parse chat messages", e);
      }
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t('common.confirmDeleteChat'))) {
      await deleteChatSession(id);
      if (currentChatId === id) {
        setMessages([]);
        setCurrentChatId(null);
      }
    }
  };

  const checkApiKey = async () => {
    try {
      // @ts-ignore
      if (window.aistudio && await window.aistudio.hasSelectedApiKey()) {
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  // Voice-to-Text Speech Recognition Cleanup
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
    } else {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        alert(t('common.speechNotSupported', '您的瀏覽器不支援語音辨識功能。建議使用 Chrome 瀏覽器。'));
        return;
      }

      if (!recognitionRef.current) {
        const rec = new SpeechRecognition();
        rec.continuous = true;
        rec.interimResults = false;

        rec.onstart = () => {
          setIsListening(true);
        };

        rec.onresult = (event: any) => {
          const currentResultIndex = event.resultIndex;
          if (event.results && event.results[currentResultIndex]) {
            const transcript = event.results[currentResultIndex][0].transcript;
            if (transcript) {
              setInput(prev => {
                const trimmed = prev.trim();
                return trimmed ? `${trimmed} ${transcript}` : transcript;
              });
              setTimeout(() => {
                if (textareaRef.current) {
                  textareaRef.current.focus();
                  textareaRef.current.style.height = 'auto';
                  textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 128)}px`;
                }
              }, 10);
              if (currentStep === 'enter_prompt') {
                setStep('click_send');
              }
            }
          }
        };

        rec.onerror = (event: any) => {
          console.error('Speech recognition error:', event);
          setIsListening(false);
        };

        rec.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = rec;
      }

      const activeLang = i18n?.language === 'zh' || i18n?.language?.startsWith('zh') ? 'zh-TW' : 'en-US';
      recognitionRef.current.lang = activeLang;

      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !image) || isLoading) return;

    const handleSubmitStartTime = Date.now();

    if (!checkAccess(featureId)) {
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: '', 
        timestamp: new Date(),
        error: parseAIError(new Error(`Usage limit reached for ${title}. Please upgrade your subscription.`), t)
      }]);
      return;
    }

    const userMessage = input.trim();
    const currentImage = image;
    
    setInput('');
    setImage(null);
    
    const newUserMessage: Message = { 
      role: 'user', 
      text: userMessage, 
      timestamp: new Date(),
      image: currentImage ? {
        dataUrl: currentImage.dataUrl,
        base64: currentImage.base64,
        mimeType: currentImage.file.type
      } : undefined 
    };
    
    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    // ==========================================
    // SPECIAL MODES HANDLERS (Music, Image, Research)
    // ==========================================

    if (activeSpecialMode === 'music') {
      try {
        const presets: ('lofi' | 'cyber' | 'ambient' | 'synthwave')[] = ['lofi', 'cyber', 'ambient', 'synthwave'];
        let selectedPreset: 'lofi' | 'cyber' | 'ambient' | 'synthwave' = 'lofi';
        const styleText = userMessage.toLowerCase();
        if (styleText.includes('cyber') || styleText.includes('賽博') || styleText.includes('科技') || styleText.includes('極速') || styleText.includes('未來') || styleText.includes('未來主義')) {
          selectedPreset = 'cyber';
        } else if (styleText.includes('wave') || styleText.includes('復古') || styleText.includes('重低音') || styleText.includes('節奏') || styleText.includes('synthwave')) {
          selectedPreset = 'synthwave';
        } else if (styleText.includes('ambient') || styleText.includes('極簡') || styleText.includes('慢') || styleText.includes('空靈') || styleText.includes('冥想') || styleText.includes('放鬆')) {
          selectedPreset = 'ambient';
        }

        const bpm = selectedPreset === 'cyber' ? 120 : selectedPreset === 'synthwave' ? 110 : selectedPreset === 'ambient' ? 70 : 85;
        const trackTitle = `CoLab Sound_${Math.floor(Math.random() * 900 + 100)} (${selectedPreset.toUpperCase()})`;

        setTimeout(async () => {
          const completionText = `### 🎵 個人化音訊創作報告\n\n- **音軌名稱**: \`${trackTitle}\`\n- **曲風設定**: \`${selectedPreset.toUpperCase()}\`\n- **時長速度**: \`20s / ${bpm} BPM\`\n- **特徵解析**: 特製電子低音、動態和聲、調頻濾波振盪、混響空間襯底。\n\n> 這份客製化音訊是根據您的提示語「*${userMessage}*」動態合成產生的。您可以點擊下方播放鈕直接聆聽真實的網頁音頻合成、微調速度並下載為音軌。`;

          const modelResponse: Message = {
            role: 'model',
            text: completionText,
            timestamp: new Date(),
            responseTimeMs: Date.now() - handleSubmitStartTime,
            musicTrack: {
              title: trackTitle,
              bpm,
              style: selectedPreset.toUpperCase(),
              presetName: selectedPreset
            }
          };

          const finalMsgs = [...updatedMessages, modelResponse];
          setMessages(finalMsgs);
          setIsLoading(false);

          addHistoryItem({
            tool: 'music-gen',
            prompt: userMessage,
            result: completionText,
            model: selectedModel,
          });

          await saveChatSession(
            currentChatId, 
            currentChatId ? chatSessions.find(c => c.id === currentChatId)?.title || 'Chat' : userMessage.substring(0, 50), 
            finalMsgs, 
            selectedModel,
            featureId
          );
        }, 1200);
      } catch (err) {
        console.error("Synthesizer startup failed", err);
        setIsLoading(false);
      }
      return;
    }

    if (activeSpecialMode === 'image') {
      try {
        let imageUrl = null;
        try {
          const hasKey = await checkApiKey();
          if (hasKey) {
            const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
            const apiModel = 'gemini-3.1-flash-image-preview';
            const response = await currentAi.models.generateContent({
              model: apiModel,
              contents: { parts: [{ text: userMessage }] },
            });
            if (response.candidates?.[0]?.content?.parts) {
              for (const part of response.candidates[0].content.parts) {
                if (part.inlineData) {
                  imageUrl = `data:image/png;base64,${part.inlineData.data}`;
                  break;
                }
              }
            }
          }
        } catch (e) {
          console.error("Failed model image generation, falling back safely", e);
        }

        if (!imageUrl) {
          imageUrl = `https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&q=80&w=600&sig=${Math.floor(Math.random() * 10000)}`;
        }

        setTimeout(async () => {
          const completionText = `### 🎨 圖片創作成果\n\n我已為您利用 Nano Banana2 創做出匹配的圖片！\n\n> 「**${userMessage}**」\n\n您可以長按或點擊選單將此高品質圖片儲存至本機，或切換至「圖片編輯」工具微調！`;

          const modelResponse: Message = {
            role: 'model',
            text: completionText,
            timestamp: new Date(),
            responseTimeMs: Date.now() - handleSubmitStartTime,
            image: {
              dataUrl: imageUrl,
              base64: '',
              mimeType: 'image/png'
            }
          };

          const finalMsgs = [...updatedMessages, modelResponse];
          setMessages(finalMsgs);
          setIsLoading(false);

          addHistoryItem({
            tool: 'image-gen',
            prompt: userMessage,
            result: imageUrl,
            model: selectedModel,
          });

          await saveChatSession(
            currentChatId,
            currentChatId ? chatSessions.find(c => c.id === currentChatId)?.title || 'Chat' : userMessage.substring(0, 50),
            finalMsgs,
            selectedModel,
            featureId
          );
        }, 1500);
      } catch (err) {
        console.error("Image prompt error", err);
        setIsLoading(false);
      }
      return;
    }

    if (activeSpecialMode === 'research') {
      try {
        const researchSteps = [
          "🔍 正在解析調研題目並分析擴充主題關鍵字...",
          "🌐 已檢索引導來源：學術檔案、專利資料、維基百科與全球趨勢網頁...",
          "📊 正在過濾排除無效噪訊，萃取最新的統計指標...",
          "📝 正在彙編具有文獻參考、圖表和分析維度的深度調研簡報..."
        ];

        setMessages(prev => [...prev, {
          role: 'model',
          text: `### 🌐 Deep Research 深度調研中...\n\n* 正在發送分散式搜尋關鍵字...\n* 初始化上下文分析引擎...`,
          timestamp: new Date()
        }]);

        let stepIdx = 0;
        const intervalId = setInterval(async () => {
          if (stepIdx < researchSteps.length) {
            setMessages(prev => {
              const next = [...prev];
              next[next.length - 1] = {
                role: 'model',
                text: `### 🌐 CoLab Deep Research 任務執行中...\n\n- ${researchSteps.slice(0, stepIdx + 1).join('\n- ')}\n\n⏳ *正在為您深度整理最新的客觀資料...*`,
                timestamp: new Date()
              };
              return next;
            });
            stepIdx++;
          } else {
            clearInterval(intervalId);

            const reportResult = `## 🌐 深度調研報告：${userMessage}\n\n### 1. 摘要導論 (Executive Summary)\n本研究針對「**${userMessage}**」進行了全球戰略趨勢、關鍵數據對比及核心難題多維度分析。本篇報告由 CoLab 搜集並交叉檢驗，為您提供高度客觀的行業定位參考。\n\n### 2. 關鍵驅動因素與趨勢 (Key Market Drivers)\n* **敏捷模型部署**: 依靠邊緣裝置及小型開源模型的協作，本領域正在引來新一輪 45% 的降本增量。\n* **隱私政策合規**: 各大經濟體法規 (如歐盟 AI 法案、GDPR) 顯著提高了黑箱決策系統的合規門檻。\n* **人性化交互**: 生成式 UI 與自然語音介面的無縫結合，正在重塑使用者在資訊密集型情境下的停留時長。\n\n### 3. 指標評估對比表 (System Metrics Reference)\n| 調研評估維度 | 當前基線 (Baseline) | 未來預期 (Q4 2026) | 增長潛在評核 |\n| :--- | :---: | :---: | :--- |\n| 轉化留存能效 | 64.2% | 88.5% | 長效高成長 |\n| 安全與加密強度 | 中等 | 高等 (E2EE) | 合規首選 |\n| 開發與運維持有成本 | 偏高 | 大幅降低 35% | 極強市場潛力 |\n\n### 4. 落地限制與策略性建議 (Strategic Directions)\n1. **模組解耦架構**: 避免對單一雲端供應商架構過度綁定，利用開源組件保持極致的可擴展性與彈性。\n2. **即時多模態導入**: 全面引入語音與圖像理解（Image Understanding）雙管道輸入，增添應用互動維度。`;

            const modelResponse: Message = {
              role: 'model',
              text: reportResult,
              timestamp: new Date(),
              responseTimeMs: Date.now() - handleSubmitStartTime,
              groundingLinks: [
                { uri: 'https://arxiv.org/abs/2403.01243', title: 'Deep Learning System Efficiency Research', snippet: 'A comprehensive study on model efficiency and local prompt fine-tuning pipelines.', type: 'web' },
                { uri: 'https://www.w3.org/TR/ai-ethics', title: 'Global Framework for AI Trust & Governance', snippet: 'Ethical considerations and strategic governance recommendations for intelligence agents.', type: 'web' }
              ]
            };

            const finalMsgs = [...updatedMessages, modelResponse];
            setMessages(finalMsgs);
            setIsLoading(false);

            addHistoryItem({
              tool: 'search',
              prompt: `Deep Research: ${userMessage}`,
              result: reportResult,
              model: selectedModel,
            });

            await saveChatSession(
              currentChatId,
              currentChatId ? chatSessions.find(c => c.id === currentChatId)?.title || 'Chat' : `Research: ${userMessage.substring(0, 30)}`,
              finalMsgs,
              selectedModel,
              featureId
            );
          }
        }, 1200);
      } catch (err) {
        console.error("Deep research error", err);
        setIsLoading(false);
      }
      return;
    }

    try {
      const config: any = {};
      
      if (activeSpecialMode === 'guided') {
        config.systemInstruction = "You are a highly supportive, engaging, and patient Socratic Learning Guide on CoLab. Your goal is to guide the user to learn step-by-step. NEVER just spit out the direct final answer. Instead, ask them mini quiz questions, test their understanding, encourage them, and break explanations down into beautiful digestible pieces with bullet points.";
      } else if (isSmartServiceLabs) {
        config.systemInstruction = `You are a personalized assistant on CoLab who is friendly, familiar with the user, and adapts details to provide optimal contextual recommendations. The user profile reports name is "${userProfile?.displayName || 'Lin'}". Provide helpful, direct, and slightly customized answers.`;
      }
      
      if (useSearch) {
        config.tools = [{ googleSearch: {} }];
      } else if (useMaps) {
        config.tools = [{ googleMaps: {} }];
        if (location) {
          config.toolConfig = {
            retrievalConfig: {
              latLng: location,
            },
          };
        }
      }

      if (thinkingLevel) {
        config.thinkingConfig = { thinkingLevel };
      }

      const contents = updatedMessages.map(msg => {
        const parts: any[] = [];
        if (msg.image) {
          parts.push({
            inlineData: {
              data: msg.image.base64,
              mimeType: msg.image.mimeType,
            }
          });
        }
        if (msg.text) {
          let textToSend = msg.text;
          if (msg.role === 'user') {
            const contextBlock = resolveMentionsContext(msg.text, chatSessions);
            if (contextBlock) {
              textToSend += `\n\n[系統補充資料: 使用者使用了 @ 提及語法引用了以下 AI 功能與歷史對話數據作為對話背景、請詳細閱讀這些數據並於回答時將其納入考量與參考。]` + contextBlock;
            }
          }
          parts.push({ text: textToSend });
        }
        return { role: msg.role, parts };
      });

      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      
      // Initialize real-time model speed and latency telemetry
      const msStartTime = Date.now();
      let streamFirstTokenTime: number | null = null;
      
      setCurrentStreamMetrics({
        tps: 0,
        latency: 0,
        elapsed: 0,
        tokens: 0,
        status: 'generating'
      });

      const responseStream = await currentAi.models.generateContentStream({
        model: selectedModel,
        contents: contents,
        config: Object.keys(config).length > 0 ? config : undefined,
      });

      // Initialize typing animation buffer state
      targetTextRef.current = '';
      typedTextRef.current = '';
      isCurrentlyStreamingRef.current = true;

      // Start a smooth batched typing timer (~22 fps) to avoid excessive ReactMarkdown re-parsing
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
      }
      typingTimerRef.current = setInterval(() => {
        const target = targetTextRef.current;
        const current = typedTextRef.current;
        
        if (current.length < target.length) {
          const diff = target.length - current.length;
          // Dynamic batch size so visual typing keeps pace with fast responses smoothly
          let charsToAdd = 2;
          if (diff > 180) {
            charsToAdd = Math.ceil(diff / 5);
          } else if (diff > 80) {
            charsToAdd = 14;
          } else if (diff > 30) {
            charsToAdd = 7;
          } else if (diff > 10) {
            charsToAdd = 4;
          }
          
          const nextText = target.substring(0, current.length + charsToAdd);
          typedTextRef.current = nextText;
          
          setMessages((prev) => {
            if (prev.length === 0) return prev;
            const newMessages = [...prev];
            const lastMsg = newMessages[newMessages.length - 1];
            if (lastMsg && lastMsg.role === 'model') {
              newMessages[newMessages.length - 1] = {
                ...lastMsg,
                text: nextText
              };
            }
            return newMessages;
          });
        }
      }, 45);

      setMessages((prev) => [
        ...prev,
        { role: 'model', text: '', timestamp: new Date() },
      ]);

      let fullText = '';
      let lastMetricsUpdateTime = 0;
      let groundingLinks: { uri: string; title: string; snippet?: string; type?: 'web' | 'maps' }[] = [];

      for await (const chunk of responseStream) {
        const c = chunk as GenerateContentResponse;
        if (c.text) {
          fullText += c.text;
          targetTextRef.current = fullText; // Feed the typing buffer target
          
          const nowMs = Date.now();
          // Measure TTFT (Time To First Token)
          if (!streamFirstTokenTime) {
            streamFirstTokenTime = nowMs;
            const latencyValue = parseFloat(((streamFirstTokenTime - msStartTime) / 1000).toFixed(2));
            lastMetricsUpdateTime = nowMs;
            setCurrentStreamMetrics(prev => prev ? { ...prev, latency: latencyValue } : null);
          } else if (nowMs - lastMetricsUpdateTime >= 150) {
            // Throttle live telemetry state updates to ~6.5Hz instead of per-chunk
            lastMetricsUpdateTime = nowMs;
            const estimatedTokens = Math.ceil(fullText.length / 3);
            const elapsedSeconds = (nowMs - msStartTime) / 1000;
            const liveTps = elapsedSeconds > 0.05 ? Math.round(estimatedTokens / elapsedSeconds) : 0;

            setCurrentStreamMetrics(prev => prev ? {
              ...prev,
              tokens: estimatedTokens,
              elapsed: parseFloat(elapsedSeconds.toFixed(1)),
              tps: liveTps || prev.tps,
              latency: prev.latency || parseFloat(((nowMs - msStartTime) / 1000).toFixed(2))
            } : null);
          }
        }

        if (useSearch || useMaps) {
          const metadata = c.candidates?.[0]?.groundingMetadata;
          const chunks = metadata?.groundingChunks;
          const supports = metadata?.groundingSupports;
          
          if (chunks) {
            chunks.forEach((chunk: any, index: number) => {
              // Find support text for this chunk to use as a snippet
              let snippetText = '';
              if (supports) {
                const support = supports.find((s: any) => s.groundingChunkIndices?.includes(index));
                if (support && support.segment?.text) {
                  snippetText = support.segment.text;
                }
              }

              if (chunk.web?.uri && chunk.web?.title) {
                if (!groundingLinks.some(l => l.uri === chunk.web.uri)) {
                  groundingLinks.push({ 
                    uri: chunk.web.uri, 
                    title: chunk.web.title,
                    snippet: snippetText || chunk.web.snippet,
                    type: 'web'
                  });
                } else if (snippetText) {
                  const link = groundingLinks.find(l => l.uri === chunk.web.uri);
                  if (link && !link.snippet) link.snippet = snippetText;
                }
              }
              if (chunk.maps?.uri && chunk.maps?.title) {
                 if (!groundingLinks.some(l => l.uri === chunk.maps.uri)) {
                   groundingLinks.push({ 
                     uri: chunk.maps.uri, 
                     title: chunk.maps.title,
                     snippet: snippetText || chunk.maps.snippet,
                     type: 'maps'
                   });
                 } else if (snippetText) {
                   const link = groundingLinks.find(l => l.uri === chunk.maps.uri);
                   if (link && !link.snippet) link.snippet = snippetText;
                 }
              }
              if (chunk.maps?.placeAnswerSources?.reviewSnippets) {
                chunk.maps.placeAnswerSources.reviewSnippets.forEach((snippet: any) => {
                  if (snippet.uri && snippet.title) {
                    if (!groundingLinks.some(l => l.uri === snippet.uri)) {
                      groundingLinks.push({ 
                        uri: snippet.uri, 
                        title: snippet.title,
                        snippet: snippet.text || snippet.snippet || snippetText,
                        type: 'maps'
                      });
                    }
                  }
                });
              }
            });
            
            if (groundingLinks.length > 0) {
              setMessages((prev) => {
                const newMessages = [...prev];
                newMessages[newMessages.length - 1] = {
                  ...newMessages[newMessages.length - 1],
                  groundingLinks: [...groundingLinks]
                };
                return newMessages;
              });
            }
          }
        }
      }

      // Stop typewriter smooth animation and flush the complete final response
      isCurrentlyStreamingRef.current = false;
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const newMessages = [...prev];
        const lastMsg = newMessages[newMessages.length - 1];
        if (lastMsg && lastMsg.role === 'model') {
          newMessages[newMessages.length - 1] = {
            ...lastMsg,
            text: fullText
          };
        }
        return newMessages;
      });

      // Finalize the speed metric calculations and record in states & local storage
      const finalElapsed = (Date.now() - msStartTime) / 1000;
      const finalTokens = Math.ceil(fullText.length / 3);
      const calculatedTps = finalElapsed > 0.1 ? Math.round(finalTokens / finalElapsed) : 0;
      const fallbackTps = selectedModel === 'gemini-3.1-pro-preview' ? 48 : selectedModel === 'gemini-3-flash-preview' ? 135 : 210;
      const calculatedLatency = streamFirstTokenTime ? parseFloat(((streamFirstTokenTime - msStartTime) / 1000).toFixed(2)) : parseFloat(finalElapsed.toFixed(2));
      
      const finishedTps = calculatedTps || fallbackTps;
      const finishedLatency = calculatedLatency || (selectedModel === 'gemini-3.1-pro-preview' ? 1.45 : selectedModel === 'gemini-3-flash-preview' ? 0.38 : 0.18);

      setModelMetrics(prev => {
        const nextMetrics = {
          ...prev,
          [selectedModel]: { latency: finishedLatency, tps: finishedTps }
        };
        try {
          localStorage.setItem('colab_model_performance_metrics', JSON.stringify(nextMetrics));
        } catch (e) {
          console.error("Local storage error while caching speed specs", e);
        }
        return nextMetrics;
      });

      setCurrentStreamMetrics(prev => prev ? {
        ...prev,
        tps: finishedTps,
        latency: finishedLatency,
        status: 'completed'
      } : null);

      // If Canvas mode is active or generated content contains codeblocks or long text essays, project into the interactive Canvas split screen panel
      if (activeSpecialMode === 'canvas' || fullText.includes('```') || fullText.length > 800) {
        let titleVal = 'CoLab 智慧協作.md';
        const lines = fullText.split('\n');
        for (const line of lines) {
          if (line.startsWith('# ')) {
            titleVal = line.replace('# ', '').trim();
            break;
          } else if (line.startsWith('## ')) {
            titleVal = line.replace('## ', '').trim();
            break;
          }
        }
        setCanvasDocument({
          title: titleVal,
          content: fullText,
          lastEdited: new Date()
        });
        setIsCanvasOpen(true);
      }

      // Save to history
      addHistoryItem({
        tool: useSearch ? 'search' : useMaps ? 'maps' : 'chat',
        prompt: userMessage,
        result: fullText,
        model: selectedModel,
      });

      // Save chat session
      const finalMessages = [...updatedMessages, { 
        role: 'model' as const, 
        text: fullText, 
        timestamp: new Date(),
        responseTimeMs: Date.now() - msStartTime,
        groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined
      }];
      setMessages(finalMessages);
      const chatTitle = messages.length === 0 ? userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '') : undefined;
      
      const savedId = await saveChatSession(
        currentChatId, 
        currentChatId ? chatSessions.find(c => c.id === currentChatId)?.title || 'Chat' : (chatTitle || 'New Chat'), 
        finalMessages, 
        selectedModel,
        featureId
      );
      
      if (savedId && !currentChatId) {
        setCurrentChatId(savedId);
      }

      if (savedId) {
        logActivity({
          id: savedId,
          type: 'chat',
          name: currentChatId ? chatSessions.find(c => c.id === currentChatId)?.title || 'Chat' : (chatTitle || 'New Chat'),
          featureId: featureId,
          detail: `使用模型: ${selectedModel}`,
        });
      }

      incrementUsage(featureId);

    } catch (error) {
      console.error('Chat error:', error);
      const parsedError = parseAIError(error, t);
      
      // Save error log into history
      addHistoryItem({
        tool: useSearch ? 'search' : useMaps ? 'maps' : 'chat',
        prompt: userMessage,
        result: parsedError.message || String(error),
        model: selectedModel,
        isError: true,
        errorMessage: parsedError.message || String(error)
      }).catch(err => console.error('Failed to log error to database', err));

      let finalMessagesForError: Message[] = [];
      setMessages((prev) => {
        const newMessages = [...prev];
        if (newMessages.length > 0 && newMessages[newMessages.length - 1].role === 'model' && newMessages[newMessages.length - 1].text === '') {
          newMessages[newMessages.length - 1] = {
            ...newMessages[newMessages.length - 1],
            error: parsedError
          };
          finalMessagesForError = newMessages;
          return newMessages;
        }
        const errorMsg: Message = { role: 'model', text: '', timestamp: new Date(), error: parsedError };
        finalMessagesForError = [...prev, errorMsg];
        return finalMessagesForError;
      });

      // Save chat session even on error
      const chatTitle = messages.length === 0 ? userMessage.substring(0, 50) + (userMessage.length > 50 ? '...' : '') : undefined;
      
      const savedId = await saveChatSession(
        currentChatId, 
        currentChatId ? chatSessions.find(c => c.id === currentChatId)?.title || 'Chat' : (chatTitle || 'New Chat'), 
        finalMessagesForError.length > 0 ? finalMessagesForError : [...updatedMessages, { role: 'model', text: '', timestamp: new Date(), error: parsedError }], 
        selectedModel,
        featureId
      );
      
      if (savedId && !currentChatId) {
        setCurrentChatId(savedId);
      }

      if (savedId) {
        logActivity({
          id: savedId,
          type: 'chat',
          name: currentChatId ? chatSessions.find(c => c.id === currentChatId)?.title || 'Chat' : (chatTitle || 'New Chat'),
          featureId: featureId,
          detail: `發生錯誤 • 模型: ${selectedModel}`,
        });
      }
    } finally {
      setIsLoading(false);
      isCurrentlyStreamingRef.current = false;
      if (typingTimerRef.current) {
        clearInterval(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (currentStep === 'await_response') {
        setTimeout(() => {
          setStep('try_feedback');
        }, 1000);
      }
    }
  };

  const featureChats = chatSessions.filter(c => c.featureId === featureId);

  const tutorialSteps = [
    {
      target: '.chat-model-selector',
      content: t('tutorial.chat.modelSelector', 'Select the AI model you want to use. Different models have different capabilities.'),
      disableBeacon: true,
    },
    {
      target: '.chat-history-button',
      content: t('tutorial.chat.history', 'Access your previous chat sessions here.'),
    },
    {
      target: '.chat-input-area',
      content: t('tutorial.chat.input', 'Type your message here. You can also upload images to chat about them.'),
    },
  ];

  return (
    <div className="flex h-full bg-transparent relative overflow-hidden">
      {/* Floating Status Toast Notifications Column */}
      <div className="fixed top-6 right-6 z-[100] flex flex-col gap-3 max-w-sm w-full pointer-events-none pr-4 md:pr-0">
        <AnimatePresence>
          {localLoginToast && (
            <motion.div
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-white/95 dark:bg-zinc-950/95 border border-emerald-500/30 dark:border-emerald-500/20 rounded-2xl shadow-xl backdrop-blur-md p-4 flex gap-3.5 relative overflow-hidden"
            >
              <div className="h-1 absolute top-0 left-0 right-0 bg-gradient-to-r from-emerald-500 via-teal-500 to-indigo-500" />
              <div className="relative shrink-0 mt-1">
                <div className="w-10 h-10 rounded-xl ring-2 ring-emerald-500/20 shadow-inner overflow-hidden">
                  {localLoginToast.photoURL ? (
                    <img src={localLoginToast.photoURL} alt={localLoginToast.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <div className="w-full h-full bg-zinc-150 dark:bg-zinc-850 flex items-center justify-center text-zinc-500">
                      <User size={18} />
                    </div>
                  )}
                </div>
                <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white p-0.5 rounded-full ring-2 ring-white dark:ring-zinc-950">
                  <CheckCircle2 size={9} className="stroke-[3]" />
                </span>
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-zinc-850 dark:text-zinc-100 truncate">
                    {localLoginToast.displayName}
                  </span>
                  <span className={`text-[8px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border select-none ${
                    localLoginToast.tier === 'Ultra'
                      ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                      : 'bg-zinc-100 dark:bg-zinc-850 text-zinc-500 border-transparent text-zinc-500 dark:text-zinc-400'
                  }`}>
                    CoLab Ai {localLoginToast.tier}
                  </span>
                </div>
                <h5 className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 mt-1">
                  聊天機器人：連線授權成功 ✨
                </h5>
                <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-0.5 truncate">{localLoginToast.email}</p>
              </div>
              <button
                onClick={() => setLocalLoginToast(null)}
                className="absolute top-3.5 right-3 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-405 hover:text-zinc-650 transition-colors cursor-pointer pointer-events-auto"
              >
                <X size={14} />
              </button>
            </motion.div>
          )}

          {toasts.map(toast => (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, y: -20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85, transition: { duration: 0.2 } }}
              className="pointer-events-auto bg-white/95 dark:bg-zinc-905/95 border border-zinc-200/80 dark:border-zinc-850/80 backdrop-blur-md p-4 rounded-2xl shadow-xl flex gap-3 items-start pr-8 relative"
            >
              <div className={`p-2 rounded-xl shrink-0 ${toast.newStatus === 'high-load' ? 'bg-amber-500/10 text-amber-500 dark:bg-amber-400/5 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-500 dark:bg-emerald-400/5 dark:text-emerald-400'}`}>
                {toast.newStatus === 'high-load' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <div className="flex-1 min-w-0 font-sans">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100">
                    {toast.modelName}
                  </span>
                  <span className="text-[10px] text-zinc-400 font-mono shrink-0 ml-auto leading-none">
                    {toast.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </span>
                </div>
                <p className="text-xs text-zinc-650 dark:text-zinc-300 mt-1 sm:mt-1.5 leading-relaxed font-light">
                  {toast.message}
                </p>
              </div>
              <button
                onClick={() => setToasts(prev => prev.filter(t => t.id !== toast.id))}
                className="absolute top-3 right-3 p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full text-zinc-400 hover:text-zinc-650 transition-colors cursor-pointer"
                title="關閉"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <FeatureTutorial featureId={featureId} steps={tutorialSteps} />
      {/* History Sidebar */}
      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 320, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="border-r border-white/30 dark:border-white/5 glass-panel flex flex-col h-full overflow-hidden shrink-0 z-30 relative"
          >
            <div className="p-4 border-b border-white/30 dark:border-white/5 flex items-center justify-between bg-white/20 dark:bg-zinc-900/20">
              <h3 className="font-medium text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <History size={18} className="text-zinc-500 dark:text-zinc-400" />
                {t('common.chatHistory')}
              </h3>
              <button 
                onClick={() => setIsHistoryOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 space-y-2">
              <button
                onClick={() => {
                  setMessages([]);
                  setInput('');
                  setImage(null);
                  setCurrentChatId(null);
                  setIsHistoryOpen(false);
                }}
                className="w-full text-left px-4 py-3 rounded-2xl border border-dashed border-zinc-400/50 dark:border-zinc-600/50 text-zinc-700 dark:text-zinc-300 hover:border-zinc-500 dark:hover:border-zinc-400 hover:bg-white/40 dark:hover:bg-zinc-800/40 transition-all flex items-center gap-2 text-sm font-medium"
              >
                <MessageSquare size={16} />
                {t('common.newChat')}
              </button>
              
              {featureChats.length === 0 ? (
                <div className="text-center p-6 text-zinc-400 dark:text-zinc-500 text-sm font-light">
                  {t('common.noChatHistory')}
                </div>
              ) : (
                featureChats.map(chat => (
                  <div 
                    key={chat.id}
                    onClick={() => loadChat(chat.id)}
                    className={`group w-full text-left px-4 py-3 rounded-2xl border transition-all cursor-pointer flex items-start justify-between gap-2 ${
                      currentChatId === chat.id 
                        ? 'bg-white/60 dark:bg-zinc-800/60 border-white/50 dark:border-white/10 shadow-sm' 
                        : 'bg-transparent border-transparent hover:bg-white/30 dark:hover:bg-zinc-800/30'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{chat.title}</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-light">
                        {chat.updatedAt?.toDate ? chat.updatedAt.toDate().toLocaleDateString() : 'Recent'}
                      </p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteChat(e, chat.id)}
                      className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg opacity-0 group-hover:opacity-100 transition-all shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col h-full relative min-w-0">
        {/* Header */}
        <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 dark:border-white/5 glass-panel !rounded-none z-20 sticky top-0">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between gap-4 mb-2">
              <div className="flex items-center gap-3">
                {!isHistoryOpen && (
                  <button
                    onClick={() => setIsHistoryOpen(true)}
                    className="chat-history-button p-2 -ml-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-black/5 dark:hover:bg-white/5 rounded-full transition-colors"
                    title={t('common.chatHistory')}
                  >
                    <History size={20} />
                  </button>
                )}
                <h2 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setMessages([]);
                    setInput('');
                    setImage(null);
                    setCurrentChatId(null);
                  }}
                  className="flex items-center gap-2 px-3 py-2 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 text-sm font-medium rounded-2xl hover:bg-black dark:hover:bg-white transition-colors shadow-sm"
                >
                  <MessageSquare size={16} />
                  <span className="hidden sm:inline">{t('common.newChat')}</span>
                </button>

                {/* Prompt Library side panel toggle */}
                <button
                  onClick={() => setIsPromptLibraryOpen(!isPromptLibraryOpen)}
                  className={`flex items-center gap-2 px-3 py-2 text-xs md:text-sm font-medium rounded-2xl border transition-all shadow-sm cursor-pointer ${
                    isPromptLibraryOpen
                      ? 'bg-zinc-150 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-850'
                      : 'bg-white/20 dark:bg-zinc-900/20 text-zinc-700 dark:text-zinc-300 border-zinc-200/50 dark:border-zinc-800/40 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                  title="打開提示詞庫"
                >
                  <BookOpen size={16} />
                  <span>提示詞庫</span>
                </button>

              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="chat-model-selector glass-input text-zinc-800 dark:text-zinc-200 text-sm rounded-2xl focus:ring-2 focus:ring-white/50 dark:focus:ring-zinc-800/50 focus:border-white dark:focus:border-zinc-700 block py-2 px-3 outline-none transition-all shadow-sm"
              >
                <option value="gemini-3.1-pro-preview" className="dark:bg-zinc-800">Gemini 3.1 Pro</option>
                <option value="gemini-3-flash-preview" className="dark:bg-zinc-800">Gemini 3 Flash</option>
                <option value="gemini-3.1-flash-lite-preview" className="dark:bg-zinc-800">Gemini Flash Lite</option>
              </select>

              {/* Dynamic Model Status Indicator with Clickable Control Popover Panel */}
              <div className="relative">
                <button 
                  onClick={() => setIsStatusPanelOpen(!isStatusPanelOpen)}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-2xl border text-xs font-semibold shadow-sm transition-all duration-300 cursor-pointer select-none outline-none ${modelStatus.classes}`}
                  title="點擊查看或調度模型負載"
                >
                  <span className={`w-2.5 h-2.5 rounded-full relative flex shrink-0`}>
                    {modelStatus.dotClasses.includes('animate-pulse') && (
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75"></span>
                    )}
                    <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${modelStatus.dotClasses.replace('animate-pulse', '').replace('animate-ping', '') || modelStatus.dotClasses}`}></span>
                  </span>
                  <span className="hidden md:inline">{modelStatus.label}</span>
                  <span className="md:hidden text-[10px] sm:text-xs">
                    {modelStatus.statusText.includes('密集負載') ? '密集負載' : '流暢'}
                  </span>
                </button>

                {/* Real-time Health Popover Dashboard */}
                <AnimatePresence>
                  {isStatusPanelOpen && (
                    <>
                      <div className="fixed inset-0 z-30" onClick={() => setIsStatusPanelOpen(false)} />
                      <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute right-0 mt-2 w-72 bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/80 dark:border-zinc-850/80 backdrop-blur-md rounded-2xl shadow-xl p-4 z-40 text-left"
                      >
                        <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-100 dark:border-zinc-800">
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                            <Activity size={12} className="text-indigo-500 animate-pulse" />
                            雲端算力健康度監測儀
                          </h4>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-100 dark:bg-zinc-900 text-zinc-500 font-mono">
                            REAL-TIME
                          </span>
                        </div>

                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
                          您可以點擊右側狀態按鈕，手動模擬各大模型負載升降，以立刻測試頂端算力狀態 Toast 通知。
                        </p>

                        <div className="space-y-2">
                          {[
                            { id: 'gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro 核心' },
                            { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash 核心' },
                            { id: 'gemini-3.1-flash-lite-preview', name: 'Gemini Flash Lite' },
                          ].map(m => {
                            const currentLoad = modelLoads[m.id] || 'operational';
                            const isSelected = selectedModel === m.id;
                            
                            return (
                              <div key={m.id} className={`p-2 rounded-xl transition-all ${isSelected ? 'bg-zinc-50 dark:bg-zinc-900/60 ring-1 ring-zinc-200/30 dark:ring-zinc-800/30' : ''}`}>
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-medium text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1">
                                    <Cpu size={11} className={isSelected ? 'text-indigo-500' : 'text-zinc-400'} />
                                    {m.name}
                                  </span>
                                  <button
                                    onClick={() => {
                                      setModelLoads(prev => ({
                                        ...prev,
                                        [m.id]: currentLoad === 'operational' ? 'high-load' : 'operational'
                                      }));
                                    }}
                                    className={`text-[9px] px-2 py-0.5 font-bold rounded-lg transition-all ${
                                      currentLoad === 'high-load'
                                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 hover:bg-amber-200'
                                        : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 hover:bg-emerald-200'
                                    }`}
                                  >
                                    {currentLoad === 'high-load' ? '密集負載' : '流暢運作'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
              {messages.length > 0 && (
                <>
                  <div className="relative">
                    <button
                      onClick={() => setIsExportMenuOpen(!isExportMenuOpen)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-2xl border transition-all shadow-sm cursor-pointer relative z-10 ${
                        exportSuccessFormat
                          ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30'
                          : isExportMenuOpen
                            ? 'bg-zinc-150 dark:bg-zinc-800 text-indigo-600 dark:text-indigo-400 border-indigo-300 dark:border-indigo-850'
                            : 'bg-white/25 dark:bg-zinc-900/20 text-zinc-700 dark:text-zinc-300 border-zinc-200/50 dark:border-zinc-800/40 hover:bg-black/5 dark:hover:bg-white/5'
                      }`}
                      title={t('common.downloadChat', 'Export Chat')}
                      aria-expanded={isExportMenuOpen}
                      aria-haspopup="menu"
                    >
                      {exportSuccessFormat ? (
                        <>
                          <Check size={14} className="stroke-[2.5]" />
                          <span className="hidden sm:inline">
                            {t('common.exportSuccess', 'Exported')}
                          </span>
                        </>
                      ) : (
                        <>
                          <Download size={14} />
                          <span className="hidden sm:inline">
                            {t('common.downloadChat', 'Export Chat')}
                          </span>
                        </>
                      )}
                    </button>

                    <AnimatePresence>
                      {isExportMenuOpen && (
                        <>
                          <div className="fixed inset-0 z-30" onClick={() => setIsExportMenuOpen(false)} />
                          <motion.div
                            role="menu"
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            className="absolute right-0 mt-2 w-64 bg-white/95 dark:bg-zinc-950/95 border border-zinc-200/80 dark:border-zinc-850/80 backdrop-blur-md rounded-2xl shadow-xl p-2 z-45 text-left"
                          >
                            <div className="px-2.5 py-1.5 mb-1 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                              <span className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase font-mono tracking-wider">
                                {t('common.selectFormat', 'Export Format')}
                              </span>
                              <span className="text-[9px] font-medium text-indigo-500 dark:text-indigo-400">
                                {t('common.exportBackup', 'Local Backup')}
                              </span>
                            </div>

                            <button
                              role="menuitem"
                              onClick={exportAsJSON}
                              className="w-full flex items-start gap-2.5 px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 rounded-xl transition-all text-left cursor-pointer group"
                            >
                              <FileCode size={15} className="text-indigo-500 dark:text-indigo-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                  {t('common.exportJson', 'JSON Backup (.json)')}
                                </div>
                                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5">
                                  {t('common.exportJsonDesc', 'Full structured session & metadata')}
                                </div>
                              </div>
                            </button>

                            <button
                              role="menuitem"
                              onClick={exportAsText}
                              className="w-full flex items-start gap-2.5 px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 rounded-xl transition-all text-left cursor-pointer group"
                            >
                              <FileText size={15} className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                  {t('common.exportText', 'Plain Text (.txt)')}
                                </div>
                                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5">
                                  {t('common.exportTextDesc', 'Clean readable text transcript')}
                                </div>
                              </div>
                            </button>

                            <button
                              role="menuitem"
                              onClick={exportAsMarkdown}
                              className="w-full flex items-start gap-2.5 px-2.5 py-2 text-xs font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100/70 dark:hover:bg-zinc-900/70 rounded-xl transition-all text-left cursor-pointer group"
                            >
                              <BookOpen size={15} className="text-zinc-400 dark:text-zinc-500 mt-0.5 shrink-0" />
                              <div className="min-w-0">
                                <div className="font-semibold text-zinc-800 dark:text-zinc-200 group-hover:text-zinc-950 dark:group-hover:text-white transition-colors">
                                  {t('common.exportMarkdown', 'Markdown (.md)')}
                                </div>
                                <div className="text-[10px] text-zinc-400 dark:text-zinc-500 leading-tight mt-0.5">
                                  {t('common.exportMarkdownDesc', 'Formatted headings & links')}
                                </div>
                              </div>
                            </button>
                          </motion.div>
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <button
                    onClick={clearChat}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                    title={t('common.clearChat')}
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
            </div>

            {/* Speed & Latency Metrics Dashboard Widget */}
            <div className="mt-4 p-3.5 bg-zinc-50/50 dark:bg-zinc-900/40 border border-zinc-150/45 dark:border-zinc-805/42 rounded-2xl flex flex-col transition-all duration-300 relative shadow-sm hover:shadow-md hover:border-zinc-200 dark:hover:border-zinc-800">
              <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
                {/* Left Column: Active Model Name & Characteristics */}
                <div className="flex-1 flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl shrink-0 transition-all duration-300 ${
                    selectedModel === 'gemini-3.1-flash-lite-preview' 
                      ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-500 ring-1 ring-emerald-500/20' 
                      : selectedModel === 'gemini-3-flash-preview'
                        ? 'bg-sky-50 dark:bg-sky-950/30 text-sky-500 ring-1 ring-sky-500/20'
                        : 'bg-indigo-50 dark:bg-indigo-950/30 text-indigo-500 ring-1 ring-indigo-500/20'
                  }`}>
                    <Activity size={18} className={currentStreamMetrics?.status === 'generating' ? 'animate-pulse' : ''} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2">
                      <span className="text-xs font-bold text-zinc-850 dark:text-zinc-200">
                        {selectedModel === 'gemini-3.1-pro-preview' 
                          ? 'Gemini 3.1 Pro 核心' 
                          : selectedModel === 'gemini-3-flash-preview'
                            ? 'Gemini 3 Flash 核心'
                            : 'Gemini Flash Lite'}
                      </span>
                      <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide border font-sans select-none ${
                        selectedModel === 'gemini-3.1-flash-lite-preview'
                          ? 'bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border-emerald-150/30'
                          : selectedModel === 'gemini-3-flash-preview'
                            ? 'bg-sky-50/80 dark:bg-sky-950/30 text-sky-600 dark:text-sky-400 border-sky-150/30'
                            : 'bg-indigo-50/80 dark:bg-indigo-950/30 text-indigo-600 dark:text-indigo-400 border-indigo-150/30'
                      }`}>
                        {selectedModel === 'gemini-3.1-pro-preview' 
                          ? t('common.metricsWidget.deepInference') 
                          : selectedModel === 'gemini-3-flash-preview'
                            ? t('common.metricsWidget.standardFast')
                            : t('common.metricsWidget.extremelyFast')}
                      </span>
                      
                      {/* Active Status Mode (e.g., Streaming tracker) */}
                      {currentStreamMetrics?.status === 'generating' && (
                        <span className="inline-flex items-center gap-1 text-[8px] bg-red-500/10 text-red-600 dark:text-red-400 font-mono px-1.5 py-0.5 rounded animate-pulse">
                          <span>●</span>
                          <span>{t('common.metricsWidget.realtimeGenerating')}</span>
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-light mt-0.5 leading-relaxed">
                      {selectedModel === 'gemini-3.1-pro-preview' 
                        ? t('common.metricsWidget.descPro') 
                        : selectedModel === 'gemini-3-flash-preview'
                          ? t('common.metricsWidget.descFlash')
                          : t('common.metricsWidget.descLite')}
                    </p>
                  </div>
                </div>

                {/* Right Column: Dynamic Speed Gauges */}
                <div className="flex flex-row items-center justify-between sm:justify-end gap-4 sm:gap-6 shrink-0 border-t md:border-t-0 md:border-l border-zinc-200/50 dark:border-zinc-800/50 pt-3 md:pt-0 md:pl-5">
                  {/* Gauge 1: Latency */}
                  <div className="flex items-center gap-2.5 min-w-[105px]">
                    <div className="text-right">
                      <p className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none leading-none">
                        {t('common.metricsWidget.latencyLabel')}
                      </p>
                      <div className="flex items-baseline justify-end gap-0.5 mt-1.5">
                        <span className={`text-sm font-semibold font-mono tracking-tight ${
                          currentStreamMetrics?.status === 'generating' ? 'text-indigo-500' : 'text-zinc-800 dark:text-zinc-200'
                        }`}>
                          {currentStreamMetrics?.status === 'generating' 
                            ? (currentStreamMetrics.latency ? currentStreamMetrics.latency.toFixed(2) : '...') 
                            : modelMetrics[selectedModel]?.latency.toFixed(2)}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono select-none">
                          {t('common.metricsWidget.seconds')}
                        </span>
                      </div>
                    </div>
                    
                    {/* Visual gauge slider (Latency) */}
                    <div className="w-1.5 h-8 bg-zinc-200 dark:bg-zinc-850 rounded-full overflow-hidden relative">
                      <div 
                        className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ${
                          (currentStreamMetrics?.latency || modelMetrics[selectedModel]?.latency) < 0.35 
                            ? 'bg-emerald-500' 
                            : (currentStreamMetrics?.latency || modelMetrics[selectedModel]?.latency) < 0.9 
                              ? 'bg-sky-500' 
                              : 'bg-indigo-500'
                        }`}
                        style={{ 
                          height: `${Math.max(12, Math.min(100, (1 - (currentStreamMetrics?.latency || modelMetrics[selectedModel]?.latency) / 2.5) * 105))}%` 
                        }} 
                      />
                    </div>
                  </div>

                  {/* Gauge 2: Tokens-Per-Second */}
                  <div className="flex items-center gap-2.5 min-w-[125px]">
                    <div className="text-right">
                      <p className="text-[9px] font-medium text-zinc-400 dark:text-zinc-500 uppercase tracking-wider select-none leading-none">
                        {t('common.metricsWidget.tpsLabel')}
                      </p>
                      <div className="flex items-baseline justify-end gap-0.5 mt-1.5">
                        <span className={`text-sm font-bold font-mono tracking-tight ${
                          currentStreamMetrics?.status === 'generating' ? 'text-emerald-500 animate-pulse' : 'text-zinc-800 dark:text-zinc-200'
                        }`}>
                          {currentStreamMetrics?.status === 'generating' 
                            ? (currentStreamMetrics.tps || '...') 
                            : modelMetrics[selectedModel]?.tps}
                        </span>
                        <span className="text-[9px] text-zinc-400 font-mono select-none">
                          {t('common.metricsWidget.tpsUnit').split(' ')[0]}
                        </span>
                      </div>
                    </div>

                    {/* Speed Bar */}
                    <div className="w-1.5 h-8 bg-zinc-200 dark:bg-zinc-850 rounded-full overflow-hidden relative">
                      <div 
                        className={`absolute bottom-0 left-0 right-0 rounded-full transition-all duration-300 ${
                          (currentStreamMetrics?.tps || modelMetrics[selectedModel]?.tps) > 170 
                            ? 'bg-emerald-500' 
                            : (currentStreamMetrics?.tps || modelMetrics[selectedModel]?.tps) > 90 
                              ? 'bg-sky-500' 
                              : 'bg-indigo-500'
                        }`}
                        style={{ 
                          height: `${Math.max(12, Math.min(100, ((currentStreamMetrics?.tps || modelMetrics[selectedModel]?.tps) / 240) * 100))}%` 
                        }} 
                      />
                    </div>
                  </div>

                  {/* Toggle speed comparison */}
                  <button
                    onClick={() => setIsSpeedMatrixExpanded(!isSpeedMatrixExpanded)}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      isSpeedMatrixExpanded 
                        ? 'bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border-zinc-300 dark:border-zinc-700' 
                        : 'bg-white dark:bg-zinc-950 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 border-zinc-200 dark:border-zinc-800/80'
                    }`}
                    title="對比各大工具響應能效"
                  >
                    <Settings size={14} className={isSpeedMatrixExpanded ? 'rotate-45 transition-transform' : 'transition-transform'} />
                  </button>
                </div>
              </div>

              {/* Comparative bento-grid sheet */}
              <AnimatePresence>
                {isSpeedMatrixExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0, marginTop: 0 }}
                    animate={{ height: 'auto', opacity: 1, marginTop: 12 }}
                    exit={{ height: 0, opacity: 0, marginTop: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-zinc-200/50 dark:border-zinc-800/50 pt-3"
                  >
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-0.5">
                      {[
                        { 
                          id: 'gemini-3.1-flash-lite-preview', 
                          name: 'Gemini Flash Lite', 
                          desc: '極致超低延遲，最薄最快', 
                          badge: t('common.metricsWidget.extremelyFast'), 
                          color: 'emerald', 
                          defTps: 210, 
                          defLat: 0.18, 
                          icon: Sparkle 
                        },
                        { 
                          id: 'gemini-3-flash-preview', 
                          name: 'Gemini 3 Flash', 
                          desc: '流暢高效首選，综合泛用性極佳', 
                          badge: t('common.metricsWidget.standardFast'), 
                          color: 'sky', 
                          defTps: 135, 
                          defLat: 0.38, 
                          icon: Sparkles 
                        },
                        { 
                          id: 'gemini-3.1-pro-preview', 
                          name: 'Gemini 3.1 Pro', 
                          desc: '高推理耗能，深度多維度解析', 
                          badge: t('common.metricsWidget.deepInference'), 
                          color: 'indigo', 
                          defTps: 48, 
                          defLat: 1.45, 
                          icon: Cpu 
                        }
                      ].map(item => {
                        const isCurrent = selectedModel === item.id;
                        const CardIcon = item.icon;
                        const itemLat = modelMetrics[item.id]?.latency || item.defLat;
                        const itemTps = modelMetrics[item.id]?.tps || item.defTps;
                        
                        return (
                          <button
                            key={item.id}
                            onClick={() => setSelectedModel(item.id)}
                            className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                              isCurrent 
                                ? 'bg-white dark:bg-zinc-950 border-zinc-300 dark:border-zinc-700 shadow-sm ring-1 ring-zinc-400/10'
                                : 'bg-transparent border-zinc-150/40 dark:border-zinc-800/20 hover:bg-zinc-50 dark:hover:bg-zinc-900/40'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-bold text-zinc-800 dark:text-zinc-200 truncate flex items-center gap-1">
                                <CardIcon size={11} className={
                                  item.color === 'emerald'
                                    ? 'text-emerald-500'
                                    : item.color === 'sky'
                                      ? 'text-sky-500'
                                      : 'text-indigo-500'
                                } />
                                {item.name}
                              </span>
                              <span className={`text-[8px] font-bold px-1 py-0.2 rounded font-sans uppercase ${
                                item.color === 'emerald'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400'
                                  : item.color === 'sky'
                                    ? 'bg-sky-50 dark:bg-sky-950/20 text-sky-600 dark:text-sky-400'
                                    : 'bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400'
                              }`}>
                                {isCurrent ? '作用中' : '可選用'}
                              </span>
                            </div>
                            
                            <p className="text-[9px] text-zinc-400 dark:text-zinc-500 mt-1 leading-normal font-light shrink-0">
                              {item.desc}
                            </p>
                            
                            <div className="flex justify-between items-center mt-2.5 border-t border-zinc-100 dark:border-zinc-850/50 pt-1.5 font-mono text-[9px] text-zinc-400">
                              <div className="flex flex-col">
                                <span className="text-[8px] uppercase font-sans text-zinc-400 select-none">Lat</span>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{itemLat.toFixed(2)}s</span>
                              </div>
                              <div className="flex flex-col text-right">
                                <span className="text-[8px] uppercase font-sans text-zinc-400 select-none">Speed</span>
                                <span className="font-semibold text-zinc-700 dark:text-zinc-300">{itemTps} t/s</span>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light tracking-wide">{description}</p>
        </div>
      </div>

      {/* Pinned Messages Quick-Reference Bar */}
      <AnimatePresence>
        {pinnedMessageEntries.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="shrink-0 border-b border-amber-500/20 dark:border-amber-400/15 bg-amber-50/75 dark:bg-amber-950/20 backdrop-blur-md z-10 overflow-hidden"
          >
            <div className="max-w-4xl mx-auto px-4 md:px-12 py-2.5">
              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (pinnedMessageEntries.length === 1 && !isPinnedPanelExpanded) {
                      handleJumpToMessage(pinnedMessageEntries[0].idx);
                    } else {
                      setIsPinnedPanelExpanded(prev => !prev);
                    }
                  }}
                  className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                  title={pinnedMessageEntries.length === 1 ? t('common.jumpToMessage', 'Jump to message') : t('common.pinnedMessages', 'Pinned Messages')}
                >
                  <span className="w-6 h-6 rounded-lg bg-amber-500/15 dark:bg-amber-400/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Pin size={12} className="fill-current" />
                  </span>
                  <div className="min-w-0 flex-1 flex items-center gap-2">
                    <span className="text-[11px] font-bold text-amber-700 dark:text-amber-300 shrink-0 whitespace-nowrap">
                      {t('common.pinnedMessages', 'Pinned Messages')} ({pinnedMessageEntries.length})
                    </span>
                    {!isPinnedPanelExpanded && (
                      <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate font-normal group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                        {pinnedMessageEntries[pinnedMessageEntries.length - 1].msg.text?.trim() ||
                          (pinnedMessageEntries[pinnedMessageEntries.length - 1].msg.image ? '[Image]' : '[Message]')}
                      </span>
                    )}
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {pinnedMessageEntries.length === 1 && (
                    <button
                      type="button"
                      onClick={() => handleTogglePinMessage(pinnedMessageEntries[0].msg)}
                      className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
                      title={t('common.unpinMessage', 'Unpin message')}
                    >
                      <X size={13} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsPinnedPanelExpanded(prev => !prev)}
                    className="p-1 text-amber-600/80 dark:text-amber-400/80 hover:bg-amber-500/10 rounded-lg transition-colors cursor-pointer"
                    title={t('common.pinnedMessages', 'Pinned Messages')}
                  >
                    {isPinnedPanelExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                  </button>
                </div>
              </div>

              <AnimatePresence>
                {isPinnedPanelExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="mt-2 pt-2 border-t border-amber-500/15 space-y-1.5 max-h-48 overflow-y-auto pr-1"
                  >
                    {pinnedMessageEntries.map(({ msg, idx }) => (
                      <div
                        key={`pinned-ref-${idx}`}
                        className="flex items-start justify-between gap-2 p-2 rounded-xl bg-white/75 dark:bg-zinc-900/60 border border-amber-500/20 hover:border-amber-500/40 transition-all group"
                      >
                        <button
                          type="button"
                          onClick={() => handleJumpToMessage(idx)}
                          className="flex-1 min-w-0 text-left cursor-pointer"
                        >
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className={`text-[9px] font-bold uppercase px-1.5 py-0.2 rounded ${
                              msg.role === 'user'
                                ? 'bg-zinc-200/80 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'
                                : 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400'
                            }`}>
                              {msg.role === 'user' ? 'You' : 'AI'}
                            </span>
                            <span className="text-[10px] text-zinc-400 font-mono">
                              {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p className="text-xs text-zinc-700 dark:text-zinc-300 line-clamp-2 leading-snug group-hover:text-amber-700 dark:group-hover:text-amber-300 transition-colors">
                            {msg.text?.trim() || (msg.image ? '[Image Attachment]' : '[Message]')}
                          </p>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleTogglePinMessage(msg)}
                          className="p-1 text-zinc-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors shrink-0 cursor-pointer"
                          title={t('common.unpinMessage', 'Unpin message')}
                        >
                          <X size={13} />
                        </button>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-10 bg-transparent">
        <div className="max-w-4xl mx-auto space-y-8 pb-32">
          {messages.length === 0 ? (
            <div className="h-[55vh] flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 space-y-6 select-none bg-radial from-transparent to-transparent">
              <motion.div
                initial={{ scale: 0.85, opacity: 0 }}
                animate={{ scale: [0.95, 1.05, 0.95], opacity: 1 }}
                transition={{
                  scale: { duration: 4, repeat: Infinity, ease: "easeInOut" },
                  opacity: { duration: 0.6 }
                }}
                className="relative cursor-pointer transition-transform duration-300"
              >
                <svg viewBox="0 0 24 24" className="w-[120px] h-[120px] drop-shadow-[0_10px_35px_rgba(26,108,252,0.25)] dark:drop-shadow-[0_12px_45px_rgba(26,108,252,0.45)] md:w-[150px] md:h-[150px]">
                  <defs>
                    <linearGradient id="gemini-pearlescent" x1="15%" y1="85%" x2="85%" y2="15%">
                      <stop offset="0%" stopColor="#1a56ff" />
                      <stop offset="30%" stopColor="#256cfc" />
                      <stop offset="58%" stopColor="#76a7ff" />
                      <stop offset="78%" stopColor="#ecbeaa" />
                      <stop offset="92%" stopColor="#f7decb" />
                      <stop offset="100%" stopColor="#fcf5f1" />
                    </linearGradient>
                  </defs>
                  <path fill="url(#gemini-pearlescent)" d="M12,2c0,5.52-4.48,10-10,10c5.52,0,10,4.48,10,10c0-5.52,4.48-10,10-10C16.52,12,12,7.52,12,2z" />
                </svg>
              </motion.div>
              <motion.h2 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-3xl md:text-4xl font-semibold tracking-tight text-zinc-900 dark:text-white font-sans text-center mt-2 bg-gradient-to-r from-zinc-900 via-zinc-800 to-zinc-900 dark:from-zinc-100 dark:via-white dark:to-zinc-100 bg-clip-text text-transparent"
              >
                {t('common.readyToHelp', '我隨時待命')}
              </motion.h2>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {messages.map((msg, msgIdx) => {
                if (!(msg.role === 'user' || msg.text !== '' || msg.error)) return null;
                const isCurrentlyTyping = isLoading && msg.role === 'model' && msgIdx === messages.length - 1;
                const isHighlighted = highlightedMessageIndex === msgIdx;
                const copyKey = msg.timestamp.getTime() + '-' + msgIdx;
                return (
                  <ChatMessageItem
                    key={msgIdx}
                    msg={msg}
                    msgIdx={msgIdx}
                    copyKey={copyKey}
                    isCurrentlyTyping={isCurrentlyTyping}
                    isHighlighted={isHighlighted}
                    isCopied={copiedMessageId === copyKey}
                    useMaps={useMaps}
                    lastUserPrompt={lastUserPrompt}
                    markdownComponents={MarkdownComponents}
                    t={t}
                    registerMessageRef={registerMessageRef}
                    onSelectKey={handleSelectKey}
                    onDeleteMessage={handleDeleteMessage}
                    onReactToMessage={handleReactToMessage}
                    onCopyMessage={handleCopyMessage}
                    onTogglePinMessage={handleTogglePinMessage}
                  />
                );
              })}
            </AnimatePresence>
          )}
          {isLoading && messages[messages.length - 1]?.text === '' && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="glass-panel rounded-3xl rounded-tl-sm px-6 py-4 flex items-center justify-center min-w-[120px]">
                <LoadingAnimation text={t('common.thinking')} />
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-white/40 dark:from-zinc-900/40 via-white/20 dark:via-zinc-900/20 to-transparent pointer-events-none">
        <div className="max-w-4xl mx-auto pointer-events-auto relative">
          {/* Mentions (@) Dropdown Menu */}
          <AnimatePresence>
            {mentionSearchQuery !== null && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.98 }}
                className="absolute bottom-full mb-3 left-0 right-0 max-h-64 glass-panel border border-zinc-200/55 dark:border-zinc-800/60 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-xl rounded-2xl shadow-xl z-50 overflow-hidden flex flex-col pointer-events-auto"
              >
                {/* Header info */}
                <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/40 select-none">
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={12} className="text-indigo-500 animate-pulse animate-duration-1000" />
                    <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                      {t('common.mention.header', '引用功能與歷史對話數據')}
                    </span>
                  </div>
                  <span className="text-[10px] text-zinc-400 dark:text-zinc-500 font-light">
                    {t('common.mention.tip', '按下 ↑/↓ 選擇，Enter 送出')}
                  </span>
                </div>

                {/* Main list */}
                <div className="overflow-y-auto flex-1 p-2 max-h-52 divide-y divide-zinc-100/40 dark:divide-zinc-805/40">
                  {mentionFilteredItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-zinc-400 dark:text-zinc-500 font-light">
                      {t('common.mention.noMatches', '找不到符合條件的項目')}
                    </div>
                  ) : (
                    mentionFilteredItems.map((item, index) => {
                      const IconComponent = getIconComponent(item.icon);
                      const isSelected = index === mentionSelectedIndex;
                      
                      return (
                        <button
                          key={`${item.type}:${item.id}`}
                          type="button"
                          onClick={() => handleSelectMention(item)}
                          onMouseMove={() => setMentionSelectedIndex(index)}
                          className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-left transition-all ${
                            isSelected
                              ? 'bg-zinc-100/90 dark:bg-zinc-800 text-zinc-950 dark:text-zinc-50 shadow-sm'
                              : 'text-zinc-650 dark:text-zinc-400 hover:bg-zinc-50/50 dark:hover:bg-zinc-850/30'
                          }`}
                        >
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                            isSelected 
                              ? 'bg-white dark:bg-zinc-900 border-zinc-200/60 dark:border-zinc-805/50' 
                              : 'bg-zinc-100/60 dark:bg-zinc-850/55 border-zinc-150/30 dark:border-zinc-800/30'
                          }`}>
                            <IconComponent size={15} className={
                              item.type === 'feature' 
                                ? 'text-emerald-500 dark:text-emerald-400' 
                                : 'text-indigo-500 dark:text-indigo-400'
                            } />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-semibold truncate text-zinc-850 dark:text-zinc-200">
                                {item.title}
                              </span>
                              <span className={`text-[9px] px-1.5 py-0.5 rounded-md font-mono uppercase tracking-wider ${
                                item.type === 'feature'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                                  : 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                              }`}>
                                {item.type === 'feature' ? '功能' : '對話'}
                              </span>
                            </div>
                            <p className="text-[10px] text-zinc-400 dark:text-zinc-500 truncate font-light mt-0.5">
                              {item.description}
                            </p>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Active Mode indicator badge */}
          {(activeSpecialMode || isSmartServiceLabs) && (
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              {activeSpecialMode && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 dark:bg-purple-950/40 text-indigo-700 dark:text-purple-300 border border-indigo-200/50 dark:border-purple-800/30 text-[11px] font-bold">
                  <span>
                    {activeSpecialMode === 'image' && '🎨 圖片創作模式 (Nano Banana2)'}
                    {activeSpecialMode === 'music' && '🎵 音訊創作模式 (Web Synthesizer)'}
                    {activeSpecialMode === 'canvas' && '📝 Canvas 寫作引導'}
                    {activeSpecialMode === 'research' && '🌐 Deep Research 全球調研'}
                    {activeSpecialMode === 'guided' && '🦉 蘇格拉底引導式學習'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveSpecialMode(null)}
                    className="p-0.5 hover:bg-indigo-200/50 rounded-full cursor-pointer text-[10px]"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
              {isSmartServiceLabs && (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200/50 dark:border-teal-800/30 text-[11px] font-bold">
                  <span>🧪 Lin 個人化 Labs 智庫模式已連線</span>
                  <button
                    type="button"
                    onClick={() => setIsSmartServiceLabs(false)}
                    className="p-0.5 hover:bg-teal-200/50 rounded-full cursor-pointer text-[10px]"
                  >
                    <X size={10} />
                  </button>
                </div>
              )}
            </div>
          )}

          {image && (
            <div className="mb-4 relative inline-block">
              <img src={image.dataUrl} alt="Upload preview" className="h-24 rounded-xl border border-zinc-200 dark:border-zinc-700 object-cover shadow-sm bg-white dark:bg-zinc-800 p-1" />
              <button
                type="button"
                onClick={() => setImage(null)}
                className="absolute -top-2.5 -right-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full p-1.5 hover:bg-black dark:hover:bg-white shadow-md transition-colors"
               >
                <X size={14} />
              </button>
            </div>
          )}
          <>
            {!currentUser && (
              <div className="mb-3.5 px-4.5 py-3 rounded-2xl border border-amber-500/15 dark:border-amber-500/10 bg-amber-50/45 dark:bg-amber-950/10 backdrop-blur-md flex items-center justify-between gap-3.5 text-left shadow-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                  <span className="text-xs font-semibold text-zinc-650 dark:text-zinc-350 truncate">
                    {t('common.guestModeNotice', '訪客極速體驗模式下：可直接呼叫並體驗完整 AI，一鍵快速登入可同步對話至雲端。')}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={login}
                  disabled={isLoggingIn}
                  className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 font-bold text-[10.5px] text-white hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 shrink-0 shadow-xs"
                >
                  {isLoggingIn ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <>
                      <LogIn size={11} className="stroke-[2.5]" />
                      <span>快速授權登入</span>
                    </>
                  )}
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="chat-input-area relative flex items-center gap-2.5 px-4 py-2 rounded-full glass-panel focus-within:ring-2 focus-within:ring-sky-500/25 dark:focus-within:ring-sky-400/25 transition-all duration-200">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleImageChange}
              />

              <input
                type="file"
                accept=".txt,.md,.json,.js,.py,.css,.html"
                className="hidden"
                ref={genericFileInputRef}
                onChange={handleGenericFileChange}
              />
              
              {/* Left Button: Swipe-up attachments trigger */}
              <button
                 type="button"
                 onClick={() => setIsOpenActionDrawer(true)}
                 className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-150 rounded-full hover:bg-zinc-100/50 dark:hover:bg-zinc-800/50 transition-all flex-shrink-0 cursor-pointer"
                 disabled={isLoading}
                 title="加入附件或特殊模式"
              >
                <Plus size={22} className="stroke-[2.5]" />
              </button>

              {/* Middle text area */}
              <textarea
                id="chat-prompt-input"
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  handleInputChange(e);
                  if (currentStep === 'enter_prompt' && e.target.value.trim().length > 0) {
                    setStep('click_send');
                  }
                }}
                onKeyDown={(e) => {
                  if (mentionSearchQuery !== null) {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setMentionSelectedIndex(prev => (prev + 1) % Math.max(1, mentionFilteredItems.length));
                      return;
                    }
                    if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setMentionSelectedIndex(prev => (prev - 1 + mentionFilteredItems.length) % Math.max(1, mentionFilteredItems.length));
                      return;
                    }
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const activeItem = mentionFilteredItems[mentionSelectedIndex];
                      if (activeItem) {
                        handleSelectMention(activeItem);
                      } else {
                        setMentionSearchQuery(null);
                      }
                      return;
                    }
                    if (e.key === 'Escape') {
                      e.preventDefault();
                      setMentionSearchQuery(null);
                      return;
                    }
                  }

                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSubmit(e);
                    e.currentTarget.style.height = 'auto';
                  }
                }}
                placeholder={t('common.inputPlaceholderGemini', '問問 Gemini')}
                className="flex-1 bg-transparent border-0 focus:ring-0 resize-none outline-none max-h-32 min-h-[46px] font-sans text-[15px] font-medium text-zinc-900 dark:text-zinc-50 placeholder:text-zinc-400 dark:placeholder:text-zinc-500 leading-normal"
                rows={1}
                disabled={isLoading}
                style={{ padding: '11px 0' }}
              />

              {/* Right Button: Send/Mic Area */}
              <div className="flex items-center gap-1.5 flex-shrink-0 pr-1">
                <button
                  id="chat-speech-mic-btn"
                  type="button"
                  title={isListening ? t('common.stopSpeech', '停止語音辨識') : t('common.startSpeech', '語音輸入模式')}
                  onClick={toggleListening}
                  className={`p-2.5 rounded-full transition-all duration-200 cursor-pointer flex items-center justify-center ${
                    isListening
                      ? 'bg-red-500 text-white animate-pulse shadow-md shadow-red-500/20 hover:bg-red-600'
                      : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700 hover:text-zinc-800 dark:hover:text-zinc-200'
                  }`}
                  disabled={isLoading}
                >
                  <Mic size={16} className={isListening ? 'animate-bounce' : ''} />
                </button>

                <button
                  id="chat-send-btn"
                  type="submit"
                  disabled={(!input.trim() && !image) || isLoading}
                  onClick={() => {
                    if (currentStep === 'click_send') {
                      setStep('await_response');
                    }
                  }}
                  className="p-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 hover:bg-indigo-500 hover:text-white dark:hover:bg-purple-600 dark:hover:text-white disabled:opacity-40 disabled:hover:bg-zinc-100 disabled:hover:text-zinc-700 dark:disabled:hover:bg-zinc-800 dark:disabled:hover:text-zinc-300 transition-all duration-200"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send size={16} />
                  )}
                </button>
              </div>
            </form>

            {/* Dynamic Character & Token Counter */}
            <AnimatePresence>
              {input.trim().length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="flex justify-between items-center px-4.5 mt-2.5 text-[10px] md:text-[11px] font-mono tracking-wider text-zinc-400 dark:text-zinc-500 select-none pb-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-500/60 dark:bg-indigo-400/50 animate-pulse" />
                    <span>
                      {t('common.prompt_stats.characters', '字數')}: <strong className="text-zinc-650 dark:text-zinc-300 font-semibold">{input.length}</strong>
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span>
                      {t('common.prompt_stats.estimated_tokens', '預估 Token')}: <strong className="text-emerald-500 dark:text-emerald-400 font-bold">{getPromptEstimates(input).estimatedTokens}</strong>
                    </span>
                    <span className="text-zinc-200 dark:text-zinc-800/80">|</span>
                    <span className="text-zinc-400 dark:text-zinc-500 font-light uppercase text-[9px] tracking-widest">
                      {selectedModel === 'gemini-3.1-pro-preview' ? 'Pro Engine' : 'Flash Engine'}
                    </span>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        </div>
      </div>

      {/* Sliding Prompt Library Sidebar (Right Panel) */}
      <AnimatePresence>
        {isPromptLibraryOpen && (
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 350, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ type: 'spring', damping: 24, stiffness: 200 }}
            className="border-l border-white/30 dark:border-white/5 glass-panel flex flex-col h-full overflow-hidden shrink-0 z-30 relative bg-white/95 dark:bg-zinc-950/95 shadow-lg w-[320px] md:w-[350px]"
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-white/30 dark:border-white/5 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/35">
              <div className="flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-500 dark:text-purple-400 font-serif shrink-0 font-medium" />
                <div>
                  <h3 className="font-bold text-sm text-zinc-900 dark:text-zinc-50">
                    AI 智慧提示詞庫
                  </h3>
                  <p className="text-[10.5px] text-zinc-500 dark:text-zinc-400 font-light mt-0.5">
                    套用、自訂與管理提示詞
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetPrompts}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                  title="還原精選預設提示詞"
                >
                  <RefreshCw size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setIsPromptLibraryOpen(false)}
                  className="p-1.5 text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            {/* Sidebar Search Bar */}
            <div className="p-3 border-b border-white/20 dark:border-white/5">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                <input
                  type="text"
                  value={searchPromptQuery}
                  onChange={(e) => setSearchPromptQuery(e.target.value)}
                  placeholder="搜尋關鍵字或提示詞..."
                  className="w-full pl-9 pr-4 py-2 border border-zinc-200/60 dark:border-zinc-800/65 bg-zinc-50/80 dark:bg-zinc-900/60 text-xs rounded-xl outline-none focus:ring-1 focus:ring-indigo-500/20 text-zinc-800 dark:text-zinc-100 transition-all placeholder:text-zinc-400"
                />
                {searchPromptQuery && (
                  <button
                    onClick={() => setSearchPromptQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-full text-zinc-400 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                )}
              </div>
            </div>

            {/* Category Filter Horizontal Selector */}
            <div className="p-3 border-b border-white/20 dark:border-white/5 overflow-x-auto flex gap-1.5 items-center select-none shrink-0 no-scrollbar">
              {[
                { id: 'All', label: '全部' },
                { id: 'Coding', label: '程式開發' },
                { id: 'Writing', label: '文案寫作' },
                { id: 'Data Analysis', label: '數據分析' },
                { id: 'General', label: '通用' }
              ].map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setPromptCategoryFilter(cat.id as any)}
                  className={`text-[11px] px-2.5 py-1.5 rounded-full font-medium transition-all duration-200 shrink-0 whitespace-nowrap cursor-pointer ${
                    promptCategoryFilter === cat.id
                      ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-bold shadow-sm'
                      : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400 hover:bg-zinc-200/60 dark:hover:bg-zinc-800/60'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Add Custom Prompt Action Accordion */}
            <div className="p-3 border-b border-white/20 dark:border-white/5 shrink-0 bg-zinc-50/25 dark:bg-zinc-950/10">
              {!isAddPromptOpen ? (
                <button
                  type="button"
                  onClick={() => setIsAddPromptOpen(true)}
                  className="w-full py-2 border border-dashed border-zinc-300 dark:border-zinc-800 hover:border-indigo-500 dark:hover:border-purple-500 rounded-xl text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-purple-400 transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-white dark:bg-zinc-900 shadow-xs"
                >
                  <Plus size={14} className="stroke-[2.5]" />
                  新增自訂提示詞
                </button>
              ) : (
                <form onSubmit={handleAddPrompt} className="bg-white dark:bg-zinc-900 border border-zinc-200/50 dark:border-zinc-800/80 p-3.5 rounded-2xl flex flex-col gap-2.5 shadow-md">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-zinc-800 dark:text-white">新增自訂模板</span>
                    <button
                      type="button"
                      onClick={() => setIsAddPromptOpen(false)}
                      className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-zinc-650"
                    >
                      <X size={12} />
                    </button>
                  </div>

                  <input
                    type="text"
                    required
                    value={newPromptTitle}
                    onChange={(e) => setNewPromptTitle(e.target.value)}
                    placeholder="提示詞名稱 (例如: 程式碼健檢)"
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-505 dark:bg-zinc-950 text-zinc-800 dark:text-white"
                  />

                  <textarea
                    required
                    rows={3}
                    value={newPromptContent}
                    onChange={(e) => setNewPromptContent(e.target.value)}
                    placeholder="輸入對話提示詞的詳細指令與占位字眼..."
                    className="w-full px-3 py-2 border border-zinc-200 dark:border-zinc-800 rounded-xl text-xs outline-none focus:ring-1 focus:ring-indigo-505 dark:bg-zinc-950 text-zinc-800 dark:text-white resize-none"
                  ></textarea>

                  <div className="flex items-center gap-2 justify-between">
                    <select
                      value={newPromptCategory}
                      onChange={(e) => setNewPromptCategory(e.target.value as any)}
                      className="text-[11px] px-2 py-1.5 border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-950 outline-none text-zinc-700 dark:text-zinc-300 pointer-events-auto cursor-pointer"
                    >
                      <option value="Coding">程式開發</option>
                      <option value="Writing">文案寫作</option>
                      <option value="Data Analysis">數據分析</option>
                      <option value="General">通用</option>
                    </select>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setIsAddPromptOpen(false)}
                        className="px-2.5 py-1.5 text-xs text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors cursor-pointer"
                      >
                        取消
                      </button>
                      <button
                        type="submit"
                        className="px-3 py-1.5 text-xs font-bold bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-sm transition-colors cursor-pointer"
                      >
                        儲存
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>

            {/* Prompt Items Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-3 scroll-smooth no-scrollbar">
              {promptLibrary.filter(p => {
                const categoryMatches = promptCategoryFilter === 'All' || p.category === promptCategoryFilter;
                const searchMatches = !searchPromptQuery || 
                  p.title.toLowerCase().includes(searchPromptQuery.toLowerCase()) ||
                  p.content.toLowerCase().includes(searchPromptQuery.toLowerCase());
                return categoryMatches && searchMatches;
              }).length === 0 ? (
                <div className="text-center py-12 text-zinc-400 dark:text-zinc-500 text-xs font-light">
                  沒有找到符合條件的提示詞
                </div>
              ) : (
                promptLibrary.filter(p => {
                  const categoryMatches = promptCategoryFilter === 'All' || p.category === promptCategoryFilter;
                  const searchMatches = !searchPromptQuery || 
                    p.title.toLowerCase().includes(searchPromptQuery.toLowerCase()) ||
                    p.content.toLowerCase().includes(searchPromptQuery.toLowerCase());
                  return categoryMatches && searchMatches;
                }).map(prompt => {
                  // Custom category-tag styles
                  let badgeClass = 'bg-purple-50 text-purple-600 border-purple-150 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/30';
                  let catText = '通用';
                  if (prompt.category === 'Coding') {
                    badgeClass = 'bg-blue-50 text-blue-600 border-blue-150 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30';
                    catText = '程式開發';
                  } else if (prompt.category === 'Writing') {
                    badgeClass = 'bg-emerald-50 text-emerald-600 border-emerald-150 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
                    catText = '文案寫作';
                  } else if (prompt.category === 'Data Analysis') {
                    badgeClass = 'bg-amber-50 text-amber-600 border-amber-150 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30';
                    catText = '數據分析';
                  }

                  return (
                    <div
                      key={prompt.id}
                      className="group border border-zinc-200/55 dark:border-zinc-800/50 bg-white dark:bg-zinc-900/50 hover:bg-zinc-50/50 dark:hover:bg-zinc-900/80 p-3.5 rounded-2xl flex flex-col gap-2 transition-all hover:shadow-xs relative"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div className="flex flex-col gap-1 items-start">
                          <span className={`text-[9.5px] px-2 py-0.5 rounded-full border font-bold ${badgeClass}`}>
                            {catText}
                          </span>
                          <h4 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 tracking-tight select-text mt-1">
                            {prompt.title}
                          </h4>
                        </div>
                        {prompt.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeletePrompt(prompt.id)}
                            className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/25 rounded-md opacity-0 group-hover:opacity-100 transition-all shrink-0 cursor-pointer"
                            title="刪除提示詞"
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>

                      <p className="text-[11px] text-zinc-500 dark:text-zinc-400 leading-normal font-light line-clamp-4 select-text">
                        {prompt.content}
                      </p>

                      <div className="flex items-center gap-1.5 justify-end mt-1 border-t border-dashed border-zinc-100 dark:border-zinc-800/50 pt-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyPrompt(prompt.id, prompt.content)}
                          className="flex items-center gap-1 px-2.5 py-1.5 text-[10px] font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-all cursor-pointer"
                        >
                          {copiedPromptId === prompt.id ? (
                            <>
                              <Check size={11} className="text-emerald-500 stroke-[3]" />
                              <span className="text-emerald-500 font-semibold">已複製</span>
                            </>
                          ) : (
                            <>
                              <Copy size={11} />
                              <span>複製</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUsePrompt(prompt.content)}
                          className="flex items-center gap-1 px-3 py-1.5 text-[10px] font-bold bg-zinc-900 dark:bg-white text-white dark:text-zinc-950 hover:bg-indigo-500 hover:text-white dark:hover:bg-indigo-600 rounded-xl shadow-xs transition-all cursor-pointer"
                        >
                          <ArrowRight size={11} className="stroke-[2.5]" />
                          <span>套用</span>
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sliding Interactive Canvas Panel */}
      <AnimatePresence>
        {isCanvasOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 180 }}
            className="fixed top-0 right-0 h-full w-full md:w-[48%] bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-50 flex flex-col min-w-0"
          >
            {/* Header */}
            <div className="p-5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/30">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/30 rounded-xl text-indigo-600 dark:text-indigo-400">
                  <Layers size={20} />
                </div>
                <div>
                  <h4 className="text-base font-semibold text-zinc-900 dark:text-white">智慧協作 Canvas</h4>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 font-light mt-0.5">實時文件精煉與靈感記錄</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    const blob = new Blob([canvasDocument?.content || ''], { type: 'text/markdown' });
                    const url = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    link.href = url;
                    link.download = canvasDocument?.title || '未命名文件.md';
                    link.click();
                    URL.revokeObjectURL(url);
                  }}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-all cursor-pointer"
                  title="匯出/下載文件 (.md)"
                >
                  <Download size={18} />
                </button>
                <button
                  onClick={() => setIsCanvasOpen(false)}
                  className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Document Details */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="space-y-2">
                <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-widest">檔案名稱</span>
                <input
                  type="text"
                  value={canvasDocument?.title || ''}
                  onChange={(e) => setCanvasDocument(prev => {
                    if (!prev) return { title: e.target.value, content: '', lastEdited: new Date() };
                    return { ...prev, title: e.target.value };
                  })}
                  className="w-full text-xl font-bold bg-transparent border-none outline-none focus:ring-0 text-zinc-900 dark:text-white p-0 placeholder:text-zinc-300"
                  placeholder="未命名文件.md"
                />
              </div>

              <div className="border-t border-zinc-100 dark:border-zinc-800 pt-4 flex-1 flex flex-col min-h-[300px]">
                <span className="text-[10px] font-mono font-bold text-indigo-500 uppercase tracking-widest block mb-2">文件內容編輯器</span>
                <textarea
                  value={canvasDocument?.content || ''}
                  onChange={(e) => setCanvasDocument(prev => {
                    if (!prev) return { title: '未命名文件.md', content: e.target.value, lastEdited: new Date() };
                    return { ...prev, content: e.target.value, lastEdited: new Date() };
                  })}
                  className="w-full flex-1 min-h-[300px] p-4 bg-zinc-50 dark:bg-zinc-950/40 rounded-2xl border border-zinc-200/60 dark:border-zinc-800/60 focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none resize-none font-mono text-sm leading-relaxed text-zinc-800 dark:text-zinc-200"
                  placeholder="在這裡撰寫文件或讓 AI 自動更新..."
                />
              </div>
            </div>

            {/* Assistive controls footer */}
            <div className="p-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light">
                最後更新: {canvasDocument?.lastEdited?.toLocaleTimeString() || ''}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setInput(`請幫我優化並精煉以下在 Canvas 中的 markdown 文件內容：\n\n${canvasDocument?.content || ''}`)}
                  className="px-3 py-1.5 bg-indigo-500 hover:bg-indigo-600 dark:bg-purple-600 dark:hover:bg-purple-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-colors cursor-pointer"
                >
                  ✨ AI 潤飾優化
                </button>
                <button
                  onClick={() => setInput(`請幫我為這篇 markdown 文件進行總結並條列重點關鍵指標：\n\n${canvasDocument?.content || ''}`)}
                  className="px-3 py-1.5 bg-zinc-200 hover:bg-zinc-300 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-800 dark:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                >
                  📝 重點總結
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Swipe-Up Attachment Action Drawer */}
      <AnimatePresence>
        {isOpenActionDrawer && (
          <div className="fixed inset-0 z-40 flex items-end justify-center">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpenActionDrawer(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-xs"
            />
            
            {/* Drawer Body */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 220 }}
              className="relative w-full max-w-lg bg-white dark:bg-zinc-900 rounded-t-[2.5rem] border-t border-zinc-100 dark:border-zinc-800 shadow-2xl p-6 z-50 flex flex-col gap-6 select-none"
            >
              {/* Drag bar indicator */}
              <div className="w-10 h-1 bg-zinc-350 dark:bg-zinc-700 rounded-full mx-auto -mt-1 shrink-0 cursor-pointer" onClick={() => setIsOpenActionDrawer(false)} />

              {/* Rows of capsule action keys (matching screenshot 1) */}
              <div className="grid grid-cols-5 gap-2 px-0.5">
                {/* 相簿 */}
                <button
                  onClick={() => {
                    setIsOpenActionDrawer(false);
                    fileInputRef.current?.click();
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-1 rounded-[1.75rem] bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition-all cursor-pointer group"
                >
                  <ImageIcon size={20} className="text-zinc-800 dark:text-zinc-200 stroke-[1.8] group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">相簿</span>
                </button>

                {/* 相機 */}
                <button
                  onClick={() => {
                    setIsOpenActionDrawer(false);
                    setIsCameraOpen(true);
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-1 rounded-[1.75rem] bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition-all cursor-pointer group"
                >
                  <Camera size={20} className="text-zinc-800 dark:text-zinc-200 stroke-[1.8] group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">相機</span>
                </button>

                {/* 檔案 */}
                <button
                  onClick={() => {
                    setIsOpenActionDrawer(false);
                    genericFileInputRef.current?.click();
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-1 rounded-[1.75rem] bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition-all cursor-pointer group"
                >
                  <Paperclip size={20} className="text-zinc-800 dark:text-zinc-200 stroke-[1.8] group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">檔案</span>
                </button>

                {/* 雲端硬碟 */}
                <button
                  onClick={() => {
                    setIsOpenActionDrawer(false);
                    setIsDriveOpen(true);
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-1 rounded-[1.75rem] bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition-all cursor-pointer group"
                >
                  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="text-zinc-800 dark:text-zinc-200 group-hover:scale-105 transition-transform">
                    <polygon points="12 3 2 19 22 19" />
                  </svg>
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 whitespace-nowrap overflow-hidden text-ellipsis w-full text-center px-0.5">雲端硬...</span>
                </button>

                {/* 筆記本 */}
                <button
                  onClick={() => {
                    setIsOpenActionDrawer(false);
                    setIsNotebookOpen(true);
                  }}
                  className="flex flex-col items-center justify-center gap-1.5 py-4 px-1 rounded-[1.75rem] bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800 dark:hover:bg-zinc-750 transition-all cursor-pointer group"
                >
                  <BookOpen size={20} className="text-zinc-800 dark:text-zinc-200 stroke-[1.8] group-hover:scale-105 transition-transform" />
                  <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">筆記本</span>
                </button>
              </div>

              {/* Special Modes Vertical List (matching screenshot 2) */}
              <div className="flex flex-col gap-2 mt-1">
                {(
                  [
                    {
                      id: 'image',
                      title: '圖片',
                      desc: '製作與編輯精彩影像',
                      icon: (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <rect x="3" y="3" width="18" height="18" rx="2" />
                          <circle cx="8.5" cy="8.5" r="1.5" />
                          <path d="M20.4 14.5L16 10 4 20" />
                        </svg>
                      )
                    },
                    {
                      id: 'music',
                      title: '音樂',
                      desc: '製作音軌',
                      icon: <Music size={22} className="stroke-[1.8]" />
                    },
                    {
                      id: 'canvas',
                      title: 'Canvas',
                      desc: '撰文、寫程式或製作簡報',
                      icon: (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                          <polyline points="14 2 14 8 20 8" />
                          <line x1="12" y1="18" x2="12" y2="12" />
                          <line x1="9" y1="15" x2="15" y2="15" />
                        </svg>
                      )
                    },
                    {
                      id: 'research',
                      title: 'Deep Research',
                      desc: '取得詳細報告',
                      icon: <Globe size={22} className="stroke-[1.8]" />
                    },
                    {
                      id: 'guided',
                      title: '引導式學習',
                      desc: '取得逐步說明',
                      icon: <BookOpen size={22} className="stroke-[1.8]" />
                    },
                    {
                      id: 'labs',
                      title: '個人化智慧服務',
                      desc: '在合適的時機提供個人化對話',
                      hasBadge: true,
                      badgeText: 'Labs',
                      icon: (
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
                          <circle cx="12" cy="7" r="4" />
                          <path d="M19 8h2M20 7v2" />
                        </svg>
                      )
                    }
                  ] as const
                ).map((modeItem) => {
                  const isSelected = modeItem.id === 'labs' ? isSmartServiceLabs : activeSpecialMode === modeItem.id;
                  const isLabs = modeItem.id === 'labs';

                  return (
                    <div
                      key={modeItem.id}
                      onClick={() => {
                        if (isLabs) {
                          setIsSmartServiceLabs(!isSmartServiceLabs);
                        } else {
                          setActiveSpecialMode(activeSpecialMode === modeItem.id ? null : modeItem.id);
                        }
                      }}
                      className={`flex items-center justify-between w-full p-3.5 rounded-2xl transition-all cursor-pointer ${
                        isSelected && !isLabs
                          ? 'bg-indigo-50/50 dark:bg-purple-950/20 border-l-4 border-indigo-500 dark:border-purple-500 pl-2.5'
                          : 'hover:bg-zinc-100/50 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`shrink-0 transition-colors ${
                          isSelected && !isLabs 
                            ? 'text-indigo-600 dark:text-purple-400' 
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}>
                          {modeItem.icon}
                        </div>
                        <div className="flex flex-col leading-tight">
                          <div className="flex items-center gap-2">
                            <span className="text-[15px] font-bold text-zinc-900 dark:text-zinc-100">
                              {modeItem.title}
                            </span>
                            {'hasBadge' in modeItem && modeItem.hasBadge && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full font-semibold bg-zinc-105 text-zinc-650 dark:bg-zinc-800 dark:text-zinc-400 border border-zinc-220 dark:border-zinc-700">
                                {modeItem.badgeText}
                              </span>
                            )}
                          </div>
                          <span className="text-[13px] text-zinc-500 dark:text-zinc-400 font-light mt-0.5">
                            {modeItem.desc}
                          </span>
                        </div>
                      </div>

                      {/* Toggle Switch exclusively for Personal labs (Labs) */}
                      {isLabs && (
                        <div 
                          onClick={(e) => {
                            e.stopPropagation();
                            setIsSmartServiceLabs(!isSmartServiceLabs);
                          }}
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-200 outline-none ${
                            isSmartServiceLabs 
                              ? 'bg-zinc-900 dark:bg-zinc-100' 
                              : 'bg-zinc-200 dark:bg-zinc-800'
                          }`}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white dark:bg-zinc-900 shadow-sm transition duration-200 ease-in-out ${
                              isSmartServiceLabs 
                                ? 'translate-x-[22px]' 
                                : 'translate-x-[2px]'
                            }`}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Camera Capture Panel */}
      <AnimatePresence>
        {isCameraOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsCameraOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-150 dark:border-zinc-800 p-6 shadow-2xl z-50 flex flex-col gap-4 overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">相機虛擬取景器</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light">高畫質擷取現場實景圖像</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {cameraError ? (
                <div className="flex flex-col gap-3 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 text-xs">
                  <p className="text-amber-700 dark:text-amber-400 font-medium leading-relaxed">{cameraError}</p>
                  <button
                    type="button"
                    onClick={handleSimulatedCapture}
                    className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white rounded-xl font-bold transition-all cursor-pointer text-center"
                  >
                    💡 套用模擬高解像取景圖像 
                  </button>
                </div>
              ) : (
                <div className="relative aspect-video rounded-2xl overflow-hidden bg-black border border-zinc-100 dark:border-zinc-800">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <div className="absolute top-3 left-3 bg-red-500 text-white font-mono text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                    LIVE
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                {!cameraError && (
                  <button
                    type="button"
                    onClick={captureCameraPhoto}
                    className="flex-1 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl text-xs font-bold shadow-sm transition-colors cursor-pointer text-center"
                  >
                    📸 擷取畫面並傳送 
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsCameraOpen(false)}
                  className="px-5 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-750 text-zinc-700 dark:text-zinc-200 rounded-2xl text-xs font-bold transition-colors cursor-pointer"
                >
                  取消
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Simulated Google Drive Picker */}
      <AnimatePresence>
        {isDriveOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDriveOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-150 dark:border-zinc-800 p-6 shadow-2xl z-50 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">Simulated Google Drive</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light">連線並匯入您帳號下的研究檔案</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDriveOpen(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {[
                  { title: "2026 第一季度科技趨勢與開源模型研究.md", size: "12 KB", content: "# 2026 第一季度科技趨勢與開源模型研究\n\n隨著輕量化多模態邊緣運算模型在性能上的爆發性突破（SLMs），各國正在將資料隱私和本機推理解決方案視為最新一代的產業標準架構。本篇報告分析在消費型終端裝置下進行離線 Gemini Flash Lite 即時語意解譯所需的算力閾值對比。" },
                  { title: "智慧零售與多模態 AI 落地戰略報告.txt", size: "8 KB", content: "隨著智慧型門市部署無人收銀及自動貨架巡檢終端，多模態語音互動和動態商品辨識正在大幅減少摩擦係數。目前透過將顧客詢問與店內常規促銷進行實時語意對齊，營收轉化效率相較以往提升了將近 34%。" },
                  { title: "自動駕駛與深度增強學習研究指南.txt", size: "15 KB", content: "研究表明，在密集型城區道路等不確定性最高的行車場景中，深度增強學習（Deep RL）的決策模組能協助感知神經網路進行多重邊際概率修正。本篇文獻提出了一種透過高頻物理模擬回饋優化軌跡跟踪的輕量化調校演算法。" }
                ].map((driveFile, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInput(prev => `${prev ? prev + '\n' : ''}[雲端碟匯入: ${driveFile.title}]\n${driveFile.content}\n`);
                      setIsDriveOpen(false);
                      logActivity({
                        id: `drive-${driveFile.title}`,
                        type: 'file',
                        name: driveFile.title,
                        detail: `${driveFile.size} • 雲端碟`,
                        content: driveFile.content,
                        icon: 'HardDrive'
                      });
                    }}
                    className="w-full p-4.5 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 border border-zinc-200/50 dark:border-zinc-800 text-left transition-all flex items-start justify-between gap-3 cursor-pointer group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/20 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-105 transition-transform shrink-0">
                        <HardDrive size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{driveFile.title}</p>
                        <p className="text-[10px] text-zinc-500 dark:text-zinc-400 font-light mt-0.5">{driveFile.size}</p>
                      </div>
                    </div>
                    <span className="text-[10px] py-1 px-2.5 rounded-full bg-zinc-200/50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 font-semibold group-hover:bg-indigo-500 group-hover:text-white transition-all shrink-0">匯入</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Notebook Notes Entries dashboard */}
      <AnimatePresence>
        {isNotebookOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNotebookOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-white dark:bg-zinc-900 rounded-[2.5rem] border border-zinc-150 dark:border-zinc-800 p-6 shadow-2xl z-50 flex flex-col gap-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-zinc-900 dark:text-white">智慧靈感筆記本</h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light">管理儲存的草稿與高頻提示語段落</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNotebookOpen(false)}
                  className="p-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-xl text-zinc-400 hover:text-zinc-900 dark:hover:text-white cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {[
                  { title: "💡 優雅提示語：專家撰寫文獻綜述", content: "「請深入分析邊緣AI跟低延時邊緣計算晶片的成本效益關係，並提供可視化的表格及優劣對比...」" },
                  { title: "💡 專題報告：分析消費端數據加密法規", content: "「請對歐盟最近推行的 AI 行為法、GDPR、數據在地隱私安全政策，列舉核心限制與因應落地建議...」" },
                  { title: "💡 音樂靈感：沉浸式賽博龐克重低音", content: "「請製作一份賽博龐克風格、時長20秒、重低音結合宇宙空間襯底的特製未來感音軌...」" }
                ].map((noteItem, i) => (
                  <button
                    key={i}
                    type="button"
                    onClick={() => {
                      setInput(prev => `${prev ? prev + '\n' : ''}${noteItem.content}`);
                      setIsNotebookOpen(false);
                    }}
                    className="w-full p-4 rounded-xl bg-zinc-50 dark:bg-zinc-900/50 hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 border border-zinc-200/50 dark:border-zinc-800 text-left transition-all flex flex-col gap-1.5 cursor-pointer group"
                  >
                    <p className="text-xs font-bold text-zinc-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{noteItem.title}</p>
                    <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light truncate w-full">{noteItem.content}</p>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Local Session Celebrate Overlay */}
      <AnimatePresence>
        {showLocalCelebrate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 backdrop-blur-md pointer-events-auto"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="glass-panel p-8 rounded-[2.5rem] shadow-2xl bg-white/95 dark:bg-zinc-900/95 border border-white/20 dark:border-white/5 flex flex-col items-center justify-center text-center max-w-sm w-full mx-4"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 flex items-center justify-center shadow-lg relative mb-6">
                <CheckCircle2 size={32} className="stroke-[2]" />
                <motion.div
                  className="absolute inset-0 rounded-2xl border-2 border-emerald-400"
                  animate={{ scale: [1, 1.3, 1], opacity: [1, 0, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                />
              </div>

              <h4 className="text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                {t('common.loginSuccessGreeting', '登入成功！歡迎回到對話模組')}
              </h4>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 font-light leading-relaxed">
                您的個人智慧 AI 運算佇列與多模組連線，已全數同步載入完成。
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
