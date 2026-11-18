import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Lock, LogIn } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';

interface LoginPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function LoginPromptModal({ isOpen, onClose }: LoginPromptModalProps) {
  const { t } = useTranslation();
  const { login } = useAuth();

  const handleLoginClick = async () => {
    onClose();
    await login();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-zinc-900/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-md glass-panel dark:bg-zinc-900/90 rounded-3xl shadow-2xl overflow-hidden flex flex-col"
          >
            <div className="absolute top-4 right-4 z-10">
              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 hover:bg-white/30 dark:hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-8 flex flex-col items-center text-center">
              {/* Animated Icon */}
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center shadow-sm mb-6 mt-4">
                <Lock size={32} className="text-indigo-600 dark:text-indigo-400" />
              </div>

              <h3 className="text-xl font-medium text-zinc-900 dark:text-zinc-100 mb-3 tracking-tight">
                {t('common.loginRequiredTitle', '請先登入再使用')}
              </h3>
              
              <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light leading-relaxed max-w-xs mb-8">
                {t('common.loginRequiredDesc', '此功能需要登入 Google 帳號才能使用。立即登入解鎖完整 AI 創作與對話工具！')}
              </p>

              <div className="w-full flex flex-col gap-3">
                <button
                  onClick={handleLoginClick}
                  className="w-full py-3.5 bg-black/80 hover:bg-black dark:bg-white/90 dark:hover:bg-white text-white dark:text-zinc-900 rounded-2xl text-sm font-medium transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <LogIn size={18} />
                  <span>{t('common.loginButton', '登入 / 註冊')}</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-3 text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200 text-sm font-medium transition-colors"
                >
                  {t('common.cancel', '暫時不要')}
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
