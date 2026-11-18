import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI, Modality } from '@google/genai';
import { Volume2, Loader2, Play, Square, Sparkles, Trash2, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import LoadingAnimation from '../components/LoadingAnimation';
import { useSubscription } from '../contexts/SubscriptionContext';
import { parseAIError, ParsedError } from '../utils/errorHandling';
import ErrorMessage from '../components/ErrorMessage';
import FeatureTutorial from '../components/FeatureTutorial';
import { printAIResponse } from '../utils/printHelper';
import RatingFeedback from '../components/RatingFeedback';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

interface TTSFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function TTSFeature({
  modelName,
  title,
  description,
}: TTSFeatureProps) {
  const { t } = useTranslation();
  const { incrementUsage, checkAccess } = useSubscription();
  const [text, setText] = useState('');
  const [voice, setVoice] = useState('Kore');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<ParsedError | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  const clearState = () => {
    if (window.confirm(t('common.tts.confirmClear'))) {
      setText('');
      setAudioUrl(null);
      setError(null);
      if (audioElement) {
        audioElement.pause();
        setAudioElement(null);
        setIsPlaying(false);
      }
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || isLoading) return;

    if (!checkAccess('tts')) {
      setError(parseAIError(new Error("Usage limit reached for text-to-speech. Please upgrade your subscription."), t));
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    if (audioElement) {
      audioElement.pause();
      setIsPlaying(false);
    }

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: [{ parts: [{ text }] }],
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      });

      const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (base64Audio) {
        // Decode base64 to binary
        const binaryString = window.atob(base64Audio);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        
        // Create a Blob from the binary data
        const blob = new Blob([bytes], { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        incrementUsage('tts');
        
        const audio = new Audio(url);
        audio.onended = () => setIsPlaying(false);
        setAudioElement(audio);
      } else {
        setError(parseAIError(new Error(t('common.tts.noSpeechGenerated')), t));
      }
    } catch (err: any) {
      console.error('TTS generation error:', err);
      setError(parseAIError(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  const togglePlay = () => {
    if (audioElement) {
      if (isPlaying) {
        audioElement.pause();
        setIsPlaying(false);
      } else {
        audioElement.play();
        setIsPlaying(true);
      }
    }
  };

  const tutorialSteps = [
    {
      target: '.tts-text',
      content: t('tutorial.tts.text', 'Enter the text you want to convert to speech.'),
      disableBeacon: true,
    },
    {
      target: '.tts-voice',
      content: t('tutorial.tts.voice', 'Select a voice for the speech.'),
    },
    {
      target: '.tts-submit',
      content: t('tutorial.tts.submit', 'Click here to generate the audio.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="tts" steps={tutorialSteps} />
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight">{title}</h2>
            {audioUrl && (
              <button
                onClick={clearState}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title={t('common.tts.clearSpeech')}
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
          <div className="w-full md:w-1/2 space-y-6">
          <form onSubmit={handleGenerate} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 tracking-wide">{t('common.tts.textToSpeech')}</label>
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder={t('common.tts.textPlaceholder')}
                className="tts-text w-full p-4 glass-input rounded-2xl focus:bg-white/50 focus:border-white focus:ring-4 focus:ring-white/30 transition-all outline-none resize-none h-48 font-light"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 tracking-wide">{t('common.tts.voice')}</label>
              <select
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                className="tts-voice w-full p-3.5 glass-input rounded-2xl focus:bg-white/50 focus:border-white focus:ring-4 focus:ring-white/30 transition-all outline-none font-light"
                disabled={isLoading}
              >
                {['Puck', 'Charon', 'Kore', 'Fenrir', 'Zephyr'].map((v) => (
                  <option key={v} value={v}>{v}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              disabled={!text.trim() || isLoading}
              className="tts-submit w-full flex items-center justify-center gap-3 py-4 px-6 bg-black/80 backdrop-blur-md text-white rounded-2xl text-sm font-medium tracking-wide hover:bg-black disabled:opacity-50 disabled:hover:bg-black/80 transition-all shadow-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('common.tts.generatingBtn')}
                </>
              ) : (
                <>
                  <Volume2 size={18} />
                  {t('common.tts.generateSpeech')}
                </>
              )}
            </button>
          </form>

          {error && (
            <ErrorMessage error={error} />
          )}
        </div>

        <div className="w-full md:w-1/2 flex flex-col glass-panel rounded-3xl overflow-hidden shadow-sm min-h-[400px]">
          <div className="p-6 border-b border-white/20 bg-white/30 backdrop-blur-sm">
            <h3 className="font-medium text-zinc-800 tracking-wide">{t('common.tts.speechOutput')}</h3>
          </div>
          <div className="flex-1 p-6 md:p-8 flex items-center justify-center relative bg-transparent">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full w-full">
                <LoadingAnimation text={t('common.tts.synthesizing')} />
              </div>
            ) : audioUrl ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center space-y-8 w-full max-w-xs"
              >
                <div className="w-32 h-32 rounded-full glass-panel shadow-sm flex items-center justify-center relative">
                  <div className={`absolute inset-0 rounded-full border border-white/30 transition-transform duration-1000 ${isPlaying ? 'scale-110 opacity-0' : 'scale-100 opacity-100'}`}></div>
                  <Volume2 size={48} className={`text-zinc-600 ${isPlaying ? 'animate-pulse' : ''}`} />
                </div>
                
                <button
                  onClick={togglePlay}
                  className="w-16 h-16 rounded-full bg-black/80 backdrop-blur-md text-white flex items-center justify-center shadow-lg hover:bg-black transition-all hover:scale-105 active:scale-95 cursor-pointer"
                >
                  {isPlaying ? <Square size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                </button>
                
                <button
                  onClick={() => printAIResponse({
                    title: title || t('common.tts.title', 'AI 語音合成'),
                    subtitle: text,
                    mediaUrl: audioUrl,
                    mediaType: 'audio'
                  })}
                  className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 rounded-2xl text-sm font-medium shadow-sm transition-all cursor-pointer mt-4"
                  title={t('common.printResponse', '列印對話')}
                >
                  <Printer size={18} />
                  <span>{t('common.print', 'Print')}</span>
                </button>
                
                <audio src={audioUrl} controls className="w-full mt-4 rounded-xl shadow-xs" onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={() => setIsPlaying(false)} />
                <RatingFeedback featureId="tts" responseId={audioUrl} className="mt-4 border-t border-zinc-200/20 w-80 max-w-full" />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center text-zinc-500 space-y-4 text-center p-8">
                <div className="w-20 h-20 rounded-full glass-panel shadow-sm flex items-center justify-center">
                  <Volume2 size={28} className="text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-600 tracking-wide">{t('common.tts.notGeneratedYet')}</p>
                  <p className="text-sm mt-1 font-light text-zinc-400">{t('common.tts.notGeneratedDesc')}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}
