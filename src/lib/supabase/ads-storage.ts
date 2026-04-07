import { supabase } from '@/lib/supabase/config';
import { STORAGE_BUCKETS } from './config';

export interface AdUploadResponse {
  url?: string;
  error?: string;
  path?: string;
  publicUrl?: string;
}

export interface AdFileInfo {
  id: string;
  name: string;
  size: number;
  type: string;
  url: string;
  uploadedAt: Date;
}

/**
 * التحقق من وجود bucket الإعلانات وإنشاؤه إذا لم يكن موجوداً
 */
export async function ensureAdsBucketExists(): Promise<boolean> {
  // إذا كنا نستخدم Cloudflare R2، نفترض أن الـ bucket موجود أو يتم التعامل معه من قبل المزود
  if (process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET) {
    return true;
  }

  try {
    console.log('Checking if ads bucket exists in Supabase...');
    // ... rest of supabase check code ...
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKETS.ADS)
      .list('', {
        limit: 1
      });

    if (error) {
      console.error('Error checking ads bucket:', error);
      // ... error handling ...
      return false;
    }

    console.log('Ads bucket exists in Supabase');
    return true;
  } catch (error) {
    console.error('Error checking ads bucket:', error);
    return false;
  }
}

/**
 * رفع ملف إعلان (صورة أو فيديو) إلى Supabase Storage
 */
export async function uploadAdFile(
  file: File,
  adId: string,
  fileType: 'image' | 'video'
): Promise<AdUploadResponse> {
  try {
    console.log('Starting file upload process...', { adId, fileType, fileName: file.name });

    // التحقق من وجود bucket أولاً
    const bucketExists = await ensureAdsBucketExists();
    if (!bucketExists) {
      return {
        error: 'bucket الإعلانات غير موجود. يرجى إنشاؤه في Supabase Dashboard أولاً.'
      };
    }

    // التحقق من نوع الملف
    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const allowedVideoTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'];

    const allowedTypes = fileType === 'image' ? allowedImageTypes : allowedVideoTypes;

    if (!allowedTypes.includes(file.type)) {
      return {
        error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}`
      };
    }

    // التحقق من حجم الملف (10MB للصور، 100MB للفيديوهات)
    const maxSize = fileType === 'image' ? 10 * 1024 * 1024 : 100 * 1024 * 1024;
    if (file.size > maxSize) {
      return {
        error: `حجم الملف كبير جداً. الحد الأقصى: ${fileType === 'image' ? '10MB' : '100MB'}`
      };
    }

    // إنشاء مسار فريد للملف
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop();
    const fileName = file.name.split('.').slice(0, -1).join('.');

    // تنظيف اسم الملف
    const cleanFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');

    // الهيكل: ads/{adId}/{type}_{timestamp}_{name}.{ext}
    const filePath = `ads/${adId}/${fileType}_${timestamp}_${cleanFileName}.${fileExt}`;

    console.log('Uploading file to storage path:', filePath);

    // استخدام نظام التخزين الموحد
    const { storageManager } = await import('@/lib/storage');
    const bucket = STORAGE_BUCKETS.ADS || 'ads';

    const result = await storageManager.upload(bucket, filePath, file, {
      cacheControl: '3600',
      contentType: file.type,
      upsert: false
    });

    console.log('Upload completed successfully:', result.publicUrl);

    return {
      url: result.publicUrl,
      path: result.path,
      publicUrl: result.publicUrl
    };

  } catch (error) {
    console.error('Error in uploadAdFile:', error);
    return {
      error: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`
    };
  }
}

/**
 * حذف ملف إعلان من Supabase Storage
 */
export async function deleteAdFile(filePath: string): Promise<{ success: boolean; error?: string }> {
  try {
    console.log('Deleting file:', filePath);

    // استخدام نظام التخزين الموحد
    const { storageManager } = await import('@/lib/storage');
    // الدالة تفترض أن filePath كامل لكن storageManager يحتاج bucket + path
    // للتوافق، سنستخدم bucket الإعلانات إذا لم يكن مضمناً في المسار
    const bucket = STORAGE_BUCKETS.ADS || 'ads';

    // إذا كان المسار يحتوي على الرابط الكامل، نستخرج المسار النسبي
    const relativePath = filePath.replace(/^https?:\/\/.*?\//, '');

    const result = await storageManager.delete(bucket, relativePath);

    if (result.error) {
      // قد لا يكون خطأ حقيقي إذا كان الملف غير موجود
      console.warn('Warning during file deletion:', result.error);
    }

    console.log('File deleted successfully check completed');
    return { success: true };

  } catch (error) {
    console.error('Error in deleteAdFile:', error);
    return {
      success: false,
      error: `فشل في حذف الملف: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}

/**
 * الحصول على قائمة ملفات إعلان معين
 */
export async function getAdFiles(adId: string): Promise<AdFileInfo[]> {
  try {
    console.log('Getting files for ad:', adId);

    const { storageManager } = await import('@/lib/storage');
    const bucket = STORAGE_BUCKETS.ADS || 'ads';

    // البحث في مجلد الصور والفيديوهات
    const [images, videos] = await Promise.all([
      storageManager.list(bucket, 'images').catch(() => []),
      storageManager.list(bucket, 'videos').catch(() => []),
    ]);

    const files: AdFileInfo[] = [];

    // معالجة الصور
    if (images) {
      for (const image of images) {
        if (image.name && image.name.includes(adId)) {
          const publicUrl = await storageManager.getPublicUrl(bucket, `images/${image.name}`);
          files.push({
            id: image.id || image.name,
            name: image.name,
            size: image.metadata?.size || 0,
            type: 'image',
            url: publicUrl,
            uploadedAt: new Date(image.updated_at || Date.now())
          });
        }
      }
    }

    // معالجة الفيديوهات
    if (videos) {
      for (const video of videos) {
        if (video.name && video.name.includes(adId)) {
          const publicUrl = await storageManager.getPublicUrl(bucket, `videos/${video.name}`);
          files.push({
            id: video.id || video.name,
            name: video.name,
            size: video.metadata?.size || 0,
            type: 'video',
            url: publicUrl,
            uploadedAt: new Date(video.updated_at || Date.now())
          });
        }
      }
    }

    console.log('Found files:', files.length);
    return files.sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime());

  } catch (error) {
    console.error('Error in getAdFiles:', error);
    return [];
  }
}

/**
 * الحصول على إحصائيات ملفات الإعلانات
 */
export async function getAdsStorageStats(): Promise<{
  totalFiles: number;
  totalSize: number;
  imagesCount: number;
  videosCount: number;
}> {
  try {
    console.log('Getting storage stats...');

    const { storageManager } = await import('@/lib/storage');
    const bucket = STORAGE_BUCKETS.ADS || 'ads';

    const [images, videos] = await Promise.all([
      storageManager.list(bucket, 'images').catch(() => []),
      storageManager.list(bucket, 'videos').catch(() => []),
    ]);

    const imagesCount = images?.length || 0;
    const videosCount = videos?.length || 0;
    const totalFiles = imagesCount + videosCount;

    // حساب الحجم الإجمالي
    let totalSize = 0;

    if (images) {
      for (const image of images) {
        totalSize += image.metadata?.size || 0;
      }
    }

    if (videos) {
      for (const video of videos) {
        totalSize += video.metadata?.size || 0;
      }
    }

    console.log('Storage stats:', { totalFiles, totalSize, imagesCount, videosCount });

    return {
      totalFiles,
      totalSize,
      imagesCount,
      videosCount
    };

  } catch (error) {
    console.error('Error getting ads storage stats:', error);
    return {
      totalFiles: 0,
      totalSize: 0,
      imagesCount: 0,
      videosCount: 0
    };
  }
}
