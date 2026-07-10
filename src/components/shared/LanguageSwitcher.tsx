'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useTranslation, Locale } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, ChevronDown, Check } from 'lucide-react';

interface LanguageOption {
  code: Locale;
  name: string;
  flag: string;
  localName: string;
}

const languages: LanguageOption[] = [
  { code: 'ar', name: 'Arabic', flag: '🇸🇦', localName: 'العربية' },
  { code: 'en', name: 'English', flag: '🇬🇧', localName: 'English' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸', localName: 'Español' },
  { code: 'pt', name: 'Portuguese', flag: '🇵🇹', localName: 'Português' },
];

export default function LanguageSwitcher({ variant = 'dark', compact = false }: { variant?: 'light' | 'dark'; compact?: boolean }) {
  const { locale, changeLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const currentLang = languages.find((lang) => lang.code === locale) || languages[0];

  const buttonClasses = variant === 'dark'
    ? `flex items-center gap-2 ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 hover:text-white hover:border-slate-500 hover:bg-slate-800/80 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 backdrop-blur-md`
    : `flex items-center gap-2 ${compact ? 'px-2 py-1' : 'px-3 py-1.5'} rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900 hover:border-slate-350 hover:bg-slate-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/50`;

  const dropdownClasses = variant === 'dark'
    ? `absolute mt-2 w-48 rounded-xl border border-slate-700/80 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-xl z-[9999] ${locale === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}`
    : `absolute mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl z-[9999] ${locale === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}`;

  const headerClasses = variant === 'dark'
    ? 'py-1 text-xs font-semibold text-slate-400 px-3 select-none mb-1'
    : 'py-1 text-xs font-semibold text-slate-500 px-3 select-none mb-1';

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={buttonClasses}
      >
        <span className="text-lg leading-none" role="img" aria-label={currentLang.name}>
          {currentLang.flag}
        </span>
        <span className={`${compact ? 'hidden sm:inline' : ''} text-xs sm:text-sm font-medium`}>
          {currentLang.localName}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${
            isOpen ? 'rotate-180' : 'rotate-0'
          }`}
        />
      </button>

      {/* Dropdown Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            className={dropdownClasses}
          >
            <div className={headerClasses}>
              {locale === 'ar' ? 'اختر اللغة' : 'Select Language'}
            </div>
            
            <div className="flex flex-col gap-0.5">
              {languages.map((lang) => {
                const isSelected = lang.code === locale;
                
                const itemClasses = isSelected
                  ? (variant === 'dark' ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'bg-emerald-50 text-emerald-600 font-semibold')
                  : (variant === 'dark' ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900');

                const subtextClasses = variant === 'dark'
                  ? 'text-[10px] text-slate-500 font-normal'
                  : 'text-[10px] text-slate-400 font-normal';

                return (
                  <button
                    key={lang.code}
                    onClick={() => {
                      changeLanguage(lang.code);
                      setIsOpen(false);
                    }}
                    className={`flex items-center justify-between w-full text-left px-3 py-2 rounded-lg transition-all duration-150 ${itemClasses}`}
                    style={{ direction: locale === 'ar' ? 'rtl' : 'ltr' }}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl leading-none" role="img" aria-label={lang.name}>
                        {lang.flag}
                      </span>
                      <div className="flex flex-col items-start leading-tight">
                        <span className="text-sm font-medium">{lang.localName}</span>
                        <span className={subtextClasses}>{lang.name}</span>
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-emerald-400" />}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
