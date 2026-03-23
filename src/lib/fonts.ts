import { Inter, Cairo, Tajawal } from 'next/font/google';

export const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
  preload: false,
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
  adjustFontFallback: false,
});

export const cairo = Cairo({
  subsets: ['arabic'],
  variable: '--font-cairo',
  display: 'swap',
  preload: false,
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
  adjustFontFallback: false,
});

export const tajawal = Tajawal({
  subsets: ['arabic'],
  weight: ['200', '300', '400', '500', '700', '800', '900'],
  variable: '--font-tajawal',
  display: 'swap',
  preload: false,
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
  adjustFontFallback: false,
});

export const optimizeFontLoading = () => {
  if (typeof window !== 'undefined') {
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = 'https://fonts.googleapis.com';
    document.head.appendChild(link);

    const link2 = document.createElement('link');
    link2.rel = 'preconnect';
    link2.href = 'https://fonts.gstatic.com';
    (link2 as any).crossOrigin = 'anonymous';
    document.head.appendChild(link2);
  }
};

export const checkFontLoading = () => {
  if (typeof window !== 'undefined') {
    const checkFont = (fontFamily: string) => {
      return (document as any).fonts.check(`16px ${fontFamily}`);
    };

    if (!checkFont('Cairo')) {
      console.warn('Cairo font not loaded yet');
    }

    if (!checkFont('Inter')) {
      console.warn('Inter font not loaded yet');
    }

    if (!checkFont('Tajawal')) {
      console.warn('Tajawal font not loaded yet');
    }
  }
};
