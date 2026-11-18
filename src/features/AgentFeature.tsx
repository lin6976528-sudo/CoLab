import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GoogleGenAI, GenerateContentResponse, Type, FunctionDeclaration, FunctionCall } from '@google/genai';
import { Send, Loader2, Wand2, Trash2, User, Bot, Image as ImageIcon, Film, Search, History, MessageSquare, X, ThumbsUp, ThumbsDown, Printer } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { motion, AnimatePresence } from 'motion/react';
import LoadingAnimation from '../components/LoadingAnimation';
import { useHistory } from '../contexts/HistoryContext';
import { useChatHistory } from '../contexts/ChatHistoryContext';
import { useAuth } from '../contexts/AuthContext';
import { useSubscription } from '../contexts/SubscriptionContext';
import { parseAIError, ParsedError } from '../utils/errorHandling';
import ErrorMessage from '../components/ErrorMessage';
import FeatureTutorial from '../components/FeatureTutorial';
import { printAIResponse } from '../utils/printHelper';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });

interface Message {
  role: 'user' | 'model' | 'function';
  text?: string;
  timestamp: Date;
  functionCalls?: FunctionCall[];
  functionResponses?: any[];
  groundingLinks?: { uri: string; title: string }[];
  error?: ParsedError;
  imageUrl?: string;
  videoUrl?: string;
  isToolCall?: boolean;
  reaction?: 'like' | 'dislike';
}

const generateImageDecl: FunctionDeclaration = {
  name: "generateImage",
  description: "Generate an image based on a text prompt. Use this when the user asks to create, draw, or generate an image.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "A detailed description of the image to generate."
      },
      aspectRatio: {
        type: Type.STRING,
        description: "The aspect ratio of the image. Supported values: '1:1', '3:4', '4:3', '9:16', '16:9'. Default is '1:1'."
      }
    },
    required: ["prompt"]
  }
};

const generateVideoDecl: FunctionDeclaration = {
  name: "generateVideo",
  description: "Generate a short video based on a text prompt. Use this when the user asks to create or generate a video.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      prompt: {
        type: Type.STRING,
        description: "A detailed description of the video to generate."
      }
    },
    required: ["prompt"]
  }
};

export default function AgentFeature() {
  const { t } = useTranslation();
  const { currentUser, userProfile } = useAuth();
  const { addHistoryItem } = useHistory();
  const { chatSessions, saveChatSession, deleteChatSession } = useChatHistory();
  const { incrementUsage, checkAccess } = useSubscription();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentChatId, setCurrentChatId] = useState<string | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [activeTool, setActiveTool] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeTool]);

  const clearChat = () => {
    if (window.confirm(t('common.confirmClearChat'))) {
      setMessages([]);
      setInput('');
      setCurrentChatId(null);
    }
  };

  const handleReactToMessage = async (msgToReact: Message, reactionType: 'like' | 'dislike') => {
    const nextReaction = msgToReact.reaction === reactionType ? undefined : reactionType;
    const updatedMessages = messages.map(msg => {
      if (msg === msgToReact) {
        return {
          ...msg,
          reaction: nextReaction
        };
      }
      return msg;
    });

    setMessages(updatedMessages);

    if (currentChatId) {
      await saveChatSession(
        currentChatId,
        chatSessions.find(c => c.id === currentChatId)?.title || 'Agent Session',
        updatedMessages,
        'gemini-3.1-pro-preview',
        'agent'
      );
    }

    if (nextReaction && currentUser) {
      try {
        await addDoc(collection(db, 'feedback'), {
          userId: currentUser.uid,
          toolId: 'agent',
          contentId: currentChatId || '',
          rating: nextReaction === 'like' ? 'up' : 'down',
          prompt: messages.find((m, idx) => messages[idx + 1] === msgToReact && m.role === 'user')?.text || '',
          response: msgToReact.text || '',
          comment: '',
          createdAt: serverTimestamp(),
        });
      } catch (e) {
        console.error("Failed to save agent feedback to Firestore:", e);
      }
    }
  };

  const loadChat = (chatId: string) => {
    const chat = chatSessions.find(c => c.id === chatId);
    if (chat) {
      try {
        const parsedMessages = JSON.parse(chat.messages);
        const formattedMessages = parsedMessages.map((msg: any) => ({
          ...msg,
          timestamp: new Date(msg.timestamp)
        }));
        setMessages(formattedMessages);
        setCurrentChatId(chat.id);
        setIsHistoryOpen(false);
      } catch (e) {
        console.error("Failed to parse chat messages", e);
      }
    }
  };

  const handleDeleteChat = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm(t('common.confirmDeleteChat'))) {
      await deleteChatSession(id);
      if (currentChatId === id) {
        setMessages([]);
        setCurrentChatId(null);
      }
    }
  };

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

  const handleGenerateImage = async (prompt: string, aspectRatio: string = "1:1") => {
    try {
      if (!(await checkApiKey())) {
        await handleSelectKey();
        if (!(await checkApiKey())) {
          throw new Error("API key is required for image generation. Please select a paid API key.");
        }
      }
      
      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      const response = await currentAi.models.generateContent({
        model: 'gemini-3.1-flash-image-preview',
        contents: { parts: [{ text: prompt }] },
        config: {
          imageConfig: {
            aspectRatio: aspectRatio as any,
            imageSize: "1K"
          }
        }
      });
      
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
      throw new Error("No image generated");
    } catch (error) {
      console.error("Image generation failed:", error);
      throw error;
    }
  };

  const handleGenerateVideo = async (prompt: string) => {
    try {
      if (!(await checkApiKey())) {
        await handleSelectKey();
        if (!(await checkApiKey())) {
          throw new Error("API key is required for video generation. Please select a paid API key.");
        }
      }

      const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY || process.env.GEMINI_API_KEY });
      let operation = await currentAi.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
          numberOfVideos: 1,
          resolution: '720p',
          aspectRatio: '16:9'
        }
      });

      while (!operation.done) {
        await new Promise(resolve => setTimeout(resolve, 5000));
        operation = await currentAi.operations.getVideosOperation({ operation: operation });
      }

      const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
      if (!downloadLink) throw new Error("No video generated");
      
      const response = await fetch(downloadLink, {
        method: 'GET',
        headers: {
          'x-goog-api-key': process.env.API_KEY || process.env.GEMINI_API_KEY || '',
        },
      });
      
      if (response.ok) {
        const blob = await response.blob();
        return URL.createObjectURL(blob);
      } else {
        throw new Error("Failed to fetch generated video");
      }
    } catch (error) {
      console.error("Video generation failed:", error);
      throw error;
    }
  };

  const executeFunctionCall = async (call: FunctionCall) => {
    setActiveTool(call.name);
    try {
      if (call.name === 'generateImage') {
        const args = call.args as any;
        const imageUrl = await handleGenerateImage(args.prompt, args.aspectRatio);
        return { imageUrl, success: true };
      } else if (call.name === 'generateVideo') {
        const args = call.args as any;
        const videoUrl = await handleGenerateVideo(args.prompt);
        return { videoUrl, success: true };
      }
      return { error: `Function ${call.name} not found` };
    } catch (error: any) {
      return { error: error.message || "Function execution failed" };
    } finally {
      setActiveTool(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    if (!checkAccess('agent')) {
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: '', 
        timestamp: new Date(),
        error: parseAIError(new Error("Usage limit reached for AI Agent. Please upgrade your subscription."), t)
      }]);
      return;
    }

    const userMessage = input.trim();
    setInput('');
    
    const newUserMessage: Message = { 
      role: 'user', 
      text: userMessage, 
      timestamp: new Date()
    };
    
    let currentMessages = [...messages, newUserMessage];
    setMessages(currentMessages);
    setIsLoading(true);

    try {
      let isDone = false;
      let turnCount = 0;
      const MAX_TURNS = 5;

      while (!isDone && turnCount < MAX_TURNS) {
        turnCount++;
        
        const contents = currentMessages.map(msg => {
          const parts: any[] = [];
          if (msg.role === 'function' && msg.functionResponses) {
            msg.functionResponses.forEach(r => parts.push({ functionResponse: r }));
          } else if (msg.role === 'model' && msg.functionCalls) {
            msg.functionCalls.forEach(c => parts.push({ functionCall: c }));
          } else if (msg.text) {
            parts.push({ text: msg.text });
          }
          return { role: msg.role === 'function' ? 'user' : msg.role, parts };
        });

        const response = await ai.models.generateContent({
          model: 'gemini-3.1-pro-preview',
          contents: contents,
          config: {
            tools: [
              { googleSearch: {} },
              { functionDeclarations: [generateImageDecl, generateVideoDecl] }
            ],
            // @ts-ignore
            toolConfig: { includeServerSideToolInvocations: true },
            systemInstruction: "You are a helpful AI Agent. You can search the web, generate images, and generate videos. If the user asks for an image or video, use the appropriate tool, then describe what you created. If you use a tool, wait for the result before continuing."
          }
        });

        const candidate = response.candidates?.[0];
        if (!candidate) break;

        const functionCalls = candidate.content?.parts?.filter(p => p.functionCall).map(p => p.functionCall as FunctionCall);
        const textParts = candidate.content?.parts?.filter(p => p.text).map(p => p.text).join('\n');
        
        let groundingLinks: { uri: string; title: string }[] = [];
        const chunks = candidate.groundingMetadata?.groundingChunks;
        if (chunks) {
          chunks.forEach((chunk: any) => {
            if (chunk.web?.uri && chunk.web?.title) {
              if (!groundingLinks.some(l => l.uri === chunk.web.uri)) {
                groundingLinks.push({ uri: chunk.web.uri, title: chunk.web.title });
              }
            }
          });
        }

        if (functionCalls && functionCalls.length > 0) {
          // Add model's function call message
          const modelMessage: Message = {
            role: 'model',
            timestamp: new Date(),
            functionCalls: functionCalls,
            text: textParts || undefined
          };
          currentMessages = [...currentMessages, modelMessage];
          setMessages(currentMessages);

          // Execute functions
          const functionResponses = [];
          for (const call of functionCalls) {
            const result = await executeFunctionCall(call);
            functionResponses.push({
              name: call.name,
              response: result
            });
            
            // If the tool returned media, add a special message to display it
            if (result.imageUrl || result.videoUrl) {
               currentMessages = [...currentMessages, {
                 role: 'model',
                 timestamp: new Date(),
                 imageUrl: result.imageUrl,
                 videoUrl: result.videoUrl,
                 isToolCall: true
               }];
               setMessages(currentMessages);
            }
          }

          // Add function response message
          const functionMessage: Message = {
            role: 'function',
            timestamp: new Date(),
            functionResponses: functionResponses
          };
          currentMessages = [...currentMessages, functionMessage];
          setMessages(currentMessages);
          
        } else {
          // Final text response
          const finalMessage: Message = {
            role: 'model',
            text: textParts,
            timestamp: new Date(),
            groundingLinks: groundingLinks.length > 0 ? groundingLinks : undefined
          };
          currentMessages = [...currentMessages, finalMessage];
          setMessages(currentMessages);
          isDone = true;
        }
      }

      // Save history
      const title = currentMessages[0].text?.substring(0, 30) + '...' || 'Agent Session';
      const savedId = await saveChatSession(
        currentChatId,
        title,
        currentMessages,
        'gemini-3.1-pro-preview',
        'agent'
      );
      if (savedId) setCurrentChatId(savedId);

      incrementUsage('agent');
      addHistoryItem({
        tool: 'agent',
        prompt: userMessage,
        result: 'Agent completed task',
        model: 'gemini-3.1-pro-preview'
      });

    } catch (error: any) {
      console.error("Agent error:", error);
      const parsedError = parseAIError(error, t);
      setMessages(prev => [...prev, { 
        role: 'model', 
        text: '', 
        timestamp: new Date(),
        error: parsedError
      }]);
    } finally {
      setIsLoading(false);
      setActiveTool(null);
    }
  };

  const tutorialSteps = [
    {
      target: '.agent-history-button',
      content: t('tutorial.agent.history', 'View your past agent sessions here.'),
      disableBeacon: true,
    },
    {
      target: '.agent-input-area',
      content: t('tutorial.agent.input', 'Describe a complex task for the agent to perform.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-zinc-50/50 dark:bg-zinc-900/50 relative">
      <FeatureTutorial featureId="agent" steps={tutorialSteps} />
      <div className="flex-none p-4 md:p-6 border-b border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
              <Wand2 size={20} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">
                {t('features.agent.title', 'AI Agent')}
              </h1>
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-medium">
                {t('features.agent.description', 'Automate multi-step tasks with tools')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="agent-history-button p-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition-colors"
              title={t('common.chatHistory')}
            >
              <History size={20} />
            </button>
            <button
              onClick={clearChat}
              disabled={messages.length === 0 || isLoading}
              className="p-2 text-zinc-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-zinc-500"
              title={t('common.clearChat')}
            >
              <Trash2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 md:p-6 scroll-smooth">
        <div className="max-w-4xl mx-auto space-y-6 pb-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 dark:text-zinc-400 py-20">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                <Wand2 size={32} />
              </div>
              <p className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-2">
                {t('common.startChat', 'Start a conversation...')}
              </p>
              <p className="text-sm text-center max-w-md">
                I can search the web, generate images, and create videos. Ask me to perform a complex task!
              </p>
            </div>
          ) : (
            messages.map((msg, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-4 ${msg.role === 'user' ? 'flex-row-reverse' : ''} ${msg.role === 'function' ? 'hidden' : ''}`}
              >
                {msg.role !== 'function' && (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-1 ${
                    msg.role === 'user' 
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900' 
                      : 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400'
                  }`}>
                    {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                  </div>
                )}
                
                <div className={`flex flex-col gap-2 max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {msg.error ? (
                    <ErrorMessage error={msg.error} />
                  ) : msg.isToolCall ? (
                    <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-2 shadow-sm overflow-hidden">
                      {msg.imageUrl && (
                        <img src={msg.imageUrl} alt="Generated" className="max-w-full rounded-xl" />
                      )}
                      {msg.videoUrl && (
                        <video src={msg.videoUrl} controls autoPlay loop className="max-w-full rounded-xl" />
                      )}
                    </div>
                  ) : msg.functionCalls ? (
                    <div className="flex flex-col gap-2">
                      {msg.text && (
                        <div className="px-5 py-3.5 rounded-2xl bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm">
                          <div className="prose dark:prose-invert max-w-none text-sm">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {msg.text}
                            </ReactMarkdown>
                          </div>
                        </div>
                      )}
                      {msg.functionCalls.map((call, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                          {call.name === 'generateImage' ? <ImageIcon size={14} /> : call.name === 'generateVideo' ? <Film size={14} /> : <Wand2 size={14} />}
                          <span>Using tool: {call.name}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={`px-5 py-3.5 rounded-2xl ${
                      msg.role === 'user'
                        ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-md'
                        : 'bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-800 dark:text-zinc-200 shadow-sm'
                    }`}>
                      <div className={`prose max-w-none text-sm ${msg.role === 'user' ? 'prose-invert dark:prose-zinc' : 'dark:prose-invert'}`}>
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {msg.text || ''}
                        </ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {msg.groundingLinks && msg.groundingLinks.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {msg.groundingLinks.map((link, i) => (
                        <a
                          key={i}
                          href={link.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors shadow-sm"
                        >
                          <Search size={12} />
                          <span className="truncate max-w-[200px]">{link.title}</span>
                        </a>
                      ))}
                    </div>
                  )}

                  {msg.role === 'model' && !msg.error && (
                    <div className="flex items-center gap-2 mt-2 select-none flex-wrap">
                      <button
                        onClick={() => handleReactToMessage(msg, 'like')}
                        className={`p-1 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center relative hover:scale-110 active:scale-95 ${
                          msg.reaction === 'like'
                            ? 'text-emerald-500 bg-emerald-500/10 scale-105'
                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                        }`}
                        title="這很有幫助 (Thumbs Up)"
                      >
                        <ThumbsUp size={12} className={msg.reaction === 'like' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
                      </button>
                      
                      <button
                        onClick={() => handleReactToMessage(msg, 'dislike')}
                        className={`p-1 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center relative hover:scale-110 active:scale-95 ${
                          msg.reaction === 'dislike'
                            ? 'text-rose-500 bg-rose-500/10 scale-105'
                            : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50'
                        }`}
                        title="這沒有幫助 (Thumbs Down)"
                      >
                        <ThumbsDown size={12} className={msg.reaction === 'dislike' ? 'stroke-[2.5]' : 'stroke-[1.8]'} />
                      </button>

                      <button
                        onClick={() => printAIResponse({
                          title: t('common.agentResponse', 'AI 代理對話回應'),
                          subtitle: messages.filter(m => m.role === 'user').pop()?.text || undefined,
                          content: msg.text,
                          mediaUrl: msg.imageUrl || msg.videoUrl || undefined,
                          mediaType: msg.imageUrl ? 'image' : msg.videoUrl ? 'video' : undefined
                        })}
                        className="p-1 rounded-md transition-all duration-200 cursor-pointer flex items-center justify-center text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:scale-110 active:scale-95"
                        title={t('common.printResponse', '列印此回應')}
                        type="button"
                      >
                        <Printer size={12} className="stroke-[1.8]" />
                      </button>

                      <AnimatePresence>
                        {msg.reaction && (
                          <motion.span
                            initial={{ opacity: 0, x: -5, scale: 0.9 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className={`text-[9px] font-sans font-bold px-1.5 py-0.2 rounded uppercase border tracking-wider select-none ${
                              msg.reaction === 'like'
                                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                            }`}
                          >
                            {msg.reaction === 'like' ? 'Helpful' : 'Unhelpful'}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </motion.div>
            ))
          )}
          
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex gap-4"
            >
              <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center shrink-0 mt-1 text-indigo-600 dark:text-indigo-400">
                <Bot size={16} />
              </div>
              <div className="bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-2xl px-5 py-4 shadow-sm flex flex-col gap-3 min-w-[200px]">
                <LoadingAnimation />
                {activeTool && (
                  <div className="flex items-center gap-2 text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-3 py-2 rounded-lg border border-indigo-100 dark:border-indigo-800/30">
                    <Loader2 size={14} className="animate-spin" />
                    <span>
                      {activeTool === 'generateImage' ? 'Generating image...' : 
                       activeTool === 'generateVideo' ? 'Generating video (this may take a few minutes)...' : 
                       `Running ${activeTool}...`}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="flex-none p-4 md:p-6 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="agent-input-area relative flex items-end gap-2 bg-white dark:bg-zinc-800 rounded-2xl border border-zinc-200 dark:border-zinc-700 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/50 transition-all p-2">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={t('common.inputPlaceholder')}
              className="w-full max-h-48 min-h-[44px] bg-transparent border-none focus:ring-0 resize-none py-3 px-3 text-sm text-zinc-900 dark:text-zinc-100 placeholder:text-zinc-400"
              rows={1}
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl hover:bg-zinc-800 dark:hover:bg-white transition-colors disabled:opacity-50 disabled:hover:bg-zinc-900 dark:disabled:hover:bg-zinc-100 shrink-0 mb-0.5 mr-0.5"
            >
              <Send size={18} className={isLoading ? "opacity-0" : "opacity-100"} />
              {isLoading && <Loader2 size={18} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-spin" />}
            </button>
          </form>
        </div>
      </div>

      <AnimatePresence>
        {isHistoryOpen && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            className="absolute top-0 right-0 bottom-0 w-80 bg-white dark:bg-zinc-900 border-l border-zinc-200 dark:border-zinc-800 shadow-2xl z-20 flex flex-col"
          >
            <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-900/50">
              <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                <History size={18} className="text-zinc-500" />
                {t('common.chatHistory')}
              </h3>
              <button
                onClick={() => setIsHistoryOpen(false)}
                className="p-2 text-zinc-500 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-2">
              {chatSessions.filter(c => c.featureId === 'agent').length === 0 ? (
                <div className="text-center text-zinc-500 dark:text-zinc-400 mt-10 text-sm">
                  {t('common.noChatHistory')}
                </div>
              ) : (
                <div className="space-y-1">
                  {chatSessions.filter(c => c.featureId === 'agent').map(chat => (
                    <div
                      key={chat.id}
                      onClick={() => loadChat(chat.id)}
                      className={`w-full text-left p-3 rounded-xl transition-colors group cursor-pointer flex items-start gap-3 ${
                        currentChatId === chat.id 
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100' 
                          : 'hover:bg-zinc-100 dark:hover:bg-zinc-800/50 text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <MessageSquare size={16} className={`shrink-0 mt-0.5 ${currentChatId === chat.id ? 'text-indigo-500' : 'text-zinc-400'}`} />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{chat.title}</div>
                        <div className="text-xs opacity-60 mt-1 flex items-center justify-between">
                          <span>{new Date(chat.updatedAt?.toDate ? chat.updatedAt.toDate() : chat.updatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteChat(e, chat.id)}
                        className="p-1.5 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md opacity-0 group-hover:opacity-100 transition-all shrink-0"
                        title={t('common.delete')}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
              <button
                onClick={() => {
                  setCurrentChatId(null);
                  setMessages([]);
                  setIsHistoryOpen(false);
                }}
                className="w-full py-2.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors shadow-sm"
              >
                {t('common.newChat')}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
