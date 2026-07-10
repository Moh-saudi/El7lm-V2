'use client';
import React from 'react';
import Image from 'next/image';
import { Trophy } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

const getStories = (t: any) => [
    {
        name: t('successStories.story1Name'),
        club: t('successStories.story1Club'),
        image: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=800&auto=format&fit=crop&q=60",
        desc: t('successStories.story1Desc'),
        stats: { goals: 24, matches: 30 }
    },
    {
        name: t('successStories.story2Name'),
        club: t('successStories.story2Club'),
        image: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=800&auto=format&fit=crop&q=60",
        desc: t('successStories.story2Desc'),
        stats: { cleanSheets: 15, matches: 28 }
    },
    {
        name: t('successStories.story3Name'),
        club: t('successStories.story3Club'),
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=800&auto=format&fit=crop&q=60",
        desc: t('successStories.story3Desc'),
        stats: { goals: 32, matches: 25 }
    }
];

export default function SuccessStoriesPage() {
    const { t, isRTL } = useTranslation();
    const STORIES = getStories(t);

    return (
        <div className="min-h-screen bg-background" dir={isRTL ? 'rtl' : 'ltr'}>
            {/* Header */}
            <div className="bg-gradient-to-br from-slate-900 to-primary/80 text-white py-16 text-center px-4 relative overflow-hidden">
                <div className="absolute inset-0 bg-[url('/images/pattern.png')] opacity-10"></div>
                <div className="relative z-10">
                    <h1 className="text-4xl font-bold mb-4">{t('successStories.title')}</h1>
                    <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                        {t('successStories.subtitle')}
                    </p>
                </div>
            </div>

            {/* Stories Grid */}
            <div className="container mx-auto px-4 py-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {STORIES.map((story, i) => (
                        <div key={i} className="bg-card rounded-xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300 border border-border group hover:-translate-y-1">
                            <div className="relative h-64 overflow-hidden">
                                <Image
                                    src={story.image}
                                    alt={story.name}
                                    layout="fill"
                                    objectFit="cover"
                                    className="group-hover:scale-110 transition-transform duration-700"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 to-transparent flex flex-col justify-end p-6">
                                    <h3 className="text-white text-2xl font-bold">{story.name}</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-secondary"></span>
                                        <p className="text-slate-200 font-medium text-sm">{story.club}</p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-6">
                                <p className="text-muted-foreground leading-relaxed mb-6">
                                    {story.desc}
                                </p>
                                <div className="flex items-center justify-between border-t border-border pt-4">
                                    <div className="flex items-center gap-2 text-primary font-bold">
                                        <Trophy size={18} className="text-yellow-500" />
                                        <span>{t('successStories.achievement')}</span>
                                    </div>
                                    <button className="text-sm text-primary font-bold hover:underline">{t('successStories.readMore')}</button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* CTA */}
            <div className="bg-muted/30 py-12 text-center border-t border-border">
                <h2 className="text-2xl font-bold text-foreground mb-4">{t('successStories.ctaTitle')}</h2>
                <p className="text-muted-foreground mb-6">{t('successStories.ctaSub')}</p>
                <a href="/auth/register" className="inline-block bg-primary text-primary-foreground px-8 py-3 rounded-xl font-bold hover:bg-primary/90 transition-all shadow-lg shadow-primary/25">
                    {t('successStories.registerFree')}
                </a>
            </div>
        </div>
    );
}
