'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import LanguageSwitcher from '@/components/shared/LanguageSwitcher';
import DynamicTranslator from '@/components/shared/DynamicTranslator';

export default function TestTranslatePage() {
  const { t, isRTL } = useTranslation();

  const sampleUserBio = t('translationTest.sampleUserBio');

  return (
    <div 
      className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center p-6"
      style={{ direction: isRTL ? 'rtl' : 'ltr' }}
    >
      <div className="w-full max-w-xl bg-slate-900/60 border border-slate-800 rounded-2xl p-8 backdrop-blur-md shadow-2xl flex flex-col gap-6">
        
        {/* Header with Switcher */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-tight text-white">
              {t('common.welcome')}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {t('translationTest.subtitle')}
            </p>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Static Translation Test */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-emerald-400">
            {t('translationTest.staticTitle')}
          </h2>
          <div className="grid grid-cols-2 gap-3 bg-slate-950/50 p-4 rounded-xl border border-slate-850">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-500 uppercase">Key: common.login</span>
              <span className="text-sm font-medium">{t('common.login')}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-500 uppercase">Key: common.startFree</span>
              <span className="text-sm font-medium">{t('common.startFree')}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-500 uppercase">Key: nav.tournaments</span>
              <span className="text-sm font-medium">{t('nav.tournaments')}</span>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] text-slate-500 uppercase">Key: landing.featuresTitle</span>
              <span className="text-sm font-medium">{t('landing.featuresTitle')}</span>
            </div>
          </div>
        </div>

        {/* Dynamic Translation Test */}
        <div className="flex flex-col gap-2">
          <h2 className="text-sm font-semibold text-emerald-400">
            {t('translationTest.dynamicTitle')}
          </h2>
          <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-850 flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 text-sm">
                A
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-200">
                  {t('translationTest.playerName')}
                </span>
                <span className="text-[10px] text-slate-500">{t('translationTest.bioLabel')}</span>
              </div>
            </div>
            <DynamicTranslator 
              text={sampleUserBio} 
              textClassName="text-slate-300 text-sm leading-relaxed" 
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="text-center text-[11px] text-slate-500 border-t border-slate-850 pt-4">
          {t('translationTest.footer')}
        </div>

      </div>
    </div>
  );
}
