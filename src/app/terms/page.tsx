'use client';
import React from 'react';
import { useTranslation } from '@/lib/i18n';

export default function TermsPage() {
    const { t, isRTL } = useTranslation();

    return (
        <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8" dir={isRTL ? 'rtl' : 'ltr'}>
            <div className="max-w-4xl mx-auto bg-card rounded-xl shadow-lg p-8 border border-border">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-primary mb-2">{t('terms.title')}</h1>
                    <p className="text-muted-foreground">{t('terms.lastUpdate')}</p>
                </div>

                <div className="space-y-8 text-foreground leading-relaxed">
                    <section>
                        <h2 className="text-xl font-bold text-secondary-foreground mb-3 flex items-center gap-2">
                            <span className="w-2 h-8 bg-secondary rounded-full inline-block"></span>
                            {t('terms.introTitle')}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('terms.introDesc')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary-foreground mb-3 flex items-center gap-2">
                            <span className="w-2 h-8 bg-secondary rounded-full inline-block"></span>
                            {t('terms.accountsTitle')}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('terms.accountsDesc')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary-foreground mb-3 flex items-center gap-2">
                            <span className="w-2 h-8 bg-secondary rounded-full inline-block"></span>
                            {t('terms.ipTitle')}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('terms.ipDesc')}
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-bold text-secondary-foreground mb-3 flex items-center gap-2">
                            <span className="w-2 h-8 bg-secondary rounded-full inline-block"></span>
                            {t('terms.dataTitle')}
                        </h2>
                        <p className="text-muted-foreground">
                            {t('terms.dataDesc')}
                        </p>
                    </section>

                    <div className="border-t border-border pt-6 mt-8">
                        <p className="text-sm text-muted-foreground text-center">
                            {t('terms.legalContact')}{' '}
                            <a href="mailto:legal@el7lm.com" className="text-primary hover:underline font-bold">
                                legal@el7lm.com
                            </a>
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
