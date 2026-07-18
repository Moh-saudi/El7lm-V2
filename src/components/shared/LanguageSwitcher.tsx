'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation, Locale } from '@/lib/i18n';
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

function FlagIcon({ code, className = 'h-4 w-6' }: { code: Locale; className?: string }) {
  const common = { className, viewBox: '0 0 24 16', role: 'img' as const, 'aria-hidden': true };
  if (code === 'ar') return <svg {...common}><rect width="24" height="16" rx="2" fill="#165b33" /><text x="12" y="6.8" textAnchor="middle" fill="#fff" fontSize="2.15" fontFamily="Arial">لا إله إلا الله</text><path d="M6 10.5h12" stroke="#fff" strokeWidth=".65" strokeLinecap="round" /><path d="M7 9.5h10" stroke="#fff" strokeWidth=".35" strokeLinecap="round" /></svg>;
  if (code === 'en') return <svg {...common}><rect width="24" height="16" rx="2" fill="#23408e" /><path d="M0 0l24 16M24 0L0 16" stroke="#fff" strokeWidth="3.6" /><path d="M0 0l24 16M24 0L0 16" stroke="#c8102e" strokeWidth="1.4" /><path d="M12 0v16M0 8h24" stroke="#fff" strokeWidth="5.2" /><path d="M12 0v16M0 8h24" stroke="#c8102e" strokeWidth="2.6" /></svg>;
  if (code === 'es') return <svg {...common}><rect width="24" height="16" rx="2" fill="#aa151b" /><rect y="3.5" width="24" height="9" fill="#f1bf00" /><circle cx="6" cy="8" r="1.15" fill="#aa151b" opacity=".85" /></svg>;
  return <svg {...common}><rect width="24" height="16" rx="2" fill="#046a38" /><rect width="9.2" height="16" fill="#d7141a" /><circle cx="9.2" cy="8" r="3.25" fill="#ffdf00" /><path d="M9.2 4.75a3.25 3.25 0 0 1 0 6.5 2.6 2.6 0 0 0 0-6.5z" fill="#d7141a" /></svg>;
}

export default function LanguageSwitcher({ variant = 'dark', compact = false }: { variant?: 'light' | 'dark'; compact?: boolean }) {
  const { locale, changeLanguage } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const currentLang = languages.find((lang) => lang.code === locale) || languages[0];

  const updateMenuPosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const menuWidth = 192;
    const viewportPadding = 8;
    const preferredLeft = locale === 'ar' ? rect.left : rect.right - menuWidth;
    const left = Math.min(
      Math.max(preferredLeft, viewportPadding),
      window.innerWidth - menuWidth - viewportPadding,
    );
    setMenuPosition({ top: rect.bottom + 8, left });
  }, [locale]);

  const toggleMenu = () => {
    updateMenuPosition();
    setIsOpen((open) => !open);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    updateMenuPosition();

    const handleViewportChange = () => updateMenuPosition();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [isOpen, updateMenuPosition]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if ((event.target as HTMLElement).closest('[data-language-menu]')) return;
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonClasses = variant === 'dark'
    ? `flex items-center gap-2 rounded-lg border border-transparent bg-transparent text-slate-200 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${compact ? 'px-2 py-1' : 'px-2 py-1 sm:px-3 sm:py-1.5'}`
    : `flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-all duration-200 hover:border-slate-350 hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 ${compact ? 'px-2 py-1' : 'px-2 py-1 sm:px-3 sm:py-1.5'}`;

  const dropdownClasses = variant === 'dark'
    ? 'fixed z-[2147483647] w-48 rounded-xl border border-slate-700/80 bg-slate-950/95 p-1.5 shadow-2xl backdrop-blur-xl'
    : 'fixed z-[2147483647] w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-2xl';

  return (
    <div className="relative z-[100] inline-block text-left" ref={dropdownRef}>
      <button ref={buttonRef} type="button" onClick={toggleMenu} className={buttonClasses} aria-label={currentLang.localName} aria-expanded={isOpen}>
        <FlagIcon code={currentLang.code} className="h-4 w-6 shrink-0 sm:h-5 sm:w-7" />
        <span className="hidden text-xs font-medium sm:inline sm:text-sm">{currentLang.localName}</span>
        <ChevronDown className={`hidden h-4 w-4 text-slate-400 transition-transform duration-300 sm:block ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && mounted && createPortal(
          <div data-language-menu="true" className={dropdownClasses} style={{ top: menuPosition.top, left: menuPosition.left }}>
            <div className={`mb-1 px-3 py-1 text-xs font-semibold ${variant === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>{locale === 'ar' ? 'اختر اللغة' : 'Select Language'}</div>
            <div className="flex flex-col gap-0.5">
              {languages.map((lang) => {
                const selected = lang.code === locale;
                const itemClasses = selected
                  ? (variant === 'dark' ? 'bg-emerald-500/10 text-emerald-400 font-medium' : 'bg-emerald-50 text-emerald-600 font-semibold')
                  : (variant === 'dark' ? 'text-slate-300 hover:bg-slate-800/70 hover:text-white' : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900');
                return <button key={lang.code} type="button" onClick={() => { changeLanguage(lang.code); setIsOpen(false); }} className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left transition-all duration-150 ${itemClasses}`} style={{ direction: locale === 'ar' ? 'rtl' : 'ltr' }}><span className="flex items-center gap-2.5"><FlagIcon code={lang.code} className="h-4 w-6 shrink-0" /><span className="flex flex-col items-start leading-tight"><span className="text-sm font-medium">{lang.localName}</span><span className={`text-[10px] font-normal ${variant === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>{lang.name}</span></span></span>{selected && <Check className="h-4 w-4 text-emerald-400" />}</button>;
              })}
            </div>
          </div>, document.body
        )}
    </div>
  );
}
