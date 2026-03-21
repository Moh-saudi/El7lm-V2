'use client';

import Script from 'next/script';

interface ClarityScriptProps {
  projectId: string;
}

/**
 * مكون لتحميل Microsoft Clarity Script
 * بناءً على الكود الرسمي من Microsoft
 */
const ClarityScript: React.FC<ClarityScriptProps> = ({ projectId }) => {
  if (!projectId || projectId === 'your_clarity_project_id_here') {
    console.warn('⚠️ Clarity Project ID غير صحيح:', projectId);
    return null;
  }

  return (
    <Script
      id="clarity-script"
      strategy="afterInteractive"
        onError={(e) => {
          console.warn('⚠️ Microsoft Clarity failed to load:', e);
          // محاولة تحميل بديلة
          setTimeout(() => {
            if (typeof window !== 'undefined' && !(window as any).clarity) {
              console.log('🔄 Attempting fallback Clarity load...');
              const script = document.createElement('script');
              script.innerHTML = `
                (function(c,l,a,r,i,t,y){
                  try {
                    c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                    t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                    t.onerror=function(){console.warn('Clarity fallback failed');};
                    y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
                  } catch(e) {
                    console.warn('Clarity fallback error:', e);
                  }
                })(window, document, "clarity", "script", "${projectId}");
              `;
              document.head.appendChild(script);
            }
          }, 2000);
        }}
        onLoad={() => {
          console.log('✅ Microsoft Clarity loaded successfully');
        }}
      dangerouslySetInnerHTML={{
        __html: `
          (function(c,l,a,r,i,t,y){
            try {
              c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
              t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
              t.onerror=function(){console.warn('Clarity script failed to load');};
              y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
            } catch(e) {
              console.warn('Clarity initialization error:', e);
            }
          })(window, document, "clarity", "script", "${projectId}");
        `
      }}
    />
  );
};

export default ClarityScript;

