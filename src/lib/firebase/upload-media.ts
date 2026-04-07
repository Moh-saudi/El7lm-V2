import { supabase } from '@/lib/supabase/config';
import { User } from '@supabase/supabase-js';

// تعريف أسماء buckets التخزين في Supabase حسب نوع الحساب (محدثة لتتطابق مع البوكتات الفعلية)
const STORAGE_BUCKETS = {
  PROFILE_IMAGES: 'profile-images',
  ADDITIONAL_IMAGES: 'avatars', // بوكت avatars للاعبين المستقلين
  // بوكتات خاصة باللاعبين حسب نوع الحساب (أسماء صحيحة من Supabase)
  PLAYER_TRAINER: 'playertrainer',
  PLAYER_CLUB: 'playerclub',
  PLAYER_AGENT: 'playeragent',
  PLAYER_ACADEMY: 'playeracademy',
  VIDEOS: 'videos',
  DOCUMENTS: 'documents'
};

// أنواع الحسابات المدعومة
export type AccountType = 'trainer' | 'club' | 'agent' | 'academy' | 'independent';

// تحديد البوكت المناسب حسب نوع الحساب
function getPlayerBucket(accountType: AccountType): string {
  switch (accountType) {
    case 'trainer':
      return STORAGE_BUCKETS.PLAYER_TRAINER;
    case 'club':
      return STORAGE_BUCKETS.PLAYER_CLUB;
    case 'agent':
      return STORAGE_BUCKETS.PLAYER_AGENT;
    case 'academy':
      return STORAGE_BUCKETS.PLAYER_ACADEMY;
    case 'independent':
      return STORAGE_BUCKETS.ADDITIONAL_IMAGES; // بوكت avatars للاعبين المستقلين
    default:
      return STORAGE_BUCKETS.ADDITIONAL_IMAGES; // افتراضي للاعبين المستقلين
  }
}

// تحديد نوع الحساب من مسار URL الحالي
function detectAccountTypeFromPath(): AccountType {
  if (typeof window !== 'undefined') {
    const path = window.location.pathname;
    if (path.includes('/club/')) return 'club';
    if (path.includes('/agent/')) return 'agent';
    if (path.includes('/academy/')) return 'academy';
    if (path.includes('/trainer/')) return 'trainer';
    if (path.includes('/player/')) return 'independent'; // اللاعبين المستقلين
  }
  return 'independent'; // افتراضي للاعبين المستقلين
}

// دالة مساعدة لاستخراج مسار الملف (Key) من الرابط
function extractFileKey(url: string, bucketName: string): string | null {
  if (!url) return null;

  try {
    // 1. معالجة روابط Supabase
    if (url.includes('/storage/v1/object/public/')) {
      // مثال: .../storage/v1/object/public/profile-images/uid.jpg
      const parts = url.split(`/storage/v1/object/public/${bucketName}/`);
      if (parts.length > 1) return decodeURIComponent(parts[1]);

      // محاولة عامة إذا لم يتطابق اسم البوكت
      const genericParts = url.split('/storage/v1/object/public/');
      if (genericParts.length > 1) {
        const fullPath = decodeURIComponent(genericParts[1]);
        // إذا كان المسار يبدأ باسم البوكت، نحذفه
        if (fullPath.startsWith(bucketName + '/')) {
          return fullPath.substring(bucketName.length + 1);
        }
        return fullPath;
      }
    }

    // 2. معالجة روابط Cloudflare R2 أو روابط مباشرة أخرى
    if (url.startsWith('http')) {
      const urlObj = new URL(url);
      // في R2، المسار هو ما بعد الدومين
      // مثال: https://pub-xxx.r2.dev/uid.jpg -> uid.jpg
      return decodeURIComponent(urlObj.pathname.substring(1));
    }

    // إذا كان رابط نسبي أو مسار مباشر
    return url;

  } catch (e) {
    console.error('❌ خطأ في استخراج مسار الملف من الرابط:', url, e);
    return null;
  }
}

export async function uploadProfileImage(file: File, user: User) {
  const fileExt = file.name.split('.').pop();
  const filePath = `profile-images/${user.id}.${fileExt}`;

  // استخدام نظام التخزين الموحد
  const { storageManager } = await import('@/lib/storage');

  const result = await storageManager.upload('profile-images', filePath, file, {
    upsert: true,
    contentType: file.type
  });

  return result.publicUrl;
}

export async function deleteProfileImage(imageUrl: string, user: User) {
  const filePath = extractFileKey(imageUrl, 'profile-images');
  if (filePath) {
    const { storageManager } = await import('@/lib/storage');
    await storageManager.delete('profile-images', filePath);
  }
}

export async function uploadAdditionalImage(file: File, user: User) {
  const fileExt = file.name.split('.').pop();
  const filePath = `additional-images/${user.id}/${Date.now()}.${fileExt}`;

  // تحديد bucket حسب نوع الحساب
  const accountType = detectAccountTypeFromPath();
  const bucket = getPlayerBucket(accountType);

  // استخدام نظام التخزين الموحد
  const { storageManager } = await import('@/lib/storage');

  const result = await storageManager.upload(bucket, filePath, file, {
    upsert: false,
    contentType: file.type
  });

  return result.publicUrl;
}

export async function deleteAdditionalImage(imageUrl: string, user: User) {
  // تحديد bucket حسب نوع الحساب (محاولة تخمين)
  const accountType = detectAccountTypeFromPath();
  const bucket = getPlayerBucket(accountType);

  const filePath = extractFileKey(imageUrl, bucket);

  if (filePath) {
    const { storageManager } = await import('@/lib/storage');
    await storageManager.delete(bucket, filePath);
  }
}

// رفع صورة اللاعب الشخصية (مع تحديد نوع الحساب)
export async function uploadPlayerProfileImage(
  file: File,
  userId: string,
  accountType?: AccountType
): Promise<{ url: string }> {
  // التحقق من حجم الملف (5MB حد أقصى)
  if (file.size > 5 * 1024 * 1024) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    throw new Error(`🚫 حجم الصورة كبير جداً (${fileSizeMB} ميجابايت)\n\nالحد الأقصى المسموح: 5 ميجابايت\n\nالرجاء ضغط الصورة باستخدام أي أداة ضغط صور (مثل tinypng.com) ثم حاول رفعها مجدداً.`);
  }
  const fileExt = file.name.split('.').pop();
  // استخدام userId مباشرة كاسم للملف لضمان استبدال الصورة القديمة
  const filePath = `${userId}.${fileExt}`;

  // تحديد bucket حسب نوع الحساب
  const detectedAccountType = accountType || detectAccountTypeFromPath();
  const bucket = getPlayerBucket(detectedAccountType);

  console.log('رفع صورة اللاعب الشخصية:', {
    bucket,
    accountType: detectedAccountType,
    filePath,
    file: { name: file.name, size: file.size, type: file.type },
    userId
  });

  try {
    // استخدام نظام التخزين الموحد
    const { storageManager } = await import('@/lib/storage');

    const result = await storageManager.upload(bucket, filePath, file, {
      upsert: true,
      contentType: file.type
    });

    console.log('✅ تم رفع صورة اللاعب الشخصية:', result.publicUrl);
    return { url: result.publicUrl };
  } catch (error) {
    console.error('❌ خطأ في رفع صورة اللاعب الشخصية:', error instanceof Error ? error.message : 'Unknown error', error);
    throw error;
  }
}

// حذف صورة اللاعب الشخصية
export async function deletePlayerProfileImage(imageUrl: string, accountType?: AccountType) {
  const detectedAccountType = accountType || detectAccountTypeFromPath();
  const bucket = getPlayerBucket(detectedAccountType);

  const filePath = extractFileKey(imageUrl, bucket);

  if (filePath) {
    const { storageManager } = await import('@/lib/storage');
    await storageManager.delete(bucket, filePath);
  }
}

// رفع صورة إضافية للاعب
export async function uploadPlayerAdditionalImage(
  file: File,
  userId: string,
  accountType?: AccountType
): Promise<{ url: string }> {
  const fileExt = file.name.split('.').pop();
  // استخدام مسار فرعي منظم
  const filePath = `${userId}/${Date.now()}.${fileExt}`;

  // تحديد bucket حسب نوع الحساب
  const detectedAccountType = accountType || detectAccountTypeFromPath();
  const bucket = getPlayerBucket(detectedAccountType);

  console.log('رفع صورة إضافية للاعب:', {
    bucket,
    accountType: detectedAccountType,
    filePath,
    file: { name: file.name, size: file.size, type: file.type },
    userId
  });

  try {
    // استخدام نظام التخزين الموحد
    const { storageManager } = await import('@/lib/storage');

    const result = await storageManager.upload(bucket, filePath, file, {
      upsert: false,
      contentType: file.type
    });

    console.log('✅ تم رفع الصورة الإضافية بنجاح:', result.publicUrl);
    return { url: result.publicUrl };
  } catch (error) {
    console.error('❌ خطأ في رفع الصورة الإضافية:', error instanceof Error ? error.message : 'Unknown error', error);
    throw error;
  }
}

// حذف صورة إضافية
export async function deletePlayerAdditionalImage(imageUrl: string, accountType?: AccountType) {
  const detectedAccountType = accountType || detectAccountTypeFromPath();
  const bucket = getPlayerBucket(detectedAccountType);

  const filePath = extractFileKey(imageUrl, bucket);

  if (filePath) {
    const { storageManager } = await import('@/lib/storage');
    await storageManager.delete(bucket, filePath);
  }
}

// رفع مستند للاعب
export async function uploadPlayerDocument(
  file: File,
  userId: string,
  documentType: string,
  accountType?: AccountType
): Promise<{ url: string, name: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = file.name.split('.').slice(0, -1).join('.');
  const filePath = `documents/${userId}/${documentType}_${Date.now()}.${fileExt}`;

  // تحديد bucket حسب نوع الحساب
  const detectedAccountType = accountType || detectAccountTypeFromPath();
  const bucket = getPlayerBucket(detectedAccountType);

  console.log('رفع مستند اللاعب:', {
    bucket,
    accountType: detectedAccountType,
    filePath,
    file,
    userId
  });

  try {
    // استخدام نظام التخزين الموحد
    const { storageManager } = await import('@/lib/storage');

    const result = await storageManager.upload(bucket, filePath, file, {
      upsert: false,
      contentType: file.type
    });

    console.log('✅ تم رفع المستند بنجاح:', result.publicUrl);
    return {
      url: result.publicUrl,
      name: fileName
    };
  } catch (error) {
    console.error('❌ خطأ في رفع المستند:', error instanceof Error ? error.message : 'Unknown error', error);
    throw error;
  }
}

// حذف مستند
export async function deletePlayerDocument(documentUrl: string, accountType?: AccountType) {
  const detectedAccountType = accountType || detectAccountTypeFromPath();
  const bucket = getPlayerBucket(detectedAccountType);

  const filePath = extractFileKey(documentUrl, bucket);

  if (filePath) {
    const { storageManager } = await import('@/lib/storage');
    await storageManager.delete(bucket, filePath);
  }
}

// رفع فيديو للاعب
export async function uploadPlayerVideo(
  file: File,
  ownerId: string,
  playerId: string,
  accountType?: AccountType
): Promise<{ url: string, name: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = file.name.split('.').slice(0, -1).join('.');
  const filePath = `videos/${ownerId}/${playerId}/${Date.now()}.${fileExt}`;

  // تحديد bucket حسب نوع الحساب
  const detectedAccountType = accountType || detectAccountTypeFromPath();
  const bucket = getPlayerBucket(detectedAccountType);

  console.log('رفع فيديو اللاعب:', {
    bucket,
    accountType: detectedAccountType,
    filePath,
    file,
    ownerId,
    playerId
  });

  try {
    // استخدام نظام التخزين الموحد
    const { storageManager } = await import('@/lib/storage');

    const result = await storageManager.upload(bucket, filePath, file, {
      upsert: false,
      contentType: file.type
    });

    console.log('✅ تم رفع الفيديو بنجاح:', result.publicUrl);
    return {
      url: result.publicUrl,
      name: fileName
    };
  } catch (error) {
    console.error('❌ خطأ في رفع الفيديو:', error instanceof Error ? error.message : 'Unknown error', error);
    throw error;
  }
}

// حذف فيديو
export async function deletePlayerVideo(videoUrl: string, accountType?: AccountType) {
  const detectedAccountType = accountType || detectAccountTypeFromPath();
  const bucket = getPlayerBucket(detectedAccountType);

  const filePath = extractFileKey(videoUrl, bucket);

  if (filePath) {
    const { storageManager } = await import('@/lib/storage');
    await storageManager.delete(bucket, filePath);
  }
}

// دوال مساعدة للواجهات
export const trainerUpload = {
  profileImage: (file: File, userId: string) => uploadPlayerProfileImage(file, userId, 'trainer'),
  additionalImage: (file: File, userId: string) => uploadPlayerAdditionalImage(file, userId, 'trainer'),
  document: (file: File, userId: string, documentType: string) => uploadPlayerDocument(file, userId, documentType, 'trainer'),
  video: (file: File, trainerId: string, playerId: string) => uploadPlayerVideo(file, trainerId, playerId, 'trainer')
};

// النادي يحتاج معاملة خاصة لبعض الفيديوهات
export async function uploadClubVideo(
  file: File,
  clubId: string
): Promise<{ url: string, name: string }> {
  const fileExt = file.name.split('.').pop();
  const fileName = file.name.split('.').slice(0, -1).join('.');
  const filePath = `videos/${clubId}/${Date.now()}.${fileExt}`;

  // البوكت الثابت لفيديوهات النادي لأنه يستخدم دالة خاصة
  const bucket = 'playerclub';

  console.log('رفع فيديو خاص بالنادي:', {
    bucket,
    filePath,
    file: { name: file.name, size: file.size, type: file.type }
  });

  try {
    // استخدام نظام التخزين الموحد
    const { storageManager } = await import('@/lib/storage');

    const result = await storageManager.upload(bucket, filePath, file, {
      upsert: false,
      cacheControl: '3600',
      contentType: file.type
    });

    console.log('✅ تم رفع فيديو النادي بنجاح:', result.publicUrl);

    return {
      url: result.publicUrl,
      name: fileName
    };
  } catch (error) {
    console.error('❌ خطأ في رفع فيديو النادي:', error instanceof Error ? error.message : 'Unknown error', error);
    throw error;
  }
}

// الواجهات المصدرة
export const clubUpload = {
  profileImage: (file: File, userId: string) => uploadPlayerProfileImage(file, userId, 'club'),
  additionalImage: (file: File, userId: string) => uploadPlayerAdditionalImage(file, userId, 'club'),
  document: (file: File, userId: string, documentType: string) => uploadPlayerDocument(file, userId, documentType, 'club'),
  video: (file: File, clubId: string, playerId: string) => uploadPlayerVideo(file, clubId, playerId, 'club'),
  videoFile: (file: File, clubId: string) => uploadClubVideo(file, clubId)
};

export const agentUpload = {
  profileImage: (file: File, userId: string) => uploadPlayerProfileImage(file, userId, 'agent'),
  additionalImage: (file: File, userId: string) => uploadPlayerAdditionalImage(file, userId, 'agent'),
  document: (file: File, userId: string, documentType: string) => uploadPlayerDocument(file, userId, documentType, 'agent'),
  video: (file: File, agentId: string, playerId: string) => uploadPlayerVideo(file, agentId, playerId, 'agent')
};

export const academyUpload = {
  profileImage: (file: File, userId: string) => uploadPlayerProfileImage(file, userId, 'academy'),
  additionalImage: (file: File, userId: string) => uploadPlayerAdditionalImage(file, userId, 'academy'),
  document: (file: File, userId: string, documentType: string) => uploadPlayerDocument(file, userId, documentType, 'academy'),
  video: (file: File, academyId: string, playerId: string) => uploadPlayerVideo(file, academyId, playerId, 'academy')
};
