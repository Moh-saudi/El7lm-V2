"use client";
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { valuePropositions } from '@/data/landing-stats';
import { CanvasRevealEffect } from "@/components/ui/canvas-reveal-effect";

interface ValuePropsProps {
    isDarkMode: boolean;
    currentLanguage: 'ar' | 'en' | 'fr' | 'es';
}

export const ValuePropositions: React.FC<ValuePropsProps> = ({
    isDarkMode,
    currentLanguage
}) => {
    const isRTL = currentLanguage === 'ar';
    const props = valuePropositions[currentLanguage];

    const sectionTitle = {
        ar: 'لماذا منصة الحلم؟',
        en: 'Why El7lm Platform?',
        fr: 'Pourquoi la Plateforme El7lm ?',
        es: '¿Por qué la Plataforma El7lm?'
    };

    return (
        <section
            className={`py-20 md:py-32 ${isDarkMode ? 'bg-slate-950' : 'bg-white'
                }`}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                {/* Section Title */}
                <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className={`text-3xl sm:text-4xl md:text-6xl font-bold text-center mb-20 ${isDarkMode ? 'text-white' : 'text-gray-900'
                        }`}
                >
                    {sectionTitle[currentLanguage]}
                </motion.h2>

                {/* Canvas Reveal Cards */}
                <div className="flex flex-col lg:flex-row items-center justify-center w-full gap-4 mx-auto px-8">
                    {props.map((prop, index) => (
                        <Card
                            key={index}
                            title={prop.title}
                            description={prop.description}
                            icon={<span className="text-5xl">{prop.icon}</span>}
                            isDarkMode={isDarkMode}
                        >
                            <CanvasRevealEffect
                                animationSpeed={index === 0 ? 5.1 : index === 1 ? 3 : 3}
                                containerClassName={
                                    index === 0 ? "bg-emerald-900" :
                                        index === 1 ? "bg-black" :
                                            "bg-sky-600"
                                }
                                colors={
                                    index === 1 ? [
                                        [236, 72, 153],
                                        [232, 121, 249],
                                    ] : undefined
                                }
                                dotSize={2}
                            />
                        </Card>
                    ))}
                </div>
            </div>
        </section>
    );
};

const Card = ({
    title,
    description,
    icon,
    children,
    isDarkMode
}: {
    title: string;
    description: string;
    icon: React.ReactNode;
    children?: React.ReactNode;
    isDarkMode: boolean;
}) => {
    const [hovered, setHovered] = React.useState(false);
    return (
        <div
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            className={`border group/canvas-card flex items-center justify-center max-w-sm w-full mx-auto p-4 relative h-[30rem] cursor-pointer transition-all duration-300 ${isDarkMode ? 'border-white/[0.2] bg-slate-900' : 'border-black/[0.2] bg-gray-50'
                }`}
        >
            <Icon className={`absolute h-6 w-6 -top-3 -left-3 ${isDarkMode ? 'text-white' : 'text-black'}`} />
            <Icon className={`absolute h-6 w-6 -bottom-3 -left-3 ${isDarkMode ? 'text-white' : 'text-black'}`} />
            <Icon className={`absolute h-6 w-6 -top-3 -right-3 ${isDarkMode ? 'text-white' : 'text-black'}`} />
            <Icon className={`absolute h-6 w-6 -bottom-3 -right-3 ${isDarkMode ? 'text-white' : 'text-black'}`} />

            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="h-full w-full absolute inset-0"
                    >
                        {children}
                    </motion.div>
                )}
            </AnimatePresence>

            <div className="relative z-20 text-center">
                <div className="text-center group-hover/canvas-card:-translate-y-4 group-hover/canvas-card:opacity-0 transition duration-200 w-full mx-auto flex items-center justify-center mb-4">
                    {icon}
                </div>
                <h2 className={`text-xl font-bold opacity-0 group-hover/canvas-card:opacity-100 relative z-10 mt-4 group-hover/canvas-card:text-white group-hover/canvas-card:-translate-y-2 transition duration-200 ${isDarkMode ? 'text-white' : 'text-black'
                    }`}>
                    {title}
                </h2>

                {/* Always visible title (before hover) */}
                <div className="group-hover/canvas-card:opacity-0 transition duration-200 absolute inset-0 flex flex-col items-center justify-center pt-20">
                    <h3 className={`text-2xl font-bold mb-2 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>{title}</h3>
                    <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>{description}</p>
                </div>
            </div>
        </div>
    );
};

export const Icon = ({ className, ...rest }: any) => {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth="1.5"
            stroke="currentColor"
            className={className}
            {...rest}
        >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
        </svg>
    );
};
