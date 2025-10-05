// إصلاح مشكلة إعادة تعريف location في Next.js
// هذا الملف يحل مشكلة TypeError: Cannot redefine property: location

declare global {
  interface Window {
    location: Location;
  }
}

// دالة للتحقق من وجود location وتجنب إعادة تعريفها
export const safeLocationAccess = (): Location | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    // التحقق من وجود location دون إعادة تعريفها
    if (window.location && typeof window.location === 'object') {
      return window.location;
    }
    return null;
  } catch (error) {
    console.debug('خطأ في الوصول إلى location (تم التعامل معه):', error);
    return null;
  }
};

// دالة آمنة للحصول على href
export const getSafeHref = (): string => {
  const location = safeLocationAccess();
  return location?.href || '';
};

// دالة آمنة للحصول على pathname
export const getSafePathname = (): string => {
  const location = safeLocationAccess();
  return location?.pathname || '';
};

// دالة آمنة للحصول على hostname
export const getSafeHostname = (): string => {
  const location = safeLocationAccess();
  return location?.hostname || '';
};

// دالة آمنة للحصول على search
export const getSafeSearch = (): string => {
  const location = safeLocationAccess();
  return location?.search || '';
};

// دالة آمنة للحصول على hash
export const getSafeHash = (): string => {
  const location = safeLocationAccess();
  return location?.hash || '';
};

// دالة آمنة للتنقل
export const safeNavigate = (url: string): boolean => {
  try {
    const location = safeLocationAccess();
    if (location) {
      location.href = url;
      return true;
    }
    return false;
  } catch (error) {
    console.debug('خطأ في التنقل (تم التعامل معه):', error);
    return false;
  }
};

// دالة آمنة لإعادة التحميل
export const safeReload = (): boolean => {
  try {
    const location = safeLocationAccess();
    if (location) {
      location.reload();
      return true;
    }
    return false;
  } catch (error) {
    console.debug('خطأ في إعادة التحميل (تم التعامل معه):', error);
    return false;
  }
};

// دالة آمنة للعودة للخلف
export const safeGoBack = (): boolean => {
  try {
    if (typeof window !== 'undefined' && window.history) {
      window.history.back();
      return true;
    }
    return false;
  } catch (error) {
    console.debug('خطأ في العودة للخلف (تم التعامل معه):', error);
    return false;
  }
};

// دالة آمنة للتقدم للأمام
export const safeGoForward = (): boolean => {
  try {
    if (typeof window !== 'undefined' && window.history) {
      window.history.forward();
      return true;
    }
    return false;
  } catch (error) {
    console.debug('خطأ في التقدم للأمام (تم التعامل معه):', error);
    return false;
  }
};

// دالة آمنة لاستبدال التاريخ
export const safeReplaceState = (state: any, title: string, url?: string): boolean => {
  try {
    if (typeof window !== 'undefined' && window.history) {
      window.history.replaceState(state, title, url);
      return true;
    }
    return false;
  } catch (error) {
    console.debug('خطأ في استبدال التاريخ (تم التعامل معه):', error);
    return false;
  }
};

// دالة آمنة لإضافة حالة جديدة للتاريخ
export const safePushState = (state: any, title: string, url?: string): boolean => {
  try {
    if (typeof window !== 'undefined' && window.history) {
      window.history.pushState(state, title, url);
      return true;
    }
    return false;
  } catch (error) {
    console.debug('خطأ في إضافة حالة جديدة للتاريخ (تم التعامل معه):', error);
    return false;
  }
};

// تهيئة آمنة للـ location
export const initializeLocationFix = (): void => {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    // التأكد من أن location موجودة ومتاحة
    if (!window.location) {
      console.warn('location غير متاحة في window');
      return;
    }

    // حماية location من إعادة التعريف
    const locationDescriptor = Object.getOwnPropertyDescriptor(window, 'location');
    if (locationDescriptor && !locationDescriptor.configurable) {
      console.debug('location محمية من إعادة التعريف');
      return;
    }

    // إضافة حماية إضافية
    try {
      Object.defineProperty(window, 'location', {
        value: window.location,
        writable: false,
        configurable: false,
        enumerable: true
      });
    } catch (error) {
      // إذا فشل التعريف، فهذا يعني أن location محمية بالفعل
      console.debug('location محمية بالفعل من إعادة التعريف');
    }

    console.debug('✅ تم تهيئة إصلاح location بنجاح');
  } catch (error) {
    console.debug('فشل في تهيئة إصلاح location (تم التعامل معه):', error);
  }
};

export default {
  safeLocationAccess,
  getSafeHref,
  getSafePathname,
  getSafeHostname,
  getSafeSearch,
  getSafeHash,
  safeNavigate,
  safeReload,
  safeGoBack,
  safeGoForward,
  safeReplaceState,
  safePushState,
  initializeLocationFix
};
