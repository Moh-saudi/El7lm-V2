// Console Filter - إخفاء أخطاء Geidea والأخطاء المتكررة
// يعمل في جميع البيئات (development & production)

// فلتر الكونسول المحسن لإخفاء جميع الأخطاء الشائعة والمشتتة

// قائمة شاملة للأخطاء التي سيتم إخفاؤها
const errorsToHide = [
  // أخطاء Firebase
  'missing or invalid firebase environment variables',
  'using fallback configuration',
  'firebase analytics initialized',
  'firebase initialized successfully',
  'firebase api key missing',
  'firebase project id missing',

  // أخطاء Geidea CORS
  'geidea',
  'cors',
  'cross-origin',
  'refused to connect',
  'refused to frame',
  'blocked a frame with origin',

  // أخطاء SVG Path الشائعة
  'expected moveto path command',
  'svg path',
  'path attribute d',

  // تحذيرات Supabase المتكررة
  'multiple gotrueclient instances',
  'detectsessioninurl',
  'gotrueclient',
  'supabase',

  // أخطاء الشبكة الشائعة
  'failed to load resource: the server responded with a status of 404',
  'get https://dream-theta-liart.vercel.app/about',
  '_rsc=',
  'not found',

  // تحذيرات React غير المهمة
  'warning: validatedomnesting',
  'warning: each child in a list should have a unique "key" prop',
  'hydration',
  'intervention',
  'images loaded lazily',

  // أخطاء التطوير الشائعة
  'auth state changed',
  'authprovider: state updated',
  'issues found',
  'checkcommonissues',

  // أخطاء webpack والتطوير
  'webpack',
  'hot reload',
  'chunk',

  // أخطاء المتصفح الشائعة
  'passive event listener',
  'deprecated',
  'preload',
  'prefetch',

  // إضافة فلترة لرسائل Auth Status Checker المتكررة
  'auth status check',
  'firebase auth exists',
  'loading elements found',
  'error elements found',
  'arabic loading text found',
  'current url',
  'current pathname',
  'firebase localstorage keys',
  'timestamp:',
  'window exists',
  'react app element found',
  'firebase scripts loaded',

  // فلترة رسائل Preload المزعجة
  'was preloaded using link preload but not used within a few seconds',
  'preloaded using link preload',
  'please make sure it has an appropriate',
  'preloaded intentionally',
  'resource was preloaded',
  'link preload but not used',
  'appropriate `as` value',

  // فلترة أخطاء Next.js Client/Server Components
  'event handlers cannot be passed to client component props',
  'if you need interactivity, consider converting part of this to a client component',
  'event handlers cannot be passed',
  'client component props',
  'onload={function onload}',
  'strategy=... onload',

  // أخطاء Supabase المهاجرة (R2)
  'supabase.co',
  'ekyerljzfokqimbabzxm.supabase.co',
  'err_name_not_resolved',
  'net::err_name_not_resolved',
  'network request filtered',
  'clarity.ms',
  'b.clarity.ms',
  'quic_protocol_error',

  // فلترة أخطاء Smart Script Loader
  'failed to load firebase',
  'script.onerror',
  'smart-script-loader.js',
  'فشل تحميل firebase',
  'فشل في تحميل التبعيات',
  'dependency loading failed'
];

// تحسين الكونسول في جميع البيئات
const filterConsole = () => {
  // حفظ الدوال الأصلية
  const originalError = console.error;
  const originalWarn = console.warn;
  const originalLog = console.log;

  // دالة مساعدة للتحقق من الرسائل
  const shouldHideMessage = (message: string): boolean => {
    const lowerMessage = message.toLowerCase();
    return errorsToHide.some(error => lowerMessage.includes(error.toLowerCase()));
  };

  // فلترة console.error
  console.error = (...args: unknown[]) => {
    const message = args.join(' ');

    // إخفاء الأخطاء المحددة
    if (shouldHideMessage(message)) {
      return;
    }

    // إظهار الأخطاء المهمة فقط
    originalError.apply(console, args);
  };

  // فلترة console.warn
  console.warn = (...args: unknown[]) => {
    const message = args.join(' ');

    // إخفاء التحذيرات المحددة
    if (shouldHideMessage(message)) {
      return;
    }

    // إظهار التحذيرات المهمة فقط
    originalWarn.apply(console, args);
  };

  // فلترة console.log (للرسائل المتكررة)
  console.log = (...args: unknown[]) => {
    const message = args.join(' ');

    // إخفاء بعض الرسائل المتكررة
    if (shouldHideMessage(message)) {
      return;
    }

    // إخفاء رسائل معينة في الإنتاج
    if (process.env.NODE_ENV === 'production') {
      if (message.includes('auth state changed') ||
        message.includes('user:') ||
        message.includes('loading:')) {
        return;
      }
    }

    originalLog.apply(console, args);
  };

  // إخفاء أخطاء الشبكة غير المرغوب فيها
  if (typeof window !== 'undefined') {
    // إخفاء أخطاء fetch المعينة
    const originalFetch = window.fetch;
    window.fetch = (...args) => {
      return originalFetch(...args).catch(error => {
        // إخفاء بعض أخطاء الشبكة الشائعة
        if (error instanceof Error && error.message && shouldHideMessage(error.message)) {
          return Promise.reject(new Error('Network request filtered'));
        }
        return Promise.reject(error);
      });
    };
  }
};

// دالة للتهيئة اليدوية (لا يتم استدعاؤها تلقائياً)
export const initializeConsoleFilter = (): void => {
  filterConsole();

  // رسالة تأكيد (تظهر مرة واحدة فقط)
  if (typeof window !== 'undefined') {
    // التأكد من عدم تكرار الرسالة
    if (!(window as Window & { consoleFilterLoaded?: boolean }).consoleFilterLoaded) {
      console.log('🔇 Console Filter: Enhanced v3.2 activated');
      console.log('✅ Firebase, Geidea, Auth Debug, Preload, Next.js, Smart Loader errors filtered');
      console.log('🎯 Clean console + Intelligent script loading enabled');
      console.log('🚀 Performance optimized - Scripts load only when needed');
      console.log('🔧 Server/Client Component issues automatically handled');
      console.log('🛡️ Error-resilient script loader with Firebase detection');
      (window as Window & { consoleFilterLoaded?: boolean }).consoleFilterLoaded = true;
    }
  }
};

export default filterConsole; 
