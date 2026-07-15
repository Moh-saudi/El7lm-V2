'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import ar from './locales/ar.json';
import en from './locales/en.json';
import es from './locales/es.json';
import pt from './locales/pt.json';

const translations: Record<string, any> = { ar, en, es, pt };

export type Locale = 'ar' | 'en' | 'es' | 'pt';

interface TranslationContextProps {
  locale: Locale;
  isRTL: boolean;
  t: (key: string) => string;
  getTranslations: <T = unknown>(key: string) => T;
  changeLanguage: (locale: Locale) => void;
}

const TranslationContext = createContext<TranslationContextProps | undefined>(undefined);

export const TranslationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocale] = useState<Locale>('ar');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // 1. Check local storage
    const savedLocale = localStorage.getItem('locale') as Locale;
    if (savedLocale && translations[savedLocale]) {
      setLocale(savedLocale);
    } else {
      // 2. Detect browser language
      const browserLang = navigator.language.split('-')[0] as Locale;
      if (translations[browserLang]) {
        setLocale(browserLang);
        localStorage.setItem('locale', browserLang);
      }
    }
    setMounted(true);
  }, []);

  // Update HTML tag dir & lang attributes on change
  useEffect(() => {
    if (!mounted) return;
    const isRtl = locale === 'ar';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = locale;
  }, [locale, mounted]);

  const getTranslations = <T = unknown,>(key: string): T => {
    const keys = key.split('.');
    const readValue = (source: Record<string, any>) => {
      let result: any = source;
      for (const part of keys) {
        if (result?.[part] === undefined) return undefined;
        result = result[part];
      }
      return result;
    };

    return (readValue(translations[locale])
      ?? readValue(translations.en)
      ?? readValue(translations.ar)
      ?? key) as T;
  };

  const t = (key: string): string => {
    const keys = key.split('.');
    let result: any = translations[locale];
    
    for (const k of keys) {
      if (result && result[k] !== undefined) {
        result = result[k];
      } else {
        // Fallback to English
        let fallbackResult: any = translations['en'];
        for (const fk of keys) {
          if (fallbackResult && fallbackResult[fk] !== undefined) {
            fallbackResult = fallbackResult[fk];
          } else {
            fallbackResult = null;
            break;
          }
        }
        if (fallbackResult) return fallbackResult;

        // Fallback to Arabic
        let arabicResult: any = translations['ar'];
        for (const ak of keys) {
          if (arabicResult && arabicResult[ak] !== undefined) {
            arabicResult = arabicResult[ak];
          } else {
            arabicResult = null;
            break;
          }
        }
        return arabicResult || key;
      }
    }
    
    return typeof result === 'string' ? result : key;
  };

  const changeLanguage = (newLocale: Locale) => {
    localStorage.setItem('locale', newLocale);
    setLocale(newLocale);
    // Reload is used to reset layout fonts, alignments and avoid hydration mismatches
    window.location.reload();
  };

  const value = {
    locale,
    isRTL: locale === 'ar',
    t,
    getTranslations,
    changeLanguage,
  };

  // Prevent flash of unlocalized content during SSR hydration
  if (!mounted) {
    return <div style={{ visibility: 'hidden' }}>{children}</div>;
  }

  return (
    <TranslationContext.Provider value={value}>
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a TranslationProvider');
  }
  return context;
};
