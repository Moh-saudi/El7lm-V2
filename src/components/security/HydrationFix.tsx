'use client';

import React, { useState, useEffect, ReactNode } from 'react';

interface HydrationFixProps {
  children: ReactNode;
  fallback?: ReactNode;
  suppressHydrationWarning?: boolean;
}

/**
 * مكون لإصلاح مشاكل Hydration في Next.js
 * يضمن أن المحتوى يتم عرضه فقط على العميل لتجنب اختلافات SSR/CSR
 */
export default function HydrationFix({ 
  children, 
  fallback = null,
  suppressHydrationWarning = true 
}: HydrationFixProps) {
  const [isClient, setIsClient] = useState(false);
  const [hasHydrationError, setHasHydrationError] = useState(false);

  useEffect(() => {
    // تأكد من أننا على العميل
    setIsClient(true);

    // استمع لأخطاء hydration
    const handleError = (event: ErrorEvent) => {
      if (
        event.message.includes('hydration') ||
        event.message.includes('Text content did not match') ||
        event.message.includes('Extra attributes from the server') ||
        event.message.includes('Prop `') ||
        event.message.includes('className') ||
        event.message.includes('rel')
      ) {
        console.warn('🔧 Hydration mismatch detected, suppressing error:', event.message);
        setHasHydrationError(true);
        event.preventDefault();
        return false;
      }
    };

    // استمع لأخطاء غير معالجة
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (
        event.reason?.message?.includes('hydration') ||
        event.reason?.message?.includes('Text content did not match')
      ) {
        console.warn('🔧 Hydration promise rejection detected, suppressing:', event.reason);
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  // إذا لم نكن على العميل بعد، اعرض fallback
  if (!isClient) {
    return (
      <div suppressHydrationWarning={suppressHydrationWarning}>
        {fallback}
      </div>
    );
  }

  // إذا كان هناك خطأ hydration، اعرض المحتوى مع suppressHydrationWarning
  if (hasHydrationError) {
    return (
      <div suppressHydrationWarning={suppressHydrationWarning}>
        {children}
      </div>
    );
  }

  // العرض العادي
  return (
    <div suppressHydrationWarning={suppressHydrationWarning}>
      {children}
    </div>
  );
}

/**
 * Hook للتحقق من أننا على العميل
 */
export const useIsClient = () => {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  return isClient;
};

/**
 * Hook للتحقق من حالة hydration
 */
export const useHydrationStatus = () => {
  const [isHydrated, setIsHydrated] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setIsHydrated(true);

    const handleError = (event: ErrorEvent) => {
      if (event.message.includes('hydration')) {
        setHasError(true);
      }
    };

    window.addEventListener('error', handleError);
    return () => window.removeEventListener('error', handleError);
  }, []);

  return { isHydrated, hasError };
};

/**
 * مكون لعرض محتوى فقط على العميل
 */
export const ClientOnly: React.FC<{ children: ReactNode; fallback?: ReactNode }> = ({ 
  children, 
  fallback = null 
}) => {
  const isClient = useIsClient();

  if (!isClient) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
};

/**
 * مكون لعرض محتوى مختلف على الخادم والعميل
 */
export const ConditionalRender: React.FC<{
  server: ReactNode;
  client: ReactNode;
}> = ({ server, client }) => {
  const isClient = useIsClient();

  return <>{isClient ? client : server}</>;
};
