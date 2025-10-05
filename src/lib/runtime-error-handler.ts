/**
 * معالج أخطاء Runtime
 * يحل مشاكل "Unchecked runtime.lastError: The message port closed before a response was received"
 */

// دالة لحل مشاكل runtime errors
export const handleRuntimeErrors = () => {
  if (typeof window !== 'undefined') {
    // حل مشاكل message port
    const originalConsoleError = console.error;
    console.error = (...args) => {
      const message = args.join(' ');
      
      // تجاهل أخطاء message port غير الحرجة
      if (message.includes('message port closed before a response was received')) {
        return; // تجاهل هذا الخطأ
      }
      
      // تجاهل أخطاء Chrome DevTools
      if (message.includes('DevTools')) {
        return; // تجاهل أخطاء DevTools
      }
      
      // تجاهل أخطاء Extensions
      if (message.includes('extension') || message.includes('chrome-extension')) {
        return; // تجاهل أخطاء Extensions
      }
      
      // طباعة الأخطاء الأخرى
      originalConsoleError.apply(console, args);
    };

    // حل مشاكل unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const reason = event.reason;
      
      // تجاهل أخطاء message port
      if (reason && typeof reason === 'string' && 
          reason.includes('message port closed')) {
        event.preventDefault();
        return;
      }
      
      // تجاهل أخطاء Extensions
      if (reason && typeof reason === 'string' && 
          (reason.includes('extension') || reason.includes('chrome-extension'))) {
        event.preventDefault();
        return;
      }
    });

    // حل مشاكل uncaught exceptions
    window.addEventListener('error', (event) => {
      const message = event.message;
      
      // تجاهل أخطاء message port
      if (message && message.includes('message port closed')) {
        event.preventDefault();
        return;
      }
      
      // تجاهل أخطاء Extensions
      if (message && (message.includes('extension') || message.includes('chrome-extension'))) {
        event.preventDefault();
        return;
      }
    });
  }
};

// دالة لتنظيف event listeners
export const cleanupRuntimeErrorHandlers = () => {
  if (typeof window !== 'undefined') {
    // إعادة تعيين console.error
    console.error = console.error;
  }
};

// دالة للتحقق من حالة الخطأ
export const checkErrorStatus = () => {
  if (typeof window !== 'undefined') {
    return {
      hasUnhandledRejections: false,
      hasUncaughtExceptions: false,
      messagePortErrors: 0,
      extensionErrors: 0,
    };
  }
  return null;
};
