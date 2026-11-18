import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, X, Sparkles, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface CoCoinWarningNotificationProps {
  isVisible: boolean;
  remainingPoints: number;
  onClose: () => void;
  onUpgradeClick: () => void;
}

export default function CoCoinWarningNotification({
  isVisible,
  remainingPoints,
  onClose,
  onUpgradeClick,
}: CoCoinWarningNotificationProps) {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9, filter: 'blur(4px)' }}
          animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
          exit={{ opacity: 0, y: 20, scale: 0.95, filter: 'blur(4px)' }}
          transition={{ type: 'spring', damping: 20, stiffness: 260 }}
          className="fixed bottom-24 right-6 z-50 max-w-sm w-full bg-white/90 dark:bg-zinc-900/95 backdrop-blur-md rounded-2xl border border-rose-200/80 dark:border-rose-900/50 shadow-2xl overflow-hidden pointer-events-auto"
          id="cocoin-warning-notification"
        >
          {/* Top colored accent bar */}
          <div className="h-1 bg-gradient-to-r from-red-500 via-orange-500 to-amber-500" />
          
          <div className="p-4 flex gap-3 relative">
            {/* Warning icon container */}
            <div className="shrink-0 w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center border border-rose-100 dark:border-rose-900/30">
              <AlertTriangle className="text-rose-500 dark:text-rose-400" size={20} />
            </div>

            {/* Content info */}
            <div className="flex-1 space-y-1.5 pr-6">
              <h4 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                {t('notification.pointsLowTitle', 'Co幣即將用盡！')}
              </h4>
              <p className="text-xs text-zinc-650 dark:text-zinc-350 leading-relaxed font-light">
                {t(
                  'notification.pointsLowDesc',
                  '您的剩餘 Co幣餘額僅剩 {{remaining}}。請立即升級方案以確保您能無間斷地使用所有 AI 頂級功能！',
                  { remaining: remainingPoints }
                )}
              </p>

              {/* Action upgrade button */}
              <button
                onClick={onUpgradeClick}
                className="mt-2.5 w-full flex items-center justify-center gap-1 px-3 py-1.5 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium text-xs rounded-xl shadow-xs hover:shadow-md hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 active:scale-98 hover:scale-[1.01] transition-all cursor-pointer"
                id="cocoin-upgrade-cta"
              >
                <Sparkles size={12} className="animate-pulse text-amber-200" />
                <span>{t('notification.upgradeNow', '立即升級方案')}</span>
                <ChevronRight size={12} />
              </button>
            </div>

            {/* Dismiss Cross */}
            <button
              onClick={onClose}
              className="absolute top-3 right-3 p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-850 rounded-full transition-all"
              title={t('common.close', '關閉')}
              id="cocoin-warning-dismiss"
            >
              <X size={15} />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
