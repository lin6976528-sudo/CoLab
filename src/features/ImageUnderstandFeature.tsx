import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { Image as ImageIcon, Upload, Loader2, X, Sparkles, Trash2, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import LoadingAnimation from '../components/LoadingAnimation';
import { parseAIError, ParsedError } from '../utils/errorHandling';
import ErrorMessage from '../components/ErrorMessage';
import FeatureTutorial from '../components/FeatureTutorial';
import { printAIResponse } from '../utils/printHelper';
import RatingFeedback from '../components/RatingFeedback';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

interface ImageUnderstandFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function ImageUnderstandFeature({
  modelName,
  title,
  description,
}: ImageUnderstandFeatureProps) {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const { incrementUsage, checkAccess } = useSubscription();
  const [selectedModel, setSelectedModel] = useState(userProfile?.preferences?.defaultModel || modelName);
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<{ file: File; dataUrl: string; base64: string } | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ParsedError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const dataUrl = reader.result as string;
        const base64 = dataUrl.split(',')[1];
        setImage({ file, dataUrl, base64 });
        setResult(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearState = () => {
    if (window.confirm(t('common.imageUnderstand.confirmClear'))) {
      setImage(null);
      setResult(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleAnalyze = async () => {
    if (!image || !prompt.trim() || isLoading) return;

    if (!checkAccess('image-understand')) {
      setError(parseAIError(new Error("Usage limit reached for image understanding. Please upgrade your subscription."), t));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await ai.models.generateContent({
        model: selectedModel,
        contents: {
          parts: [
            {
              inlineData: {
                data: image.base64,
                mimeType: image.file.type,
              },
            },
            { text: prompt },
          ],
        },
      });

      setResult(response.text || t('common.imageUnderstand.noResult'));
      incrementUsage('image-understand');
    } catch (err: any) {
      console.error('Image analysis error:', err);
      setError(parseAIError(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  const tutorialSteps = [
    {
      target: '.image-understand-upload',
      content: t('tutorial.imageUnderstand.upload', 'Upload an image you want the AI to analyze.'),
      disableBeacon: true,
    },
    {
      target: '.image-understand-prompt',
      content: t('tutorial.imageUnderstand.prompt', 'Ask a question or give an instruction about the image.'),
    },
    {
      target: '.image-understand-submit',
      content: t('tutorial.imageUnderstand.submit', 'Click here to analyze the image.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="image-understand" steps={tutorialSteps} />
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight">{title}</h2>
            <div className="flex items-center gap-3">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="glass-input text-zinc-800 text-sm rounded-2xl focus:ring-2 focus:ring-white/50 focus:border-white block py-2 px-3 outline-none transition-all shadow-sm"
              >
                <option value="gemini-3.1-pro-preview">Gemini 3.1 Pro</option>
                <option value="gemini-3-flash-preview">Gemini 3 Flash</option>
              </select>
              {(image || result) && (
                <button
                  onClick={clearState}
                  className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                  title={t('common.imageUnderstand.clearContent')}
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          </div>
          <p className="text-sm text-zinc-500 font-light tracking-wide">{description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-10 bg-transparent">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row gap-8 lg:gap-12">
          <div className="w-full md:w-1/2 space-y-6">
          <div
            className={`image-understand-upload relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${
              image ? 'border-white/20 glass-panel shadow-sm' : 'border-white/40 hover:border-white/60 hover:bg-white/10 cursor-pointer glass-panel'
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
                <img src={image.dataUrl} alt="Preview" className="max-w-full max-h-full object-contain rounded-2xl shadow-sm border border-white/20" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setImage(null);
                    setResult(null);
                  }}
                  className="absolute -top-3 -right-3 p-2 bg-white/90 backdrop-blur-sm border border-white/30 rounded-full text-zinc-500 hover:text-red-500 hover:bg-red-50 shadow-sm transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <>
                <div className="w-16 h-16 rounded-full glass-panel flex items-center justify-center mb-4 shadow-sm text-zinc-500">
                  <Upload size={24} />
                </div>
                <p className="font-medium text-zinc-700 tracking-wide">{t('common.imageUnderstand.uploadImage')}</p>
                <p className="text-sm text-zinc-500 mt-1 font-light">{t('common.imageUnderstand.uploadNote')}</p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 tracking-wide">{t('common.imageUnderstand.prompt')}</label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="image-understand-prompt w-full p-4 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 transition-all outline-none font-light"
                disabled={isLoading || !image}
              />
            </div>

            <button
              onClick={handleAnalyze}
              disabled={!image || !prompt.trim() || isLoading}
              className="image-understand-submit w-full flex items-center justify-center gap-3 py-4 px-6 bg-black/80 backdrop-blur-md text-white rounded-2xl text-sm font-medium tracking-wide hover:bg-black disabled:opacity-50 disabled:hover:bg-black/80 transition-all shadow-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('common.imageUnderstand.analyzingBtn')}
                </>
              ) : (
                <>
                  <ImageIcon size={18} />
                  {t('common.imageUnderstand.analyzeImage')}
                </>
              )}
            </button>
          </div>

          {error && (
            <ErrorMessage error={error} />
          )}
        </div>

        <div className="w-full md:w-1/2 flex flex-col glass-panel rounded-3xl overflow-hidden shadow-sm min-h-[500px]">
          <div className="p-6 border-b border-white/20 bg-white/30 backdrop-blur-sm">
            <h3 className="font-medium text-zinc-800 tracking-wide">{t('common.imageUnderstand.analysisResult')}</h3>
          </div>
          <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-transparent">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center w-full">
                <LoadingAnimation text={t('common.imageUnderstand.processing')} />
              </div>
            ) : result ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="prose prose-sm md:prose-base max-w-none prose-zinc prose-a:text-zinc-900 hover:prose-a:text-zinc-600 font-light leading-relaxed"
              >
                <ReactMarkdown>{result}</ReactMarkdown>
                
                <div className="mt-6 flex justify-start">
                  <button
                    onClick={() => printAIResponse({
                      title: title || t('common.imageUnderstand.analysisResult', '影像辨識與分析結果'),
                      subtitle: prompt,
                      mediaUrl: image ? image.dataUrl : undefined,
                      mediaType: 'image',
                      content: result
                    })}
                    className="flex items-center gap-2 px-5 py-2 glass-button text-zinc-900 dark:text-zinc-100 rounded-xl text-sm font-medium shadow-sm transition-all focus:outline-hidden hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>{t('common.print', 'Print')}</span>
                  </button>
                </div>
                <RatingFeedback featureId="image-understand" responseId={result} className="mt-6 border-t border-zinc-200/20" />
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 text-center p-8">
                <div className="w-20 h-20 rounded-full glass-panel shadow-sm flex items-center justify-center">
                  <ImageIcon size={28} className="text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-600 tracking-wide">{t('common.imageUnderstand.notAnalyzedYet')}</p>
                  <p className="text-sm mt-1 font-light text-zinc-400">{t('common.imageUnderstand.notAnalyzedDesc')}</p>
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
