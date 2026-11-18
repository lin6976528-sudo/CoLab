import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { PlaySquare, Upload, Loader2, X, Download, AlertCircle, Sparkles, Trash2, Share2, Settings2, Image as ImageIcon, Type, Printer } from 'lucide-react';
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

interface AnimateImageFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function AnimateImageFeature({
  modelName,
  title,
  description,
}: AnimateImageFeatureProps) {
  const { t } = useTranslation();
  const { addHistoryItem } = useHistory();
  const { logActivity } = useRecentActivity();
  const { incrementUsage, checkAccess } = useSubscription();
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<{ file: File; dataUrl: string; base64: string } | null>(null);
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [generatedVideo, setGeneratedVideo] = useState<string | null>(null);
  const [error, setError] = useState<ParsedError | null>(null);
  const [status, setStatus] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);

  // Advanced Options State
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [watermarkType, setWatermarkType] = useState<'none' | 'text' | 'image'>('none');
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkImage, setWatermarkImage] = useState<string | null>(null);
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');
  const [watermarkOpacity, setWatermarkOpacity] = useState(50);
  const [downloadFormat, setDownloadFormat] = useState('original');
  const [downloadResolution, setDownloadResolution] = useState('original');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [downloadStatus, setDownloadStatus] = useState('');

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
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setImage({ file, dataUrl, base64 });
        setGeneratedVideo(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleWatermarkImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setWatermarkImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearState = () => {
    if (window.confirm(t('common.animateImage.confirmClear'))) {
      setImage(null);
      setPrompt('');
      setGeneratedVideo(null);
      setError(null);
      setStatus('');
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const downloadVideo = async () => {
    if (!generatedVideo) return;
    
    const hasWatermark = watermarkType !== 'none' && (watermarkType === 'text' ? !!watermarkText : !!watermarkImage);
    const needsTranscoding = hasWatermark || downloadFormat !== 'original' || downloadResolution !== 'original';

    if (!needsTranscoding) {
      const a = document.createElement('a');
      a.href = generatedVideo;
      a.download = `animated-video-${Date.now()}.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    setIsDownloading(true);
    setDownloadProgress(0);
    setDownloadStatus(t('common.videoGen.preparingVideo', 'Preparing video...'));
    try {
      const video = document.createElement('video');
      video.src = generatedVideo;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';
      await new Promise((resolve) => {
        video.onloadedmetadata = resolve;
      });

      setDownloadStatus(t('common.videoGen.processingFrames', 'Processing frames...'));

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
        setDownloadStatus(t('common.videoGen.finalizingDownload', 'Finalizing download...'));
        const blob = new Blob(chunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
        a.download = `animated-video-${Date.now()}.${ext}`;
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
            setDownloadStatus(t('common.videoGen.encodingVideo', 'Encoding video...'));
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

      requestAnimationFrame(drawFrame);

    } catch (err) {
      console.error('Error downloading video:', err);
      setIsDownloading(false);
      setDownloadProgress(0);
      setDownloadStatus('');
      alert(t('common.videoGen.downloadError', 'Failed to process and download video.'));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image || isLoading) return;

    if (!checkAccess('animate-image')) {
      setError(parseAIError(new Error("Usage limit reached for image animation. Please upgrade your subscription."), t));
      return;
    }

    const hasKey = await checkApiKey();
    if (!hasKey) {
      setError(parseAIError(new Error(t('common.animateImage.needApiKey')), t));
      return;
    }

    setIsLoading(true);
    setProgress(5);
    setError(null);
    setGeneratedVideo(null);
    setStatus(t('common.animateImage.initializing'));

    try {
      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

      setProgress(15);
      let operation = await currentAi.models.generateVideos({
        model: modelName,
        prompt: prompt || undefined,
        image: {
          imageBytes: image.base64,
          mimeType: image.file.type,
        },
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: aspectRatio,
        }
      });

      setStatus(t('common.animateImage.generating'));
      setProgress(30);

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        setProgress(prev => Math.min(prev + (Math.random() * 5 + 2), 95));
        setStatus(t('common.animateImage.stillGenerating'));
        operation = await currentAi.operations.getVideosOperation({operation: operation});
      }

      setProgress(100);
      
      if (operation.error) {
        throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error'}`);
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      
      if (downloadLink) {
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
          incrementUsage('animate-image');
          setStatus('');
          logActivity({
            id: `ani-${Date.now()}`,
            type: 'task',
            name: prompt ? (prompt.substring(0, 30) + (prompt.length > 30 ? '...' : '')) : '圖生影片',
            featureId: 'animate-image',
            detail: `使用 ${modelName} 動畫化圖片`,
            icon: 'PlaySquare'
          });
          addHistoryItem({
            tool: 'animate-image',
            prompt: prompt || 'Animated image',
            result: url,
            model: modelName,
          });
        } else {
          throw new Error(t('common.animateImage.fetchError'));
        }
      } else {
        throw new Error(t('common.animateImage.noVideoGenerated'));
      }

    } catch (err: any) {
      console.error('Video generation error:', err);
      setError(parseAIError(err, t));
      setStatus('');
    } finally {
      setIsLoading(false);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, {
          body: 'Image animation has completed.',
          icon: '/vite.svg'
        });
      }
    }
  };

  const tutorialSteps = [
    {
      target: '.animate-image-upload',
      content: t('tutorial.animateImage.upload', 'Upload the image you want to animate.'),
      disableBeacon: true,
    },
    {
      target: '.animate-image-prompt',
      content: t('tutorial.animateImage.prompt', 'Describe how you want the image to be animated.'),
    },
    {
      target: '.animate-image-submit',
      content: t('tutorial.animateImage.submit', 'Click here to generate the animation.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="animate-image" steps={tutorialSteps} />
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 dark:border-white/5 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
            {(image || generatedVideo) && (
              <button
                onClick={clearState}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                title={t('common.animateImage.clearContent')}
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
              <p>{t('common.animateImage.apiKeyRequired')}</p>
            </div>
            <button 
              onClick={handleSelectKey}
              className="px-4 py-2 bg-amber-100/50 hover:bg-amber-200/50 dark:bg-amber-900/20 dark:hover:bg-amber-900/40 text-amber-900 dark:text-amber-100 rounded-lg font-medium transition-colors self-start border border-amber-200/50 dark:border-amber-800/30 shadow-sm active:scale-[0.98]"
            >
              {t('common.animateImage.selectApiKey')}
            </button>
          </div>

          <div
            className={`animate-image-upload relative border-2 border-dashed rounded-3xl p-6 flex flex-col items-center justify-center text-center transition-all duration-300 ${
              image ? 'border-white/20 dark:border-white/5 glass-panel shadow-sm' : 'border-white/40 dark:border-white/10 hover:border-white/60 dark:hover:border-white/20 hover:bg-white/10 dark:hover:bg-white/5 cursor-pointer glass-panel'
            }`}
            onClick={() => !image && fileInputRef.current?.click()}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            
            {image ? (
              <div className="relative w-full aspect-video flex items-center justify-center">
                <img src={image.dataUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-sm border border-white/20 dark:border-white/5" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImage(null);
                    setGeneratedVideo(null);
                  }}
                  className="absolute -top-3 -right-3 p-2 bg-white/90 dark:bg-zinc-800/90 backdrop-blur-sm border border-white/30 dark:border-white/10 rounded-full text-zinc-500 dark:text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 shadow-sm transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full glass-panel flex items-center justify-center mb-3 shadow-sm text-zinc-500 dark:text-zinc-400">
                  <Upload size={20} />
                </div>
                <p className="font-medium text-zinc-700 dark:text-zinc-300 text-sm tracking-wide">{t('common.animateImage.uploadImage')}</p>
              </>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">{t('common.animateImage.prompt')}</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('common.animateImage.promptPlaceholder')}
                className="animate-image-prompt w-full p-4 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 dark:focus:ring-zinc-800/50 transition-all outline-none resize-none h-24 font-light dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                disabled={isLoading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">{t('common.animateImage.aspectRatio')}</label>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value)}
                className="w-full p-3.5 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 dark:focus:ring-zinc-800/50 transition-all outline-none font-light dark:text-zinc-100"
                disabled={isLoading}
              >
                <option value="16:9">{t('common.animateImage.aspectRatio16_9')}</option>
                <option value="9:16">{t('common.animateImage.aspectRatio9_16')}</option>
              </select>
            </div>

            {/* Advanced Options Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 transition-colors"
              >
                <Settings2 size={16} />
                {showAdvanced ? t('common.videoGen.hideAdvanced', 'Hide Advanced Options') : t('common.videoGen.showAdvanced', 'Show Advanced Options')}
              </button>
            </div>

            {/* Advanced Options Panel */}
            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4 pt-2 overflow-hidden"
              >
                <div className="p-4 glass-panel rounded-2xl space-y-4">
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('common.videoGen.watermark', 'Watermark')}</h3>
                  
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWatermarkType('none')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors ${watermarkType === 'none' ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900' : 'bg-white/50 text-zinc-600 hover:bg-white/80 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
                    >
                      {t('common.videoGen.none', 'None')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkType('text')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${watermarkType === 'text' ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900' : 'bg-white/50 text-zinc-600 hover:bg-white/80 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
                    >
                      <Type size={14} />
                      {t('common.videoGen.text', 'Text')}
                    </button>
                    <button
                      type="button"
                      onClick={() => setWatermarkType('image')}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-medium transition-colors flex items-center justify-center gap-1 ${watermarkType === 'image' ? 'bg-zinc-800 text-white dark:bg-white dark:text-zinc-900' : 'bg-white/50 text-zinc-600 hover:bg-white/80 dark:bg-zinc-800/50 dark:text-zinc-400 dark:hover:bg-zinc-800'}`}
                    >
                      <ImageIcon size={14} />
                      {t('common.videoGen.image', 'Image')}
                    </button>
                  </div>

                  {watermarkType === 'text' && (
                    <div>
                      <input
                        type="text"
                        value={watermarkText}
                        onChange={(e) => setWatermarkText(e.target.value)}
                        placeholder={t('common.videoGen.watermarkTextPlaceholder', 'Enter watermark text...')}
                        className="w-full p-2.5 text-sm glass-input rounded-xl focus:ring-2 focus:ring-white/50 dark:focus:ring-zinc-800/50 transition-all outline-none font-light dark:text-zinc-100 placeholder:text-zinc-400"
                      />
                    </div>
                  )}

                  {watermarkType === 'image' && (
                    <div>
                      <input
                        type="file"
                        accept="image/*"
                        ref={watermarkInputRef}
                        onChange={handleWatermarkImageChange}
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => watermarkInputRef.current?.click()}
                        className="w-full p-2.5 text-sm glass-input rounded-xl hover:bg-white/50 dark:hover:bg-zinc-800/50 transition-colors flex items-center justify-center gap-2 text-zinc-600 dark:text-zinc-300"
                      >
                        <Upload size={16} />
                        {watermarkImage ? t('common.videoGen.changeImage', 'Change Image') : t('common.videoGen.uploadImage', 'Upload Image')}
                      </button>
                      {watermarkImage && (
                        <div className="mt-2 flex justify-center">
                          <img src={watermarkImage} alt="Watermark preview" className="h-12 object-contain rounded" />
                        </div>
                      )}
                    </div>
                  )}

                  {watermarkType !== 'none' && (
                    <div className="space-y-3 pt-2 border-t border-white/10 dark:border-white/5">
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('common.videoGen.position', 'Position')}</label>
                        <select
                          value={watermarkPosition}
                          onChange={(e) => setWatermarkPosition(e.target.value)}
                          className="w-full p-2 text-sm glass-input rounded-xl outline-none dark:text-zinc-100"
                        >
                          <option value="top-left">{t('common.videoGen.topLeft', 'Top Left')}</option>
                          <option value="top-right">{t('common.videoGen.topRight', 'Top Right')}</option>
                          <option value="bottom-left">{t('common.videoGen.bottomLeft', 'Bottom Left')}</option>
                          <option value="bottom-right">{t('common.videoGen.bottomRight', 'Bottom Right')}</option>
                          <option value="center">{t('common.videoGen.center', 'Center')}</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">
                          {t('common.videoGen.opacity', 'Opacity')}: {watermarkOpacity}%
                        </label>
                        <input
                          type="range"
                          min="10"
                          max="100"
                          value={watermarkOpacity}
                          onChange={(e) => setWatermarkOpacity(parseInt(e.target.value))}
                          className="w-full accent-zinc-800 dark:accent-zinc-200"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div className="p-4 glass-panel rounded-2xl space-y-4">
                  <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('common.videoGen.downloadOptions', 'Download Options')}</h3>
                  
                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('common.videoGen.format', 'Format')}</label>
                    <select
                      value={downloadFormat}
                      onChange={(e) => setDownloadFormat(e.target.value)}
                      className="w-full p-2 text-sm glass-input rounded-xl outline-none dark:text-zinc-100"
                    >
                      <option value="original">{t('common.videoGen.originalFormat', 'Original')}</option>
                      <option value="mp4">MP4</option>
                      <option value="webm">WebM</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-500 dark:text-zinc-400 mb-1">{t('common.videoGen.resolution', 'Resolution')}</label>
                    <select
                      value={downloadResolution}
                      onChange={(e) => setDownloadResolution(e.target.value)}
                      className="w-full p-2 text-sm glass-input rounded-xl outline-none dark:text-zinc-100"
                    >
                      <option value="original">{t('common.videoGen.originalResolution', 'Original')}</option>
                      <option value="1080p">1080p</option>
                      <option value="720p">720p</option>
                      <option value="480p">480p</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            <button
              type="submit"
              disabled={!image || isLoading}
              className="animate-image-submit w-full flex items-center justify-center gap-3 py-4 px-6 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 rounded-2xl text-sm font-medium tracking-wide hover:bg-black dark:hover:bg-white disabled:opacity-50 disabled:hover:bg-black/80 dark:disabled:hover:bg-white/90 transition-all shadow-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('common.animateImage.generatingBtn')}
                </>
              ) : (
                <>
                  <PlaySquare size={18} />
                  {t('common.animateImage.generateVideo')}
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
              <p className="text-sm mt-4 font-light text-zinc-400 dark:text-zinc-500 text-center">{t('common.animateImage.generationNote')}</p>
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
                className="max-w-full max-h-[calc(100%-80px)] object-contain rounded-2xl shadow-md border border-white/20 dark:border-white/5"
              />
              
              {/* Download Progress Overlay */}
              {isDownloading && (
                <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm rounded-2xl m-6">
                  <div className="bg-white dark:bg-zinc-900 p-6 rounded-2xl shadow-xl max-w-sm w-full mx-4 flex flex-col items-center text-center">
                    <Loader2 size={32} className="animate-spin text-indigo-500 mb-4" />
                    <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">{downloadStatus}</h3>
                    <div className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-full h-2 mb-2 overflow-hidden">
                      <motion.div
                        className="bg-indigo-500 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${downloadProgress}%` }}
                        transition={{ duration: 0.2 }}
                      />
                    </div>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400">{downloadProgress}%</p>
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-center gap-3 w-full shrink-0">
                <button
                  onClick={() => shareContent(t('common.animateImage.title'), prompt, generatedVideo, 'animated-video.mp4', 'video/mp4')}
                  className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 dark:text-zinc-100 rounded-2xl text-sm font-medium shadow-sm disabled:opacity-50 cursor-pointer"
                  disabled={isDownloading}
                >
                  <Share2 size={18} />
                  {t('common.share', 'Share')}
                </button>
                <button
                  onClick={() => printAIResponse({
                    title: title || t('common.animateImage.title', 'AI 動態圖片'),
                    subtitle: prompt,
                    mediaUrl: generatedVideo,
                    mediaType: 'video'
                  })}
                  className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 dark:text-zinc-100 rounded-2xl text-sm font-medium shadow-sm transition-all focus:outline-hidden hover:scale-105 active:scale-95 cursor-pointer disabled:opacity-50"
                  disabled={isDownloading}
                  title={t('common.printResponse', '列印對話')}
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
                  {t('common.animateImage.downloadVideo')}
                </button>
              </div>
              <RatingFeedback featureId="animate-image" responseId={generatedVideo} className="mt-4 border-t border-zinc-200/20" />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center text-zinc-500 dark:text-zinc-400 space-y-4 p-8 text-center">
              <div className="w-20 h-20 rounded-full glass-panel shadow-sm flex items-center justify-center">
                <PlaySquare size={28} className="text-zinc-400 dark:text-zinc-500" />
              </div>
              <div>
                <p className="font-medium text-zinc-600 dark:text-zinc-300 tracking-wide">{t('common.animateImage.notGeneratedYet')}</p>
                <p className="text-sm mt-1 font-light text-zinc-400 dark:text-zinc-500">{t('common.animateImage.notGeneratedDesc')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}

