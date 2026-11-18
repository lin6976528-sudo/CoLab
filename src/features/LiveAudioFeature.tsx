import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { Headphones, Mic, MicOff, Loader2, AlertCircle, Sparkles, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import LoadingAnimation from '../components/LoadingAnimation';
import { useSubscription } from '../contexts/SubscriptionContext';
import { parseAIError, ParsedError } from '../utils/errorHandling';
import ErrorMessage from '../components/ErrorMessage';
import FeatureTutorial from '../components/FeatureTutorial';
import RatingFeedback from '../components/RatingFeedback';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

interface LiveAudioFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function LiveAudioFeature({
  modelName,
  title,
  description,
}: LiveAudioFeatureProps) {
  const { t } = useTranslation();
  const { incrementUsage, checkAccess } = useSubscription();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<ParsedError | null>(null);
  const [logs, setLogs] = useState<{ type: 'user' | 'ai' | 'system'; text: string }[]>([]);
  
  const sessionRef = useRef<any>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const addLog = (type: 'user' | 'ai' | 'system', text: string) => {
    setLogs((prev) => [...prev, { type, text }]);
  };

  const clearLogs = () => {
    if (window.confirm(t('common.liveAudio.confirmClear'))) {
      setLogs([]);
    }
  };

  const connect = async () => {
    if (!checkAccess('live-audio')) {
      setError(parseAIError(new Error("Usage limit reached for live audio. Please upgrade your subscription."), t));
      return;
    }

    setIsConnecting(true);
    setError(null);
    setLogs([]);

    try {
      // Setup audio context for playback
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 24000,
      });

      // Request microphone access
      mediaStreamRef.current = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      });

      addLog('system', t('common.liveAudio.micConnected'));

      const sessionPromise = ai.live.connect({
        model: modelName,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: 'Zephyr' },
            },
          },
          systemInstruction: 'You are a helpful and concise voice assistant.',
        },
        callbacks: {
          onopen: () => {
            setIsConnected(true);
            setIsConnecting(false);
            incrementUsage('live-audio');
            addLog('system', t('common.liveAudio.connected'));

            // Setup audio capture
            if (audioContextRef.current && mediaStreamRef.current) {
              const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)({
                sampleRate: 16000,
              });
              
              sourceRef.current = audioCtx.createMediaStreamSource(mediaStreamRef.current);
              processorRef.current = audioCtx.createScriptProcessor(4096, 1, 1);

              processorRef.current.onaudioprocess = (e) => {
                const inputData = e.inputBuffer.getChannelData(0);
                // Convert float32 to int16
                const pcmData = new Int16Array(inputData.length);
                for (let i = 0; i < inputData.length; i++) {
                  pcmData[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF;
                }

                // Convert to base64
                const buffer = new ArrayBuffer(pcmData.length * 2);
                const view = new DataView(buffer);
                for (let i = 0; i < pcmData.length; i++) {
                  view.setInt16(i * 2, pcmData[i], true); // true for little-endian
                }
                
                let binary = '';
                const bytes = new Uint8Array(buffer);
                for (let i = 0; i < bytes.byteLength; i++) {
                  binary += String.fromCharCode(bytes[i]);
                }
                const base64Data = window.btoa(binary);

                sessionPromise.then((session) => {
                  session.sendRealtimeInput({
                    media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' },
                  });
                });
              };

              sourceRef.current.connect(processorRef.current);
              processorRef.current.connect(audioCtx.destination);
            }
          },
          onmessage: async (message: LiveServerMessage) => {
            const base64Audio = message.serverContent?.modelTurn?.parts[0]?.inlineData?.data;
            if (base64Audio && audioContextRef.current) {
              // Decode base64 to binary
              const binaryString = window.atob(base64Audio);
              const len = binaryString.length;
              const bytes = new Uint8Array(len);
              for (let i = 0; i < len; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }

              // Convert to Int16Array (PCM 16-bit)
              const int16Array = new Int16Array(bytes.buffer);
              
              // Convert to Float32Array for AudioBuffer
              const float32Array = new Float32Array(int16Array.length);
              for (let i = 0; i < int16Array.length; i++) {
                float32Array[i] = int16Array[i] / 0x8000;
              }

              const audioBuffer = audioContextRef.current.createBuffer(1, float32Array.length, 24000);
              audioBuffer.getChannelData(0).set(float32Array);

              const source = audioContextRef.current.createBufferSource();
              source.buffer = audioBuffer;
              source.connect(audioContextRef.current.destination);
              source.start();
            }

            if (message.serverContent?.interrupted) {
              addLog('system', t('common.liveAudio.aiInterrupted'));
            }
          },
          onerror: (err) => {
            console.error('Live API Error:', err);
            setError(parseAIError(err, t));
            disconnect();
          },
          onclose: () => {
            addLog('system', t('common.liveAudio.connectionClosed'));
            disconnect();
          },
        },
      });

      sessionRef.current = await sessionPromise;

    } catch (err: any) {
      console.error('Live API Setup Error:', err);
      setError(parseAIError(err, t));
      setIsConnecting(false);
      disconnect();
    }
  };

  const disconnect = () => {
    if (sessionRef.current) {
      try {
        sessionRef.current.close();
      } catch (e) {
        console.error('Error closing session', e);
      }
      sessionRef.current = null;
    }

    if (processorRef.current && sourceRef.current) {
      sourceRef.current.disconnect();
      processorRef.current.disconnect();
      processorRef.current = null;
      sourceRef.current = null;
    }

    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach(track => track.stop());
      mediaStreamRef.current = null;
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }

    setIsConnected(false);
    setIsConnecting(false);
  };

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, []);

  const tutorialSteps = [
    {
      target: '.live-audio-connect',
      content: t('tutorial.liveAudio.connect', 'Click here to connect and start a live audio session.'),
      disableBeacon: true,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="live-audio" steps={tutorialSteps} />
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight">{title}</h2>
            {logs.length > 0 && (
              <button
                onClick={clearLogs}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title={t('common.liveAudio.clearLogs')}
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <p className="text-sm text-zinc-500 font-light tracking-wide">{description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-10 bg-transparent">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 lg:gap-12">
          <div className="w-full md:w-1/3 space-y-6">
          <div className="p-4 glass-panel border-blue-200/50 rounded-2xl text-sm text-blue-800 flex flex-col gap-3 shadow-sm font-light">
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              <p>{t('common.liveAudio.micPermissionNote')}</p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/40 rounded-3xl glass-panel shadow-sm transition-all duration-300 hover:border-white/60">
            <button
              onClick={isConnected ? disconnect : connect}
              disabled={isConnecting}
              className={`live-audio-connect w-24 h-24 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                isConnected 
                  ? 'bg-red-500/80 backdrop-blur-md text-white hover:bg-red-600/80 animate-pulse ring-4 ring-red-500/20' 
                  : isConnecting
                  ? 'bg-white/40 backdrop-blur-md text-white cursor-not-allowed'
                  : 'bg-black/80 backdrop-blur-md text-white hover:bg-black hover:scale-105 active:scale-95 ring-4 ring-black/10'
              }`}
            >
              {isConnecting ? (
                <LoadingAnimation text="" />
              ) : isConnected ? (
                <MicOff size={32} />
              ) : (
                <Mic size={32} />
              )}
            </button>
            <p className="mt-6 font-medium text-zinc-700 tracking-wide">
              {isConnecting ? t('common.liveAudio.connecting') : isConnected ? t('common.liveAudio.connectedSpeak') : t('common.liveAudio.clickToConnect')}
            </p>
            {isConnected && (
              <p className="text-sm text-zinc-500 mt-1 font-light">{t('common.liveAudio.clickToDisconnect')}</p>
            )}
          </div>

          {error && (
            <ErrorMessage error={error} />
          )}
        </div>

        <div className="flex-1 flex flex-col glass-panel rounded-3xl overflow-hidden min-h-[500px] shadow-sm">
          <div className="p-6 border-b border-white/20 bg-white/10 backdrop-blur-sm">
            <h3 className="font-medium text-zinc-800 tracking-wide">{t('common.liveAudio.conversationHistory')}</h3>
          </div>
          <div className="flex-1 p-6 md:p-8 overflow-y-auto space-y-4 bg-transparent">
            {logs.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 text-center p-8">
                <div className="w-20 h-20 rounded-full glass-panel shadow-sm flex items-center justify-center">
                  <Headphones size={28} className="text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-600 tracking-wide">{t('common.liveAudio.noConversation')}</p>
                  <p className="text-sm mt-1 font-light text-zinc-400">{t('common.liveAudio.connectToStart')}</p>
                </div>
              </div>
            ) : (
              logs.map((log, index) => (
                <div key={index} className={`flex flex-col ${log.type === 'user' ? 'items-end' : log.type === 'ai' ? 'items-start' : 'items-center'} w-full`}>
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-4 rounded-2xl text-sm md:text-base shadow-sm font-light ${
                      log.type === 'system' 
                        ? 'glass-panel bg-blue-50/30 text-blue-800 border-blue-200/50 mx-auto text-center' 
                        : log.type === 'user'
                        ? 'bg-black/80 backdrop-blur-md text-white max-w-[80%] rounded-tr-sm'
                        : 'glass-panel text-zinc-800 max-w-[80%] rounded-tl-sm'
                    }`}
                  >
                    {log.text}
                  </motion.div>
                  {log.type === 'ai' && (
                    <RatingFeedback 
                      featureId="live-audio" 
                      responseId={`segment_${index}`} 
                      prompt="Live voice conversation"
                      response={log.text}
                      className="mt-1 border-t-0 bg-transparent py-1.5 px-0 w-64 self-start" 
                    />
                  )}
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
