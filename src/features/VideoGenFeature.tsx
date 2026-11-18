import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI, VideoGenerationReferenceImage, VideoGenerationReferenceType } from '@google/genai';
import { Film, Loader2, Download, AlertCircle, Sparkles, ImagePlus, X, Trash2, Share2, Printer } from 'lucide-react';
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

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

interface VideoGenFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function VideoGenFeature({
  modelName,
  title,
  description,
}: VideoGenFeatureProps) {
  const { t } = useTranslation();
  const { addHistoryItem } = useHistory();
  const { logActivity } = useRecentActivity();
  const { incrementUsage, checkAccess } = useSubscription();
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [generationResolution, setGenerationResolution] = useState<'1080p' | '720p'>('1080p');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<ParsedError | null>(null);

  useEffect(() => {
    try {
      const staged = localStorage.getItem('co_staged_prompt');
      if (staged) {
        const stageObj = JSON.parse(staged);
        if (stageObj && stageObj.featureId === 'video-gen' && stageObj.content) {
          setPrompt(stageObj.content);
          localStorage.removeItem('co_staged_prompt');
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve staged prompt:", e);
    }
  }, []);
  const [status, setStatus] = useState<string>('');
  const [startImage, setStartImage] = useState<{ file: File; dataUrl: string; base64: string } | null>(null);
  const [endImage, setEndImage] = useState<{ file: File; dataUrl: string; base64: string } | null>(null);
  const [refImages, setRefImages] = useState<{ file: File; dataUrl: string; base64: string }[]>([]);
  const [selectedModel, setSelectedModel] = useState<string>(modelName);
  const [watermarkType, setWatermarkType] = useState<'none' | 'text' | 'image'>('none');
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState<'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center'>('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState<number>(80);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const remainingSlots = 3 - refImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setRefImages(prev => [...prev, { file, dataUrl, base64 }]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setRefImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setStartImage({ file, dataUrl, base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleEndImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      setEndImage({ file, dataUrl, base64 });
    };
    reader.readAsDataURL(file);
  };

  const handleWatermarkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setWatermarkImage(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const downloadVideo = async () => {
    if (!generatedVideo) return;
    
    const hasWatermark = watermarkType !== 'none' && (watermarkType === 'text' ? !!watermarkText : !!watermarkImage);
    const needsTranscoding = hasWatermark || downloadFormat !== 'original' || downloadResolution !== 'original';

    if (!needsTranscoding) {
      const a = document.createElement('a');
      a.href = generatedVideo;
      a.download = `video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus('Preparing video...');
    try {
      const video = document.createElement('video');
      video.src = generatedVideo;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      setDownloadStatus('Processing frames...');

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

      let wmImg: HTMLImageElement | null = null;
      if (watermarkType === 'image' && watermarkImage) {
        wmImg = new Image();
        wmImg.src = watermarkImage;
        await new Promise((resolve) => {
          wmImg!.onload = resolve;
        });
      }

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
        setDownloadStatus('Finalizing download...');
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `video-${Date.now()}.${ext}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        setIsDownloading(false);
        setDownloadProgress(0);
        setDownloadStatus('');
      };

      recorder.start();
      video.play();

      const drawFrame = () => {
        if (video.paused || video.ended) {
          if (recorder.state !== 'inactive') {
            setDownloadStatus('Encoding video...');
            recorder.stop();
          }
          return;
        }
        
        if (video.duration) {
          setDownloadProgress(Math.round((video.currentTime / video.duration) * 100));
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        if (watermarkType === 'text' && watermarkText) {
          const fontSize = Math.floor(canvas.height * 0.05);
          ctx.font = `bold ${fontSize}px sans-serif`;
          ctx.fillStyle = `rgba(255, 255, 255, ${watermarkOpacity / 100})`;
          
          let x = 0, y = 0;
          ctx.textAlign = watermarkPosition.includes('right') ? 'right' : watermarkPosition.includes('left') ? 'left' : 'center';
          ctx.textBaseline = watermarkPosition.includes('bottom') ? 'bottom' : watermarkPosition.includes('top') ? 'top' : 'middle';
          
          if (watermarkPosition.includes('right')) x = canvas.width - 30;
          else if (watermarkPosition.includes('left')) x = 30;
          else x = canvas.width / 2;
          
          if (watermarkPosition.includes('bottom')) y = canvas.height - 30;
          else if (watermarkPosition.includes('top')) y = 30;
          else y = canvas.height / 2;

          ctx.shadowColor = `rgba(0, 0, 0, ${watermarkOpacity / 100})`;
          ctx.shadowBlur = 8;
          ctx.shadowOffsetX = 2;
          ctx.shadowOffsetY = 2;
          ctx.fillText(watermarkText, x, y);
        } else if (watermarkType === 'image' && wmImg) {
          const wmWidth = canvas.width * 0.15;
          const wmHeight = (wmImg.height / wmImg.width) * wmWidth;
          ctx.globalAlpha = watermarkOpacity / 100;
          
          let x = 0, y = 0;
          if (watermarkPosition.includes('right')) x = canvas.width - wmWidth - 30;
          else if (watermarkPosition.includes('left')) x = 30;
          else x = (canvas.width - wmWidth) / 2;
          
          if (watermarkPosition.includes('bottom')) y = canvas.height - wmHeight - 30;
          else if (watermarkPosition.includes('top')) y = 30;
          else y = (canvas.height - wmHeight) / 2;

          ctx.drawImage(wmImg, x, y, wmWidth, wmHeight);
          ctx.globalAlpha = 1.0;
        }

        requestAnimationFrame(drawFrame);
      };

      drawFrame();
    } catch (err) {
      console.error('Error downloading processed video:', err);
      setIsDownloading(false);
      alert('Failed to download processed video.');
    }
  };

  const clearState = () => {
    if (window.confirm(t('common.videoGen.confirmClear'))) {
      setPrompt('');
      setGeneratedVideo(null);
      setError(null);
      setStatus('');
      setStartImage(null);
      setEndImage(null);
      setRefImages([]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    if (!checkAccess('video-gen')) {
      setError(parseAIError(new Error("Usage limit reached for video generation. Please upgrade your subscription."), t));
      return;
    }

    const hasKey = await checkApiKey();
    if (!hasKey) {
      setError(parseAIError(new Error(t('common.videoGen.needApiKey')), t));
      return;
    }

    setIsLoading(true);
    setProgress(5);
    setError(null);
    setGeneratedVideo(null);
    setStatus(t('common.videoGen.initializing'));

    try {
      // Create a new instance right before making the call to ensure latest key
      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

      let config: any = {
        numberOfVideos: 1,
        resolution: (refImages.length > 0 || startImage || endImage) ? '720p' : generationResolution,
        aspectRatio: (refImages.length > 0 || startImage || endImage) ? '16:9' : aspectRatio,
      };

      if (endImage) {
        config.lastFrame = {
          imageBytes: endImage.base64,
          mimeType: endImage.file.type,
        };
      }

      if (refImages.length > 0) {
        const referenceImagesPayload: VideoGenerationReferenceImage[] = refImages.map(img => ({
          image: {
            imageBytes: img.base64,
            mimeType: img.file.type,
          },
          referenceType: VideoGenerationReferenceType.ASSET,
        }));
        config.referenceImages = referenceImagesPayload;
      }

      setProgress(15);
      
      const requestPayload: any = {
        model: refImages.length > 0 ? 'veo-3.1-generate-preview' : selectedModel,
        prompt: prompt,
        config: config
      };

      if (startImage) {
        requestPayload.image = {
          imageBytes: startImage.base64,
          mimeType: startImage.file.type,
        };
      }

      let operation = await currentAi.models.generateVideos(requestPayload);

      setStatus(t('common.videoGen.generating'));
      setProgress(30);

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setProgress(prev => Math.min(prev + (Math.random() * 5 + 2), 95));
        setStatus(t('common.videoGen.stillGenerating'));
        operation = await currentAi.operations.getVideosOperation({operation: operation});
      }

      setProgress(100);
      
      if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error'}`);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
        // We need to fetch it with the API key header
        const response = await fetch(downloadLink, {
          method: 'GET',
          headers: {
            'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY || '',
          },
        });
        
        if (response.ok) {
          const blob = await response.blob();
          const url = URL.createObjectURL(blob);
          setGeneratedVideo(url);
          setStatus('');
          incrementUsage('video-gen');
          logActivity({
            id: `vid-${Date.now()}`,
            type: 'task',
            name: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
            featureId: 'video-gen',
            detail: `使用 ${selectedModel} 生成影片`,
            icon: 'PlaySquare'
          });
          addHistoryItem({
            tool: 'video-gen',
            prompt: prompt,
            result: url,
            model: refImages.length > 0 ? 'veo-3.1-generate-preview' : selectedModel,
          });
        } else {
          throw new Error(t('common.videoGen.fetchError'));
        }
      } else {
        throw new Error(t('common.videoGen.noVideoGenerated'));
      }

    } catch (err: any) {
      console.error('Video generation error:', err);
      
      const errorMsg = err?.message?.toLowerCase() || '';
      let parsedError = parseAIError(err, t);
      
      // Video-specific error overrides
      if (errorMsg.includes('publisher model') && errorMsg.includes('not found')) {
        parsedError = {
          title: t('common.errors.modelAccess.title', 'Model Access Error'),
          message: t('common.errors.modelAccess.message', 'The selected video generation model is not available or you do not have access to it.'),
          suggestion: t('common.errors.modelAccess.suggestion', 'Please ensure your API key has access to the Veo models, or try selecting a different model.')
        };
      } else if (errorMsg.includes('safety') || errorMsg.includes('blocked')) {
        parsedError = {
          title: t('common.errors.safety.title', 'Safety Violation'),
          message: t('common.errors.safety.message', 'Your prompt or the generated video was flagged by safety filters.'),
          suggestion: t('common.errors.safety.suggestion', 'Please modify your prompt to ensure it complies with safety guidelines and try again.')
        };
      } else if (errorMsg.includes('invalid argument') || errorMsg.includes('400')) {
        parsedError = {
          title: t('common.errors.invalidRequest.title', 'Invalid Request'),
          message: t('common.errors.invalidRequest.message', 'The request was invalid. This might be due to an unsupported aspect ratio, resolution, or prompt for the selected model.'),
          suggestion: t('common.errors.invalidRequest.suggestion', 'Please check your settings and try again.')
        };
      } else if (errorMsg.includes('video generation failed')) {
        parsedError = {
          title: t('common.errors.generationFailed.title', 'Generation Failed'),
          message: err.message,
          suggestion: t('common.errors.generationFailed.suggestion', 'The video generation process failed. Please try again with a different prompt or settings.')
        };
      }

      setError(parsedError);
      setStatus('');
      addHistoryItem({
        tool: 'video-gen',
        prompt: prompt,
        result: parsedError.message || String(err),
        model: refImages.length > 0 ? 'veo-3.1-generate-preview' : selectedModel,
        isError: true,
        errorMessage: parsedError.message || String(err)
      }).catch(e => console.error('Failed to log error to database', e));
    } finally {
      setIsLoading(false);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: 'Video generation has completed.',
          icon: '/vite.svg'
        });
      }
    }
  };

  const tutorialSteps = [
    {
      target: '.video-gen-prompt',
      content: t('tutorial.videoGen.prompt', 'Describe the video you want to generate. Be as descriptive as possible.'),
      disableBeacon: true,
    },
    {
      target: '.video-gen-aspect-ratio',
      content: t('tutorial.videoGen.aspectRatio', 'Choose the aspect ratio for your video.'),
    },
    {
      target: '.video-gen-submit',
      content: t('tutorial.videoGen.submit', 'Click here to start generating your video. This may take a few minutes.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="video-gen" steps={tutorialSteps} />
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 dark:border-white/5 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
            {generatedVideo && (
              <button
                onClick={clearState}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                title={t('common.videoGen.clearVideo')}
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
              <p>{t('common.videoGen.apiKeyRequired')}</p>
            </div>
            <button 
              onClick={handleSelectKey}
              className="px-4 py-2 glass-button text-amber-900 dark:text-amber-100 rounded-xl font-medium transition-colors self-start shadow-sm active:scale-[0.98]"
            >
              {t('common.videoGen.selectApiKey')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">{t('common.videoGen.model', 'AI Model')}</label>
              <select
                value={refImages.length > 0 ? 'veo-3.1-generate-preview' : selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-3.5 glass-input rounded-2xl focus:bg-white/50 dark:focus:bg-zinc-800/50 focus:border-white dark:focus:border-zinc-700 focus:ring-4 focus:ring-white/30 dark:focus:ring-zinc-800/30 transition-all outline-none font-light disabled:opacity-60 dark:text-zinc-100"
                disabled={isLoading || refImages.length > 0}
              >
                <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast (Faster)</option>
                <option value="veo-3.1-generate-preview">Veo 3.1 (High Quality)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">{t('common.videoGen.prompt')}</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('common.videoGen.promptPlaceholder')}
                className="video-gen-prompt w-full p-4 glass-input rounded-2xl focus:bg-white/50 dark:focus:bg-zinc-800/50 focus:border-white dark:focus:border-zinc-700 focus:ring-4 focus:ring-white/30 dark:focus:ring-zinc-800/30 transition-all outline-none resize-none h-32 font-light dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">
                Guide Frames (Optional)
              </label>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Start Frame */}
                <div>
                  <div className="text-xs text-zinc-500 mb-1">Start Frame</div>
                  {startImage ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/20 dark:border-white/5 group shadow-sm">
                      <img src={startImage.dataUrl} alt="Start Frame" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setStartImage(null)}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="aspect-video rounded-lg border-2 border-dashed border-white/40 dark:border-white/10 flex flex-col items-center justify-center text-zinc-500 hover:border-white/60 dark:hover:border-white/20 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer glass-panel shadow-sm">
                      <ImagePlus size={20} className="mb-1" />
                      <span className="text-[10px] font-medium">Upload Start</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleStartImageChange}
                        disabled={isLoading}
                      />
                    </label>
                  )}
                </div>

                {/* End Frame */}
                <div>
                  <div className="text-xs text-zinc-500 mb-1">End Frame</div>
                  {endImage ? (
                    <div className="relative aspect-video rounded-lg overflow-hidden border border-white/20 dark:border-white/5 group shadow-sm">
                      <img src={endImage.dataUrl} alt="End Frame" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setEndImage(null)}
                        className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <label className="aspect-video rounded-lg border-2 border-dashed border-white/40 dark:border-white/10 flex flex-col items-center justify-center text-zinc-500 hover:border-white/60 dark:hover:border-white/20 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer glass-panel shadow-sm">
                      <ImagePlus size={20} className="mb-1" />
                      <span className="text-[10px] font-medium">Upload End</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleEndImageChange}
                        disabled={isLoading}
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">
                {t('common.videoGen.referenceImages')} (Style/Character)
              </label>
              <div className="grid grid-cols-3 gap-2 mb-2">
                {refImages.map((img, index) => (
                  <div key={index} className="relative aspect-video rounded-lg overflow-hidden border border-white/20 dark:border-white/5 group shadow-sm">
                    <img src={img.dataUrl} alt={`Ref ${index + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-1 right-1 p-1 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/70"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {refImages.length < 3 && (
                  <label className="aspect-video rounded-lg border-2 border-dashed border-white/40 dark:border-white/10 flex flex-col items-center justify-center text-zinc-500 hover:border-white/60 dark:hover:border-white/20 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer glass-panel shadow-sm">
                    <ImagePlus size={20} className="mb-1" />
                    <span className="text-[10px] font-medium">{t('common.videoGen.uploadImage')}</span>
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={handleFileChange}
                      disabled={isLoading}
                    />
                  </label>
                )}
              </div>
              {refImages.length > 0 && (
                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 font-light">
                  * {t('common.videoGen.referenceImageNote')}
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="video-gen-aspect-ratio">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">{t('common.videoGen.aspectRatio')}</label>
                <select
                  value={(refImages.length > 0 || startImage || endImage) ? '16:9' : aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value)}
                  className="w-full p-3.5 glass-input rounded-2xl focus:bg-white/50 dark:focus:bg-zinc-800/50 focus:border-white dark:focus:border-zinc-700 focus:ring-4 focus:ring-white/30 dark:focus:ring-zinc-800/30 transition-all outline-none font-light disabled:opacity-60 dark:text-zinc-100"
                  disabled={isLoading || refImages.length > 0 || !!startImage || !!endImage}
                >
                  <option value="16:9">{t('common.videoGen.aspectRatio16_9')}</option>
                  <option value="9:16">{t('common.videoGen.aspectRatio9_16')}</option>
                </select>
                {(refImages.length > 0 || startImage || endImage) && (
                  <p className="text-[11px] text-zinc-500 mt-1">* Aspect ratio is locked to 16:9 when using reference images.</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">Resolution</label>
                <select
                  value={(refImages.length > 0 || startImage || endImage) ? '720p' : generationResolution}
                  onChange={(e) => setGenerationResolution(e.target.value as any)}
                  className="w-full p-3.5 glass-input rounded-2xl focus:bg-white/50 dark:focus:bg-zinc-800/50 focus:border-white dark:focus:border-zinc-700 focus:ring-4 focus:ring-white/30 dark:focus:ring-zinc-800/30 transition-all outline-none font-light disabled:opacity-60 dark:text-zinc-100"
                  disabled={isLoading || refImages.length > 0 || !!startImage || !!endImage}
                >
                  <option value="1080p">1080p</option>
                  <option value="720p">720p</option>
                </select>
                {(refImages.length > 0 || startImage || endImage) && (
                  <p className="text-[11px] text-zinc-500 mt-1">* Resolution is locked to 720p when using reference images.</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">Watermark</label>
              <div className="flex gap-2 mb-2">
                <button
                  type="button"
                  onClick={() => setWatermarkType('none')}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${watermarkType === 'none' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-white/50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400'}`}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('text')}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${watermarkType === 'text' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-white/50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400'}`}
                >
                  Text
                </button>
                <button
                  type="button"
                  onClick={() => setWatermarkType('image')}
                  className={`flex-1 py-2 px-3 rounded-xl text-sm font-medium transition-colors ${watermarkType === 'image' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300' : 'bg-white/50 text-zinc-600 dark:bg-zinc-800/50 dark:text-zinc-400'}`}
                >
                  Image
                </button>
              </div>
              
              {watermarkType === 'text' && (
                <input
                  type="text"
                  value={watermarkText}
                  onChange={(e) => setWatermarkText(e.target.value)}
                  placeholder="Enter watermark text"
                  className="w-full p-3 glass-input rounded-2xl focus:bg-white/50 dark:focus:bg-zinc-800/50 focus:border-white dark:focus:border-zinc-700 focus:ring-4 focus:ring-white/30 dark:focus:ring-zinc-800/30 transition-all outline-none font-light dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                />
              )}
              
              {watermarkType === 'image' && (
                <div className="flex items-center gap-4">
                  {watermarkImage && (
                    <img src={watermarkImage} alt="Watermark" className="w-12 h-12 object-contain bg-black/5 dark:bg-white/5 rounded-lg" />
                  )}
                  <label className="flex-1 p-3 border-2 border-dashed border-white/40 dark:border-white/10 rounded-2xl flex items-center justify-center text-zinc-500 hover:border-white/60 dark:hover:border-white/20 hover:text-zinc-700 dark:hover:text-zinc-300 transition-colors cursor-pointer glass-panel shadow-sm text-sm">
                    <ImagePlus size={16} className="mr-2" />
                    Upload Image
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleWatermarkImageChange}
                    />
                  </label>
                </div>
              )}

              {watermarkType !== 'none' && (
                <div className="flex flex-col gap-3 mt-3">
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 w-16">Position</label>
                    <select
                      value={watermarkPosition}
                      onChange={(e) => setWatermarkPosition(e.target.value as any)}
                      className="flex-1 p-2 glass-input rounded-xl focus:bg-white/50 dark:focus:bg-zinc-800/50 focus:border-white dark:focus:border-zinc-700 transition-all outline-none text-sm dark:text-zinc-100"
                    >
                      <option value="bottom-right">Bottom Right</option>
                      <option value="bottom-left">Bottom Left</option>
                      <option value="top-right">Top Right</option>
                      <option value="top-left">Top Left</option>
                      <option value="center">Center</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="text-xs font-medium text-zinc-500 dark:text-zinc-400 w-16">Opacity</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={watermarkOpacity}
                      onChange={(e) => setWatermarkOpacity(Number(e.target.value))}
                      className="flex-1 accent-indigo-500"
                    />
                    <span className="text-xs text-zinc-500 dark:text-zinc-400 w-8 text-right">{watermarkOpacity}%</span>
                  </div>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="video-gen-submit w-full flex items-center justify-center gap-3 py-4 px-6 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 rounded-2xl text-sm font-medium tracking-wide hover:bg-black dark:hover:bg-white disabled:opacity-50 disabled:hover:bg-black/80 dark:disabled:hover:bg-white/90 transition-all shadow-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('common.videoGen.generatingBtn')}
                </>
              ) : (
                <>
                  <Film size={18} />
                  {t('common.videoGen.generateVideo')}
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
                  className="bg-indigo-500 dark:bg-indigo-400 h-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <p className="text-sm mt-4 font-light text-zinc-400 dark:text-zinc-500 text-center">{t('common.videoGen.generationNote')}</p>
            </div>
          ) : generatedVideo ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-transparent"
            >
              <div className="relative w-full max-h-[calc(100%-80px)] rounded-2xl shadow-md border border-white/20 dark:border-white/5 overflow-hidden group">
                <video
                  src={generatedVideo}
                  controls
                  autoPlay
                  loop
                  className="w-full h-full object-contain"
                />
                {watermarkType === 'text' && watermarkText && (
                  <div 
                    className={`absolute text-white font-bold text-xl drop-shadow-md pointer-events-none ${
                      watermarkPosition.includes('bottom') ? 'bottom-12' : watermarkPosition.includes('top') ? 'top-4' : 'top-1/2 -translate-y-1/2'
                    } ${
                      watermarkPosition.includes('right') ? 'right-4 text-right' : watermarkPosition.includes('left') ? 'left-4 text-left' : 'left-1/2 -translate-x-1/2 text-center'
                    }`} 
                    style={{ 
                      textShadow: '2px 2px 8px rgba(0,0,0,0.8)',
                      opacity: watermarkOpacity / 100
                    }}
                  >
                    {watermarkText}
                  </div>
                )}
                {watermarkType === 'image' && watermarkImage && (
                  <img 
                    src={watermarkImage} 
                    className={`absolute w-24 h-24 object-contain pointer-events-none ${
                      watermarkPosition.includes('bottom') ? 'bottom-12' : watermarkPosition.includes('top') ? 'top-4' : 'top-1/2 -translate-y-1/2'
                    } ${
                      watermarkPosition.includes('right') ? 'right-4' : watermarkPosition.includes('left') ? 'left-4' : 'left-1/2 -translate-x-1/2'
                    }`}
                    style={{ opacity: watermarkOpacity / 100 }}
                  />
                )}
                {isDownloading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm z-50">
                    <div className="bg-white dark:bg-zinc-800 p-6 rounded-3xl flex flex-col items-center gap-4 shadow-2xl min-w-[240px]">
                      <Loader2 size={28} className="text-indigo-500 animate-spin" />
                      <div className="flex flex-col items-center gap-1 w-full">
                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                          {downloadStatus || 'Processing Video...'}
                        </span>
                        {downloadProgress > 0 && downloadProgress < 100 && (
                          <div className="w-full flex flex-col gap-2 mt-2">
                            <div className="w-full bg-zinc-100 dark:bg-zinc-700 rounded-full h-1.5 overflow-hidden">
                              <motion.div
                                className="bg-indigo-500 h-full"
                                initial={{ width: 0 }}
                                animate={{ width: `${downloadProgress}%` }}
                                transition={{ duration: 0.1 }}
                              />
                            </div>
                            <span className="text-xs text-zinc-500 dark:text-zinc-400 text-center font-medium">
                              {downloadProgress}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
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
                    onClick={() => shareContent(t('common.videoGen.title'), prompt, generatedVideo, 'generated-video.mp4', 'video/mp4')}
                    className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 dark:text-zinc-100 rounded-2xl text-sm font-medium shadow-sm cursor-pointer disabled:opacity-50"
                    disabled={isDownloading}
                  >
                    <Share2 size={18} />
                    {t('common.share', 'Share')}
                  </button>
                  <button
                    onClick={() => printAIResponse({
                      title: title || t('common.videoGen.title', 'AI 影片生成'),
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
                    className="flex items-center gap-2 px-6 py-2.5 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 rounded-2xl text-sm font-medium hover:bg-black dark:hover:bg-white transition-colors shadow-sm disabled:opacity-50"
                  >
                    <Download size={18} />
                    {t('common.videoGen.downloadVideo')}
                  </button>
                </div>
                <RatingFeedback featureId="video-gen" responseId={generatedVideo} className="mt-4 border-t border-zinc-200/20" />
              </div>
            </motion.div>
          ) : (
            <div className="flex flex-col items-center text-zinc-500 dark:text-zinc-400 space-y-4 p-8 text-center">
              <div className="w-20 h-20 rounded-full glass-panel shadow-sm flex items-center justify-center">
                <Film size={28} className="text-zinc-400 dark:text-zinc-500" />
              </div>
              <div>
                <p className="font-medium text-zinc-600 dark:text-zinc-300 tracking-wide">{t('common.videoGen.notGeneratedYet')}</p>
                <p className="text-sm mt-1 font-light text-zinc-400 dark:text-zinc-500">{t('common.videoGen.notGeneratedDesc')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
