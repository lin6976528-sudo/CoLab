import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI } from '@google/genai';
import { Mic, Square, Loader2, Play, Sparkles, Trash2, Upload, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import LoadingAnimation from '../components/LoadingAnimation';
import { useHistory } from '../contexts/HistoryContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { parseAIError, ParsedError } from '../utils/errorHandling';
import ErrorMessage from '../components/ErrorMessage';
import FeatureTutorial from '../components/FeatureTutorial';
import { printAIResponse } from '../utils/printHelper';
import RatingFeedback from '../components/RatingFeedback';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

interface TranscribeFeatureProps {
  modelName: string;
  title: string;
  description: string;
}

export default function TranscribeFeature({
  modelName,
  title,
  description,
}: TranscribeFeatureProps) {
  const { t } = useTranslation();
  const { addHistoryItem } = useHistory();
  const { incrementUsage, checkAccess } = useSubscription();
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [audioBase64, setAudioBase64] = useState<string | null>(null);
  const [mimeType, setMimeType] = useState<string | null>(null);
  const [transcription, setTranscription] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<ParsedError | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearState = () => {
    if (window.confirm(t('common.transcribe.confirmClear'))) {
      setAudioUrl(null);
      setAudioBase64(null);
      setMimeType(null);
      setTranscription(null);
      setError(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    setAudioUrl(url);
    setMimeType(file.type);

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = (reader.result as string).split(',')[1];
      setAudioBase64(base64data);
    };
    reader.readAsDataURL(file);
    
    setTranscription(null);
    setError(null);
    setIsRecording(false);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder.mimeType });
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        setMimeType(mediaRecorder.mimeType);

        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = (reader.result as string).split(',')[1];
          setAudioBase64(base64data);
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setError(null);
      setTranscription(null);
      setAudioUrl(null);
      setAudioBase64(null);
    } catch (err: any) {
      console.error('Error accessing microphone:', err);
      setError(parseAIError(new Error(t('common.transcribe.micError')), t));
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const handleTranscribe = async () => {
    if (!audioBase64 || !mimeType || isLoading) return;

    if (!checkAccess('transcribe')) {
      setError(parseAIError(new Error("Usage limit reached for transcription. Please upgrade your subscription."), t));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            {
              inlineData: {
                data: audioBase64,
                mimeType: mimeType,
              },
            },
            { text: '請準確地轉錄這段語音。' },
          ],
        },
      });

      setTranscription(response.text || t('common.transcribe.noTranscription'));
      incrementUsage('transcribe');
      addHistoryItem({
        tool: 'transcribe',
        prompt: 'Transcribe audio',
        result: response.text || t('common.transcribe.noTranscription'),
        model: modelName,
      });
    } catch (err: any) {
      console.error('Transcription error:', err);
      setError(parseAIError(err, t));
    } finally {
      setIsLoading(false);
    }
  };

  const tutorialSteps = [
    {
      target: '.transcribe-record',
      content: t('tutorial.transcribe.record', 'Click here to start recording your voice.'),
      disableBeacon: true,
    },
    {
      target: '.transcribe-upload',
      content: t('tutorial.transcribe.upload', 'Or, upload an existing audio file.'),
    },
    {
      target: '.transcribe-submit',
      content: t('tutorial.transcribe.submit', 'Click here to transcribe the audio.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent relative">
      <FeatureTutorial featureId="transcribe" steps={tutorialSteps} />
      {/* Header */}
      <div className="shrink-0 px-6 py-8 md:px-12 md:py-10 border-b border-white/20 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between gap-4 mb-2">
            <h2 className="text-3xl font-serif font-medium text-zinc-900 tracking-tight">{title}</h2>
            {(audioUrl || transcription) && (
              <button
                onClick={clearState}
                className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                title={t('common.transcribe.clearContent')}
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
            <div className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-white/40 rounded-3xl glass-panel shadow-sm transition-all duration-300 hover:border-white/60 relative overflow-hidden">
              <div className="flex gap-6 items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={isRecording ? stopRecording : startRecording}
                    className={`transcribe-record w-16 h-16 rounded-full flex items-center justify-center shadow-sm transition-all duration-300 ${
                      isRecording 
                        ? 'bg-red-500/80 backdrop-blur-md text-white hover:bg-red-600/80 animate-pulse ring-4 ring-red-500/20' 
                        : 'bg-black/80 backdrop-blur-md text-white hover:bg-black hover:scale-105 active:scale-95 ring-4 ring-white/10'
                    }`}
                  >
                    {isRecording ? <Square size={24} fill="currentColor" /> : <Mic size={24} />}
                  </button>
                  <span className="text-xs font-medium text-zinc-500">
                    {isRecording ? t('common.transcribe.stopRecording') : t('common.transcribe.startRecording')}
                  </span>
                </div>

                <div className="w-px h-12 bg-white/20"></div>

                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isRecording}
                    className="transcribe-upload w-16 h-16 rounded-full glass-button text-zinc-700 flex items-center justify-center shadow-sm transition-all duration-300 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:hover:scale-100"
                  >
                    <Upload size={24} />
                  </button>
                  <span className="text-xs font-medium text-zinc-500">{t('common.transcribe.uploadAudio')}</span>
                </div>
              </div>
              
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                accept="audio/*"
                className="hidden"
              />
            </div>

            {audioUrl && !isRecording && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-5 glass-panel rounded-2xl shadow-sm">
                <p className="text-sm font-medium text-zinc-700 mb-3 tracking-wide">{t('common.transcribe.recordedAudio')}</p>
                <audio src={audioUrl} controls className="w-full rounded-lg" />
              </div>

              <button
                onClick={handleTranscribe}
                disabled={isLoading}
                className="transcribe-submit w-full flex items-center justify-center gap-3 py-4 px-6 bg-black/80 backdrop-blur-md text-white rounded-2xl text-sm font-medium tracking-wide hover:bg-black disabled:opacity-50 disabled:hover:bg-black/80 transition-all shadow-sm active:scale-[0.98]"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {t('common.transcribe.transcribingBtn')}
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    {t('common.transcribe.transcribeAudio')}
                  </>
                )}
              </button>
            </motion.div>
          )}

          {error && (
            <ErrorMessage error={error} />
          )}
        </div>

        <div className="flex-1 flex flex-col glass-panel rounded-3xl overflow-hidden min-h-[500px] shadow-sm">
          <div className="p-6 border-b border-white/20 bg-white/30 backdrop-blur-sm">
            <h3 className="font-medium text-zinc-800 tracking-wide">{t('common.transcribe.transcriptionResult')}</h3>
          </div>
          <div className="flex-1 p-6 md:p-8 overflow-y-auto bg-transparent">
            {isLoading ? (
              <div className="h-full flex flex-col items-center justify-center w-full">
                <LoadingAnimation text={t('common.transcribe.processing')} />
              </div>
            ) : transcription ? (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="prose prose-sm md:prose-base max-w-none prose-zinc font-light leading-relaxed"
              >
                <ReactMarkdown>{transcription}</ReactMarkdown>
                
                <div className="mt-6 flex justify-start">
                  <button
                    onClick={() => printAIResponse({
                      title: title || t('common.transcribe.transcriptionResult', '語音轉譯結果'),
                      subtitle: undefined,
                      content: transcription
                    })}
                    className="flex items-center gap-2 px-5 py-2 glass-button text-zinc-900 rounded-xl text-sm font-medium shadow-sm transition-all focus:outline-hidden hover:scale-105 active:scale-95 cursor-pointer"
                  >
                    <Printer size={16} />
                    <span>{t('common.print', 'Print')}</span>
                  </button>
                </div>
                <RatingFeedback featureId="transcribe" responseId={transcription} className="mt-6 border-t border-zinc-200/20" />
              </motion.div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-4 text-center p-8">
                <div className="w-20 h-20 rounded-full glass-panel shadow-sm flex items-center justify-center">
                  <Mic size={28} className="text-zinc-400" />
                </div>
                <div>
                  <p className="font-medium text-zinc-600 tracking-wide">{t('common.transcribe.notTranscribedYet')}</p>
                  <p className="text-sm mt-1 font-light text-zinc-400">{t('common.transcribe.notTranscribedDesc')}</p>
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
