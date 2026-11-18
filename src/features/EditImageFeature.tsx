import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { Wand2, Upload, Loader2, X, Download, Sparkles, Trash2, Share2, Printer } from 'lucide-react';
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

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

interface EditImageFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function EditImageFeature({
  modelName,
  title,
  description,
}: EditImageFeatureProps) {
  const { t } = useTranslation();
  const { addHistoryItem } = useHistory();
  const { incrementUsage, checkAccess } = useSubscription();
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<{ file: File; dataUrl: string; base64: string } | null>(null);
  const [resultImage, setResultImage] = useState<string | null>(null);
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
        setResultImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearState = () => {
    if (window.confirm(t('common.editImage.confirmClear'))) {
      setImage(null);
      setResultImage(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleEdit = async () => {
    if (!image || !prompt.trim() || isLoading) return;

    if (!checkAccess('edit-image')) {
      setError(parseAIError(new Error("Usage limit reached for image editing. Please upgrade your subscription."), t));
      return;
    }

    setIsLoading(true);
    setError(null);
    setResultImage(null);

    try {
      const response = await ai.models.generateContent({
        model: modelName,
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
        setResultImage(imageUrl);
        incrementUsage('edit-image');
        addHistoryItem({
          tool: 'edit-image',
          prompt: prompt,
          result: imageUrl,
          model: modelName,
        });
      } else {
        setError(parseAIError(new Error(t('common.editImage.noImageGenerated')), t));
      }
    } catch (err: any) {
      console.error('Image editing error:', err);
      setError(parseAIError(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  const tutorialSteps = [
    {
      target: '.edit-image-upload',
      content: t('tutorial.editImage.upload', 'Upload the image you want to edit.'),
      disableBeacon: true,
    },
    {
      target: '.edit-image-prompt',
      content: t('tutorial.editImage.prompt', 'Describe how you want to edit the image.'),
    },
    {
      target: '.edit-image-submit',
      content: t('tutorial.editImage.submit', 'Click here to apply the edits.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="edit-image" steps={tutorialSteps} />
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight">{title}</h2>
            {(image || resultImage) && (
              <button
                onClick={clearState}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title={t('common.editImage.clearImage')}
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
          <div
            className={`edit-image-upload relative border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center text-center transition-all duration-300 ${
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
                    setResultImage(null);
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
                <p className="font-medium text-zinc-700 tracking-wide">{t('common.editImage.uploadImage')}</p>
                <p className="text-sm text-zinc-500 mt-1 font-light">{t('common.editImage.uploadNote')}</p>
              </>
            )}
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-zinc-700 mb-2 tracking-wide">{t('common.editImage.prompt')}</label>
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="edit-image-prompt w-full p-4 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 transition-all outline-none font-light"
                disabled={isLoading || !image}
              />
            </div>

            <button
              onClick={handleEdit}
              disabled={!image || !prompt.trim() || isLoading}
              className="edit-image-submit w-full flex items-center justify-center gap-3 py-4 px-6 bg-black/80 backdrop-blur-md text-white rounded-2xl text-sm font-medium tracking-wide hover:bg-black disabled:opacity-50 disabled:hover:bg-black/80 transition-all shadow-sm active:scale-[0.98]"
            >
              {isLoading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {t('common.editImage.editingBtn')}
                </>
              ) : (
                <>
                  <Wand2 size={18} />
                  {t('common.editImage.editImage')}
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
            <h3 className="font-medium text-zinc-800 tracking-wide">{t('common.editImage.editResult')}</h3>
          </div>
          <div className="flex-1 p-6 md:p-8 overflow-y-auto flex items-center justify-center relative bg-transparent">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full w-full">
                <LoadingAnimation text={t('common.editImage.processing')} />
              </div>
            ) : resultImage ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full h-full flex flex-col items-center justify-center p-6 bg-transparent"
              >
                <img src={resultImage} alt="Edited" className="max-w-full max-h-[calc(100%-80px)] object-contain rounded-2xl shadow-md border border-white/20" />
                <div className="mt-6 flex justify-center gap-3 w-full shrink-0">
                  <button
                    onClick={() => shareContent(t('common.editImage.title'), prompt, resultImage, 'edited-image.png', 'image/png')}
                    className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 rounded-2xl text-sm font-medium shadow-sm cursor-pointer"
                  >
                    <Share2 size={18} />
                    {t('common.share', 'Share')}
                  </button>
                  <button
                    onClick={() => printAIResponse({
                      title: title || t('common.editImage.title', 'AI 圖片編輯與重繪'),
                      subtitle: prompt,
                      mediaUrl: resultImage,
                      mediaType: 'image'
                    })}
                    className="flex items-center gap-2 px-6 py-2.5 glass-button text-zinc-900 rounded-2xl text-sm font-medium shadow-sm transition-all focus:outline-hidden hover:scale-105 active:scale-95 cursor-pointer"
                    title={t('common.printResponse', '列印對話')}
                  >
                    <Printer size={18} />
                    <span>{t('common.print', 'Print')}</span>
                  </button>
                  <a
                    href={resultImage}
                    download="edited-image.png"
                    className="flex items-center gap-2 px-6 py-2.5 bg-black/80 backdrop-blur-md text-white rounded-2xl text-sm font-medium hover:bg-black transition-colors shadow-sm"
                  >
                    <Download size={18} />
                    {t('common.editImage.downloadImage')}
                  </a>
                </div>
                <RatingFeedback featureId="edit-image" responseId={resultImage} className="mt-4 border-t border-zinc-200/20" />
              </motion.div>
            ) : (
              <div className="flex flex-col items-center text-zinc-500 space-y-4 text-center p-8">
                <div className="w-20 h-20 rounded-full glass-panel shadow-sm flex items-center justify-center">
                  <Wand2 size={28} className="text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-600 tracking-wide">{t('common.editImage.notGeneratedYet')}</p>
                  <p className="text-sm mt-1 font-light text-zinc-400">{t('common.editImage.notGeneratedDesc')}</p>
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
