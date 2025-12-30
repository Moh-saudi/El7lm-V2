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

  // 2. إذا كان المسار يحتوي على رابط Supabase قديم، قم بتحويله إلى Cloudflare
  if (path.includes('.supabase.co/storage/v1/object/')) {
    const fixed = fixReceiptUrl(path);
    if (fixed && fixed.startsWith('http') && fixed.includes('assets.el7lm.com')) {
      return fixed;
    }
  }

  // 3. إذا كان رابطاً كاملاً آخر
  if (path.startsWith('http')) {
    return path;
  }

  // 4. إذا كان مجرد مسار نسبي، استخدم Cloudflare كخيار أول (حسب رغبة المستخدم)
  const cleanPath = path.startsWith('/') ? path.substring(1) : path;

  // التحقق من وجود bucket في المسار النسبي إذا لم يكن موجوداً
  if (!cleanPath.includes('/') && bucket) {
    return `${CLOUDFLARE_BASE_URL}/${bucket}/${cleanPath}`;
  }

  return `${CLOUDFLARE_BASE_URL}/${cleanPath}`;
};

// دالة للتحقق من وجود الصورة في Supabase
export const checkImageExists = async (path: string, bucket: string = 'avatars') => {
  if (!path) return false;

  try {
    const { data, error } = await supabase.storage.from(bucket).list('', {
      search: path,
      limit: 1
    });

    if (error) {
      console.error(`❌ Error checking image existence:`, error);
      // إذا كان الخطأ من نوع StorageUnknownError، إرجاع false بدلاً من إثارة خطأ
      if (error.message && error.message.includes('Unexpected token')) {
        return false;
      }
      return false;
    }

    const exists = data && data.some(file => file.name === path);
    return exists;
  } catch (error: any) {
    console.error(`❌ Error checking image existence:`, error);
    // إذا كان الخطأ يحتوي على HTML response، فهذا يعني مشكلة في الخادم
    if (error.message && error.message.includes('Unexpected token')) {
      return false;
    }
    return false;
  }
};

// دالة جديدة لجلب صورة المستخدم من Supabase
export const getUserAvatarFromSupabase = async (userId: string, accountType: string) => {
  if (!userId) return null;

  try {
    // جرب امتدادات مختلفة
    const extensions = ['jpg', 'jpeg', 'png', 'webp'];

    for (const ext of extensions) {
      const fileName = `${userId}.${ext}`;

      try {
        const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(fileName);

        // تحقق من وجود الصورة مع معالجة أفضل للأخطاء
        try {
          const { data: fileExists, error } = await supabase.storage.from('avatars').list('', {
            search: fileName,
            limit: 1
          });

          if (error) {
            console.error(`❌ Error checking file existence for ${fileName}:`, error);
            // إذا كان الخطأ من نوع StorageUnknownError أو خطأ في الشبكة، تجاهل الملف
            if (error.message && error.message.includes('Unexpected token')) {
              continue;
            }
            continue;
          }

          if (fileExists && fileExists.length > 0) {
            return publicUrl;
          }
        } catch (listError: any) {
          console.error(`❌ Error listing files for ${fileName}:`, listError);
          // إذا كان الخطأ يحتوي على HTML response، فهذا يعني مشكلة في الخادم
          if (listError.message && listError.message.includes('Unexpected token')) {
            continue;
          }
          continue;
        }
      } catch (error) {
        console.error(`❌ Error checking ${fileName}:`, error);
        continue;
      }
    }

    return null;
  } catch (error) {
    console.error(`❌ Error getting avatar for user ${userId}:`, error);
    return null;
  }
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
