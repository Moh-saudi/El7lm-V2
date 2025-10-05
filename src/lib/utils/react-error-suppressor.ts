// معالج أخطاء React المضغوط
// هذا الملف يمنع أخطاء React #418 و #423 من الظهور في الكونسول

/**
 * معالجة أخطاء React المضغوط
 */
export const suppressReactMinifiedErrors = () => {
  if (typeof window === 'undefined') return;

  // حفظ الطرق الأصلية
  const originalError = console.error;
  const originalWarn = console.warn;

  // معالجة console.error
  console.error = function(...args: any[]) {
    const message = args.join(' ');

    // منع أخطاء React المضغوط
    if (
      message.includes('Minified React error #418') ||
      message.includes('Minified React error #423') ||
      message.includes('visit https://react.dev/errors/418') ||
      message.includes('visit https://react.dev/errors/423') ||
      message.includes('use the non-minified dev environment')
    ) {
      // تسجيل كتحذير بدلاً من خطأ
      console.warn('🔧 React minified error suppressed:', message);
      return;
    }

    // استدعاء الطريقة الأصلية للأخطاء الأخرى
    originalError.apply(console, args);
  };

  // معالجة console.warn
  console.warn = function(...args: any[]) {
    const message = args.join(' ');

    // منع تحذيرات React المضغوط
    if (
      message.includes('Minified React error #418') ||
      message.includes('Minified React error #423') ||
      message.includes('visit https://react.dev/errors/418') ||
      message.includes('visit https://react.dev/errors/423')
    ) {
      // تسجيل كمعلومات بدلاً من تحذير
      console.info('🔧 React minified warning suppressed:', message);
      return;
    }

    // استدعاء الطريقة الأصلية للتحذيرات الأخرى
    originalWarn.apply(console, args);
  };

  // معالجة الأخطاء غير المعالجة
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;

    if (error && typeof error === 'object') {
      const message = error.message || error.toString();

      if (
        message.includes('Minified React error #418') ||
        message.includes('Minified React error #423') ||
        message.includes('visit https://react.dev/errors/418') ||
        message.includes('visit https://react.dev/errors/423')
      ) {
        console.warn('🔧 React minified promise rejection suppressed:', message);
        event.preventDefault();
        return false;
      }
    }
  };

  // معالجة الأخطاء العامة
  const handleError = (event: ErrorEvent) => {
    const message = event.message || '';

    if (
      message.includes('Minified React error #418') ||
      message.includes('Minified React error #423') ||
      message.includes('visit https://react.dev/errors/418') ||
      message.includes('visit https://react.dev/errors/423')
    ) {
      console.warn('🔧 React minified error event suppressed:', message);
      event.preventDefault();
      return false;
    }
  };

  // إضافة مستمعي الأحداث
  window.addEventListener('unhandledrejection', handleUnhandledRejection);
  window.addEventListener('error', handleError);

  // إرجاع دالة التنظيف
  return () => {
    console.error = originalError;
    console.warn = originalWarn;
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    window.removeEventListener('error', handleError);
  };
};

/**
 * تهيئة معالجة أخطاء React
 */
export const initializeReactErrorSuppression = () => {
  console.log('🔧 تهيئة معالجة أخطاء React المضغوط...');

  const cleanup = suppressReactMinifiedErrors();

  // إضافة معالجة إضافية للكود المضغوط
  if (typeof window !== 'undefined') {
    // منع أخطاء MessagePort
    const originalConsoleError = console.error;
    console.error = function(...args: any[]) {
      const message = args.join(' ');

      if (
        message.includes('message port closed before a response was received') ||
        message.includes('MessagePort') ||
        message.includes('ERR_BLOCKED_BY_CLIENT')
      ) {
        // تجاهل هذه الأخطاء
        return;
      }

      originalConsoleError.apply(console, args);
    };
  }

  return cleanup;
};

/**
 * معالجة أخطاء React في وضع التطوير
 */
export const setupDevelopmentErrorHandling = () => {
  if (process.env.NODE_ENV !== 'development') return;

  console.log('🔧 تهيئة معالجة أخطاء React في وضع التطوير...');

  // في وضع التطوير، نعرض الأخطاء ولكن مع معلومات إضافية
  const originalError = console.error;
  console.error = function(...args: any[]) {
    const message = args.join(' ');

    if (message.includes('Minified React error #418')) {
      console.group('🚨 React Error #418 - Hydration Mismatch');
      console.error('هذا الخطأ يحدث عادة بسبب اختلاف في المحتوى بين الخادم والعميل');
      console.error('الحلول المقترحة:');
      console.error('1. تأكد من أن المحتوى متطابق بين SSR و CSR');
      console.error('2. استخدم suppressHydrationWarning للمحتوى الديناميكي');
      console.error('3. تأكد من عدم استخدام window أو localStorage في SSR');
      console.groupEnd();
      return;
    }

    if (message.includes('Minified React error #423')) {
      console.group('🚨 React Error #423 - Invalid Hook Call');
      console.error('هذا الخطأ يحدث عادة بسبب استدعاء hooks خارج مكون React');
      console.error('الحلول المقترحة:');
      console.error('1. تأكد من استدعاء hooks داخل مكونات React فقط');
      console.error('2. لا تستدعي hooks في event handlers أو callbacks');
      console.error('3. تأكد من أن hooks تُستدعى في نفس الترتيب دائماً');
      console.groupEnd();
      return;
    }

    originalError.apply(console, args);
  };
};
