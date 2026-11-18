import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { Layers, Plus, Image as ImageIcon, Type, Play, Download, Trash2, CheckCircle2, XCircle, Loader2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { parseAIError, ParsedError } from '../utils/errorHandling';
import ErrorMessage from '../components/ErrorMessage';
import FeatureTutorial from '../components/FeatureTutorial';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import RatingFeedback from '../components/RatingFeedback';

interface BatchItem {
  id: string;
  type: 'text' | 'image';
  content: string; // text content or data URL for image
  mimeType?: string;
  file?: File;
  status: 'idle' | 'processing' | 'success' | 'error';
  result?: string;
  error?: string;
}

interface BatchProcessFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function BatchProcessFeature({
  modelName,
  title,
  description,
}: BatchProcessFeatureProps) {
  const { t } = useTranslation();
  const { userProfile } = useAuth();
  const { incrementUsage, checkAccess } = useSubscription();
  const [selectedModel, setSelectedModel] = useState(userProfile?.preferences?.defaultModel || modelName);
  const [prompt, setPrompt] = useState('');
  const [items, setItems] = useState<BatchItem[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [globalError, setGlobalError] = useState<ParsedError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      const staged = localStorage.getItem('co_staged_prompt');
      if (staged) {
        const stageObj = JSON.parse(staged);
        if (stageObj && stageObj.featureId === 'batch-process' && stageObj.content) {
          setPrompt(stageObj.content);
          localStorage.removeItem('co_staged_prompt');
        }
      }
    } catch (e) {
      console.warn("Failed to retrieve staged prompt:", e);
    }
  }, []);

  const handleAddText = () => {
    const newItem: BatchItem = {
      id: Math.random().toString(36).substring(7),
      type: 'text',
      content: '',
      status: 'idle',
    };
    setItems((prev) => [...prev, newItem]);
  };

  const handleTextChange = (id: string, newText: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, content: newText, status: 'idle', result: undefined, error: undefined } : item))
    );
  };

  const handleRemoveItem = (id: string) => {
    if (window.confirm(t('common.confirmDelete', 'Are you sure you want to permanently delete this item?'))) {
      setItems((prev) => prev.filter((item) => item.id !== id));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newItem: BatchItem = {
          id: Math.random().toString(36).substring(7),
          type: 'image',
          content: reader.result as string,
          mimeType: file.type,
          file: file,
          status: 'idle',
        };
        setItems((prev) => [...prev, newItem]);
      };
      reader.readAsDataURL(file);
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClearAll = () => {
    if (window.confirm(t('features.batch-process.clearAll') + '?')) {
      setItems([]);
      setPrompt('');
      setGlobalError(null);
    }
  };

  const exportCsv = () => {
    const headers = ['ID', 'Type', 'Content/Filename', 'Result', 'Error'];
    const rows = items.map((item) => [
      item.id,
      item.type,
      item.type === 'text' ? item.content : item.file?.name || 'image',
      item.result || '',
      item.error || '',
    ]);
    const csvContent = [headers, ...rows]
      .map((e) => e.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'batch_results.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const runBatch = async () => {
    if (!prompt.trim() || items.length === 0) return;

    if (!checkAccess('batch-process')) {
      setGlobalError(parseAIError(new Error("Usage limit reached for batch processing. Please upgrade your subscription."), t));
      return;
    }

    setIsProcessing(true);
    setGlobalError(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.status === 'success') continue; // Skip already successful

        setItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'processing', error: undefined } : p)));

        try {
          let contents: any;
          if (item.type === 'text') {
            contents = `${prompt}\n\nInput:\n${item.content}`;
          } else {
            const base64Data = item.content.split(',')[1];
            contents = {
              parts: [
                { text: prompt },
                { inlineData: { data: base64Data, mimeType: item.mimeType || 'image/jpeg' } },
              ],
            };
          }

          const response = await ai.models.generateContent({
            model: selectedModel,
            contents: contents,
          });

          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, status: 'success', result: response.text } : p))
          );
          incrementUsage('batch-process');
        } catch (err: any) {
          console.error(`Error processing item ${item.id}:`, err);
          setItems((prev) =>
            prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: err.message || 'Unknown error' } : p))
          );
        }
      }
    } catch (err: any) {
      console.error('Batch processing error:', err);
      setGlobalError(parseAIError(err, t));
    } finally {
      setIsProcessing(false);
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(t('features.batch-process.title', 'Batch Processing'), {
          body: 'Batch processing has completed.',
          icon: '/vite.svg'
        });
      }
    }
  };

  const completedCount = items.filter((i) => i.status === 'success').length;
  const errorCount = items.filter((i) => i.status === 'error').length;
  const processingCount = items.filter((i) => i.status === 'processing').length;
  const idleCount = items.filter((i) => i.status === 'idle').length;
  const totalCount = items.length;

  const tutorialSteps = [
    {
      target: '.batch-process-upload',
      content: t('tutorial.batchProcess.upload', 'Upload images or add text items to process.'),
      disableBeacon: true,
    },
    {
      target: '.batch-process-prompt',
      content: t('tutorial.batchProcess.prompt', 'Enter the prompt to apply to all items.'),
    },
    {
      target: '.batch-process-submit',
      content: t('tutorial.batchProcess.submit', 'Click here to start batch processing.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="batch-process" steps={tutorialSteps} />
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 dark:border-white/5 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 glass-panel text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-sm">
                <Layers size={24} />
              </div>
              <h2 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">{title}</h2>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="glass-input text-zinc-800 dark:text-zinc-200 text-sm rounded-2xl focus:ring-2 focus:ring-white/50 dark:focus:ring-zinc-800/50 focus:border-white dark:focus:border-zinc-700 block py-2 px-3 outline-none transition-all shadow-sm"
              >
                <option value="gemini-3.1-pro-preview" className="dark:bg-zinc-800">Gemini 3.1 Pro</option>
                <option value="gemini-3-flash-preview" className="dark:bg-zinc-800">Gemini 3 Flash</option>
                <option value="gemini-3.1-flash-lite-preview" className="dark:bg-zinc-800">Gemini Flash Lite</option>
              </select>
              {items.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={exportCsv}
                    disabled={completedCount === 0}
                    className="flex items-center gap-2 px-4 py-2 glass-button text-zinc-700 dark:text-zinc-300 rounded-xl text-sm font-medium disabled:opacity-50"
                    title={t('features.batch-process.exportCsv')}
                  >
                    <Download size={16} />
                    <span className="hidden sm:inline">{t('features.batch-process.exportCsv')}</span>
                  </button>
                  <button
                    onClick={handleClearAll}
                    disabled={isProcessing}
                    className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors disabled:opacity-50"
                    title={t('features.batch-process.clearAll')}
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              )}
            </div>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light tracking-wide">{description}</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-8 md:px-12 md:py-10 bg-transparent">
        <div className="max-w-6xl mx-auto flex flex-col lg:flex-row gap-8 lg:gap-12">
          {/* Left Column: Controls */}
          <div className="w-full lg:w-1/3 space-y-6">
            <div className="glass-panel p-6 rounded-3xl shadow-sm">
              <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2 tracking-wide">
                {t('features.batch-process.systemPrompt')}
              </label>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={t('features.batch-process.systemPromptPlaceholder')}
                className="batch-process-prompt w-full p-4 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 dark:focus:ring-zinc-800/50 transition-all outline-none resize-none h-32 font-light dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                disabled={isProcessing}
              />

              <div className="batch-process-upload mt-6 flex flex-col gap-3">
                <button
                  onClick={handleAddText}
                  disabled={isProcessing}
                  className="flex items-center justify-center gap-2 w-full py-3 px-4 glass-button text-zinc-700 dark:text-zinc-300 rounded-2xl text-sm font-medium disabled:opacity-50"
                >
                  <Type size={16} />
                  {t('features.batch-process.addText')}
                </button>
                <label className="flex items-center justify-center gap-2 w-full py-3 px-4 glass-button text-zinc-700 dark:text-zinc-300 rounded-2xl text-sm font-medium cursor-pointer disabled:opacity-50">
                  <ImageIcon size={16} />
                  {t('features.batch-process.addImages')}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                    disabled={isProcessing}
                    ref={fileInputRef}
                  />
                </label>
              </div>

              <div className="mt-8 pt-6 border-t border-white/20 dark:border-white/5">
                <button
                  onClick={runBatch}
                  disabled={isProcessing || items.length === 0 || !prompt.trim()}
                  className="batch-process-submit w-full flex items-center justify-center gap-3 py-4 px-6 bg-black/80 dark:bg-white/90 backdrop-blur-md text-white dark:text-zinc-900 rounded-2xl text-sm font-medium tracking-wide hover:bg-black dark:hover:bg-white disabled:opacity-50 disabled:hover:bg-black/80 dark:disabled:hover:bg-white/90 transition-all shadow-sm active:scale-[0.98]"
                >
                  {isProcessing ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      {t('features.batch-process.status.processing')}
                    </>
                  ) : (
                    <>
                      <Play size={18} />
                      {t('features.batch-process.runBatch')}
                    </>
                  )}
                </button>
              </div>
            </div>

            {globalError && <ErrorMessage error={globalError} />}

            {totalCount > 0 && (
              <div className="glass-panel p-6 rounded-3xl shadow-sm space-y-4">
                <div className="flex justify-between items-center text-sm">
                  <div className="text-zinc-500 dark:text-zinc-400 font-medium">
                    Total: <span className="font-bold text-zinc-900 dark:text-zinc-100">{totalCount}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ {completedCount}</span>
                    {processingCount > 0 && <span className="text-indigo-550 dark:text-indigo-400 font-medium animate-pulse">⚙ {processingCount}</span>}
                    {errorCount > 0 && <span className="text-red-500 dark:text-red-400 font-medium">✗ {errorCount}</span>}
                  </div>
                </div>
                
                {/* Visual unified segmented progress bar */}
                <div className="w-full bg-zinc-100 dark:bg-zinc-850/60 rounded-full h-2 overflow-hidden flex shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] border border-zinc-200/10">
                  {completedCount > 0 && (
                    <motion.div
                      className="bg-emerald-500 h-full shrink-0"
                      initial={{ width: 0 }}
                      animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  {processingCount > 0 && (
                    <motion.div
                      className="bg-indigo-500 dark:bg-indigo-400 h-full shrink-0 animate-pulse"
                      initial={{ width: 0 }}
                      animate={{ width: `${(processingCount / totalCount) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  {errorCount > 0 && (
                    <motion.div
                      className="bg-red-500 h-full shrink-0"
                      initial={{ width: 0 }}
                      animate={{ width: `${(errorCount / totalCount) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  {idleCount > 0 && (
                    <motion.div
                      className="bg-zinc-200 dark:bg-zinc-700 h-full shrink-0"
                      initial={{ width: 0 }}
                      animate={{ width: `${(idleCount / totalCount) * 100}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Items List */}
          <div className="w-full lg:w-2/3 space-y-4">
            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 glass-panel rounded-3xl border-dashed text-zinc-400 dark:text-zinc-500 p-8 text-center">
                <Layers size={32} className="mb-4 text-zinc-400 dark:text-zinc-500" />
                <p className="font-medium text-zinc-600 dark:text-zinc-400">No items added</p>
                <p className="text-sm mt-1 font-light text-zinc-500 dark:text-zinc-400">Add text or images to begin batch processing</p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Advanced Master Interactive Progress Dashboard */}
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                  className="glass-panel p-6 rounded-3xl shadow-sm border border-zinc-200/50 dark:border-zinc-800/40 bg-white/45 dark:bg-zinc-900/10 backdrop-blur-md relative overflow-hidden"
                >
                  <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${isProcessing ? 'bg-indigo-500 animate-pulse' : 'bg-zinc-400 dark:bg-zinc-600'}`} />
                      <span className="text-xs font-bold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider">
                        {isProcessing ? t('features.batch-process.status.processing') : t('features.batch-process.status.idle')}
                      </span>
                    </div>

                    <div className="text-xs font-bold font-mono px-3 py-1 rounded-full bg-zinc-100 dark:bg-zinc-800/60 text-zinc-650 dark:text-zinc-300">
                      {Math.round(((completedCount + errorCount) / totalCount) * 100)}% {t('features.batch-process.status.success')}
                    </div>
                  </div>

                  {/* High Density grid metric display cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5 mb-5 select-none">
                    <div className="p-3.5 rounded-2xl bg-zinc-50/50 dark:bg-zinc-800/20 border border-zinc-200/30 dark:border-zinc-800/10">
                      <div className="text-[10px] text-zinc-450 dark:text-zinc-500 uppercase font-semibold tracking-wider">Total Queue</div>
                      <div className="text-lg font-extrabold text-zinc-850 dark:text-zinc-100 font-mono mt-0.5">{totalCount}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-emerald-500/5 border border-emerald-500/10 dark:border-emerald-500/5">
                      <div className="text-[10px] text-emerald-600 dark:text-emerald-400 uppercase font-semibold tracking-wider">Succeeded</div>
                      <div className="text-lg font-extrabold text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">{completedCount}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-indigo-500/5 border border-indigo-500/10 dark:border-indigo-400/5">
                      <div className="text-[10px] text-indigo-650 dark:text-indigo-400 uppercase font-semibold tracking-wider">Processing</div>
                      <div className="text-lg font-extrabold text-indigo-605 dark:text-indigo-400 font-mono mt-0.5">{processingCount}</div>
                    </div>
                    <div className="p-3.5 rounded-2xl bg-red-500/5 border border-red-500/10 dark:border-red-500/5">
                      <div className="text-[10px] text-red-500 dark:text-red-400 uppercase font-semibold tracking-wider">Failed</div>
                      <div className="text-lg font-extrabold text-red-500 dark:text-red-400 font-mono mt-0.5">{errorCount}</div>
                    </div>
                  </div>

                  {/* Multi-segmented high-fidelity progress bar ribbon */}
                  <div className="w-full bg-zinc-100 dark:bg-zinc-800/60 rounded-full h-3 overflow-hidden flex shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] border border-zinc-200/20 dark:border-zinc-700/10">
                    {completedCount > 0 && (
                      <motion.div
                        className="bg-emerald-500 shrink-0 h-full border-r border-white/10"
                        initial={{ width: 0 }}
                        animate={{ width: `${(completedCount / totalCount) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                    {processingCount > 0 && (
                      <motion.div
                        className="bg-indigo-500 dark:bg-indigo-400 relative overflow-hidden shrink-0 h-full border-r border-white/10"
                        initial={{ width: 0 }}
                        animate={{ width: `${(processingCount / totalCount) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      >
                        <motion.div
                          className="absolute inset-0 bg-linear-to-r from-transparent via-white/20 to-transparent"
                          animate={{ x: ["-100%", "100%"] }}
                          transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                          style={{ width: '100%' }}
                        />
                      </motion.div>
                    )}
                    {errorCount > 0 && (
                      <motion.div
                        className="bg-red-500 shrink-0 h-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${(errorCount / totalCount) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                    {idleCount > 0 && (
                      <motion.div
                        className="bg-zinc-200 dark:bg-zinc-700 h-full shrink-0"
                        initial={{ width: 0 }}
                        animate={{ width: `${(idleCount / totalCount) * 100}%` }}
                        transition={{ duration: 0.4 }}
                      />
                    )}
                  </div>
                </motion.div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`glass-panel rounded-3xl p-5 shadow-sm relative overflow-hidden ${
                        item.status === 'error'
                          ? 'border-red-200/50 dark:border-red-900/30'
                          : item.status === 'success'
                          ? 'border-emerald-200/50 dark:border-emerald-900/30'
                          : item.status === 'processing'
                          ? 'border-indigo-200/50 dark:border-indigo-900/30 ring-1 ring-indigo-100/50 dark:ring-indigo-900/30'
                          : ''
                      }`}
                    >
                      {/* Active crawling loader at the top edge of the processing card */}
                      {item.status === 'processing' && (
                        <div className="absolute top-0 left-0 right-0 h-[2.5px] overflow-hidden rounded-t-3xl">
                          <motion.div
                            className="h-full bg-linear-to-r from-indigo-500 via-purple-500 to-indigo-500"
                            animate={{ x: ["-100%", "100%"] }}
                            transition={{
                              repeat: Infinity,
                              duration: 1.8,
                              ease: "linear"
                            }}
                            style={{ width: '100%' }}
                          />
                        </div>
                      )}

                      <div className="flex items-start justify-between gap-4 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-white/50 dark:bg-zinc-800/50 px-2 py-1 rounded-md">
                            #{index + 1}
                          </span>
                          {item.status === 'processing' && <Loader2 size={16} className="text-indigo-500 dark:text-indigo-400 animate-spin" />}
                          {item.status === 'success' && <CheckCircle2 size={16} className="text-emerald-500 dark:text-emerald-400" />}
                          {item.status === 'error' && <XCircle size={16} className="text-red-500 dark:text-red-400" />}
                          {item.status === 'idle' && <span className="text-xs text-zinc-400 dark:text-zinc-500">{t('features.batch-process.status.idle')}</span>}
                        </div>
                      <button
                        onClick={() => handleRemoveItem(item.id)}
                        disabled={isProcessing}
                        className="text-zinc-400 hover:text-red-500 transition-colors disabled:opacity-50"
                      >
                        <X size={16} />
                      </button>
                    </div>

                    <div className="mb-4">
                      {item.type === 'text' ? (
                        <textarea
                          value={item.content}
                          onChange={(e) => handleTextChange(item.id, e.target.value)}
                          placeholder={t('features.batch-process.textPlaceholder')}
                          className="w-full p-3 glass-input rounded-2xl text-sm focus:ring-4 focus:ring-white/50 dark:focus:ring-zinc-800/50 outline-none resize-y min-h-[80px] dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                          disabled={isProcessing || item.status === 'success'}
                        />
                      ) : (
                        <div className="flex items-center gap-4 glass-panel p-3 rounded-2xl">
                          <img src={item.content} alt="Upload" className="w-16 h-16 object-cover rounded-xl border border-white/20 dark:border-white/5" />
                          <div className="text-sm text-zinc-600 dark:text-zinc-400 truncate flex-1">
                            {item.file?.name || 'Image'}
                          </div>
                        </div>
                      )}
                    </div>

                    {item.result && (
                      <>
                        <div className="mt-4 p-4 glass-panel bg-emerald-50/30 dark:bg-emerald-900/10 border-emerald-200/50 dark:border-emerald-800/30 rounded-2xl">
                          <div className="text-xs font-medium text-emerald-800 dark:text-emerald-400 mb-2 uppercase tracking-wider">Result</div>
                          <div className="text-sm text-zinc-800 dark:text-zinc-200 whitespace-pre-wrap">{item.result}</div>
                        </div>
                        <RatingFeedback 
                          featureId="batch-process" 
                          responseId={item.id} 
                          prompt={item.content}
                          response={item.result}
                          className="mt-2 border-t-0 bg-transparent py-2 px-1" 
                        />
                      </>
                    )}

                    {item.error && (
                      <div className="mt-4 p-4 glass-panel bg-red-50/30 dark:bg-red-900/10 border-red-200/50 dark:border-red-800/30 rounded-2xl">
                        <div className="text-xs font-medium text-red-800 dark:text-red-400 mb-2 uppercase tracking-wider">Error</div>
                        <div className="text-sm text-red-600 dark:text-red-400">{item.error}</div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
