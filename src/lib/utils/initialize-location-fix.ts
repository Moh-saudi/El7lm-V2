// تهيئة إصلاح مشكلة location عند بدء التطبيق
import { initializeLocationFix } from './location-fix';

// تشغيل إصلاح location عند تحميل الملف
if (typeof window !== 'undefined') {
  // تشغيل فوري
  initializeLocationFix();

  // تشغيل إضافي عند تحميل الصفحة
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeLocationFix);
  } else {
    initializeLocationFix();
  }

  // تشغيل عند تحميل النافذة
  window.addEventListener('load', initializeLocationFix);

  console.debug('🔧 تم تهيئة إصلاح location');
}

export default initializeLocationFix;
