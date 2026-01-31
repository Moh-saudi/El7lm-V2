"use client";
import React from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, PlayCircle } from 'lucide-react';
import { BackgroundLines } from '../ui/background-lines';
import { SparklesCore } from '../ui/sparkles';

interface NewHeroSectionProps {
    isDarkMode: boolean;
    currentLanguage: 'ar' | 'en' | 'fr' | 'es';
    onGetStarted: () => void;
}

export const NewHeroSection: React.FC<NewHeroSectionProps> = ({
    isDarkMode,
    currentLanguage,
    onGetStarted
}) => {
    const isRTL = currentLanguage === 'ar';

    const content = {
        ar: {
            title: 'اكتشف موهبتك الرياضية',
            subtitle: 'المنصة الأولى التي تربط المواهب الكروية بالفرص العالمية',
            getStarted: 'ابدأ مجاناً',
            trustedBy: 'وكلاء معتمدون في:'
        },
        en: {
            title: 'Discover Your Athletic Talent',
            subtitle: 'The first platform connecting football talents with global opportunities',
            getStarted: 'Start Free',
            trustedBy: 'Trusted Agents in:'
        },
        fr: {
            title: 'Découvrez Votre Talent Sportif',
            subtitle: 'La première plateforme reliant les talents du football aux opportunités mondiales',
            getStarted: 'Commencer',
            trustedBy: 'Agents de confiance en :'
        },
        es: {
            title: 'Descubre Tu Talento Atlético',
            subtitle: 'La primera plataforma que conecta talentos del fútbol con oportunidades globales',
            getStarted: 'Empezar Gratis',
            trustedBy: 'Agentes de confianza en:'
        }
    };

    const t = content[currentLanguage];

    const countries = [
        { name: 'Egypt', flag: '🇪🇬', ar: 'مصر', en: 'Egypt' },
        { name: 'Morocco', flag: '🇲🇦', ar: 'المغرب', en: 'Morocco' },
        { name: 'Qatar', flag: '🇶🇦', ar: 'قطر', en: 'Qatar' },
        { name: 'Iraq', flag: '🇮🇶', ar: 'العراق', en: 'Iraq' },
        { name: 'Jordan', flag: '🇯🇴', ar: 'الأردن', en: 'Jordan' },
        { name: 'Portugal', flag: '🇵🇹', ar: 'البرتغال', en: 'Portugal' },
    ];

    return (
        <section
            className={`relative min-h-[90vh] flex items-center justify-center overflow-hidden ${isDarkMode
                ? 'bg-slate-900'
                : 'bg-white'
                }`}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <BackgroundLines className="flex items-center justify-center w-full flex-col px-4">

                <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-20">
                    <div className="max-w-6xl mx-auto">
                        {/* Main Content */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                            className="text-center mb-12 relative"
                        >
                            {/* Sparkles Effect on Title */}
                            <div className="relative w-full h-40 flex flex-col items-center justify-center overflow-hidden rounded-md mb-4 bg-transparent">
                                <div className="w-full absolute inset-0 h-full">
                                    <SparklesCore
                                        id="tsparticlesfullpage"
                                        background="transparent"
                                        minSize={0.6}
                                        maxSize={1.4}
                                        particleDensity={100}
                                        className="w-full h-full"
                                        particleColor={isDarkMode ? "#FFFFFF" : "#000000"}
                                    />
                                </div>
                                <h1 className={`text-4xl sm:text-5xl md:text-7xl font-bold leading-tight relative z-20 ${isDarkMode ? 'text-white' : 'text-gray-900'
                                    }`}>
                                    {t.title}
                                </h1>
                            </div>

                            {/* Subtitle */}
                            <p className={`text-lg sm:text-xl md:text-2xl mb-12 max-w-3xl mx-auto leading-relaxed ${isDarkMode ? 'text-gray-300' : 'text-gray-600'
                                }`}>
                                {t.subtitle}
                            </p>

                            {/* CTA Button */}
                            <div className="flex justify-center mb-20 relative z-30">
                                <button
                                    onClick={onGetStarted}
                                    className={`group relative px-10 py-5 rounded-2xl font-bold text-xl transition-all duration-300 flex items-center gap-3 ${isDarkMode
                                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-900/50'
                                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/30'
                                        } shadow-2xl hover:scale-105 hover:-translate-y-1 cursor-pointer`}
                                >
                                    {t.getStarted}
                                    <ArrowRight className={`w-6 h-6 transition-transform group-hover:${isRTL ? '-translate-x-1' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </motion.div>

                        {/* Trusted Agents Marquee */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ duration: 1, delay: 0.5 }}
                            className="border-t border-b border-gray-200/10 py-8 backdrop-blur-sm relative z-30"
                        >
                            <p className={`text-center text-sm font-medium mb-6 uppercase tracking-wider ${isDarkMode ? 'text-gray-400' : 'text-gray-500'
                                }`}>
                                {t.trustedBy}
                            </p>

                            <div className="flex flex-wrap justify-center items-center gap-8 sm:gap-16 opacity-80">
                                {countries.map((country, index) => (
                                    <div key={index} className="flex items-center gap-3 group cursor-default">
                                        <span className="text-4xl filter grayscale group-hover:grayscale-0 transition-all duration-300 transform group-hover:scale-110">
                                            {country.flag}
                                        </span>
                                        <span className={`text-xl font-bold transition-colors duration-300 ${isDarkMode ? 'text-gray-400 group-hover:text-white' : 'text-gray-500 group-hover:text-gray-900'
                                            }`}>
                                            {country[isRTL ? 'ar' : 'en'] as string}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    </div>
                </div>
            </BackgroundLines>
        </section>
    );
};
