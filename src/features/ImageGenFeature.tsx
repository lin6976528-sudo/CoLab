import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { ImagePlus, Loader2, Download, Sparkles, Trash2, Share2, Info, Printer } from 'lucide-react';
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

interface ImageGenFeatureProps {
  modelName: string;
  title: string;
  description: string;
  allowAspectRatio?: boolean;
  allowImageSize?: boolean;
}

export default function ImageGenFeature({
  modelName,
  title,
  description,
  allowAspectRatio = false,
  allowImageSize = false,
}: ImageGenFeatureProps) {
  const { t } = useTranslation();
  const { addHistoryItem } = useHistory();
  const { logActivity } = useRecentActivity();
  const { incrementUsage, checkAccess } = useSubscription();
  const [selectedModel, setSelectedModel] = useState(modelName);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState('1:1');
  const [imageSize, setImageSize] = useState('1K');
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<ParsedError | null>(null);

  useEffect(() => {
    try {
      const staged = localStorage.getItem('co_staged_prompt');
      if (staged) {
        const stageObj = JSON.parse(staged);
        if (stageObj && stageObj.featureId === 'image-gen' && stageObj.content) {
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

  const clearState = () => {
    if (window.confirm(t('common.imageGen.confirmClear'))) {
      setPrompt('');
      setGeneratedImage(null);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim() || isLoading) return;

    if (!checkAccess('image-gen')) {
      setError(parseAIError(new Error("Usage limit reached for image generation. Please upgrade your subscription."), t));
      return;
    }

    const requiresKey = selectedModel === 'gemini-3-pro-image-preview' || selectedModel === 'gemini-3.1-flash-image-preview';
    
    if (requiresKey) {
      const hasKey = await checkApiKey();
      if (!hasKey) {
        setError(parseAIError(new Error(t('common.imageGen.needApiKey')), t));
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    try {
      const currentAi = requiresKey ? new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY }) : ai;
      const config: any = {
        imageConfig: {},
      };

      if (allowAspectRatio) {
        config.imageConfig.aspectRatio = aspectRatio;
      }
      if (allowImageSize) {
        config.imageConfig.imageSize = imageSize;
      }

      const response = await currentAi.models.generateContent({
        model: selectedModel,
        contents: {
          parts: [{ text: prompt }],
        },
        config: Object.keys(config.imageConfig).length > 0 ? config : undefined,
      });

      let imageUrl = null;
      if (response.candidates?.[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.inlineData) {
            const base64EncodeString = part.inlineData.data;
            imageUrl = `data:image/png;base64,${base64EncodeString}`;
            break;
          }
        }
      }

      if (imageUrl) {
        setGeneratedImage(imageUrl);
        incrementUsage('image-gen');
        logActivity({
          id: `img-${Date.now()}`,
          type: 'task',
          name: prompt.substring(0, 30) + (prompt.length > 30 ? '...' : ''),
          featureId: 'image-gen',
          detail: `使用 ${selectedModel} 生成圖片`,
          icon: 'Image'
        });
        addHistoryItem({
          tool: 'image-gen',
          prompt: prompt,
          result: imageUrl,
          model: selectedModel,
        });
      } else {
        const errorVal = new Error(t('common.imageGen.noImageGenerated'));
        setError(parseAIError(errorVal, t));
        addHistoryItem({
          tool: 'image-gen',
          prompt: prompt,
          result: errorVal.message,
          model: selectedModel,
          isError: true,
          errorMessage: errorVal.message
        }).catch(e => console.error('Failed to log error to database', e));
      }
    } catch (err: any) {
      console.error('Image generation error:', err);
      const parsed = parseAIError(err, t);
      setError(parsed);
      addHistoryItem({
        tool: 'image-gen',
        prompt: prompt,
        result: parsed.message || String(err),
        model: selectedModel,
        isError: true,
        errorMessage: parsed.message || String(err)
      }).catch(e => console.error('Failed to log error to database', e));
    } finally {
      setIsLoading(false);
    }
  };

  const tutorialSteps = [
    {
      target: '.image-gen-prompt',
      content: t('tutorial.imageGen.prompt', 'Describe the image you want to generate in detail.'),
      disableBeacon: true,
    },
    {
      target: '.image-gen-aspect-ratio',
      content: t('tutorial.imageGen.aspectRatio', 'Choose the aspect ratio for your generated image.'),
    },
    {
      target: '.image-gen-submit',
      content: t('tutorial.imageGen.submit', 'Click here to generate your image.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="image-gen" steps={tutorialSteps} />
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight">{title}</h2>
            {generatedImage && (
              <button
                onClick={clearState}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title={t('common.imageGen.clearImage')}
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
          {(selectedModel === 'gemini-3-pro-image-preview' || selectedModel === 'gemini-3.1-flash-image-preview') && (
            <div className="p-4 glass-panel border border-amber-200/50 rounded-2xl text-sm text-amber-800 flex flex-col gap-3 shadow-sm font-light">
              <div className="flex items-start gap-2">
                <Sparkles size={16} className="mt-0.5 flex-shrink-0" />
                <p>{t('common.imageGen.apiKeyRequired')}</p>
              </div>
              <button 
                onClick={handleSelectKey}
                className="px-4 py-2 glass-button text-amber-900 rounded-xl font-medium transition-colors self-start shadow-sm active:scale-[0.98]"
              >
                {t('common.imageGen.selectApiKey')}
              </button>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 tracking-wide">{t('common.imageGen.model', 'Model')}</label>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="w-full p-3.5 glass-input rounded-2xl focus:bg-white/50 focus:border-white focus:ring-4 focus:ring-white/30 transition-all outline-none font-light"
                disabled={isLoading}
              >
                <option value="imagen-3.0-generate-002">{t('common.imageGen.modelImagen', 'Imagen 3.0 (Generate)')}</option>
                <option value="gemini-3.1-flash-image-preview">{t('common.imageGen.modelGeminiFlash', 'Gemini 3.1 Flash Image Preview (Fast)')}</option>
                <option value="gemini-3-pro-image-preview">{t('common.imageGen.modelGeminiPro', 'Gemini 3.0 Pro Image Preview (High Quality)')}</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 tracking-wide">{t('common.imageGen.prompt')}</label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('common.imageGen.promptPlaceholder')}
                className="image-gen-prompt w-full p-4 glass-input rounded-2xl focus:bg-white/50 focus:border-white focus:ring-4 focus:ring-white/30 transition-all outline-none resize-none h-32 font-light"
                disabled={isLoading}
              />
              <div className="mt-2 flex items-start text-xs text-zinc-500 font-light gap-1.5 p-2 bg-white/30 rounded-xl">
                <Info size={14} className="mt-0.5 flex-shrink-0" />
                <p>{t('common.imageGen.promptGuidance', 'Tip: Be specific about the subject, style, lighting, camera angle, and mood for better results. (e.g., "A hyper-realistic close-up portrait of a cyberpunk fox, neon rim lighting, cinematic 85mm lens, atmospheric mist")')}</p>
              </div>
            </div>

            {allowAspectRatio && (
              <div className="image-gen-aspect-ratio">
                <label className="block text-sm font-medium text-zinc-700 mb-3 tracking-wide">{t('common.imageGen.aspectRatio')}</label>
                <div className="grid grid-cols-4 gap-2">
                  {['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'].map((ratio) => {
                    const [w, h] = ratio.split(':').map(Number);
                    const max = Math.max(w, h);
                    const width = (w / max) * 16;
                    const height = (h / max) * 16;
                    
                    return (
                      <button
                        key={ratio}
                        type="button"
                        onClick={() => setAspectRatio(ratio)}
                        disabled={isLoading}
                        className={`py-3 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
                          aspectRatio === ratio
                            ? 'bg-black/80 backdrop-blur-md text-white shadow-md ring-1 ring-white/20'
                            : 'glass-button text-zinc-600 shadow-sm'
                        }`}
                      >
                        <div className="w-5 h-5 flex items-center justify-center mb-1.5 opacity-80">
                          <div 
                            className="border-current border-[1.5px] rounded-[3px]" 
                            style={{ width: `${width}px`, height: `${height}px` }}
                          />
                        </div>
                        <span className="text-[10px] font-mono font-medium tracking-wider">{ratio}</span>
                      </button>
                    );
                  })}
                </div>
                {modelName !== 'gemini-3-pro-image-preview' && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {['4:1', '1:4', '8:1', '1:8'].map((ratio) => {
                      const [w, h] = ratio.split(':').map(Number);
                      const max = Math.max(w, h);
                      const width = (w / max) * 16;
                      const height = (h / max) * 16;
                      
                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => setAspectRatio(ratio)}
                          disabled={isLoading}
                          className={`py-2 px-1 rounded-2xl flex flex-col items-center justify-center transition-all ${
                            aspectRatio === ratio
                              ? 'bg-black/80 backdrop-blur-md text-white shadow-md ring-1 ring-white/20'
                              : 'glass-button text-zinc-600 shadow-sm'
                          }`}
                        >
                          <div className="w-5 h-5 flex items-center justify-center mb-1 opacity-80">
                            <div 
                              className={`border-current border-[1.5px] ${ratio.includes('8') ? 'rounded-[1px]' : 'rounded-[2px]'}`} 
                              style={{ width: `${width}px`, height: `${height}px` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono font-medium tracking-wider">{ratio}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {allowImageSize && (
              <div>
                <label className="block text-sm font-medium text-zinc-700 mb-3 tracking-wide">{t('common.imageGen.imageSize')}</label>
                <div className={`grid ${modelName === 'gemini-3-pro-image-preview' ? 'grid-cols-3' : 'grid-cols-4'} gap-2`}>
                  {(modelName === 'gemini-3-pro-image-preview' ? ['1K', '2K', '4K'] : ['512px', '1K', '2K', '4K']).map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setImageSize(size)}
                      disabled={isLoading}
                      className={`py-2.5 px-2 rounded-2xl text-xs font-medium transition-all ${
                        imageSize === size
                          ? 'bg-black/80 backdrop-blur-md text-white shadow-md ring-1 ring-white/20'
                          : 'glass-button text-zinc-600 shadow-sm'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!prompt.trim() || isLoading}
              className="image-gen-submit w-full flex items-center justify-center gap-3 py-4 px-6 bg-black/80 backdrop-blur-md text-white rounded-2xl text-sm font-medium tracking-wide hover:bg-black disabled:opacity-50 disabled:hover:bg-black/80 transition-all shadow-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('common.imageGen.generating')}
                </>
              ) : (
                <>
                  <ImagePlus size={18} />
                  {t('common.imageGen.generateImage')}
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
            <div className="flex flex-col items-center justify-center h-full w-full">
              <LoadingAnimation text={t('common.imageGen.creatingMasterpiece')} />
            </div>
          ) : generatedImage ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-transparent"
            >
              <img
                src={generatedImage}
                alt="Generated"
                className="max-w-full max-h-[calc(100%-80px)] object-contain rounded-2xl shadow-md border border-white/20"
              />
              <div className="mt-6 flex justify-center gap-3 w-full shrink-0">
                <button
                  onClick={() => shareContent(t('common.imageGen.title'), prompt, generatedImage, 'generated-image.png', 'image/png')}
                  className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 rounded-2xl text-sm font-medium shadow-sm cursor-pointer"
                >
                  <Share2 size={18} />
                  {t('common.share', 'Share')}
                </button>
                <button
                  onClick={() => printAIResponse({
                    title: title || t('common.imageGen.title', 'AI 圖片生成'),
                    subtitle: prompt,
                    mediaUrl: generatedImage,
                    mediaType: 'image'
                  })}
                  className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 rounded-2xl text-sm font-medium shadow-sm transition-all cursor-pointer"
                  title={t('common.printResponse', '列印影像')}
                >
                  <Printer size={18} />
                  <span>{t('common.print', 'Print')}</span>
                </button>
                <a
                  href={generatedImage}
                  download="generated-image.png"
                  className="flex items-center gap-2 px-6 py-2.5 bg-black/80 backdrop-blur-md text-white rounded-2xl text-sm font-medium hover:bg-black transition-colors shadow-sm"
                >
                  <Download size={18} />
                  {t('common.imageGen.downloadImage')}
                </a>
              </div>
              <RatingFeedback featureId="image-gen" responseId={generatedImage} prompt={prompt} response={generatedImage} className="mt-4 border-t border-zinc-200/20" />
            </motion.div>
          ) : (
            <div className="flex flex-col items-center text-zinc-500 space-y-4 p-8 text-center">
              <div className="w-20 h-20 rounded-full glass-panel shadow-sm flex items-center justify-center">
                <ImagePlus size={28} className="text-zinc-400" />
              </div>
              <div>
                <p className="font-medium text-zinc-600 tracking-wide">{t('common.imageGen.notGeneratedYet')}</p>
                <p className="text-sm mt-1 font-light text-zinc-400">{t('common.imageGen.notGeneratedDesc')}</p>
              </div>
            </div>
          )}
        </div>
      </div>
      </div>
    </div>
  );
}
