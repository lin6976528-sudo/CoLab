import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface LanguageSwitcherProps {
  align?: 'left' | 'right';
  className?: string;
}

export default function LanguageSwitcher({ align = 'right', className = '' }: LanguageSwitcherProps) {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const languages = [
    { code: 'zh', label: '繁體中文', flag: '🇹🇼' },
    { code: 'en', label: 'English', flag: '🇺🇸' }
  ];

  const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

  const selectLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef} id="language-switcher-dropdown">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/50 dark:bg-zinc-900/50 hover:bg-white/80 dark:hover:bg-zinc-900/80 border border-zinc-200/50 dark:border-zinc-850/50 text-zinc-700 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white text-xs font-semibold shadow-xs transition-all duration-200 cursor-pointer"
        type="button"
        title={t('common.language', 'Language')}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <Globe size={14} className="text-zinc-500 group-hover:text-zinc-950 transition-colors" />
        <span className="hidden sm:inline font-mono tracking-wide">{currentLanguage.label}</span>
        <span className="sm:hidden font-mono tracking-wide">{currentLanguage.code.toUpperCase()}</span>
        <ChevronDown size={12} className={`text-zinc-400 dark:text-zinc-500 transition-transform duration-350 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={`absolute mt-1.5 w-40 bg-zinc-900/95 dark:bg-zinc-950/95 backdrop-blur-md border border-white/10 dark:border-white/5 rounded-2xl shadow-xl overflow-hidden z-50 py-1 ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="px-3 py-1.5 text-[10px] font-mono tracking-wider text-zinc-500 dark:text-zinc-400 uppercase select-none border-b border-white/5 mb-1">
              Select Language
            </div>
            {languages.map((lang) => {
              const isSelected = i18n.language === lang.code;
              return (
                <button
                  key={lang.code}
                  onClick={() => selectLanguage(lang.code)}
                  className={`w-full flex items-center justify-between px-3 py-2 text-xs font-medium text-left transition-colors cursor-pointer hover:bg-white/10 ${
                    isSelected ? 'text-indigo-400 bg-white/5' : 'text-zinc-300 hover:text-white'
                  }`}
                  role="option"
                  aria-selected={isSelected}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm leading-none" role="img" aria-hidden="true">{lang.flag}</span>
                    <span>{lang.label}</span>
                  </div>
                  {isSelected && <Check size={13} className="text-indigo-400" />}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
