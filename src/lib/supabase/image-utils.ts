import { supabase } from './config';
import { fixReceiptUrl } from '../utils/cloudflare-r2-utils';

const CLOUDFLARE_BASE_URL = 'https://assets.el7lm.com';

export const getSupabaseImageUrl = (path: string, bucket: string = 'avatars') => {
  if (!path) {
    return '';
  }

  // 1. إذا كان المسار يحتوي بالفعل على رابط Cloudflare
  if (path.includes('assets.el7lm.com')) {
    return path;
  }

  // 2. إذا كان المسار رابطاً كاملاً (Http)، حاكل إصلاحه وتحويله لـ Cloudflare
  if (path.startsWith('http')) {
    const fixed = fixReceiptUrl(path);
    if (fixed && fixed.includes('assets.el7lm.com')) {
      return fixed;
    }

    // إذا كان لا يزال من Supabase بعد محاولة الإصلاح (ولم ينجح التبديل)، 
    // وكان السوبا بيس معطلاً (DNS Error)، نفضل إرجاع مسار نسبي ليعالج ككلاود فلير
    if (path.includes('supabase.co')) {
      console.warn('⚠️ image-utils: Supabase URL detected but fix failed. Trying path extraction.', path);
      const parts = path.split('/');
      const fileName = parts[parts.length - 1];
      if (fileName && fileName.includes('.')) {
        return `${CLOUDFLARE_BASE_URL}/${bucket}/${fileName}`;
      }
    }

    return path;
  }

  // 3. إذا كان مجرد مسار نسبي، استخدم Cloudflare
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  // التحقق من وجود bucket في المسار النسبي إذا لم يكن موجوداً
  if (!cleanPath.includes('/') && bucket) {
    return `${CLOUDFLARE_BASE_URL}/${bucket}/${cleanPath}`;
  }

  return `${CLOUDFLARE_BASE_URL}/${cleanPath}`;
};

// دالة للتحقق من وجود الصورة في Supabase
export const checkImageExists = async (path: string, bucket: string = 'avatars') => {
  // Supabase storage is currently defunct/migrated to R2
  // We return true by default to allow fallback logic to try the Cloudflare URL
  return true;
};

// دالة جديدة لجلب صورة المستخدم من Supabase
export const getUserAvatarFromSupabase = async (userId: string, accountType: string) => {
  // Supabase storage is defunct. We should use Cloudflare URLs directly.
  return null;
};

export const getPlayerAvatarUrl = (userData: any, user?: any) => {
  if (!userData) {
    return null;
  }

  // استخدام user object للحصول على uid و email الصحيحين
  const uid = user?.uid || userData.uid;
  const email = user?.email || userData.email;
  const accountType = userData.accountType;

  // البحث في الحقول المختلفة للصورة
  const imageFields = [
    userData.profile_image_url,
    userData.profile_image,
    userData.avatar,
    userData.photoURL,
    userData.profilePicture,
    userData.image
  ];

  for (const field of imageFields) {
    if (field) {
      // تحقق من نوع البيانات
      let fieldValue: string;

      if (typeof field === 'string') {
        fieldValue = field;
      } else if (typeof field === 'object' && field !== null && 'url' in field) {
        fieldValue = field.url;
      } else if (typeof field === 'object' && field !== null && 'path' in field) {
        fieldValue = field.path;
      } else {
        continue;
      }

      // تحقق من أن القيمة صحيحة
      if (!fieldValue || fieldValue === 'undefined' || fieldValue === 'null') {
        continue;
      }

      // إذا كان رابط كامل، تحقق مما إذا كان يحتاج تحويل لـ Cloudflare
      if (fieldValue.startsWith('http')) {
        // إذا كان رابط Supabase، نمرره لـ getSupabaseImageUrl ليقوم بتحويله
        if (fieldValue.includes('.supabase.co')) {
          return getSupabaseImageUrl(fieldValue, 'avatars');
        }
        return fieldValue;
      }

      // إذا كان مسار، استخدم المحول الموحد الذي يدعم Cloudflare الآن
      const url = getSupabaseImageUrl(fieldValue, 'avatars');
      if (url && url !== '' && !url.includes('undefined')) {
        return url;
      }
    }
  }

  // إذا لم نجد صورة، جرب البحث في bucket avatars باستخدام معرف المستخدم
  if (uid) {
    // جرب امتدادات مختلفة
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];

    for (const ext of extensions) {
      const fileName = `${uid}.${ext}`;
      const url = getSupabaseImageUrl(fileName, 'avatars');

      if (url && url !== '') {
        return url;
      }
    }
  }

  // إذا لم نجد صورة، إرجاع null للسماح بعرض الصورة الافتراضية
  return null;
}; 
