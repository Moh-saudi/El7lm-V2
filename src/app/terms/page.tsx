'use client';

import React from 'react';
import { useTranslation } from '@/lib/i18n';
import { WebsiteShell } from '@/components/website/WebsiteShell';

export default function TermsPage() {
    const { t, isRTL } = useTranslation();

    return (
        <WebsiteShell title={t('terms.title')}>
            <div className="py-12 px-4 sm:px-6 lg:px-8" dir={isRTL ? 'rtl' : 'ltr'}>
                <div className="max-w-4xl mx-auto rounded-2xl shadow-xl p-6 sm:p-10 border" style={{ background: 'var(--card)', borderColor: 'var(--line)' }}>
                    <div className="text-center mb-10">
                        <h1 className="text-3xl font-extrabold mb-2" style={{ color: 'var(--navy)' }}>{t('terms.title')}</h1>
                        <p className="text-sm font-semibold" style={{ color: 'var(--mute)' }}>{t('terms.lastUpdate')}</p>
                    </div>

                    <div className="space-y-8 leading-relaxed" style={{ color: 'var(--ink)' }}>
                        <section>
                            <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--navy)' }}>
                                <span className="w-2 h-7 rounded-full inline-block" style={{ backgroundColor: 'var(--gold)' }}></span>
                                {t('terms.introTitle')}
                            </h2>
                            <p style={{ color: 'var(--mute)' }}>
                                {t('terms.introDesc')}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--navy)' }}>
                                <span className="w-2 h-7 rounded-full inline-block" style={{ backgroundColor: 'var(--gold)' }}></span>
                                {t('terms.accountsTitle')}
                            </h2>
                            <p style={{ color: 'var(--mute)' }}>
                                {t('terms.accountsDesc')}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--navy)' }}>
                                <span className="w-2 h-7 rounded-full inline-block" style={{ backgroundColor: 'var(--gold)' }}></span>
                                {t('terms.ipTitle')}
                            </h2>
                            <p style={{ color: 'var(--mute)' }}>
                                {t('terms.ipDesc')}
                            </p>
                        </section>

                        <section>
                            <h2 className="text-xl font-bold mb-3 flex items-center gap-2" style={{ color: 'var(--navy)' }}>
                                <span className="w-2 h-7 rounded-full inline-block" style={{ backgroundColor: 'var(--gold)' }}></span>
                                {t('terms.dataTitle')}
                            </h2>
                            <p style={{ color: 'var(--mute)' }}>
                                {t('terms.dataDesc')}
                            </p>
                        </section>

                        <div className="border-t pt-6 mt-8" style={{ borderColor: 'var(--line)' }}>
                            <p className="text-sm text-center" style={{ color: 'var(--mute)' }}>
                                {t('terms.legalContact')}{' '}
                                <a href="mailto:legal@el7lm.com" className="font-bold underline" style={{ color: 'var(--gold)' }}>
                                    legal@el7lm.com
                                </a>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </WebsiteShell>
    );
}
