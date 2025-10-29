'use client';

import { useEffect } from 'react';

interface ClarityProviderProps {
  children: React.ReactNode;
  projectId: string;
}

const ClarityProvider: React.FC<ClarityProviderProps> = ({ children, projectId }) => {
  useEffect(() => {
    // التحقق من تحميل Clarity
    if (projectId && typeof window !== 'undefined' && projectId !== 'your_clarity_project_id_here') {
      const checkClarity = () => {
        if ((window as any).clarity) {
          console.log('✅ Microsoft Clarity loaded successfully with project:', projectId);

          // تعيين بعض الإعدادات الأساسية
          (window as any).clarity('set', 'project_id', projectId);
          (window as any).clarity('set', 'platform', 'el7lm');

          return true;
        }
        return false;
      };

      // محاولة فورية
      if (!checkClarity()) {
        // انتظار تحميل Clarity
        const interval = setInterval(() => {
          if (checkClarity()) {
            clearInterval(interval);
          }
        }, 100);

        // إيقاف المحاولة بعد 10 ثوان
        setTimeout(() => {
          clearInterval(interval);
          if (!(window as any).clarity) {
            console.warn('⚠️ Clarity لم يتم تحميله خلال 10 ثوان');
          }
        }, 10000);
      }
    } else {
      console.warn('⚠️ Clarity Project ID غير صحيح:', projectId);
    }
  }, [projectId]);

  useEffect(() => {
    // Track page views using correct Clarity API
    if (typeof window !== 'undefined' && (window as any).clarity) {
      const currentPath = window.location.pathname;

      // Set custom tags using correct API
      (window as any).clarity('set', 'current_page', currentPath);

      // Track specific page events using correct API
      if (currentPath.includes('/dashboard/messages')) {
        (window as any).clarity('event', 'messages_page_viewed');
      } else if (currentPath.includes('/dashboard')) {
        (window as any).clarity('event', 'dashboard_page_viewed');
      }

      console.log('📊 Clarity page tracking initialized for:', currentPath);
    }
  }, []);

  return (
    <>
      {children}
    </>
  );
};

export default ClarityProvider;
