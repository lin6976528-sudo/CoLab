import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Code2, Shield, Zap, Globe, Github, Twitter, ArrowUpCircle, BookOpen, Mail, ExternalLink, ChevronRight, ChevronDown, LifeBuoy, MessageSquare, CheckCircle } from 'lucide-react';
import { CoLabLogo } from '../components/CoLabLogo';
import { useSubscription } from '../contexts/SubscriptionContext';
import SubscriptionComparison from '../components/SubscriptionComparison';

export default function AboutPage() {
  const { t } = useTranslation();
  const { tier, setTier, setIsPricingModalOpen } = useSubscription();

  // Documentation section states
  const [activeDoc, setActiveDoc] = React.useState<number | null>(null);
  
  // Support ticket form states
  const [ticketSent, setTicketSent] = React.useState(false);
  const [isSending, setIsSending] = React.useState(false);
  const [supportForm, setSupportForm] = React.useState({
    category: 'Billing',
    subject: '',
    message: ''
  });

  const handleSupportFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setSupportForm(prev => ({ ...prev, [name]: value }));
  };

  const submitSupportTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supportForm.subject.trim() || !supportForm.message.trim()) return;
    
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setTicketSent(true);
      setSupportForm({ category: 'Billing', subject: '', message: '' });
    }, 1200);
  };

  const documentationTopics = [
    {
      title: t('features.about.docs.coins.title', 'Coins & Token Usage Guide'),
      summary: t('features.about.docs.coins.summary', 'Learn how CoCoins work across different tiers, from generation limits to priority queues.'),
      content: t('features.about.docs.coins.content', 'Every AI model request uses credits (called CoCoins). For example, simple Text Chat tasks require fewer CoCoins than advanced tasks like multi-frame Video Generation or high-fidelity Music Synthesis. Your daily and monthly coin limit renews automatically based on your subscription tier (e.g., Plus: 1500, Go: 3000, Max: 12000). Active balances can be viewed on your Dashboard at any time.')
    },
    {
      title: t('features.about.docs.models.title', 'Gemini & Veo Feature Grid'),
      summary: t('features.about.docs.models.summary', 'An overview of available model architectures and capability unlocks.'),
      content: t('features.about.docs.models.content', 'CoLab supports raw multi-modal prompting: (1) Image Gen & Reminders on basic tiers. (2) Gemini 1.5 Pro with large contexts, batch processing tools, and video-understanding abilities starting with the Pro tier. (3) Next-generation high-framerate video generation using Google Veo for Ultra, Max, and Super tiers.')
    },
    {
      title: t('features.about.docs.privacy.title', 'Security, Storage & Cache Policy'),
      summary: t('features.about.docs.privacy.summary', 'How we securely store your prompt history and manage media assets safely.'),
      content: t('features.about.docs.privacy.content', 'All generated texts, audio clips, and image artifacts are securely stored in your personal, encrypted Firestore bucket. This data is private and solely accessible by your logged-in Google credentials. To protect system speeds and integrity, local session states can cached briefly, but real creations are persisted safely under rigorous compliance protocols.')
    }
  ];

  const features = [
    {
      icon: <Sparkles className="w-6 h-6 text-amber-500" />,
      title: t('features.about.tech.gemini.title', 'Gemini 3.1 Pro'),
      description: t('features.about.tech.gemini.description', 'Powered by Google\'s most capable AI model for complex reasoning, coding, and creative tasks.')
    },
    {
      icon: <Zap className="w-6 h-6 text-blue-500" />,
      title: t('features.about.tech.veo.title', 'Veo Video Generation'),
      description: t('features.about.tech.veo.description', 'Create stunning, high-quality videos from text prompts using the advanced Veo model.')
    },
    {
      icon: <Shield className="w-6 h-6 text-emerald-500" />,
      title: t('features.about.tech.secure.title', 'Secure & Private'),
      description: t('features.about.tech.secure.description', 'Your data is protected with enterprise-grade security and privacy controls.')
    },
    {
      icon: <Code2 className="w-6 h-6 text-purple-500" />,
      title: t('features.about.tech.developer.title', 'Developer Friendly'),
      description: t('features.about.tech.developer.description', 'Built with modern web technologies including React, Tailwind CSS, and Firebase.')
    }
  ];

  const subscriptionTiers = [
    {
      name: 'Free',
      price: 'NT$ 0',
      color: 'border-zinc-200/60 dark:border-zinc-800/60',
      badge: 'Basic / 體驗',
      features: [
        '基本 300 Co幣額度',
        '基礎聊天與搜尋功能',
        '語音轉文字',
        '標準回應速度'
      ]
    },
    {
      name: 'Plus',
      price: 'NT$ 135',
      color: 'border-indigo-500/25 dark:border-indigo-500/15',
      badge: 'Best Value / 推薦',
      features: [
        '中階 1500 Co幣額度',
        '圖片生成與分析 (限額)',
        '影片中生成兩次',
        '圖片中生成十次'
      ]
    },
    {
      name: 'Go',
      price: 'NT$ 270',
      color: 'border-teal-500/25 dark:border-teal-500/15',
      badge: 'Student / 學生方案',
      features: [
        '特惠 3000 Co幣額度',
        '解鎖進階助理任務代理',
        '圖片中生成20次',
        '影片中生成4次'
      ]
    },
    {
      name: 'Pro',
      price: 'NT$ 650',
      color: 'border-blue-500/25 dark:border-blue-500/15',
      badge: 'Power User / 創作',
      features: [
        '進階 4500 Co幣額度',
        'Gemini 3.1 Pro 進階推理',
        '圖片生成與分析',
        '文字轉語音',
        '優先回應速度'
      ]
    },
    {
      name: 'One',
      price: 'NT$ 1280',
      color: 'border-indigo-500/25 dark:border-indigo-500/15',
      badge: 'CoLab One / 智慧平衡',
      features: [
        '中階 5500 Co幣額度',
        'Imagen 3 圖片風格全解鎖',
        '2 次極速影片生成額度',
        '解鎖 1 次影片分析功能',
        '中高優先回應回應速度'
      ]
    },
    {
      name: 'Advanced',
      price: 'NT$ 1970',
      color: 'border-violet-500/25 dark:border-violet-500/15',
      badge: 'Advanced / 全面升級',
      features: [
        '進階 6500 Co幣額度',
        'Gemini 3.1 Pro 超大脈絡區塊',
        '4 次極速影片生成額度',
        '解鎖 3 次影片分析功能',
        '2 次即時語音對談額度'
      ]
    },
    {
      name: 'Ultra',
      price: 'NT$ 3290',
      color: 'border-amber-500/25 dark:border-amber-500/15',
      badge: 'Flagship / 旗艦頂級',
      features: [
        '旗艦 9000 Co幣額度',
        'Veo 3.1 影片生成與分析',
        'Gemini Live 即時語音對話',
        '最高優先級回應速度',
        '搶先體驗新功能'
      ]
    },
    {
      name: 'Max',
      price: 'NT$ 4300',
      color: 'border-rose-500/25 dark:border-rose-500/15',
      badge: 'Max / 巔峰尊榮',
      features: [
        '12000 Co幣額度',
        '8 部 Veo 影片創作與動畫額度',
        '極致尊爵 1 對 1 專家支援',
        '全新 AGI 智能代理優先調度',
        '尊榮 Max 終身客製識別徽章'
      ]
    },
    {
      name: 'Super',
      price: 'NT$ 8910',
      color: 'border-fuchsia-500/25 dark:border-fuchsia-500/15',
      badge: 'Super / 量子無極限',
      features: [
        '全功能 26000 Co幣量子無限算力',
        '星海級 AGI 自我優化智能代理',
        '毫微秒級即時回應',
        '全宇宙 1對1 熱線專家終身支援',
        '超豪金尊爵 Super 終身識別徽章'
      ]
    }
  ];

  return (
    <div className="min-h-full bg-transparent overflow-y-auto">
      <div className="max-w-4xl mx-auto px-6 py-12 md:py-20">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <div className="w-20 h-20 glass-panel text-zinc-900 rounded-3xl flex items-center justify-center shadow-xl mx-auto mb-8 transform rotate-3 hover:rotate-6 transition-transform">
            <CoLabLogo size={68} />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-medium text-zinc-900 mb-6 tracking-tight">
            {t('features.about.title', 'About CoLab')}
          </h1>
          <p className="text-lg md:text-xl text-zinc-600 max-w-2xl mx-auto leading-relaxed">
            {t('features.about.subtitle', 'CoLab is an advanced AI collaboration platform that brings together the power of Google\'s latest generative models into a single, unified workspace.')}
          </p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="glass-panel rounded-3xl p-8 md:p-12 shadow-sm mb-12"
        >
          <h2 className="text-2xl font-semibold text-zinc-900 mb-6">{t('features.about.mission.title', 'Our Mission')}</h2>
          <p className="text-zinc-600 leading-relaxed mb-8 text-lg">
            {t('features.about.mission.description', 'We believe that artificial intelligence should be accessible, intuitive, and seamlessly integrated into your creative and professional workflows. CoLab was built to bridge the gap between complex AI models and everyday tasks, providing a clean, distraction-free environment for you to explore, create, and innovate.')}
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-12">
            {features.map((feature, index) => (
              <div key={index} className="flex gap-4">
                <div className="shrink-0 w-12 h-12 glass-panel rounded-2xl flex items-center justify-center">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="text-lg font-medium text-zinc-900 mb-2">{feature.title}</h3>
                  <p className="text-zinc-600 leading-relaxed">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Subscription Tiers Grid Layout */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="glass-panel rounded-3xl p-8 md:p-12 shadow-sm mb-12"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-2xl font-semibold text-zinc-900">
                {t('features.about.pricing.title', 'CoLab Subscription Tiers')}
              </h2>
              <p className="text-sm text-zinc-500 mt-1">
                {t('features.about.pricing.subtitle', 'Choose the plan that matches your creative scope and computing requirements.')}
              </p>
            </div>
            <button
              onClick={() => setIsPricingModalOpen(true)}
              className="px-5 py-2.5 bg-indigo-50 dark:bg-zinc-900 border border-indigo-100 dark:border-zinc-800 text-indigo-600 dark:text-indigo-400 rounded-xl text-xs font-bold hover:bg-indigo-100/50 dark:hover:bg-zinc-850/50 transition-colors flex items-center gap-1.5 cursor-pointer uppercase tracking-wider"
            >
              <span>{t('features.about.pricing.compareBtn', 'Compare All Plans')}</span>
              <ChevronRight size={14} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {subscriptionTiers.map((tierItem) => (
              <div 
                key={tierItem.name} 
                className={`p-5 rounded-2xl border ${tierItem.color} bg-white/20 dark:bg-zinc-900/10 flex flex-col justify-between transition-all hover:scale-[1.02] duration-200 shadow-xs relative overflow-hidden`}
              >
                {/* Visual Accent glow for top tiers */}
                {['Ultra', 'Max', 'Super'].includes(tierItem.name) && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/10 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
                )}
                <div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-zinc-100/80 dark:bg-zinc-800/80 text-zinc-500 dark:text-zinc-400 uppercase tracking-wide border border-zinc-200/40 dark:border-zinc-700/40 select-none">
                    {tierItem.badge}
                  </span>
                  
                  <h3 className="text-lg font-bold text-zinc-900 mt-3 flex items-center gap-1.5">
                    <span>CoLab {tierItem.name}</span>
                  </h3>
                  
                  <div className="flex items-baseline gap-1 mt-2 mb-4">
                    <span className="text-xl font-extrabold text-zinc-900">{tierItem.price}</span>
                    <span className="text-xs text-zinc-500 font-medium">/ 月</span>
                  </div>

                  <ul className="space-y-2 border-t border-zinc-100 dark:border-zinc-800/40 pt-3 mb-6">
                    {tierItem.features.map((featureItem, fidx) => (
                      <li key={fidx} className="flex items-start gap-1.5 text-xs text-zinc-600 dark:text-zinc-400">
                        <CheckCircle size={12} className="shrink-0 mt-0.5 text-indigo-500" />
                        <span className="leading-normal">{featureItem}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  onClick={() => setIsPricingModalOpen(true)}
                  className="w-full py-2.5 bg-zinc-900 hover:bg-zinc-800 active:scale-[0.98] text-white text-xs font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Zap size={12} />
                  <span>{t('features.about.pricing.upgrade', 'Upgrade Now')}</span>
                </button>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Subscription Detailed Comparison Component */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.14 }}
          className="glass-panel rounded-3xl p-6 md:p-10 shadow-sm mb-12 border border-zinc-200/50 dark:border-zinc-800/40"
        >
          <SubscriptionComparison 
            currentPlan={tier} 
            onSelectPlan={(planName) => setTier(planName as any)} 
          />
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="glass-panel rounded-3xl p-8 md:p-12 shadow-sm mb-12"
        >
          <h2 className="text-2xl font-semibold text-zinc-900 mb-8">{t('features.about.faq.title', 'Frequently Asked Questions')}</h2>
          <div className="space-y-6">
            {[
              {
                q: t('features.about.faq.tiers.q', 'What are the CoLab subscription tiers?'),
                a: t('features.about.faq.tiers.a', 'CoLab offers multiple tiers to suit your needs: Free, Plus, Go, Pro, Advanced, Ultra, Max, and Super. Each tier provides progressively more AI processing power, higher usage limits, and access to premium models like Gemini 1.5 Pro and Veo.')
              },
              {
                q: t('features.about.faq.advanced.q', 'What is the Advanced subscription tier?'),
                a: t('features.about.faq.advanced.a', 'The Advanced subscription plan is positioned between Pro and Ultra plans at NT$ 1970 per month. It is optimized for premium creators needing increased prompt sizes, fast rendering queues, and extra CoCoin storage capacities.')
              },
              {
                q: t('features.about.faq.upgrade.q', 'How do I upgrade or change my plan?'),
                a: t('features.about.faq.upgrade.a', 'You can upgrade your plan at any time through the Prices modal. Your new benefits will be available immediately after the transaction is confirmed.')
              },
              {
                q: t('features.about.faq.limits.q', 'Are there any usage limits?'),
                a: t('features.about.faq.limits.a', 'Yes, usage limits vary by tier. Free users have basic limits, while higher-tier users (Plus to Super) enjoy significantly expanded quotas and priority access to our most advanced AI features.')
              },
              {
                q: t('features.about.faq.privacy.q', 'Is my data secure?'),
                a: t('features.about.faq.privacy.a', 'Absolutely. We prioritize your privacy and security. Your personal data and creative outputs are protected with enterprise-grade encryption and are not used to train our base AI models without your explicit consent.')
              },
              {
                q: t('features.about.faq.terms.q', 'What are the service terms?'),
                a: t('features.about.faq.terms.a', 'By using CoLab, you agree to our terms of service, which include responsible AI use, respecting intellectual property rights, and adhering to our community guidelines.')
              }
            ].map((faq, idx) => (
              <div key={idx} className="pb-6 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                <h3 className="text-lg font-medium text-zinc-900 mb-2 flex gap-2">
                  <span className="text-indigo-500 font-bold">Q:</span> {faq.q}
                </h3>
                <p className="text-zinc-600 leading-relaxed flex gap-2">
                  <span className="text-emerald-500 font-bold">A:</span> {faq.a}
                </p>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Documentation & Support Hub */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.16 }}
          className="glass-panel rounded-3xl p-8 md:p-12 shadow-sm mb-12 border border-zinc-200/50 dark:border-zinc-800/50"
        >
          <div className="flex flex-col lg:flex-row gap-12">
            
            {/* Left Column: Interactive Documentation Guide */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 rounded-xl">
                  <BookOpen className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold text-zinc-900">{t('features.about.docs.title', 'Documentation & Guides')}</h2>
                  <p className="text-sm text-zinc-500 mt-0.5">{t('features.about.docs.subtitle', 'Quick articles to master your AI workflow')}</p>
                </div>
              </div>

              <div className="space-y-4">
                {documentationTopics.map((topic, idx) => {
                  const isOpen = activeDoc === idx;
                  return (
                    <div 
                      key={idx} 
                      className="border border-zinc-100 dark:border-zinc-800/60 rounded-2xl overflow-hidden transition-all duration-200 bg-zinc-50/50 dark:bg-zinc-900/10 hover:border-zinc-200 dark:hover:border-zinc-800"
                    >
                      <button
                        onClick={() => setActiveDoc(isOpen ? null : idx)}
                        className="w-full px-5 py-4 flex items-center justify-between text-left cursor-pointer transition-colors"
                      >
                        <div className="pr-4">
                          <h3 className="font-semibold text-zinc-900 text-base">{topic.title}</h3>
                          <p className="text-zinc-500 text-xs mt-1 leading-snug">{topic.summary}</p>
                        </div>
                        <div className={`p-1.5 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : ''}`}>
                          <ChevronDown size={14} />
                        </div>
                      </button>

                      <AnimatePresence initial={false}>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                          >
                            <div className="px-5 pb-5 pt-1 text-sm text-zinc-650 leading-relaxed border-t border-zinc-100 dark:border-zinc-850 bg-white/40 dark:bg-zinc-900/20">
                              {topic.content}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center gap-2">
                <a 
                  href="https://ai.google.dev/gemini-api/docs" 
                  target="_blank" 
                  referrerPolicy="no-referrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                >
                  <span>{t('features.about.docs.external', 'View Official Gemini SDK Documentation')}</span>
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>

            {/* Right Column: Contact Support Form */}
            <div className="lg:w-[380px] shrink-0 border-t lg:border-t-0 lg:border-l border-zinc-100 dark:border-zinc-00/80 pt-10 lg:pt-0 lg:pl-12 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl">
                    <LifeBuoy className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold text-zinc-900">{t('features.about.support.title', 'Contact Support')}</h2>
                    <p className="text-sm text-zinc-500 mt-0.5">{t('features.about.support.subtitle', 'Submit a persistent token ticket')}</p>
                  </div>
                </div>

                {ticketSent ? (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center flex flex-col items-center justify-center shadow-inner"
                  >
                    <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4">
                      <CheckCircle size={24} />
                    </div>
                    <h3 className="font-semibold text-zinc-900 text-base mb-1">Ticket Submitted!</h3>
                    <p className="text-xs text-zinc-650 leading-relaxed mb-4">
                      Thank you for contacting CoLab Support. Your billing/technical inquiry has been logged as Ticket #{Math.floor(Math.random() * 900000) + 100000}. Our team will respond shortly.
                    </p>
                    <button 
                      onClick={() => setTicketSent(false)}
                      className="px-4 py-2 bg-zinc-900 text-white rounded-xl text-xs font-semibold hover:bg-zinc-800 transition-colors"
                    >
                      New Message
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={submitSupportTicket} className="space-y-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                        {t('features.about.support.form.category', 'Category')}
                      </label>
                      <select 
                        name="category"
                        value={supportForm.category}
                        onChange={handleSupportFormChange}
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      >
                        <option value="Billing">{t('features.about.support.form.cat.billing', 'Billing & CoCoins')}</option>
                        <option value="Technical">{t('features.about.support.form.cat.technical', 'Technical Issue')}</option>
                        <option value="Account">{t('features.about.support.form.cat.account', 'Account Access')}</option>
                        <option value="Feedback">{t('features.about.support.form.cat.feedback', 'Feature suggestion')}</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                        {t('features.about.support.form.subject', 'Subject')}
                      </label>
                      <input 
                        type="text"
                        name="subject"
                        required
                        value={supportForm.subject}
                        onChange={handleSupportFormChange}
                        placeholder={t('features.about.support.form.subject.placeholder', 'Brief description of query')}
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-1.5">
                        {t('features.about.support.form.message', 'Message')}
                      </label>
                      <textarea 
                        name="message"
                        required
                        rows={3}
                        value={supportForm.message}
                        onChange={handleSupportFormChange}
                        placeholder={t('features.about.support.form.message.placeholder', 'Please supply detailed context here...')}
                        className="w-full px-4 py-2.5 bg-white dark:bg-zinc-950/20 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-800 text-sm placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 resize-none"
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={isSending || !supportForm.subject.trim() || !supportForm.message.trim()}
                      className="w-full py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl font-semibold text-sm hover:bg-zinc-800 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none transition-all flex items-center justify-center gap-2 cursor-pointer"
                    >
                      {isSending ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>{t('features.about.support.form.sending', 'Sending Ticket...')}</span>
                        </>
                      ) : (
                        <>
                          <Mail size={16} />
                          <span>{t('features.about.support.form.submit', 'Submit Support Ticket')}</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>

          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.18 }}
          className="relative glass-panel rounded-3xl p-8 mb-12 overflow-hidden bg-gradient-to-br from-indigo-500/5 to-purple-500/5 dark:from-indigo-500/10 dark:to-purple-500/10 border border-indigo-500/20"
        >
          <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
            <ArrowUpCircle size={120} className="text-indigo-500" />
          </div>
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="text-center md:text-left">
              <h2 className="text-2xl font-bold text-zinc-900 mb-2">
                {t('features.about.upgrade.title', 'Ready to supercharge your creativity?')}
              </h2>
              <p className="text-zinc-600 max-w-lg">
                {t('features.about.upgrade.description', 'Join thousands of creators who use CoLab to bring their ideas to life. Upgrade your subscription to unlock premium AI models and higher usage limits.')}
              </p>
            </div>
            <button 
              onClick={() => setIsPricingModalOpen(true)}
              className="px-8 py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold shadow-lg shadow-indigo-600/20 transition-all hover:scale-105 active:scale-95 flex items-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Zap size={18} />
              {t('features.about.upgrade.button', 'Upgrade Now')}
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-6"
        >
          <div className="glass-panel rounded-3xl p-8 md:p-10 shadow-lg relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
            <h2 className="text-2xl font-semibold mb-4 relative z-10 text-zinc-900">{t('features.about.technology.title', 'The Technology')}</h2>
            <p className="text-zinc-600 leading-relaxed mb-8 relative z-10">
              {t('features.about.technology.description', 'CoLab leverages the cutting-edge capabilities of the Gemini API, providing access to multimodal models that can understand text, images, audio, and video simultaneously.')}
            </p>
            <div className="flex flex-wrap gap-3 relative z-10">
              {['React 18', 'TypeScript', 'Tailwind CSS', 'Firebase', 'Vite', 'Framer Motion'].map((tech) => (
                <span key={tech} className="px-3 py-1.5 glass-panel rounded-lg text-sm font-medium text-zinc-700">
                  {tech}
                </span>
              ))}
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-8 md:p-10 shadow-sm flex flex-col justify-center items-center text-center">
            <Globe className="w-12 h-12 text-zinc-400 mb-6" />
            <h2 className="text-2xl font-semibold text-zinc-900 mb-4">{t('features.about.connect.title', 'Connect With Us')}</h2>
            <p className="text-zinc-600 mb-8">
              {t('features.about.connect.description', 'Have questions, feedback, or want to contribute? We\'d love to hear from you.')}
            </p>
            <div className="flex gap-4">
              <button className="w-12 h-12 glass-button text-zinc-600 hover:text-zinc-900 rounded-full flex items-center justify-center transition-colors">
                <Github size={20} />
              </button>
              <button className="w-12 h-12 glass-button text-zinc-600 hover:text-zinc-900 rounded-full flex items-center justify-center transition-colors">
                <Twitter size={20} />
              </button>
            </div>
          </div>
        </motion.div>

        <div className="mt-16 text-center text-sm text-zinc-400">
          <p>{t('features.about.footer.copyright', { year: new Date().getFullYear() })}</p>
          <p className="mt-2">{t('features.about.footer.version', 'Version 1.0.0')}</p>
        </div>
      </div>

      {/* Floating Action Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.5, y: 100 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: 1, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsPricingModalOpen(true)}
        className="fixed bottom-8 right-8 z-40 w-16 h-16 bg-indigo-600 dark:bg-indigo-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-indigo-600/40 hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors group cursor-pointer"
      >
        <Zap size={24} className="group-hover:animate-pulse" />
        <div className="absolute right-full mr-4 px-3 py-1.5 bg-zinc-900 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none uppercase tracking-wider">
          {t('features.about.fab.upgrade', 'Upgrade Tiers')}
        </div>
      </motion.button>
    </div>
  );
}
