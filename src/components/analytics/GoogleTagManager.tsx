'use client';

import { useEffect } from 'react';
import Script from 'next/script';

interface GoogleTagManagerProps {
  gtmId: string;
}

/**
 * مكون Google Tag Manager
 * لإدارة جميع أدوات التحليلات والتتبع
 */
const GoogleTagManager: React.FC<GoogleTagManagerProps> = ({ gtmId }) => {
  if (!gtmId || gtmId === 'GTM-XXXXXXX') {
    console.warn('⚠️ Google Tag Manager ID غير صحيح:', gtmId);
    return null;
  }

  useEffect(() => {
    console.log('🔧 Loading Google Tag Manager with ID:', gtmId);
  }, [gtmId]);

  return (
    <>
      {/* Google Tag Manager - Head */}
      <Script
        id="google-tag-manager"
        strategy="afterInteractive"
        onError={(e) => {
          console.warn('⚠️ Google Tag Manager failed to load:', e);
          // محاولة تحميل بديلة
          setTimeout(() => {
            if (typeof window !== 'undefined' && !(window as any).dataLayer) {
              console.log('🔄 Attempting fallback GTM load...');
              const script = document.createElement('script');
              script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
              script.async = true;
              script.onerror = () => console.warn('⚠️ Fallback GTM load also failed');
              document.head.appendChild(script);
            }
          }, 2000);
        }}
        onLoad={() => {
          console.log('✅ Google Tag Manager loaded successfully');
        }}
        dangerouslySetInnerHTML={{
          __html: `
            (function(w,d,s,l,i){
              try {
                w[l]=w[l]||[];w[l].push({'gtm.start':
                new Date().getTime(),event:'gtm.js'});
                var f=d.getElementsByTagName(s)[0],
                j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
                j.async=true;
                j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;
                j.onerror=function(){console.warn('GTM script failed to load');};
                f.parentNode.insertBefore(j,f);
              } catch(e) {
                console.warn('GTM initialization error:', e);
              }
            })(window,document,'script','dataLayer','${gtmId}');
          `
        }}
      />

      {/* Google Tag Manager - NoScript */}
      <noscript>
        <iframe
          src={`https://www.googletagmanager.com/ns.html?id=${gtmId}`}
          height="0"
          width="0"
          className="hidden"
        />
      </noscript>
    </>
  );
};

export default GoogleTagManager;

