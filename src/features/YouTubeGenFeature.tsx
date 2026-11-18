import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { Youtube, Loader2, Download, AlertCircle, Trash2, Share2, Clock, MonitorPlay, Smartphone, Printer } from 'lucide-react';
import { motion } from 'motion/react';
import LoadingAnimation from '../components/LoadingAnimation';
import { useHistory } from '../contexts/HistoryContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { parseAIError, ParsedError } from '../utils/errorHandling';
import ErrorMessage from '../components/ErrorMessage';
import FeatureTutorial from '../components/FeatureTutorial';
import { shareContent } from '../utils/share';
import { printAIResponse } from '../utils/printHelper';
import RatingFeedback from '../components/RatingFeedback';

interface YouTubeGenFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function YouTubeGenFeature({
  modelName,
  title,
  description,
}: YouTubeGenFeatureProps) {
  const { t } = useTranslation();
  const { addHistoryItem } = useHistory();
  const { incrementUsage, checkAccess } = useSubscription();
  const [prompt, setPrompt] = useState('');
  const [format, setFormat] = useState<'standard' | 'shorts'>('standard');
  const [duration, setDuration] = useState<'5s' | '12s'>('5s');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<ParsedError | null>(null);
  const [status, setStatus] = useState<string>('');
  const [selectedModel, setSelectedModel] = useState<string>(modelName);

  useEffect(() => {
    try {
      const staged = localStorage.getItem('co_staged_prompt');
      if (staged) {
        const stageObj = JSON.parse(staged);
        if (stageObj && stageObj.featureId === 'youtube-gen' && stageObj.content) {
          setPrompt(stageObj.content);
          localStorage.removeItem('co_staged_prompt');
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve staged prompt:", e);
    }
  }, []);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<'original' | 'mp4' | 'webm'>('original');
  const [downloadResolution, setDownloadResolution] = useState<'original' | '1080p' | '720p' | '480p'>('original');

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

  const clearState = () => {
    if (window.confirm(t('common.videoGen.confirmClear', 'Are you sure you want to clear the generated video?'))) {
      setPrompt('');
      setGeneratedVideo(null);
      setError(null);
      setStatus('');
    }
  };

  const downloadVideo = async () => {
    if (!generatedVideo) return;
    
    const needsTranscoding = downloadFormat !== 'original' || downloadResolution !== 'original';

    if (!needsTranscoding) {
      const a = document.createElement('a');
      a.href = generatedVideo;
      a.download = `youtube-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setIsDownloading(true);
    try {
      const video = document.createElement('video');
      video.src = generatedVideo;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      let targetWidth = video.videoWidth;
      let targetHeight = video.videoHeight;

      if (downloadResolution !== 'original') {
        const targetH = parseInt(downloadResolution.replace('p', ''), 10);
        if (targetH && targetH !== video.videoHeight) {
          targetHeight = targetH;
          targetWidth = Math.round(video.videoWidth * (targetH / video.videoHeight));
          if (targetWidth % 2 !== 0) targetWidth += 1;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext('2d')!;

      const stream = canvas.captureStream(30);
      
      let mimeType = '';
      if (downloadFormat === 'webm') {
        mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
      } else if (downloadFormat === 'mp4') {
        mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : '';
        if (!mimeType) {
          console.warn('MP4 encoding not supported, falling back to WebM');
          mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm';
        }
      } else {
        mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : (MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm');
      }
          
      const recorder = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `youtube-video-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
      };

      recorder.start();
      video.play();

      const drawFrame = () => {
        if (video.paused || video.ended) {
          if (recorder.state !== 'inactive') {
            recorder.stop();
          }
          return;
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        requestAnimationFrame(drawFrame);
      };

      drawFrame();
    } catch (err) {
      console.error('Error downloading processed video:', err);
      setIsDownloading(false);
      alert('Failed to download processed video.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    if (!checkAccess('youtube-gen')) {
      setError(parseAIError(new Error("Usage limit reached for YouTube generation. Please upgrade your subscription."), t));
      return;
    }

    const hasKey = await checkApiKey();
    if (!hasKey) {
      setError(parseAIError(new Error(t('common.videoGen.needApiKey', 'API Key required')), t));
      return;
    }

    setIsLoading(true);
    setProgress(5);
    setError(null);
    setGeneratedVideo(null);
    setStatus(t('common.videoGen.initializing', 'Initializing...'));

    try {
      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const aspectRatio = format === 'standard' ? '16:9' : '9:16';
      
      // If extending to 12s, we MUST use 720p for the first generation
      const resolution = duration === '12s' ? '720p' : '1080p';

      setStatus(t('common.videoGen.generating', 'Generating initial video...'));
      setProgress(15);

      let operation = await currentAi.models.generateVideos({
        model: selectedModel,
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: resolution,
          aspectRatio: aspectRatio
        }
      });

      setProgress(30);

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setProgress(prev => Math.min(prev + (Math.random() * 5 + 2), duration === '12s' ? 50 : 95));
        setStatus(t('common.videoGen.stillGenerating', 'Still generating... This may take a few minutes.'));
        operation = await currentAi.operations.getVideosOperation({operation: operation});
      }

      let finalVideoUri = operation.response?.generatedVideos?.[0]?.video?.uri;
      let finalVideoObj = operation.response?.generatedVideos?.[0]?.video;

      if (!finalVideoUri || !finalVideoObj) {
        throw new Error(t('common.videoGen.noVideoGenerated', 'No video generated'));
      }

      // If duration is 12s, extend the video
      if (duration === '12s') {
        setStatus('Extending video to 12 seconds...');
        setProgress(55);
        
        let extendOperation = await currentAi.models.generateVideos({
          model: selectedModel,
          prompt: prompt, // Use the same prompt or a continuation prompt
          video: finalVideoObj,
          config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
          }
        });

        while (!extendOperation.done) {
          await new Promise(resolve => setTimeout(resolve, 10000));
          setProgress(prev => Math.min(prev + (Math.random() * 5 + 2), 95));
          setStatus('Still extending video... This may take a few minutes.');
          extendOperation = await currentAi.operations.getVideosOperation({operation: extendOperation});
        }

        finalVideoUri = extendOperation.response?.generatedVideos?.[0]?.video?.uri;
        if (!finalVideoUri) {
          throw new Error('Failed to extend video');
        }
      }

      setProgress(100);

      setStatus('Downloading video...');
      const response = await fetch(finalVideoUri, {
        method: 'GET',
        headers: {
          'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY || '',
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setGeneratedVideo(url);
        incrementUsage('youtube-gen');
        setStatus('');
        addHistoryItem({
          tool: 'youtube-gen',
          prompt: prompt,
          result: url,
          model: duration === '12s' ? `${selectedModel} (extended)` : selectedModel,
        });
      } else {
        throw new Error(t('common.videoGen.fetchError', 'Failed to fetch video'));
      }

    } catch (err: any) {
      console.error('YouTube video generation error:', err);
      setError(parseAIError(err, t));
      setStatus('');
    } finally {
      setIsLoading(false);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: 'YouTube video generation has completed.',
          icon: '/vite.svg'
        });
      }
    }
  };

  const tutorialSteps = [
    {
      target: '.youtube-gen-topic',
      content: t('tutorial.youtubeGen.topic', 'Enter the topic or idea for your YouTube video here.'),
      disableBeacon: true,
    },
    {
      target: '.youtube-gen-submit',
      content: t('tutorial.youtubeGen.submit', 'Click here to generate your video script and visuals.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="youtube-gen" steps={tutorialSteps} />
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 dark:border-white/5 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 glass-panel text-red-600 dark:text-red-500 rounded-xl flex items-center justify-center shadow-sm">
                <Youtube size={24} />
              </div>
              <h2 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
            </div>
            {generatedVideo && (
              <button
                onClick={clearState}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                title={t('common.videoGen.clearVideo', 'Clear Video')}
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
            <div className="p-4 glass-panel border-amber-200/50 dark:border-amber-900/30 rounded-2xl text-sm text-amber-800 dark:text-amber-400 flex flex-col gap-3 shadow-sm font-light">
              <div className="flex items-start gap-2">
                <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                <p>{t('common.videoGen.apiKeyRequired', 'A Google Cloud API key with billing enabled is required for Veo models.')}</p>
              </div>
              <button 
                onClick={handleSelectKey}
                className="px-4 py-2 bg-amber-100/50 hover:bg-amber-200/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-100 rounded-lg font-medium transition-colors self-start border border-amber-200/50 dark:border-amber-800/30 shadow-sm active:scale-[0.98]"
              >
                {t('common.videoGen.selectApiKey', 'Select API Key')}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">{t('common.videoGen.model', 'AI Model')}</label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full p-3.5 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 dark:focus:ring-zinc-800/50 transition-all outline-none font-light disabled:opacity-60 dark:text-zinc-100"
                  disabled={isLoading}
                >
                  <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast (Faster)</option>
                  <option value="veo-3.1-generate-preview">Veo 3.1 (High Quality)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">Video Prompt</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Describe the YouTube video you want to generate..."
                  className="youtube-gen-topic w-full p-4 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 dark:focus:ring-zinc-800/50 transition-all outline-none resize-none h-32 font-light dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                  disabled={isLoading}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">Format</label>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setFormat('standard')}
                      disabled={isLoading}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        format === 'standard' 
                          ? 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400 backdrop-blur-md' 
                          : 'glass-panel text-zinc-600 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <MonitorPlay size={18} />
                      <div className="text-left">
                        <div className="text-sm font-medium">Standard</div>
                        <div className="text-[10px] opacity-80">16:9 Landscape</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormat('shorts')}
                      disabled={isLoading}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        format === 'shorts' 
                          ? 'bg-red-500/20 border-red-500/50 text-red-600 dark:text-red-400 backdrop-blur-md' 
                          : 'glass-panel text-zinc-600 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <Smartphone size={18} />
                      <div className="text-left">
                        <div className="text-sm font-medium">Shorts</div>
                        <div className="text-[10px] opacity-80">9:16 Portrait</div>
                      </div>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">Duration</label>
                  <div className="flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={() => setDuration('5s')}
                      disabled={isLoading}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        duration === '5s' 
                          ? 'bg-black/80 dark:bg-white/90 border-black/50 dark:border-white/50 text-white dark:text-zinc-900 backdrop-blur-md' 
                          : 'glass-panel text-zinc-600 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <Clock size={18} />
                      <div className="text-left">
                        <div className="text-sm font-medium">5 Seconds</div>
                        <div className="text-[10px] opacity-80">Standard Generation</div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDuration('12s')}
                      disabled={isLoading}
                      className={`flex items-center gap-3 p-3 rounded-2xl border transition-all ${
                        duration === '12s' 
                          ? 'bg-black/80 dark:bg-white/90 border-black/50 dark:border-white/50 text-white dark:text-zinc-900 backdrop-blur-md' 
                          : 'glass-panel text-zinc-600 dark:text-zinc-400 hover:bg-white/40 dark:hover:bg-zinc-800/40'
                      }`}
                    >
                      <Clock size={18} />
                      <div className="text-left">
                        <div className="text-sm font-medium">12 Seconds</div>
                        <div className="text-[10px] opacity-80">Extended (Takes longer)</div>
                      </div>
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={!prompt.trim() || isLoading}
                className="youtube-gen-submit w-full flex items-center justify-center gap-3 py-4 px-6 bg-red-600/90 backdrop-blur-md text-white rounded-2xl text-sm font-medium tracking-wide hover:bg-red-600 disabled:opacity-50 disabled:hover:bg-red-600/90 transition-all shadow-sm active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {status || 'Generating...'}
                  </>
                ) : (
                  <>
                    <Youtube size={18} />
                    Generate YouTube Video
                  </>
                )}
              </button>
            </form>

            {error && (
              <ErrorMessage error={error} />
            )}
          </div>

          <div className="flex-1 flex flex-col items-center justify-center glass-panel rounded-3xl overflow-hidden relative min-h-[500px] shadow-sm">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full w-full max-w-md mx-auto px-6">
                <LoadingAnimation text={status} />
                <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mt-8 overflow-hidden">
                  <motion.div
                    className="bg-red-500 dark:bg-red-600 h-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-sm mt-4 font-light text-zinc-400 dark:text-zinc-500 text-center">
                  {duration === '12s' ? 'Extended videos require two generation passes.' : 'Generating high-quality video...'}
                </p>
              </div>
            ) : generatedVideo ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-transparent"
              >
                <video
                  src={generatedVideo}
                  controls
                  autoPlay
                  loop
                  className={`max-w-full max-h-[calc(100%-80px)] object-contain rounded-2xl shadow-md border border-white/20 dark:border-white/5 ${format === 'shorts' ? 'h-full aspect-[9/16]' : 'w-full aspect-video'}`}
                />
                {isDownloading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50 rounded-2xl">
                    <div className="bg-white dark:bg-zinc-800 p-4 rounded-2xl flex flex-col items-center gap-3 shadow-xl">
                      <Loader2 size={24} className="text-red-500 animate-spin" />
                      <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Processing Video...</span>
                    </div>
                  </div>
                )}
                <div className="mt-6 flex flex-col items-center gap-4 w-full shrink-0">
                  <div className="flex flex-wrap justify-center gap-4 text-sm bg-white/50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-white/20 dark:border-white/5">
                    <div className="flex items-center gap-2">
                      <label className="text-zinc-500 dark:text-zinc-400 font-medium">Format:</label>
                      <select 
                        value={downloadFormat} 
                        onChange={e => setDownloadFormat(e.target.value as any)}
                        className="bg-transparent border-none outline-none text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
                      >
                        <option value="original">Original (MP4)</option>
                        <option value="mp4">MP4</option>
                        <option value="webm">WebM</option>
                      </select>
                    </div>
                    <div className="w-px h-4 bg-zinc-300 dark:bg-zinc-700 self-center"></div>
                    <div className="flex items-center gap-2">
                      <label className="text-zinc-500 dark:text-zinc-400 font-medium">Resolution:</label>
                      <select 
                        value={downloadResolution} 
                        onChange={e => setDownloadResolution(e.target.value as any)}
                        className="bg-transparent border-none outline-none text-zinc-700 dark:text-zinc-300 font-medium cursor-pointer"
                      >
                        <option value="original">Original</option>
                        <option value="1080p">1080p</option>
                        <option value="720p">720p</option>
                        <option value="480p">480p</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex justify-center gap-3 w-full">
                    <button
                      onClick={() => shareContent('YouTube Video', prompt, generatedVideo, 'youtube-video.mp4', 'video/mp4')}
                      className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 dark:text-zinc-100 rounded-2xl text-sm font-medium shadow-sm cursor-pointer disabled:opacity-50"
                      disabled={isDownloading}
                    >
                      <Share2 size={18} />
                      Share
                    </button>
                    <button
                      onClick={() => printAIResponse({
                        title: title || 'YouTube Video Generator',
                        subtitle: prompt,
                        mediaUrl: generatedVideo,
                        mediaType: 'video'
                      })}
                      className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 dark:text-zinc-100 rounded-2xl text-sm font-medium shadow-sm transition-all cursor-pointer disabled:opacity-50"
                      disabled={isDownloading}
                      title={t('common.printResponse', '列印影像')}
                    >
                      <Printer size={18} />
                      <span>{t('common.print', 'Print')}</span>
                    </button>
                    <button
                      onClick={downloadVideo}
                      disabled={isDownloading}
                      className="flex items-center gap-2 px-6 py-2.5 bg-red-600/90 dark:bg-red-700/90 backdrop-blur-md text-white rounded-2xl text-sm font-medium hover:bg-red-600 dark:hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Download size={18} />
                      Download
                    </button>
                  </div>
                  <RatingFeedback featureId="youtube-gen" responseId={generatedVideo} className="mt-4 border-t border-zinc-200/20" />
                </div>
              </motion.div>
            ) : (
              <div className="flex flex-col items-center text-zinc-500 dark:text-zinc-400 space-y-4 p-8 text-center">
                <div className="w-20 h-20 rounded-full glass-panel shadow-sm flex items-center justify-center">
                  <Youtube size={28} className="text-zinc-400 dark:text-zinc-500" />
                </div>
                <div>
                  <p className="font-medium text-zinc-600 dark:text-zinc-300 tracking-wide">No video generated yet</p>
                  <p className="text-sm mt-1 font-light text-zinc-400 dark:text-zinc-500">Enter a prompt and click generate to create a YouTube video</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
