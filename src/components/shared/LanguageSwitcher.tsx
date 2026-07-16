'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useTranslation, Locale } from '@/lib/i18n';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';

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
  const currentLang = languages.find((lang) => lang.code === locale) || languages[0];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonClasses = variant === 'dark'
    ? `flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 text-slate-200 transition-all duration-200 hover:border-slate-500 hover:bg-slate-800/80 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 backdrop-blur-md ${compact ? 'px-2 py-1' : 'px-2 py-1 sm:px-3 sm:py-1.5'}`
    : `flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-all duration-200 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${compact ? 'px-2 py-1' : 'px-2 py-1 sm:px-3 sm:py-1.5'}`;

  const dropdownClasses = variant === 'dark'
    ? `absolute z-[9999] mt-2 w-48 rounded-xl border border-slate-700/80 bg-slate-950/90 p-1.5 shadow-2xl backdrop-blur-xl ${locale === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}`
    : `absolute z-[9999] mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl ${locale === 'ar' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'}`;

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen((open) => !open)} className={buttonClasses} aria-label={currentLang.localName} aria-expanded={isOpen}>
        <span className="text-lg leading-none" role="img" aria-label={currentLang.name}>{currentLang.flag}</span>
        <span className="hidden text-xs font-medium sm:inline sm:text-sm">{currentLang.localName}</span>
        <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform duration-300 sm:block ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, y: 8, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.95 }} transition={{ duration: 0.15, ease: 'easeOut' }} className={dropdownClasses}>
            <div className={`mb-1 px-3 py-1 text-xs font-semibold ${variant === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{locale === 'ar' ? 'اختر اللغة' : 'Select Language'}</div>
            <div className="flex flex-col gap-0.5">
              {languages.map((lang) => {
                const selected = lang.code === locale;
                const itemClasses = selected
                  ? (variant === 'dark' ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'bg-emerald-50 text-emerald-600 font-semibold')
                  : (variant === 'dark' ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900');
                return <button key={lang.code} type="button" onClick={() => { changeLanguage(lang.code); setIsOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-all duration-150 ${itemClasses}`} style={{ direction: locale === 'ar' ? 'rtl' : 'ltr' }}><span className="flex items-center gap-2.5"><span className="text-xl leading-none" role="img" aria-label={lang.name}>{lang.flag}</span><span className="flex flex-col items-start leading-tight"><span className="text-sm font-medium">{lang.localName}</span><span className={`text-[10px] font-normal ${variant === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{lang.name}</span></span></span>{selected && <Check className="h-4 w-4 text-emerald-400" />}</button>;
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
