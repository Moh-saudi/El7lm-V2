// إصلاح مشاكل الاتصال بـ Firebase
// هذا الملف يحتوي على حلول لمشاكل الاتصال المختلفة

import { db } from './config';

/**
 * إعادة محاولة الاتصال بـ Firebase مع backoff
 */
export const retryFirebaseConnection = async (
  operation: () => Promise<any>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<any> => {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`🔄 محاولة الاتصال بـ Firebase (${attempt}/${maxRetries})`);
      const result = await operation();
      console.log('✅ نجح الاتصال بـ Firebase');
      return result;
    } catch (error: any) {
      lastError = error;
      console.warn(`⚠️ فشل الاتصال (${attempt}/${maxRetries}):`, error.message);

      // إذا كان الخطأ بسبب AdBlocker أو مشاكل الشبكة، لا نعيد المحاولة
      if (
        error.message.includes('ERR_BLOCKED_BY_CLIENT') ||
        error.message.includes('net::ERR_BLOCKED_BY_CLIENT') ||
        error.message.includes('Failed to fetch') ||
        error.message.includes('NetworkError')
      ) {
        console.warn('🚫 تم حظر الاتصال بواسطة AdBlocker أو مشاكل الشبكة');
        break;
      }

      // انتظار قبل المحاولة التالية
      if (attempt < maxRetries) {
        const waitTime = delay * Math.pow(2, attempt - 1); // Exponential backoff
        console.log(`⏳ انتظار ${waitTime}ms قبل المحاولة التالية...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError || new Error('فشل في الاتصال بـ Firebase بعد جميع المحاولات');
};

/**
 * فحص حالة الاتصال بـ Firebase
 */
export const checkFirebaseConnection = async (): Promise<boolean> => {
  try {
    // محاولة قراءة بسيطة من Firestore
    const testRef = db.collection('_test_connection').limit(1);
    await testRef.get();
    return true;
  } catch (error: any) {
    console.warn('❌ فشل في فحص الاتصال بـ Firebase:', error.message);
    return false;
  }
};

/**
 * معالجة أخطاء Firebase الشائعة
 */
export const handleFirebaseError = (error: any): string => {
  const errorMessage = error.message || error.toString();

  // أخطاء AdBlocker
  if (errorMessage.includes('ERR_BLOCKED_BY_CLIENT')) {
    return 'تم حظر الاتصال بواسطة AdBlocker. يرجى تعطيل AdBlocker لهذا الموقع.';
  }

  // أخطاء الشبكة
  if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
    return 'مشكلة في الاتصال بالإنترنت. يرجى التحقق من اتصالك.';
  }

  // أخطاء Firebase محددة
  if (errorMessage.includes('permission-denied')) {
    return 'ليس لديك صلاحية للوصول إلى هذه البيانات.';
  }

  if (errorMessage.includes('unavailable')) {
    return 'خدمة Firebase غير متاحة حالياً. يرجى المحاولة لاحقاً.';
  }

  if (errorMessage.includes('deadline-exceeded')) {
    return 'انتهت مهلة الاتصال. يرجى المحاولة مرة أخرى.';
  }

  // خطأ عام
  return 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.';
};

/**
 * إعداد مراقب الاتصال
 */
export const setupConnectionMonitor = () => {
  if (typeof window === 'undefined') return;

  let isOnline = navigator.onLine;
  let connectionCheckInterval: NodeJS.Timeout | null = null;

  const handleOnline = () => {
    console.log('🌐 تم استعادة الاتصال بالإنترنت');
    isOnline = true;
    
    // فحص الاتصال بـ Firebase
    checkFirebaseConnection().then(connected => {
      if (connected) {
        console.log('✅ تم استعادة الاتصال بـ Firebase');
        // يمكن إضافة إعادة تحميل البيانات هنا
      }
    });
  };

  const handleOffline = () => {
    console.log('📴 فقدان الاتصال بالإنترنت');
    isOnline = false;
  };

  // مراقبة حالة الاتصال
  window.addEventListener('online', handleOnline);
  window.addEventListener('offline', handleOffline);

  // فحص دوري للاتصال
  connectionCheckInterval = setInterval(async () => {
    if (isOnline) {
      const connected = await checkFirebaseConnection();
      if (!connected) {
        console.warn('⚠️ فقدان الاتصال بـ Firebase');
      }
    }
  }, 30000); // كل 30 ثانية

  // تنظيف
  return () => {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
    if (connectionCheckInterval) {
      clearInterval(connectionCheckInterval);
    }
  };
};

/**
 * إعداد معالج أخطاء Firebase
 */
export const setupFirebaseErrorHandler = () => {
  if (typeof window === 'undefined') return;

  // معالجة أخطاء Firebase غير المعالجة
  const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
    const error = event.reason;
    
    if (error && typeof error === 'object' && error.code) {
      // خطأ Firebase
      const message = handleFirebaseError(error);
      console.error('🚨 خطأ Firebase غير معالج:', message);
      
      // يمكن إضافة إشعار للمستخدم هنا
      // toast.error(message);
      
      // منع الخطأ من الظهور في الكونسول
      event.preventDefault();
    }
  };

  window.addEventListener('unhandledrejection', handleUnhandledRejection);

  return () => {
    window.removeEventListener('unhandledrejection', handleUnhandledRejection);
  };
};

/**
 * تهيئة إصلاحات الاتصال
 */
export const initializeConnectionFixes = () => {
  console.log('🔧 تهيئة إصلاحات الاتصال بـ Firebase...');
  
  const cleanupConnectionMonitor = setupConnectionMonitor();
  const cleanupErrorHandler = setupFirebaseErrorHandler();

  return () => {
    if (cleanupConnectionMonitor) cleanupConnectionMonitor();
    if (cleanupErrorHandler) cleanupErrorHandler();
  };
};
