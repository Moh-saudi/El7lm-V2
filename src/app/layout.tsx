import ClarityProvider from '@/components/analytics/ClarityProvider';
import ClarityUserTracker from '@/components/analytics/ClarityUserTracker';
import GoogleTagManager from '@/components/analytics/GoogleTagManager';
import GTMDataLayer from '@/components/analytics/GTMDataLayer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
// import PageRefreshDetector from '@/components/PageRefreshDetector';
import { cairo, inter } from '@/lib/fonts';
import '@mantine/core/styles.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import 'react-toastify/dist/ReactToastify.css';
import './globals.css';
import { Providers } from './providers';
// إصلاح مشكلة location
import '@/lib/utils/initialize-location-fix';
// Lightweight polyfill for SSR: ensure globalThis.self exists
try {
  const g: any = globalThis as any;
  if (typeof g.self === 'undefined') g.self = g;
} catch {}

export const metadata: Metadata = {
  title: 'El7lm - منصة كرة القدم المتكاملة',
  description: 'منصة شاملة لإدارة كرة القدم واللاعبين والأندية',
  keywords: 'كرة القدم، لاعبي كرة القدم، أندية، تدريب، إدارة رياضية',
  authors: [{ name: 'El7lm Team' }],
  creator: 'El7lm',
  publisher: 'El7lm',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL('https://el7lm.com'),
  alternates: {
    canonical: '/',
    languages: {
      'ar': '/ar',
      'en': '/en',
    },
  },
  openGraph: {
    title: 'El7lm - منصة كرة القدم المتكاملة',
    description: 'منصة شاملة لإدارة كرة القدم واللاعبين والأندية',
    url: 'https://el7lm.com',
    siteName: 'El7lm',
    images: [
      {
        url: '/images/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'El7lm - منصة كرة القدم المتكاملة',
      },
    ],
    locale: 'ar_SA',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'El7lm - منصة كرة القدم المتكاملة',
    description: 'منصة شاملة لإدارة كرة القدم واللاعبين والأندية',
    images: ['/images/twitter-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: 'your-google-verification-code',
    yandex: 'your-yandex-verification-code',
    yahoo: 'your-yahoo-verification-code',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${cairo.variable}`}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="El7lm" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />

        {/* Preconnect to external domains */}
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />

        {/* DNS Prefetch */}
        <link rel="dns-prefetch" href="//firestore.googleapis.com" />
        <link rel="dns-prefetch" href="//identitytoolkit.googleapis.com" />

        {/* Font loading with fallback */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

        {/* Security Headers */}
        <meta httpEquiv="X-Content-Type-Options" content="nosniff" />
        <meta httpEquiv="X-XSS-Protection" content="1; mode=block" />
        <meta httpEquiv="Referrer-Policy" content="strict-origin-when-cross-origin" />
        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID || ''} />

        {/* Polyfill for SSR: self = globalThis */}
        <script dangerouslySetInnerHTML={{
          __html: `try{if(typeof self==='undefined')self=globalThis;}catch{}`
        }} />
      </head>
      <body className={`${cairo.className} antialiased`}>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              // تحسين تحميل الخطوط مع معالجة الأخطاء
              (function() {
                try {
                  // التحقق من وجود الخطوط المحلية أولاً
                  const testFont = (fontFamily) => {
                    const canvas = document.createElement('canvas');
                    const context = canvas.getContext('2d');
                    context.font = '16px ' + fontFamily;
                    return context.font.indexOf(fontFamily) !== -1;
                  };

                  // إذا لم تكن الخطوط متوفرة محلياً، قم بتحميلها من Google Fonts
                  if (!testFont('Cairo') || !testFont('Inter')) {
                    const link = document.createElement('link');
                    link.rel = 'stylesheet';
                    link.href = 'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap';
                    link.onerror = function() {
                      console.warn('فشل في تحميل الخطوط من Google Fonts، سيتم استخدام الخطوط المحلية');
                    };
                    document.head.appendChild(link);
                  }
                } catch (error) {
                  console.warn('خطأ في تحميل الخطوط:', error);
                }
              })();


              // حماية شاملة من التحديثات اللحظية
              (function() {
              // معالجة أخطاء React بشكل صحيح
              const originalError = console.error;
              const originalWarn = console.warn;

              console.error = function(...args) {
                const message = args.join(' ');
                // فقط تجاهل أخطاء message port غير الحرجة
                if (message.includes('message port closed before a response was received')) {
                  return;
                }
                originalError.apply(console, args);
              };

              console.warn = function(...args) {
                const message = args.join(' ');
                // فقط تجاهل تحذيرات Extensions
                if (message.includes('extension') || message.includes('chrome-extension')) {
                  return;
                }
                originalWarn.apply(console, args);
              };


                // منع التحديثات المتكررة بطريقة آمنة
                let refreshCount = 0;
                const maxRefreshCount = 3;

                const handleBeforeUnload = (e) => {
                  refreshCount++;
                  if (refreshCount > maxRefreshCount) {
                    console.warn('تم منع التحديث المتكرر');
                    e.preventDefault();
                    e.returnValue = '';
                  }
                };

                window.addEventListener('beforeunload', handleBeforeUnload);


                // إعادة تعيين العدادات كل 10 ثوان
                setInterval(() => {
                  refreshCount = 0;
                }, 10000);
              })();
            `,
          }}
        />
        <Providers>
          <ErrorBoundary>
            <ClarityProvider projectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || ''}>
              <ClarityUserTracker />
              <GTMDataLayer />
              {/* <PageRefreshDetector /> */}
              {children}
            </ClarityProvider>
          </ErrorBoundary>
          <Toaster
              position="top-center"
              toastOptions={{
                duration: 4000,
                style: {
                  background: '#363636',
                  color: '#fff',
                  fontFamily: 'Cairo, sans-serif',
                },
                success: {
                  duration: 3000,
                  iconTheme: {
                    primary: '#10b981',
                    secondary: '#fff',
                  },
                },
                error: {
                  duration: 5000,
                  iconTheme: {
                    primary: '#ef4444',
                    secondary: '#fff',
                  },
                },
              }}
            />
        </Providers>
      </body>
    </html>
  );
}
