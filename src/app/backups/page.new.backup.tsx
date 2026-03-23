'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Moon, Sun, Menu, X, Globe } from 'lucide-react';
import { NewHeroSection } from '@/components/landing/NewHeroSection';
import { ValuePropositions } from '@/components/landing/ValuePropositions';
import { DashboardPreview } from '@/components/landing/DashboardPreview';
import Image from 'next/image';

// Force dynamic rendering
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export default function NewLandingPage() {
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [currentLanguage, setCurrentLanguage] = useState<'ar' | 'en'>('ar');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    // Initialize from localStorage
    useEffect(() => {
        const savedTheme = localStorage.getItem('theme');
        const savedLang = localStorage.getItem('language') as 'ar' | 'en';

        if (savedTheme) {
            setIsDarkMode(savedTheme === 'dark');
        }
        if (savedLang) {
            setCurrentLanguage(savedLang);
        }
    }, []);

    // Toggle theme
    const toggleTheme = () => {
        const newTheme = !isDarkMode;
        setIsDarkMode(newTheme);
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    };

    // Toggle language
    const toggleLanguage = () => {
        const newLang = currentLanguage === 'ar' ? 'en' : 'ar';
        setCurrentLanguage(newLang);
        localStorage.setItem('language', newLang);
    };

    // Handle Get Started
    const handleGetStarted = () => {
        window.location.href = '/auth/register';
    };

    const isRTL = currentLanguage === 'ar';

    const navContent = {
        ar: {
            home: 'الرئيسية',
            features: 'المميزات',
            login: 'تسجيل الدخول'
        },
        en: {
            home: 'Home',
            features: 'Features',
            login: 'Login'
        }
    };

    const footerContent = {
        ar: {
            description: 'منصة الحلم - المنصة الأولى لاكتشاف وتطوير المواهب الرياضية في الشرق الأوسط',
            rights: 'جميع الحقوق محفوظة © 2026 - شركة ميسك القطرية',
            quickLinks: 'روابط سريعة',
            privacy: 'سياسة الخصوصية',
            terms: 'الشروط والأحكام',
            support: 'الدعم',
            contact: 'تواصل معنا'
        },
        en: {
            description: 'El7lm Platform - The first platform for discovering and developing sports talents in the Middle East',
            rights: 'All Rights Reserved © 2026 - Misk Qatar Company',
            quickLinks: 'Quick Links',
            privacy: 'Privacy Policy',
            terms: 'Terms & Conditions',
            support: 'Support',
            contact: 'Contact Us'
        }
    };

    const nav = navContent[currentLanguage];
    const footer = footerContent[currentLanguage];

    return (
        <div
            className={`min-h-screen ${isDarkMode ? 'dark bg-slate-900' : 'bg-white'}`}
            dir={isRTL ? 'rtl' : 'ltr'}
        >
            {/* Header */}
            <header className={`fixed top-0 w-full z-50 border-b backdrop-blur-md ${isDarkMode
                    ? 'bg-slate-900/80 border-slate-800'
                    : 'bg-white/80 border-gray-200'
                }`}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-2">
                            <Image
                                src="/images/logo.png"
                                alt="El7lm Logo"
                                width={40}
                                height={40}
                                className="rounded-lg"
                            />
                            <span className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'
                                }`}>
                                {currentLanguage === 'ar' ? 'منصة الحلم' : 'El7lm'}
                            </span>
                        </div>

                        {/* Desktop Navigation */}
                        <nav className="hidden md:flex items-center gap-8">
                            <a
                                href="#home"
                                className={`font-medium transition-colors ${isDarkMode
                                        ? 'text-gray-300 hover:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {nav.home}
                            </a>
                            <a
                                href="#features"
                                className={`font-medium transition-colors ${isDarkMode
                                        ? 'text-gray-300 hover:text-white'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                {nav.features}
                            </a>
                        </nav>

                        ...

                        {/* Action Buttons */}
                        <div className="hidden md:flex items-center gap-4">
                            <button
                                onClick={() => window.location.href = '/auth/login'}
                                className={`px-6 py-2 rounded-lg font-medium transition-colors ${isDarkMode
                                        ? 'text-white hover:bg-slate-800'
                                        : 'text-gray-900 hover:bg-gray-100'
                                    }`}
                            >
                                {nav.login}
                            </button>

                            {/* Language Toggle */}
                            <button
                                onClick={toggleLanguage}
                                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
                                    }`}
                            >
                                <Globe className={`w-5 h-5 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`} />
                            </button>

                            {/* Theme Toggle */}
                            <button
                                onClick={toggleTheme}
                                className={`p-2 rounded-lg transition-colors ${isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-gray-100'
                                    }`}
                            >
                                {isDarkMode ? (
                                    <Sun className="w-5 h-5 text-yellow-400" />
                                ) : (
                                    <Moon className="w-5 h-5 text-gray-600" />
                                )}
                            </button>
                        </div>

                        {/* Mobile Menu Button */}
                        <button
                            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                            className="md:hidden p-2"
                        >
                            {isMobileMenuOpen ? (
                                <X className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
                            ) : (
                                <Menu className={`w-6 h-6 ${isDarkMode ? 'text-white' : 'text-gray-900'}`} />
                            )}
                        </button>
                    </div>

                    {/* Mobile Menu */}
                    {isMobileMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="md:hidden py-4 border-t border-gray-200 dark:border-slate-800"
                        >
                            <div className="flex flex-col gap-4">
                                <a href="#home" className={`px-4 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {nav.home}
                                </a>
                                <a href="#features" className={`px-4 py-2 ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                    {nav.features}
                                </a>
                                <button
                                    onClick={() => window.location.href = '/auth/login'}
                                    className={`px-4 py-2 text-${isRTL ? 'right' : 'left'} ${isDarkMode ? 'text-gray-300' : 'text-gray-600'}`}
                                >
                                    {nav.login}
                                </button>
                                <div className="flex gap-2 px-4">
                                    <button onClick={toggleLanguage} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800">
                                        <Globe className="w-5 h-5" />
                                    </button>
                                    <button onClick={toggleTheme} className="p-2 rounded-lg bg-gray-100 dark:bg-slate-800">
                                        {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </div>
            </header>

            {/* Main Content */}
            <main className="pt-16">
                {/* Hero Section */}
                <div id="home">
                    <NewHeroSection
                        isDarkMode={isDarkMode}
                        currentLanguage={currentLanguage}
                        onGetStarted={handleGetStarted}
                    />
                </div>

                {/* Value Propositions */}
                <div id="features">
                    <ValuePropositions
                        isDarkMode={isDarkMode}
                        currentLanguage={currentLanguage}
                    />
                </div>

                {/* Dashboard Preview */}
                <DashboardPreview
                    isDarkMode={isDarkMode}
                    currentLanguage={currentLanguage}
                    onGetStarted={handleGetStarted}
                />
            </main>

            {/* Footer */}
            <footer className={`py-12 border-t ${isDarkMode
                    ? 'bg-slate-900 border-slate-800'
                    : 'bg-gray-50 border-gray-200'
                }`}>
                <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                        {/* Brand */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <Image
                                    src="/images/logo.png"
                                    alt="El7lm Logo"
                                    width={40}
                                    height={40}
                                    className="rounded-lg"
                                />
                                <span className={`font-bold text-xl ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                    {currentLanguage === 'ar' ? 'منصة الحلم' : 'El7lm'}
                                </span>
                            </div>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                {footer.description}
                            </p>
                        </div>

                        {/* Quick Links */}
                        <div>
                            <h3 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {footer.quickLinks}
                            </h3>
                            <div className="flex flex-col gap-2">
                                <a href="/privacy" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                                    {footer.privacy}
                                </a>
                                <a href="/terms" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                                    {footer.terms}
                                </a>
                                <a href="/support" className={`text-sm ${isDarkMode ? 'text-gray-400 hover:text-white' : 'text-gray-600 hover:text-gray-900'}`}>
                                    {footer.support}
                                </a>
                            </div>
                        </div>

                        {/* Contact */}
                        <div>
                            <h3 className={`font-bold mb-4 ${isDarkMode ? 'text-white' : 'text-gray-900'}`}>
                                {footer.contact}
                            </h3>
                            <p className={`text-sm ${isDarkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                                info@el7lm.com
                            </p>
                        </div>
                    </div>

                    {/* Copyright */}
                    <div className={`text-center text-sm pt-8 border-t ${isDarkMode ? 'border-slate-800 text-gray-400' : 'border-gray-200 text-gray-600'
                        }`}>
                        {footer.rights}
                    </div>
                </div>
            </footer>
        </div>
    );
}
