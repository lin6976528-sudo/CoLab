import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Bell, Calendar, Plus, Trash2, Clock, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import FeatureTutorial from '../components/FeatureTutorial';

interface Reminder {
  id: string;
  title: string;
  time: number;
  type: 'event' | 'content';
}

export default function RemindersFeature() {
  const { t } = useTranslation();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [newTitle, setNewTitle] = useState('');
  const [delayMinutes, setDelayMinutes] = useState(1);
  const [type, setType] = useState<'event' | 'content'>('event');
  const timeoutsRef = useRef<Record<string, NodeJS.Timeout | number>>({});

  useEffect(() => {
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
    return () => {
      // Cleanup all active scheduler timeouts on unmount to completely avoid leakage or runtime warnings
      Object.keys(timeoutsRef.current).forEach(id => {
        if (timeoutsRef.current[id]) {
          clearTimeout(timeoutsRef.current[id] as any);
        }
      });
    };
  }, []);

  const requestPermission = async () => {
    if (!('Notification' in window)) {
      alert(t('features.reminders.errNoSupport', 'This browser does not support desktop notification'));
      return;
    }
    const perm = await Notification.requestPermission();
    setPermission(perm);
  };

  const scheduleReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (permission !== 'granted') {
      alert(t('features.reminders.errEnableFirst', 'Please enable notifications first.'));
      return;
    }

    if (!newTitle.trim()) return;

    const delayMs = delayMinutes * 60 * 1000;
    const triggerTime = Date.now() + delayMs;
    const reminderId = Math.random().toString(36).substring(7);
    
    const reminder: Reminder = {
      id: reminderId,
      title: newTitle,
      time: triggerTime,
      type
    };

    setReminders(prev => [...prev, reminder].sort((a, b) => a.time - b.time));
    
    // Schedule the actual notification and record the reference
    const timer = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(reminder.type === 'event' ? t('features.reminders.optEvent', 'Upcoming Event') : t('features.reminders.optContent', 'New Content'), {
          body: reminder.title,
          icon: '/vite.svg'
        });
      }
      // Remove from list and deregister timeout
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      delete timeoutsRef.current[reminderId];
    }, delayMs);

    timeoutsRef.current[reminderId] = timer;

    setNewTitle('');
  };

  const removeReminder = (id: string) => {
    // Clear and dispose raw timeout if exists to prevent ghost notification firing
    if (timeoutsRef.current[id]) {
      clearTimeout(timeoutsRef.current[id] as any);
      delete timeoutsRef.current[id];
    }
    setReminders(prev => prev.filter(r => r.id !== id));
  };

  const subscribeToNewContent = () => {
    if (permission !== 'granted') {
      alert(t('features.reminders.errEnableFirst', 'Please enable notifications first.'));
      return;
    }
    
    const reminderId = Math.random().toString(36).substring(7);
    const reminder: Reminder = {
      id: reminderId,
      title: t('features.reminders.contentBody', 'Check out the new AI models!'),
      time: Date.now() + 5000,
      type: 'content'
    };

    setReminders(prev => [...prev, reminder].sort((a, b) => a.time - b.time));
    
    const timer = setTimeout(() => {
      if (Notification.permission === 'granted') {
        new Notification(t('features.reminders.alertNewContent', 'New Content Available!'), {
          body: reminder.title,
          icon: '/vite.svg'
        });
      }
      setReminders(prev => prev.filter(r => r.id !== reminderId));
      delete timeoutsRef.current[reminderId];
    }, 5000);

    timeoutsRef.current[reminderId] = timer;
  };

  const tutorialSteps = [
    {
      target: '.reminders-permission',
      content: t('features.reminders.tutorial_permission', 'Enable notifications to receive reminders.'),
      disableBeacon: true,
    },
    {
      target: '.reminders-form',
      content: t('features.reminders.tutorial_form', 'Create a new reminder here.'),
    },
  ];

  return (
    <div className="flex flex-col h-full bg-transparent overflow-y-auto">
      <FeatureTutorial featureId="reminders" steps={tutorialSteps} />
      <div className="px-6 py-8 md:px-12 md:py-10 border-b border-white/20 glass-panel !rounded-none z-20 sticky top-0">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 glass-panel text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-sm">
              <Bell size={24} />
            </div>
            <h2 className="text-3xl font-serif font-medium text-zinc-900 dark:text-zinc-100 tracking-tight">
              {t('features.reminders.title', '管理通知')}
            </h2>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 font-light tracking-wide">
            {t('features.reminders.description', '設定即將到來的活動或新內容提醒')}
          </p>
        </div>
      </div>

      <div className="flex-1 px-4 py-8 md:px-12 md:py-10">
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* Permission Status */}
          <div className="reminders-permission glass-panel p-6 rounded-3xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${permission === 'granted' ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400' : 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'}`}>
                {permission === 'granted' ? <Bell size={24} /> : <AlertCircle size={24} />}
              </div>
              <div>
                <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{t('features.reminders.statusTitle', 'Notification Status')}</h3>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  {permission === 'granted' ? t('features.reminders.statusEnabled', 'Notifications are enabled.') : t('features.reminders.statusDisabled', 'Please enable notifications to receive reminders.')}
                </p>
              </div>
            </div>
            {permission !== 'granted' && (
              <button
                onClick={requestPermission}
                className="px-6 py-2.5 bg-black/80 dark:bg-white/90 text-white dark:text-zinc-900 rounded-2xl text-sm font-medium hover:bg-black dark:hover:bg-white transition-colors"
              >
                {t('features.reminders.btnEnable', 'Enable Notifications')}
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Schedule Form */}
            <div className="reminders-form glass-panel p-6 rounded-3xl shadow-sm h-fit">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                <Calendar size={20} className="text-indigo-600 dark:text-indigo-400" />
                {t('features.reminders.formTitle', 'Schedule Reminder')}
              </h3>
              
              <form onSubmit={scheduleReminder} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t('features.reminders.labelTitle', 'Reminder Title')}</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={e => setNewTitle(e.target.value)}
                    placeholder={t('features.reminders.placeholderTitle', 'e.g., Team Meeting, Check new video')}
                    className="w-full p-3 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 dark:focus:ring-zinc-800/50 outline-none text-sm dark:text-zinc-100 placeholder:text-zinc-500 dark:placeholder:text-zinc-400"
                    required
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t('features.reminders.labelDelay', 'Delay (minutes)')}</label>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={delayMinutes}
                      onChange={e => setDelayMinutes(parseInt(e.target.value) || 1)}
                      className="w-full p-3 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 dark:focus:ring-zinc-800/50 outline-none text-sm dark:text-zinc-100"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t('features.reminders.labelType', 'Type')}</label>
                    <select
                      value={type}
                      onChange={e => setType(e.target.value as 'event' | 'content')}
                      className="w-full p-3 glass-input rounded-2xl focus:ring-4 focus:ring-white/50 dark:focus:ring-zinc-800/50 outline-none text-sm dark:text-zinc-100 [&>option]:text-zinc-900 dark:[&>option]:bg-zinc-800 dark:[&>option]:text-zinc-100"
                    >
                      <option value="event">{t('features.reminders.optEvent', 'Upcoming Event')}</option>
                      <option value="content">{t('features.reminders.optContent', 'New Content')}</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={permission !== 'granted' || !newTitle.trim()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600/90 text-white rounded-2xl text-sm font-medium hover:bg-indigo-600 disabled:opacity-50 transition-colors mt-2"
                >
                  <Plus size={18} />
                  {t('features.reminders.btnSubmit', 'Add Reminder')}
                </button>
              </form>

              <div className="mt-6 pt-6 border-t border-white/20 dark:border-white/5">
                <button
                  onClick={subscribeToNewContent}
                  disabled={permission !== 'granted'}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 glass-button text-zinc-700 dark:text-zinc-300 rounded-2xl text-sm font-medium disabled:opacity-50 transition-colors"
                >
                  <Bell size={18} />
                  {t('features.reminders.btnSimulate', 'Simulate "New Content" Alert (5s)')}
                </button>
              </div>
            </div>

            {/* Active Reminders */}
            <div className="glass-panel p-6 rounded-3xl shadow-sm">
              <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
                <Clock size={20} className="text-indigo-600 dark:text-indigo-400" />
                {t('features.reminders.activeTitle', 'Active Reminders')}
              </h3>
              
              {reminders.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-zinc-500 dark:text-zinc-400">
                  <Bell size={32} className="mb-3 opacity-20" />
                  <p className="text-sm">{t('features.reminders.noReminders', 'No active reminders')}</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reminders.map(reminder => (
                    <motion.div
                      key={reminder.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="flex items-center justify-between p-4 bg-white/40 dark:bg-zinc-900/40 rounded-2xl border border-white/50 dark:border-white/5"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full ${reminder.type === 'event' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400'}`}>
                            {reminder.type === 'event' ? t('features.reminders.optEvent', 'Upcoming Event') : t('features.reminders.optContent', 'New Content')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{reminder.title}</p>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                          {t('features.reminders.triggerAt', 'Triggers at')} {new Date(reminder.time).toLocaleTimeString()}
                        </p>
                      </div>
                      <button
                        onClick={() => removeReminder(reminder.id)}
                        className="p-2 text-zinc-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                        title={t('features.reminders.deleteTitle', 'Cancel reminder')}
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
