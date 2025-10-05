// نظام كونسول آمن - يخفي الرسائل في الإنتاج
const isClient = typeof window !== 'undefined';

// دالة فحص ما إذا كنا في بيئة تطوير آمنة
const isSafeToDevelop = (): boolean => {
  // التحقق من بيئة التطوير بطريقة آمنة
  const isDevelopment = (typeof window !== 'undefined' && (window as Window & { process?: { env?: { NODE_ENV?: string } } }).process?.env?.NODE_ENV === 'development') ||
                       (typeof process !== 'undefined' && process.env?.NODE_ENV === 'development');

  if (!isClient) return isDevelopment;

  // فحص إضافي: هل النطاق محلي أم تطوير؟
  try {
    const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
    const isLocalhost = hostname === 'localhost' ||
                       hostname === '127.0.0.1' ||
                       hostname.startsWith('192.168.') ||
                       hostname.endsWith('.local');

    return isDevelopment && isLocalhost;
  } catch (error) {
    // في حالة فشل الوصول لـ location، نعتمد على isDevelopment فقط
    return isDevelopment;
  }
};

// إنشاء كونسول آمن
export const secureConsole = {
  log: (...args: unknown[]) => {
    if (isSafeToDevelop()) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]) => {
    if (isSafeToDevelop()) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]) => {
    if (isSafeToDevelop()) {
      console.error(...args);
    } else {
      // في الإنتاج، نسجل الأخطاء فقط دون تفاصيل حساسة
      console.error('خطأ في التطبيق - يرجى المحاولة لاحقاً');
    }
  },

  debug: (...args: unknown[]) => {
    if (isSafeToDevelop()) {
      console.debug(...args);
    }
  },

  info: (...args: unknown[]) => {
    if (isSafeToDevelop()) {
      console.info(...args);
    }
  },

  // دالة خاصة للمعلومات الحساسة
  sensitive: (...args: unknown[]) => {
    if (isSafeToDevelop()) {
      console.log('🔒 [SENSITIVE]', ...args);
    }
  },

  // دالة للتحقق من بيئة التطوير
  isDev: (): boolean => isSafeToDevelop()
};

// دالة للتهيئة الآمنة للكونسول (لا تعمل تلقائياً)
export const initializeSecureConsole = (): void => {
  // في الإنتاج، نحذف جميع دوال الكونسول الأصلية إذا لم نكن في بيئة آمنة
  if (isClient && !isSafeToDevelop()) {
    const noop = (): void => {};

    // حماية إضافية: تنظيف الكونسول في الإنتاج
    try {
      console.log = noop;
      console.debug = noop;
      console.info = noop;
      console.warn = noop;
      // نترك console.error للأخطاء المهمة فقط

      // إخفاء الأوامر المتقدمة
      if ((window as Window & { authDebugger?: unknown }).authDebugger) {
        delete (window as Window & { authDebugger?: unknown }).authDebugger;
      }

      // رسالة بسيطة للمطورين الفضوليين
      console.clear();
      console.log('%c🛡️ التطبيق محمي', 'color: #ff6b6b; font-size: 20px; font-weight: bold;');
      console.log('%cإذا كنت مطور، تحقق من بيئة التطوير المحلية', 'color: #666; font-size: 14px;');
      console.log('%c⚠️ تسجيل البيانات الحساسة محظور في الإنتاج', 'color: #ff9500; font-size: 12px;');
      console.log('%c📧 للدعم التقني: support@el7lm.com', 'color: #007AFF; font-size: 12px;');

    } catch (e) {
      // فشل في تنظيف الكونسول - لا بأس
    }
  }
};

export default secureConsole;
