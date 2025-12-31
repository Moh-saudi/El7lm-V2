import ClarityProvider from '@/components/analytics/ClarityProvider';
import ClarityScript from '@/components/analytics/ClarityScript';
import ClarityUserTracker from '@/components/analytics/ClarityUserTracker';
import GoogleTagManager from '@/components/analytics/GoogleTagManager';
import GTMDataLayer from '@/components/analytics/GTMDataLayer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import HydrationFix from '@/components/security/HydrationFix';
import ReactErrorBoundary from '@/components/security/ReactErrorBoundary';
import { cairo, inter } from '@/lib/fonts';
import '@mantine/core/styles.css';
import type { Metadata } from 'next';
import { Toaster } from 'react-hot-toast';
import 'react-toastify/dist/ReactToastify.css';
import '../styles/analytics.css';
import './globals.css';
import { Providers } from './providers';
import '@/lib/utils/initialize-location-fix';
import '@/lib/firebase/connection-fix';
import '@/lib/utils/react-error-suppressor';
import '@/lib/utils/initialize-error-handling';

export const metadata: Metadata = {
  title: 'El7lm - منصة كرة القدم المتكاملة',
  description: 'منصة شاملة لإدارة كرة القدم واللاعبين والأندية',
  keywords: 'كرة القدم, لاعبي كرة القدم, أندية, تدريب, إدارة رياضية',
  authors: [{ name: 'El7lm Team' }],
  creator: 'El7lm',
  publisher: 'El7lm',
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
    images: [{ url: '/images/og-image.jpg', width: 1200, height: 630, alt: 'El7lm' }],
    locale: 'ar_SA',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ar" dir="rtl" className={`${inter.variable} ${cairo.variable}`} suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="icon" href="/favicon.ico" />

        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://www.googletagmanager.com" />
        <link rel="preconnect" href="https://www.clarity.ms" />

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;500;600;700;800;900&family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet" />

        <GoogleTagManager gtmId={process.env.NEXT_PUBLIC_GTM_ID || 'GTM-WR4X2BD8'} />
        <ClarityScript projectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || 't69agqt6n4'} />
      </head>
      <body className={`${cairo.className} antialiased`}>
        <Providers>
          <ReactErrorBoundary>
            <HydrationFix>
              <ErrorBoundary>
                <ClarityProvider projectId={process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID || ''}>
                  <ClarityUserTracker />
                  <GTMDataLayer />
                  <main id="main-content" className="flex-grow min-h-screen">
                    {children}
                  </main>
                </ClarityProvider>
              </ErrorBoundary>
            </HydrationFix>
          </ReactErrorBoundary>
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
                fontFamily: 'Cairo, sans-serif',
              },
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
