'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Autoplay } from 'swiper/modules';
import 'swiper/css';
import {
    Search, User, Menu, X, Trophy, Globe, ChevronRight, ChevronDown, Star, LogIn, UserPlus,
    MessageCircle, Phone, MapPin, Facebook, Twitter, Instagram,
    Linkedin, Youtube, Sun, Moon, CheckCircle2, TrendingUp
} from 'lucide-react';
import Image from 'next/image';
import { AnimatedTooltip } from "@/components/ui/animated-tooltip";
import { LANDING_TRANSLATIONS } from '@/data/landing-translations';
import { getLandingData } from '@/data/landing-data';
import { getLandingStats, LandingStats } from '@/lib/content/stats-service';
import { getPartners, PartnerItem } from '@/lib/content/partners-service';
import { getSuccessStories, SuccessStory } from '@/lib/content/success-stories-service';
import { getSliderItems, SliderItem } from '@/lib/content/slider-service';
import { getBrandingData, BrandingData } from '@/lib/content/branding-service';
import { getSupabaseImageUrl } from '@/lib/supabase/image-utils';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

type Language = 'ar' | 'en' | 'fr' | 'es';

export default function Home() {
    // --- State ---
    const [currentLanguage, setCurrentLanguage] = useState<Language>('ar');
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isMarketExpanded, setIsMarketExpanded] = useState(false);
    const [currentSlide, setCurrentSlide] = useState(0);
    const [landingStats, setLandingStats] = useState<LandingStats | null>(null);
    const [partners, setPartners] = useState<PartnerItem[]>([]);
    const [successStoriesData, setSuccessStoriesData] = useState<SuccessStory[]>([]); // Added state
    const [sliderData, setSliderData] = useState<SliderItem[]>([]); // Added state
    const [branding, setBranding] = useState<BrandingData | null>(null);

    // --- Derived State ---
    const t = LANDING_TRANSLATIONS[currentLanguage];
    const isRTL = currentLanguage === 'ar';
    const theme = isDarkMode ? 'dark' : 'light';

    // Get dynamic data based on language
    const { topPlayers, latestRegistrations, tournaments, successStories } = getLandingData(currentLanguage);

    // Transform Success Stories
    const tooltipItems = successStoriesData.length > 0 ? successStoriesData.map((story: any) => ({
        id: story.id,
        name: story.name,
        designation: story.club ? `${story.role} - ${story.club}` : story.role,
        image: story.image || `https://ui-avatars.com/api/?name=${story.name}&background=random`
    })) : successStories;

    // --- Effects ---
    useEffect(() => {
        const savedLang = localStorage.getItem('language') as Language;
        if (savedLang) setCurrentLanguage(savedLang);

        // Auto-detect system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setIsDarkMode(true);
        }

        // Fetch Stats
        getLandingStats().then(data => {
            console.log('Stats loaded:', data);
            setLandingStats(data);
        }).catch(err => console.error('Failed to load stats:', err));

        // Fetch Partners
        getPartners().then(setPartners).catch(err => console.error('Failed to load partners:', err));

        // Fetch Success Stories
        getSuccessStories().then(setSuccessStoriesData).catch(err => console.error('Failed to load success stories:', err));

        // Fetch Slider
        getSliderItems().then(setSliderData).catch(err => console.error('Failed to load slider:', err));

        // Fetch Branding
        getBrandingData().then(setBranding).catch(err => console.error('Failed to load branding:', err));
    }, []);

    const heroSlides = sliderData.length > 0 ? sliderData.map(item => ({
        image: getSupabaseImageUrl(item.image, 'content'),
        title: item.title,
        subtitle: item.subtitle,
        cta: item.ctaText,
        link: item.ctaLink
    })) : [
        {
            image: '/images/hero-1.jpg',
            title: t.hero.slide1_title,
            subtitle: t.hero.slide1_subtitle,
            cta: t.hero.slide1_cta,
            link: '/auth/register'
        },
        {
            image: '/images/hero-1.jpg',
            title: t.hero.slide2_title,
            subtitle: t.hero.slide2_subtitle,
            cta: t.hero.slide2_cta,
            link: '#features'
        },
        {
            image: '/images/hero-1.jpg',
            title: "El7lm Academy",
            subtitle: "Join the best football academy in the region.",
            cta: "Join Academy",
            link: '/academy/join'
        }
    ];

    // Marquee content logic
    const marqueeItems = partners.length > 0 ? partners : [
        { id: '1', name: "VLab", logoUrl: "" },
        { id: '2', name: "QSTP", logoUrl: "" },
        { id: '3', name: "QFC", logoUrl: "" },
        { id: '4', name: "MCIT", logoUrl: "" },
        { id: '5', name: "Vodafone", logoUrl: "" },
        { id: '6', name: "Ooredoo", logoUrl: "" },
        { id: '7', name: "Aspire", logoUrl: "" },
    ];
    const marqueeContent = marqueeItems;

    // Auto-rotate slider
    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentSlide((prev) => (prev + 1) % heroSlides.length);
        }, 5000);
        return () => clearInterval(timer);
    }, [heroSlides.length]);

    const toggleLanguage = () => {
        const langs: Language[] = ['ar', 'en', 'fr', 'es'];
        const nextIndex = (langs.indexOf(currentLanguage) + 1) % langs.length;
        const nextLang = langs[nextIndex];
        setCurrentLanguage(nextLang);
        localStorage.setItem('language', nextLang);
    };

    // --- Theme Colors Helper ---
    const colors = {
        bg: 'bg-background',
        cardBg: 'bg-card',
        cardBorder: 'border-border',
        headerBg: 'bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 border-b border-border sticky top-0',
        text: 'text-foreground',
        subText: 'text-muted-foreground',
        accent: 'text-primary',
        accentBg: 'bg-primary',
        sectionHeader: 'bg-muted/30'
    };

    // --- Sub-Components ---
    const TMHeader = () => (
        <header className={`${colors.headerBg} transition-colors duration-300 z-50`}>
            {/* Top Bar */}
            <div className={`border-b border-border/50 ${isDarkMode ? 'bg-muted/20' : 'bg-muted/50'}`}>
                <div className="container mx-auto px-4 h-9 flex items-center justify-between text-[10px] sm:text-xs">
                    <div className="flex items-center gap-4 text-muted-foreground">
                        {/* Language Switcher */}
                        <button onClick={toggleLanguage} className="cursor-pointer hover:text-foreground flex items-center gap-1 transition-colors">
                            <Globe size={12} />
                            <span className="uppercase">{currentLanguage}</span>
                        </button>

                        {/* Theme Toggle */}
                        <button onClick={() => setIsDarkMode(!isDarkMode)} className="cursor-pointer hover:text-foreground flex items-center gap-1 transition-colors">
                            {isDarkMode ? <Sun size={12} /> : <Moon size={12} />}
                        </button>
                    </div>

                    <div className="hidden sm:inline text-muted-foreground opacity-80">support@el7lm.com</div>
                </div>
            </div>

            {/* Main Nav & Branding */}
            <div className="container mx-auto px-4 py-3">
                <div className="flex items-center justify-between gap-4">
                    {/* 1. Logo Section */}
                    <div className="flex items-center gap-3 shrink-0">
                        <div className="w-10 h-10 md:w-12 md:h-12 bg-primary rounded-xl flex items-center justify-center text-primary-foreground font-bold text-xl md:text-2xl shadow-lg overflow-hidden relative group">
                            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                            {branding?.logoUrl ? (
                                <Image src={branding.logoUrl} alt={branding.siteName || 'El7lm'} fill className="object-cover" />
                            ) : (
                                <span>7</span>
                            )}
                        </div>
                        <div className="hidden min-[380px]:block">
                            <h1 className={`text-xl md:text-2xl font-bold leading-none tracking-tight ${colors.text}`}>{branding?.siteName || 'EL7LM'}</h1>
                            <span className={`text-[9px] md:text-[10px] uppercase tracking-widest block font-medium ${colors.accent}`}>{branding?.slogan || t.header.slogan}</span>
                        </div>
                    </div>

                    {/* 2. Search Bar (Desktop) */}
                    <div className="hidden md:flex flex-1 max-w-lg mx-auto relative px-6">
                        <div className="relative w-full group">
                            <input
                                type="text"
                                placeholder={t.header.search_placeholder}
                                className={`w-full h-11 pl-4 pr-12 rounded-xl text-sm transition-all border border-transparent focus:border-primary/50 ${isDarkMode ? 'bg-muted/50 text-white placeholder-muted-foreground focus:bg-muted' : 'bg-gray-100 text-gray-900 focus:bg-white'} focus:ring-4 focus:ring-primary/10 outline-none`}
                            />
                            <button className={`absolute ${isRTL ? 'left-2' : 'right-2'} top-2 h-7 w-7 bg-background text-primary rounded-lg shadow-sm flex items-center justify-center hover:scale-105 transition-all`}>
                                <Search size={14} />
                            </button>
                        </div>
                    </div>

                    {/* 3. Action Buttons & Mobile Toggle */}
                    <div className="flex items-center gap-2 md:gap-3">
                        {/* Login */}
                        <a href="/auth/login" className={`flex items-center justify-center w-9 h-9 md:w-auto md:h-auto md:px-5 md:py-2.5 rounded-xl font-bold text-sm transition-all border ${colors.cardBorder} hover:bg-muted text-foreground`}>
                            <LogIn size={16} />
                            <span className="hidden md:inline md:ml-2">{t.header.login}</span>
                        </a>

                        {/* Join */}
                        <a href="/auth/register" className="flex items-center justify-center h-9 px-3 md:h-auto md:px-6 md:py-2.5 rounded-xl font-bold text-xs md:text-sm bg-primary text-primary-foreground hover:opacity-90 shadow-lg shadow-primary/25 transition-all transform hover:-translate-y-0.5 whitespace-nowrap">
                            <UserPlus size={16} className="md:mr-2" />
                            <span className="hidden md:inline">{t.header.join}</span>
                            <span className="md:hidden ml-1">{t.header.join}</span>
                        </a>

                        {/* Mobile Menu Toggle */}
                        <button className={`md:hidden p-2 ml-1 rounded hover:bg-muted ${colors.text}`} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                            {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Categories Nav (Desktop) */}
            <div className="hidden md:block border-t border-border/40">
                <div className="container mx-auto px-4">
                    <nav className="flex items-center gap-1 text-sm font-medium overflow-x-auto no-scrollbar">
                        {Object.values(t.nav).map((item, i) => (
                            <a key={i} href="#" className={`px-4 py-3 hover:text-primary transition-colors border-b-2 border-transparent hover:border-primary whitespace-nowrap ${colors.subText}`}>
                                {item}
                            </a>
                        ))}
                    </nav>
                </div>
            </div>
        </header>
    );

    const SectionHeader = ({ title, icon: Icon, color, onClick, isOpen }: any) => (
        <div
            onClick={onClick}
            className={`${color || colors.sectionHeader} px-4 py-3 flex items-center justify-between rounded-t-xl transition-colors duration-300 border-b border-border/50 ${onClick ? 'cursor-pointer hover:bg-muted/70' : ''}`}
        >
            <div className="flex items-center gap-2">
                {Icon && <Icon size={18} className="text-primary" />}
                <h3 className={`font-bold text-sm uppercase tracking-wide ${colors.text}`}>{title}</h3>
            </div>
            {onClick ? (
                <div className={`md:hidden ${colors.text}`}>
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                </div>
            ) : (
                <button className={`text-[10px] ${colors.accentBg}/10 ${colors.accent} px-2 py-0.5 rounded hover:bg-primary hover:text-white transition-colors`}>View All</button>
            )}
        </div>
    );

    const ContactSection = () => (
        <div className={`${colors.cardBg} border ${colors.cardBorder} rounded-xl p-8 mb-6 relative overflow-hidden group`}>
            {/* Glossy Effect */}
            <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full -mr-40 -mt-20 blur-3xl group-hover:bg-primary/10 transition-colors"></div>

            <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                <div>
                    <h3 className={`text-2xl font-bold mb-2 ${colors.text}`}>{t.sections.contact_us}</h3>
                    <p className={`${colors.subText} mb-6 text-sm`}>{t.sections.contact_subtitle}</p>
                    <div className="space-y-4">
                        {/* Clickable Phone */}
                        <a href="https://wa.me/97470542458" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 group cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors -mx-3">
                            <div className="w-10 h-10 bg-green-500/10 rounded-full flex items-center justify-center text-green-500 shrink-0 group-hover:bg-green-500 group-hover:text-white transition-all">
                                <MessageCircle size={20} />
                            </div>
                            <div>
                                <div className={`text-xs ${colors.subText} mb-1`}>Customer Service (WhatsApp)</div>
                                <div className={`text-base font-bold font-mono ${colors.text}`} dir="ltr">+974 7054 2458</div>
                            </div>
                        </a>

                        <a href="tel:+97470542458" className="flex items-start gap-4 group cursor-pointer hover:bg-muted/50 p-3 rounded-lg transition-colors -mx-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0 group-hover:bg-primary group-hover:text-white transition-all"><Phone size={20} /></div>
                            <div>
                                <div className={`text-xs ${colors.subText} mb-1`}>Call Us Directly</div>
                                <div className={`text-base font-bold font-mono ${colors.text}`} dir="ltr">+974 7054 2458</div>
                            </div>
                        </a>

                        <div className="flex items-start gap-4 p-3 -mx-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary shrink-0"><MapPin size={20} /></div>
                            <div>
                                <div className={`text-xs ${colors.subText} mb-1`}>Qatar HQ 🇶🇦</div>
                                <div className={`text-sm font-medium leading-snug ${colors.text}`}>Doha - QFC Tower</div>
                            </div>
                        </div>
                    </div>
                </div>
                <form className={`p-6 rounded-xl border ${colors.cardBorder} bg-muted/20 backdrop-blur-sm`}>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <input type="text" placeholder={t.sections.name_placeholder} className={`bg-background border ${colors.cardBorder} ${colors.text} text-sm rounded-lg h-11 px-4 focus:ring-2 focus:ring-primary/20 outline-none`} />
                        <input type="email" placeholder={t.sections.email_placeholder} className={`bg-background border ${colors.cardBorder} ${colors.text} text-sm rounded-lg h-11 px-4 focus:ring-2 focus:ring-primary/20 outline-none`} />
                    </div>
                    <textarea placeholder={t.sections.msg_placeholder} rows={3} className={`w-full bg-background border ${colors.cardBorder} ${colors.text} text-sm rounded-lg p-4 mb-4 focus:ring-2 focus:ring-primary/20 outline-none`}></textarea>
                    <button className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold py-3 rounded-lg text-sm transition-all shadow-lg hover:shadow-primary/25">{t.sections.send_message}</button>
                </form>
            </div>
        </div>
    );

    const Footer = () => (
        <footer className={`mt-12 ${colors.cardBg} border-t ${colors.cardBorder} pt-12 pb-6 px-4`}>
            <div className="container mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
                    {/* Brand Column */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg overflow-hidden relative">
                                {branding?.footerLogoUrl || branding?.logoUrl ? (
                                    <Image src={branding?.footerLogoUrl || branding?.logoUrl || ''} alt="Logo" fill className="object-cover" />
                                ) : (
                                    <span>7</span>
                                )}
                            </div>
                            <h2 className={`text-xl font-bold ${colors.text}`}>{branding?.siteName || 'EL7LM'}</h2>
                        </div>
                        <p className={`text-sm ${colors.subText} mb-4 leading-relaxed`}>
                            {branding?.slogan || t.header.slogan}. موثقون من VLab و QFC. نصنع مستقبل الرياضة بالبيانات والذكاء الاصطناعي.
                        </p>
                        <div className="flex gap-4">
                            {/* Facebook */}
                            <a href="https://www.facebook.com/profile.php?id=61577797509887" target="_blank" rel="noopener noreferrer" className={`${colors.subText} hover:text-primary transition-colors`}>
                                <Facebook size={18} />
                            </a>
                            {/* Instagram */}
                            <a href="https://www.instagram.com/hagzzel7lm/" target="_blank" rel="noopener noreferrer" className={`${colors.subText} hover:text-primary transition-colors`}>
                                <Instagram size={18} />
                            </a>
                            {/* LinkedIn */}
                            <a href="https://www.linkedin.com/showcase/el7lm" target="_blank" rel="noopener noreferrer" className={`${colors.subText} hover:text-primary transition-colors`}>
                                <Linkedin size={18} />
                            </a>
                            {/* YouTube */}
                            <a href="https://www.youtube.com/@el7lm25" target="_blank" rel="noopener noreferrer" className={`${colors.subText} hover:text-primary transition-colors`}>
                                <Youtube size={18} />
                            </a>
                            {/* TikTok - Custom SVG */}
                            <a href="https://www.tiktok.com/@meskel7lm" target="_blank" rel="noopener noreferrer" className={`${colors.subText} hover:text-primary transition-colors`}>
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="18"
                                    height="18"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                >
                                    <path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5v4a9 9 0 0 1-9-9" />
                                </svg>
                            </a>
                        </div>
                    </div>

                    {/* Links Columns */}
                    <div>
                        <h4 className={`font-bold mb-4 ${colors.text}`}>{t.footer.platform}</h4>
                        <ul className={`space-y-2 text-sm ${colors.subText}`}>
                            <li><a href="/about" className="hover:text-primary transition-colors">{t.footer.links.about}</a></li>
                            <li><a href="/about" className="hover:text-primary transition-colors">{t.footer.links.who_we_are}</a></li>
                            <li><a href="/success-stories" className="hover:text-primary transition-colors">{t.footer.links.success}</a></li>
                            <li><a href="/careers" className="hover:text-primary transition-colors">{t.footer.links.careers}</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className={`font-bold mb-4 ${colors.text}`}>{t.footer.support}</h4>
                        <ul className={`space-y-2 text-sm ${colors.subText}`}>
                            <li><a href="/contact" className="hover:text-primary transition-colors">{t.footer.links.help}</a></li>
                            <li><a href="/terms" className="hover:text-primary transition-colors">{t.footer.links.terms}</a></li>
                            <li><a href="/privacy" className="hover:text-primary transition-colors">{t.footer.links.privacy}</a></li>
                            <li><a href="/contact" className="hover:text-primary transition-colors">{t.footer.links.contact}</a></li>
                        </ul>
                    </div>
                    <div>
                        <h4 className={`font-bold mb-4 ${colors.text}`}>{t.footer.mobile_title}</h4>
                        <p className={`text-sm ${colors.subText} mb-3`}>{t.footer.mobile_text}</p>
                        <div className="flex gap-2">
                            <div className={`w-24 h-8 bg-muted rounded border border-border flex items-center justify-center text-[10px] ${colors.subText} cursor-not-allowed`}>App Store</div>
                            <div className={`w-24 h-8 bg-muted rounded border border-border flex items-center justify-center text-[10px] ${colors.subText} cursor-not-allowed`}>Google Play</div>
                        </div>
                    </div>
                </div>

                <div className={`border-t border-border/50 pt-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs ${colors.subText}`}>
                    <div>
                        جميع الحقوق محفوظة لشركة <a href="https://mesk.qa" target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors font-bold">ميسك القطرية</a> 2024
                    </div>
                    <div className="flex gap-4">
                        <a href="/privacy" className="hover:text-primary">Privacy</a>
                        <a href="/terms" className="hover:text-primary">Terms</a>
                        <a href="#" className="hover:text-primary">Sitemap</a>
                    </div>
                </div>
            </div>
        </footer>
    );

    const WhatsAppFloat = () => (
        <a
            href="https://wa.me/97470542458"
            target="_blank"
            rel="noopener noreferrer"
            className={`fixed bottom-6 ${isRTL ? 'left-6' : 'right-6'} z-50 bg-[#25D366] text-white p-3 rounded-full shadow-lg hover:scale-110 transition-transform flex items-center gap-2 group`}
        >
            <MessageCircle size={24} fill="white" className="text-[#25D366]" />
            <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 whitespace-nowrap font-bold text-sm">
                تواصل معنا
            </span>
        </a>
    );



    return (
        <div className={`min-h-screen ${colors.bg} ${colors.text} font-cairo transition-colors duration-300`} dir={isRTL ? 'rtl' : 'ltr'}>
            <TMHeader />

            <main className="container mx-auto px-4 py-6">

                {/* --- Top Section --- */}
                <div className="w-full mb-6">

                    {/* LEFT: Hero Slider */}
                    <div className={`w-full ${colors.cardBg} shadow-sm rounded-sm overflow-hidden border ${colors.cardBorder} flex flex-col`}>
                        <SectionHeader title={t.sections.featured_stories} icon={Star} />

                        {/* Fixed Height Slider - No flex-1 to verify visibility */}
                        <div className="relative w-full h-[320px] md:h-[450px] bg-slate-900 group cursor-pointer overflow-hidden rounded-b-sm shrink-0">
                            {/* Fallback Background (Shown if image is missing or loading) */}
                            <div className={`absolute inset-0 bg-gradient-to-br transition-opacity duration-1000 ${currentSlide === 0 ? 'from-primary to-violet-900' : 'from-slate-900 to-gray-800'}`}></div>

                            {/* Background Image */}
                            {heroSlides[currentSlide].image && (
                                <Image
                                    src={heroSlides[currentSlide].image}
                                    alt={heroSlides[currentSlide].title}
                                    fill
                                    className="object-cover transition-all duration-1000 group-hover:scale-105"
                                    priority
                                />
                            )}

                            {/* Overlay Gradient */}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent z-10"></div>

                            <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8 z-20">
                                <motion.div
                                    key={currentSlide}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.5 }}
                                >
                                    <span className={`${colors.accentBg} text-white text-xs px-2 py-1 font-bold rounded-sm mb-3 inline-block`}>
                                        {currentSlide === 0 ? 'EL7LM' : 'Partners'}
                                    </span>
                                    <h2 className="text-2xl md:text-4xl font-bold text-white mb-3 leading-tight">
                                        {heroSlides[currentSlide].title}
                                    </h2>
                                    <p className="text-gray-300 text-sm md:text-base mb-6 max-w-xl">
                                        {heroSlides[currentSlide].subtitle}
                                    </p>

                                    {/* Buttons Container */}
                                    <div className="flex items-center gap-3">
                                        {/* Main CTA */}
                                        <button className={`${colors.accentBg} hover:bg-white hover:text-primary text-primary-foreground px-6 py-2 rounded-xl font-bold text-sm transition-colors`}>
                                            {heroSlides[currentSlide].cta}
                                        </button>

                                        {/* Login CTA - Added as requested */}
                                        <a href="/auth/login" className="bg-white/10 hover:bg-white/20 text-white border border-white/30 px-6 py-2 rounded font-bold text-sm transition-colors flex items-center gap-2">
                                            <LogIn size={16} />
                                            {t.header.login}
                                        </a>
                                    </div>
                                </motion.div>
                            </div>
                        </div>

                        {/* Stats Strip */}
                        {/* Stats Strip */}
                        <div className={`grid grid-cols-3 divide-x divide-x-reverse border-t border-white/5 ${isDarkMode ? 'bg-[#0f172a]' : 'bg-white'}`}>
                            <div className="p-6 text-center group hover:bg-white/5 transition-colors">
                                <div className="text-3xl font-black text-primary mb-1">
                                    {landingStats?.players || 1240}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t.hero.stats_players}</div>
                            </div>

                            <div className="p-6 text-center group hover:bg-white/5 transition-colors relative">
                                <div className="text-3xl font-black text-primary mb-1">
                                    {landingStats?.countries || 6}
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">{t.hero.stats_countries}</div>
                                <div className="text-[10px] text-slate-400 font-medium leading-tight max-w-[150px] mx-auto opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-8 left-1/2 -translate-x-1/2 bg-slate-800 text-white px-2 py-1 rounded shadow-lg z-10 w-max pointer-events-none">
                                    قطر - مصر - العراق - المغرب - الأردن - البرتغال
                                </div>
                                {/* Static list for mobile/always visible if preferred, but hover is cleaner. Let's keep it visible but subtle as per request context */}
                                <div className="text-[9px] text-slate-400 mt-1 hidden md:block">
                                    قطر - مصر - العراق - المغرب - الأردن - البرتغال
                                </div>
                            </div>

                            <div className="p-6 text-center group hover:bg-white/5 transition-colors">
                                <div className="text-3xl font-black text-emerald-500 mb-1">
                                    {landingStats?.successRate || 89}%
                                </div>
                                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{t.hero.stats_success}</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- New Mid-Page CTA Section --- */}
                <div className="mb-8 relative overflow-hidden rounded-xl shadow-2xl group border border-white/5">
                    {/* Elegant Dark Background */}
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0f172a] via-[#1e293b] to-[#0f172a]"></div>

                    {/* Subtle Texture/Pattern */}
                    <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>

                    {/* Decorative Background Elements (Refined) */}
                    <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full -mr-32 -mt-32 blur-[100px] animate-pulse"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-violet-900/20 rounded-full -ml-20 -mb-20 blur-[80px]"></div>

                    <div className="relative z-10 py-16 px-6 text-center flex flex-col items-center justify-center">
                        <div className="mb-8">
                            <h2 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight drop-shadow-md">
                                {t.sections.cta.title}
                            </h2>
                            <p className="text-slate-300 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
                                {t.sections.cta.subtitle}
                            </p>
                        </div>

                        <a
                            href="/auth/register"
                            className="group relative inline-flex items-center gap-3 px-10 py-4 bg-white text-black hover:bg-gray-100 rounded-full font-bold text-xl md:text-2xl shadow-[0_0_20px_rgba(255,255,255,0.3)] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] transition-all transform hover:-translate-y-1 overflow-hidden"
                        >
                            {/* Button Shine Effect */}
                            <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/40 to-transparent skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out"></span>

                            <UserPlus size={24} className="group-hover:scale-110 transition-transform" />
                            <span>{t.sections.cta.button}</span>
                        </a>

                        <div className="mt-8 flex flex-wrap justify-center gap-6 text-sm text-slate-400 font-medium">
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5"><CheckCircle2 size={14} className="text-emerald-500" /> مجاني بالكامل</span>
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5"><CheckCircle2 size={14} className="text-emerald-500" /> وصول مباشر للأندية</span>
                            <span className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/5"><CheckCircle2 size={14} className="text-emerald-500" /> تقارير احترافية</span>
                        </div>
                    </div>
                </div>

                {/* --- Grid Section --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {/* Latest Registrations */}
                    <div className={`col-span-2 ${colors.cardBg} shadow-sm rounded-sm border ${colors.cardBorder}`}>
                        <SectionHeader title={t.sections.latest_transfers} icon={User} />
                        <table className="w-full text-sm">
                            <thead className={`text-xs ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} ${colors.subText} border-b ${colors.cardBorder}`}>
                                <tr>
                                    <th className={`py-2 px-4 ${isRTL ? 'text-right' : 'text-left'}`}>{t.table.player}</th>
                                    <th className="py-2 text-center">{t.table.age}</th>
                                    <th className={`py-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t.table.from}</th>
                                    <th className={`py-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t.table.to}</th>
                                    <th className={`py-2 ${isRTL ? 'text-right' : 'text-left'}`}>{t.table.date}</th>
                                </tr>
                            </thead>
                            <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                                {latestRegistrations.map((reg, i) => (
                                    <tr key={i} className={`${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'}`}>
                                        <td className={`py-2 px-4 font-bold ${colors.text} cursor-pointer hover:underline`}>{reg.name}</td>
                                        <td className={`text-center text-xs ${colors.subText}`}>{reg.age}</td>
                                        <td className={`text-xs ${colors.subText}`}>
                                            <div className="flex items-center gap-1">
                                                <MapPin size={10} className="text-red-400" /> {reg.from}
                                            </div>
                                        </td>
                                        <td className="text-xs text-green-600 font-medium">
                                            <div className="flex items-center gap-1">
                                                <MapPin size={10} className="text-green-500" /> {reg.to}
                                            </div>
                                        </td>
                                        <td className={`text-[10px] ${colors.subText}`}>{reg.date}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Active Tournaments - Expanded to fill space */}
                    <div className={`col-span-2 ${colors.cardBg} shadow-sm rounded-sm border ${colors.cardBorder}`}>
                        <SectionHeader title={t.sections.active_tournaments} icon={Trophy} />
                        <div className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                            {tournaments.map((comp, i) => (
                                <div key={i} className={`p-3 flex items-center gap-3 ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-50'} cursor-pointer`}>
                                    <div className={`w-10 h-10 border ${colors.cardBorder} rounded flex items-center justify-center p-1`}>
                                        <Trophy size={20} className="text-yellow-500" />
                                    </div>
                                    <div>
                                        <div className={`font-bold ${colors.text} text-sm hover:underline`}>{comp.name}</div>
                                        <div className={`text-[10px] ${colors.subText} flex gap-2`}>
                                            <span>{comp.clubs} Clubs</span>
                                            <span className="text-green-500">• {comp.status}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* --- Success Stories --- */}
                <div className="mb-6">
                    <div className={`${colors.cardBg} shadow-sm rounded-sm border ${colors.cardBorder} p-6 flex flex-col md:flex-row items-center justify-between gap-6`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                                <Star size={20} className="text-yellow-500 fill-yellow-500" />
                                <h3 className={`font-bold text-xl ${colors.text}`}>{t.sections.success_stories}</h3>
                            </div>
                            <p className={`${colors.subText} text-sm max-w-lg leading-relaxed`}>
                                {t.sections.success_subtitle}
                            </p>
                            <button className={`mt-4 text-xs ${colors.sectionHeader} text-white px-4 py-2 rounded hover:opacity-90 transition-colors`}>
                                {t.sections.view_report}
                            </button>
                        </div>
                        <div className={`flex flex-row items-center justify-center w-full md:w-auto p-4 ${isDarkMode ? 'bg-slate-800' : 'bg-gray-50'} rounded-xl border border-dashed ${colors.cardBorder}`}>
                            <AnimatedTooltip items={tooltipItems} />
                        </div>
                    </div>
                </div>

                {/* --- Partners Section (Redesigned) --- */}
                <div className={`py-20 relative overflow-hidden ${isDarkMode ? 'bg-slate-900/30' : 'bg-blue-50/50'} backdrop-blur-sm mb-12`}>
                    {/* Background Gradients */}
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[300px] bg-primary/5 rounded-full blur-[100px] -z-10"></div>

                    <div className="container mx-auto px-4 text-center">
                        <div className="flex flex-col items-center justify-center mb-12">
                            <h3 className={`text-2xl md:text-3xl font-extrabold text-black dark:text-white mb-3 flex items-center gap-3`}>
                                <span className="w-12 h-[2px] bg-gradient-to-r from-transparent to-black/50 dark:to-white/50 hidden md:block"></span>
                                {t.sections.partners}
                                <span className="w-12 h-[2px] bg-gradient-to-l from-transparent to-black/50 dark:to-white/50 hidden md:block"></span>
                            </h3>
                            <div className={`h-1 w-24 bg-gradient-to-r from-transparent via-primary to-transparent opacity-50`}></div>
                        </div>

                        <div className="flex flex-row items-center justify-center mb-10 w-full">
                            <AnimatedTooltip marquee={true} items={marqueeContent.map((partner, idx) => ({
                                id: idx + 100,
                                name: partner.name,
                                designation: (partner as any).type === 'academy' ? 'Accredited Academy' : 'Strategic Partner',
                                image: partner.logoUrl || `https://ui-avatars.com/api/?name=${partner.name}&background=random`
                            }))} />
                        </div>
                    </div>
                </div>


                <ContactSection />
            </main >

            <Footer />
            <WhatsAppFloat />
        </div >
    );
}
