/**
 * تحسين تحميل الخطوط
 * حل مشاكل تحميل الخطوط من Google Fonts
 */

import { Inter, Cairo } from 'next/font/google';

// إعداد خط Inter مع تحسينات
export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false, // تعطيل preload لتجنب مشاكل التحميل
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  adjustFontFallback: false, // تعطيل adjustFontFallback لتجنب مشاكل التحميل
});

// إعداد خط Cairo مع تحسينات
export const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
  display: 'swap',
  preload: false, // تعطيل preload لتجنب مشاكل التحميل
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
  adjustFontFallback: false, // تعطيل adjustFontFallback لتجنب مشاكل التحميل
});

// دالة لتحسين تحميل الخطوط
export const optimizeFontLoading = () => {
  if (typeof window !== 'undefined') {
    // تحسين تحميل الخطوط في المتصفح
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link);

    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    link2.crossOrigin = 'anonymous';
    document.head.appendChild(link2);
  }
};

// دالة للتحقق من تحميل الخطوط
export const checkFontLoading = () => {
  if (typeof window !== 'undefined') {
    // التحقق من تحميل الخطوط
    const checkFont = (fontFamily: string) => {
      return document.fonts.check(`16px ${fontFamily}`);
    };

    // التحقق من تحميل خط Cairo
    if (!checkFont('Cairo')) {
      console.warn('خط Cairo لم يتم تحميله بعد');
    }

    // التحقق من تحميل خط Inter
    if (!checkFont('Inter')) {
      console.warn('خط Inter لم يتم تحميله بعد');
    }
  }
};
