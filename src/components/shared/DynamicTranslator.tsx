'use client';

import React, { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { Globe, RefreshCw, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface DynamicTranslatorProps {
  text: string;
  className?: string;
  textClassName?: string;
}

export default function DynamicTranslator({
  text,
  className = '',
  textClassName = 'text-slate-300 text-sm leading-relaxed',
}: DynamicTranslatorProps) {
  const { t, locale } = useTranslation();
  const [translatedText, setTranslatedText] = useState<string | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const handleTranslate = async () => {
    if (translatedText) {
      setShowOriginal(false);
      return;
    }

    setIsTranslating(true);
    setError(null);

    try {
      const response = await fetch('/api/translate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          target: locale,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to translate');
      }

      const data = await response.json();
      setTranslatedText(data.translatedText);
      setShowOriginal(false);
    } catch (err: any) {
      console.error('Translation error:', err);
      setError(t('common.translateFailed'));
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleText = () => {
    setShowOriginal(!showOriginal);
  };

  // If text is empty or too short, do not show translator
  if (!text || text.trim().length < 4) {
    return <p className={textClassName}>{text}</p>;
  }

  const displayText = showOriginal ? text : (translatedText || text);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Content text */}
      <AnimatePresence mode="wait">
        <motion.p
          key={displayText}
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 4 }}
          transition={{ duration: 0.15 }}
          className={textClassName}
        >
          {displayText}
        </motion.p>
      </AnimatePresence>

      {/* Control button */}
      <div className="flex items-center gap-4 text-xs select-none">
        {showOriginal ? (
          <button
            type="button"
            disabled={isTranslating}
            onClick={handleTranslate}
            className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 font-medium transition-colors disabled:opacity-50"
          >
            {isTranslating ? (
              <>
                <RefreshCw className="w-3 h-3 animate-spin" />
                <span>{t('common.translating')}</span>
              </>
            ) : (
              <>
                <Globe className="w-3.5 h-3.5" />
                <span>
                  {locale === 'ar'
                    ? t('common.translateBtn')
                    : `Translate to ${locale.toUpperCase()}`}
                </span>
              </>
            )}
          </button>
        ) : (
          <button
            type="button"
            onClick={toggleText}
            className="flex items-center gap-1 text-slate-400 hover:text-slate-300 transition-colors"
          >
            <EyeOff className="w-3 h-3" />
            <span>{locale === 'ar' ? t('common.showOriginal') : 'Show Original'}</span>
          </button>
        )}

        {/* Error message */}
        {error && <span className="text-rose-400 font-medium">{error}</span>}
      </div>
    </div>
  );
}
