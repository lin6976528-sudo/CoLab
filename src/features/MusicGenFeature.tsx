import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI, Modality } from '@google/genai';
import { Music, Loader2, Download, AlertCircle, ImagePlus, X, Trash2, Share2, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import LoadingAnimation from '../components/LoadingAnimation';
import { useHistory } from '../contexts/HistoryContext';
import { useRecentActivity } from '../contexts/RecentActivityContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { parseAIError, ParsedError } from '../utils/errorHandling';
import ErrorMessage from '../components/ErrorMessage';
import FeatureTutorial from '../components/FeatureTutorial';
import { shareContent } from '../utils/share';
import { printAIResponse } from '../utils/printHelper';
import RatingFeedback from '../components/RatingFeedback';

interface MusicGenFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function MusicGenFeature({
  modelName,
  title,
  description,
}: MusicGenFeatureProps) {
  const { t } = useTranslation();
  const { addHistoryItem } = useHistory();
  const { logActivity } = useRecentActivity();
  const { incrementUsage, checkAccess } = useSubscription();
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [lyrics, setLyrics] = useState<string>('');
  const [error, setError] = useState<ParsedError | null>(null);
  const [status, setStatus] = useState<string>('');
  const [refImage, setRefImage] = useState<{ file: File; dataUrl: string; base64: string; mimeType: string } | null>(null);
  const [selectedModel, setSelectedModel] = useState<string>(modelName);

  useEffect(() => {
    try {
      const staged = localStorage.getItem('co_staged_prompt');
      if (staged) {
        const stageObj = JSON.parse(staged);
        if (stageObj && stageObj.featureId === 'music-gen' && stageObj.content) {
          setPrompt(stageObj.content);
          localStorage.removeItem('co_staged_prompt');
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve staged prompt:", e);
    }
  }, []);

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

  const handleSelectKey = async () => {
    try {
      // @ts-ignore
      if (window.aistudio) {
        // @ts-ignore
        await window.aistudio.openSelectKey();
      }
    } catch (e) {
      console.error("Failed to open key selector", e);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setRefImage({ file, dataUrl, base64, mimeType: file.type });
    };
    reader.readAsDataURL(file);
  };

  const clearState = () => {
    if (window.confirm('Are you sure you want to clear the current generation?')) {
      setPrompt('');
      setAudioUrl(null);
      setLyrics('');
      setError(null);
      setStatus('');
      setRefImage(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    if (!checkAccess('music-gen')) {
      setError(parseAIError(new Error("Usage limit reached for music generation. Please upgrade your subscription."), t));
      return;
    }

    const hasKey = await checkApiKey();
    if (!hasKey) {
      setError(parseAIError(new Error("Please select an API key to use this feature."), t));
      return;
    }

    setIsLoading(true);
    setError(null);
    setAudioUrl(null);
    setLyrics('');
    setStatus('Generating music...');

    try {
      // Create a new instance right before making the call to ensure latest key
      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

      let contents: any = prompt;
      if (refImage) {
        contents = {
          parts: [
            { text: prompt },
            { inlineData: { data: refImage.base64, mimeType: refImage.mimeType } }
          ]
        };
      }

      const response = await currentAi.models.generateContentStream({
        model: selectedModel,
        contents: contents,
        config: {
          responseModalities: [Modality.AUDIO],
        },
      });

      let audioBase64 = "";
      let generatedLyrics = "";
      let mimeType = "audio/wav";

      for await (const chunk of response) {
        const parts = chunk.candidates?.[0]?.content?.parts;
        if (!parts) continue;
        for (const part of parts) {
          if (part.inlineData?.data) {
            if (!audioBase64 && part.inlineData.mimeType) {
              mimeType = part.inlineData.mimeType;
            }
            audioBase64 += part.inlineData.data;
          }
          if (part.text && !generatedLyrics) {
            generatedLyrics = part.text;
            setLyrics(generatedLyrics);
          }
        }
      }

      if (audioBase64) {
        const binary = atob(audioBase64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
          bytes[i] = binary.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        incrementUsage('music-gen');
        logActivity({
          id: `mus-${Date.now()}`,
          type: 'task',
          name: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
          featureId: 'music-gen',
          detail: `使用 ${selectedModel} 生成音樂`,
          icon: 'Music'
        });
        addHistoryItem({
          tool: 'music-gen',
          prompt: prompt,
          result: url,
          model: selectedModel,
        });
      } else {
        throw new Error('No audio generated.');
      }

    } catch (err) {
      console.error('Music generation error:', err);
      let parsedError = parseAIError(err, t);
      
      const errorMsg = err instanceof Error ? err.message.toLowerCase() : String(err).toLowerCase();
      if (errorMsg.includes('requested entity was not found')) {
        parsedError = {
          title: 'API Key Error',
          message: 'The selected API key is invalid or not found.',
          suggestion: 'Please click "Select API Key" to choose a valid key from your Google Cloud project.'
        };
      }
      setError(parsedError);
    } finally {
      setIsLoading(false);
      setStatus('');
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: 'Music generation has completed.',
          icon: '/vite.svg'
        });
      }
    }
  };

  const tutorialSteps = [
    {
      target: '.music-gen-prompt',
      content: 'Describe the music you want to generate. Be as descriptive as possible about the genre, mood, and instruments.',
      disableBeacon: true,
    },
    {
      target: '.music-gen-submit',
      content: 'Click here to start generating your music. This may take a minute.',
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="music-gen" steps={tutorialSteps} />
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 dark:border-white/5 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
            {audioUrl && (
              <button
                onClick={clearState}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                title="Clear Music"
              >
                <Trash2 size={18} />
              </button>
            )}
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light tracking-wide">{description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-10 bg-transparent">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 lg:gap-12">
          <div className="w-full md:w-1/3 space-y-6">
            <div className="p-4 glass-panel border border-amber-200/50 dark:border-amber-900/30 rounded-2xl text-sm text-amber-800 dark:text-amber-400 flex flex-col gap-3 shadow-sm font-light">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <p>This feature requires a paid Google Cloud API key.</p>
              </div>
              <button 
                onClick={handleSelectKey}
                className="px-4 py-2 glass-button text-amber-900 dark:text-amber-100 rounded-xl font-medium transition-colors self-start shadow-sm active:scale-[0.98]"
              >
                Select API Key
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">AI Model</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-3.5 glass-input rounded-2xl focus:bg-white/50 dark:focus:bg-zinc-800/50 focus:border-white dark:focus:border-zinc-700 focus:ring-4 focus:ring-white/30 dark:focus:ring-zinc-800/30 transition-all outline-none font-light disabled:opacity-60 dark:text-zinc-100"
                  disabled={isLoading}
                >
                  <option value="lyria-3-clip-preview">Lyria 3 Clip (30s)</option>
                  <option value="lyria-3-pro-preview">Lyria 3 Pro (Full Track)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="e.g., A cinematic orchestral track with building tension..."
                  className="music-gen-prompt w-full p-4 glass-input rounded-2xl focus:bg-white/50 dark:focus:bg-zinc-800/50 focus:border-white dark:focus:border-zinc-700 focus:ring-4 focus:ring-white/30 dark:focus:ring-zinc-800/30 transition-all outline-none resize-none h-32 font-light dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                  disabled={isLoading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">
                  Inspiration Image (Optional)
                </label>
                {refImage ? (
                  <div className="relative aspect-video rounded-xl overflow-hidden group border border-white/20 dark:border-white/5 shadow-sm">
                    <img src={refImage.dataUrl} alt="Reference" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setRefImage(null)}
                      className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-500/80 backdrop-blur-sm"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <label className="aspect-video rounded-xl border-2 border-dashed border-white/40 dark:border-white/10 flex flex-col items-center justify-center text-zinc-500 hover:border-white/60 dark:hover:border-white/20 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer glass-panel shadow-sm">
                    <ImagePlus size={24} className="mb-2" />
                    <span className="text-xs font-medium">Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleImageChange}
                      disabled={isLoading}
                    />
                  </label>
                )}
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className="music-gen-submit w-full py-4 px-6 bg-zinc-900 hover:bg-zinc-800 dark:bg-white dark:hover:bg-zinc-100 text-white dark:text-zinc-900 rounded-2xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/20 dark:shadow-white/10 active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>{status || 'Generating...'}</span>
                  </>
                ) : (
                  <>
                    <Music size={18} />
                    <span>Generate Music</span>
                  </>
                )}
              </button>
            </form>
            
            {error && <ErrorMessage error={error} />}
          </div>

          <div className="w-full md:w-2/3 flex flex-col items-center justify-center min-h-[400px] glass-panel rounded-3xl border border-white/20 dark:border-white/5 shadow-xl relative overflow-hidden p-8">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full w-full">
                <LoadingAnimation text={status || 'Generating Music...'} />
              </div>
            ) : audioUrl ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-2xl flex flex-col items-center gap-8"
              >
                <div className="w-full bg-white/50 dark:bg-zinc-800/50 p-6 rounded-3xl border border-white/20 dark:border-white/5 shadow-inner">
                  <audio 
                    controls 
                    src={audioUrl} 
                    className="w-full outline-none"
                    autoPlay
                  />
                </div>
                
                {lyrics && (
                  <div className="w-full bg-white/30 dark:bg-zinc-900/30 p-6 rounded-3xl border border-white/10 dark:border-white/5 shadow-sm">
                    <h3 className="text-lg font-medium mb-4 text-zinc-800 dark:text-zinc-200 flex items-center gap-2">
                      <Music size={18} className="text-indigo-500" />
                      Lyrics / Metadata
                    </h3>
                    <div className="whitespace-pre-wrap text-zinc-600 dark:text-zinc-400 font-light leading-relaxed max-h-[300px] overflow-y-auto custom-scrollbar pr-4">
                      {lyrics}
                    </div>
                  </div>
                )}

                <div className="flex justify-center gap-3 w-full">
                  <button
                    onClick={() => shareContent('Generated Music', prompt, audioUrl, 'generated-music.wav', 'audio/wav')}
                    className="flex items-center gap-2 px-6 py-3 glass-button text-zinc-700 dark:text-zinc-300 rounded-xl font-medium transition-all hover:shadow-md active:scale-[0.98] cursor-pointer"
                  >
                    <Share2 size={18} />
                    <span>Share</span>
                  </button>
                  <button
                    onClick={() => printAIResponse({
                      title: title || 'AI 音樂生成',
                      subtitle: prompt,
                      mediaUrl: audioUrl,
                      mediaType: 'audio',
                      content: lyrics || undefined
                    })}
                    className="flex items-center gap-2 px-6 py-3 glass-button text-zinc-700 dark:text-zinc-300 rounded-xl font-medium transition-all hover:shadow-md active:scale-[0.98] cursor-pointer"
                    title={t('common.printResponse', '列印音樂資訊')}
                  >
                    <Printer size={18} />
                    <span>{t('common.print', 'Print')}</span>
                  </button>
                  <a
                    href={audioUrl}
                    download={`music-${Date.now()}.wav`}
                    className="flex items-center gap-2 px-6 py-3 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-all shadow-lg shadow-indigo-500/30 active:scale-[0.98]"
                  >
                    <Download size={18} />
                    <span>Download WAV</span>
                  </a>
                </div>
                <RatingFeedback featureId="music-gen" responseId={audioUrl} className="mt-4 border-t border-zinc-200/20" />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center justify-center text-zinc-400 dark:text-zinc-600 gap-4">
                <div className="w-20 h-20 rounded-full bg-zinc-100 dark:bg-zinc-800/50 flex items-center justify-center mb-2">
                  <Music size={32} className="opacity-50" />
                </div>
                <p className="font-light tracking-wide text-center max-w-sm">
                  Describe the music you want to generate, and Lyria will create it for you.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
