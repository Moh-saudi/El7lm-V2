// تهيئة معالجة الأخطاء الشاملة
// هذا الملف يهيئ جميع معالجات الأخطاء في التطبيق

import { initializeReactErrorSuppression, setupDevelopmentErrorHandling } from './react-error-suppressor';

/**
 * تهيئة جميع معالجات الأخطاء
 */
export const initializeErrorHandling = () => {
  if (typeof window === 'undefined') return;

  console.log('🔧 تهيئة معالجة الأخطاء الشاملة...');

  try {
    // تهيئة معالجة أخطاء React المضغوط
    const cleanupReactErrors = initializeReactErrorSuppression();

    // تهيئة معالجة أخطاء التطوير
    setupDevelopmentErrorHandling();

    // معالجة أخطاء MessagePort
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const message = args.join(' ');

      if (
        message.includes('message port closed before a response was received') ||
        message.includes('MessagePort') ||
        message.includes('ERR_BLOCKED_BY_CLIENT') ||
        message.includes('net::ERR_BLOCKED_BY_CLIENT')
      ) {
        // تجاهل هذه الأخطاء
        return;
      }

      originalConsoleError.apply(console, args);
    };

    // معالجة أخطاء AdBlocker
    const handleAdBlockerError = (event: ErrorEvent) => {
      if (
        event.message.includes('ERR_BLOCKED_BY_CLIENT') ||
        event.message.includes('net::ERR_BLOCKED_BY_CLIENT') ||
        event.message.includes('blocked by client')
      ) {
        console.warn('🚫 تم حظر الطلب بواسطة AdBlocker:', event.message);
        event.preventDefault();
        return false;
      }
    };

    window.addEventListener('error', handleAdBlockerError);

    // معالجة أخطاء Promise rejection
    const handlePromiseRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;

      if (error && typeof error === 'object') {
        const message = error.message || error.toString();

        if (
          message.includes('ERR_BLOCKED_BY_CLIENT') ||
          message.includes('net::ERR_BLOCKED_BY_CLIENT') ||
          message.includes('blocked by client')
        ) {
          console.warn('🚫 تم حظر Promise بواسطة AdBlocker:', message);
          event.preventDefault();
          return false;
        }
      }
    };

    window.addEventListener('unhandledrejection', handlePromiseRejection);

    console.log('✅ تم تهيئة معالجة الأخطاء بنجاح');

    // إرجاع دالة التنظيف
    return () => {
      if (cleanupReactErrors) cleanupReactErrors();
      console.error = originalConsoleError;
      window.removeEventListener('error', handleAdBlockerError);
      window.removeEventListener('unhandledrejection', handlePromiseRejection);
    };

  } catch (error) {
    console.warn('خطأ في تهيئة معالجة الأخطاء:', error);
  }
};

// تهيئة تلقائية عند استيراد الملف
if (typeof window !== 'undefined') {
  initializeErrorHandling();
}
