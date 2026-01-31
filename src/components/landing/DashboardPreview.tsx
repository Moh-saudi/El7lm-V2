"use client";
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, ArrowRight, TrendingUp, Trophy, Star, Activity } from 'lucide-react';
import { growthChartData, topPlayers } from '@/data/landing-stats';

interface DashboardPreviewProps {
    isDarkMode: boolean;
    currentLanguage: 'ar' | 'en' | 'fr' | 'es';
    onGetStarted: () => void;
}

export const DashboardPreview: React.FC<DashboardPreviewProps> = ({
    isDarkMode,
    currentLanguage,
    onGetStarted
}) => {
    const isRTL = currentLanguage === 'ar';
    const [hoveredCard, setHoveredCard] = useState<number | null>(null);

    const content = {
        ar: {
            title: 'شاهد المنصة في العمل',
            subtitle: 'نظام متكامل لإدارة المواهب الرياضية',
            growth: 'نمو اللاعبين',
            topPerformers: 'نخبة هذا الشهر',
            startNow: 'ابدأ رحلتك الآن',
            month: 'الشهر',
            rating: 'التقييم'
        },
        en: {
            title: 'See The Platform In Action',
            subtitle: 'Complete system for managing sports talents',
            growth: 'Player Growth',
            topPerformers: 'Top Performers',
            startNow: 'Start Your Journey Now',
            month: 'Month',
            rating: 'Rating'
        },
        fr: {
            title: 'Voir la Plateforme en Action',
            subtitle: 'Système complet de gestion des talents sportifs',
            growth: 'Croissance des Joueurs',
            topPerformers: 'Meilleurs Joueurs',
            startNow: 'Commencez Maintenant',
            month: 'Mois',
            rating: 'Note'
        },
        es: {
            title: 'Ver la Plataforma en Acción',
            subtitle: 'Sistema completo para gestionar talentos deportivos',
            growth: 'Crecimiento de Jugadores',
            topPerformers: 'Mejores Jugadores',
            startNow: 'Empieza Ahora',
            month: 'Mes',
            rating: 'Calificación'
        }
    };

    const t = content[currentLanguage];
    const chartData = growthChartData.map(item => ({
        month: currentLanguage === 'ar' ? item.month : item.monthEn,
        players: item.players
    }));

    // Enhanced Player Cards with 3D effect
    const PlayerCard = ({ player, index }: { player: any, index: number }) => {
        const isHovered = hoveredCard === index;

        return (
            <motion.div
                className="relative group cursor-pointer"
                onHoverStart={() => setHoveredCard(index)}
                onHoverEnd={() => setHoveredCard(null)}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
            >
                <div className={`relative h-[400px] w-full rounded-[2rem] overflow-hidden transition-all duration-500 transform ${isHovered ? 'scale-105 shadow-2xl rotate-y-12' : 'scale-100 shadow-lg'
                    } ${isDarkMode ? 'bg-slate-800' : 'bg-white'}`}>

                    {/* Card Background Gradient */}
                    <div className={`absolute inset-0 bg-gradient-to-br opacity-80 ${index === 0 ? 'from-yellow-400/20 to-orange-500/20' :
                            index === 1 ? 'from-blue-400/20 to-indigo-500/20' :
                                'from-green-400/20 to-emerald-500/20'
                        }`} />

                    {/* Rank Badge */}
                    <div className="absolute top-4 right-4 z-20">
                        <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl font-bold shadow-lg ${index === 0 ? 'bg-yellow-400 text-yellow-900 border-2 border-yellow-200' :
                                index === 1 ? 'bg-gray-300 text-gray-800 border-2 border-gray-100' :
                                    'bg-orange-300 text-orange-900 border-2 border-orange-100'
                            }`}>
                            {index + 1}
                        </div>
                    </div>

                    {/* Player Image Placeholder (Avatar) */}
                    <div className="absolute top-12 left-1/2 transform -translate-x-1/2 w-32 h-32 rounded-full border-4 border-white/20 shadow-xl bg-gradient-to-br from-gray-200 to-gray-400 flex items-center justify-center overflow-hidden">
                        <span className="text-4xl">👤</span>
                    </div>

                    {/* Content */}
                    <div className="absolute bottom-0 w-full p-6 text-center z-20 bg-gradient-to-t from-black/80 to-transparent pt-20">
                        <h3 className={`text-2xl font-bold mb-1 ${isDarkMode ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
                            {currentLanguage === 'ar' ? player.name : player.nameEn}
                        </h3>
                        <p className="text-gray-300 font-medium mb-4">
                            {currentLanguage === 'ar' ? player.position : player.positionEn}
                        </p>

                        <div className="flex justify-center gap-4 mb-4">
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">{t.rating}</span>
                                <div className="flex items-center gap-1 text-yellow-400 font-bold text-xl">
                                    <Star fill="currentColor" size={16} />
                                    {player.rating}
                                </div>
                            </div>
                            <div className="flex flex-col items-center">
                                <span className="text-xs text-gray-400 uppercase tracking-wider">Perf</span>
                                <div className="flex items-center gap-1 text-green-400 font-bold text-xl">
                                    <Activity size={16} />
                                    98%
                                </div>
                            </div>
                        </div>

                        <button className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-300 ${isDarkMode ? 'bg-white text-black hover:bg-gray-200' : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}>
                            View Profile
                        </button>
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <section
            className={`py-20 md:py-28 ${isDarkMode
                    ? 'bg-gradient-to-b from-slate-900 via-blue-950/50 to-slate-900'
                    : 'bg-gradient-to-b from-blue-50 via-indigo-50/50 to-white'
                }`}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Header */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center mb-16"
                >
                    <h2 className={`text-4xl sm:text-5xl md:text-6xl font-bold mb-6 ${isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                        {t.title}
                    </h2>
                    <p className={`text-lg sm:text-xl max-w-2xl mx-auto ${isDarkMode ? 'text-gray-400' : 'text-gray-600'
                        }`}>
                        {t.subtitle}
                    </p>
                </motion.div>

                {/* 1. CHART SECTION (Full Width) */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8 }}
                    className={`mb-24 rounded-[2.5rem] p-8 sm:p-12 border shadow-2xl ${isDarkMode
                            ? 'bg-slate-800/50 border-slate-700 backdrop-blur-md'
                            : 'bg-white border-gray-100'
                        }`}
                >
                    <div className={`flex items-center gap-4 mb-8 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                        <div className={`p-3 rounded-2xl ${isDarkMode ? 'bg-blue-500/20 text-blue-400' : 'bg-blue-100 text-blue-600'}`}>
                            <TrendingUp className="w-8 h-8" />
                        </div>
                        <h3 className="text-3xl font-bold">{t.growth}</h3>
                    </div>

                    <div className="h-[400px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorPlayers" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid
                                    strokeDasharray="3 3"
                                    vertical={false}
                                    stroke={isDarkMode ? '#334155' : '#e2e8f0'}
                                />
                                <XAxis
                                    dataKey="month"
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 14 }}
                                    dy={10}
                                />
                                <YAxis
                                    axisLine={false}
                                    tickLine={false}
                                    tick={{ fill: isDarkMode ? '#94a3b8' : '#64748b', fontSize: 14 }}
                                    dx={-10}
                                />
                                <Tooltip
                                    contentStyle={{
                                        backgroundColor: isDarkMode ? '#1e293b' : '#ffffff',
                                        border: 'none',
                                        borderRadius: '12px',
                                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                                        padding: '12px 16px'
                                    }}
                                    itemStyle={{ color: isDarkMode ? '#fff' : '#000' }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="players"
                                    stroke="#3b82f6"
                                    strokeWidth={4}
                                    fillOpacity={1}
                                    fill="url(#colorPlayers)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </motion.div>

                {/* 2. TOP PERFORMERS (3D Cards) */}
                <div className="mb-20">
                    <div className="text-center mb-12">
                        <span className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wider mb-4 inline-block ${isDarkMode ? 'bg-blue-900/30 text-blue-400 border border-blue-500/30' : 'bg-blue-100 text-blue-600'
                            }`}>
                            {t.topPerformers}
                        </span>
                        <h3 className={`text-4xl font-bold ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                            Champions of the Month
                        </h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
                        {topPlayers.map((player, index) => (
                            <PlayerCard key={index} player={player} index={index} />
                        ))}
                    </div>
                </div>

                {/* Final CTA */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="text-center"
                >
                    <button
                        onClick={onGetStarted}
                        className={`group px-12 py-6 rounded-2xl font-bold text-xl transition-all duration-300 inline-flex items-center gap-3 ${isDarkMode
                                ? 'bg-white text-slate-900 hover:bg-gray-100'
                                : 'bg-slate-900 text-white hover:bg-slate-800'
                            } shadow-xl hover:shadow-2xl hover:-translate-y-1`}
                    >
                        {t.startNow}
                        <ArrowRight className={`w-6 h-6 transition-transform group-hover:${isRTL ? '-translate-x-1' : 'translate-x-1'}`} />
                    </button>
                </motion.div>
            </div>
        </section>
    );
};
