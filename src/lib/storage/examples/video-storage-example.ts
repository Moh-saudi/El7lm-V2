/**
 * مثال: تحديث video-storage.ts لاستخدام نظام التخزين الموحد
 * 
 * هذا ملف مثال يوضح كيفية تحديث الكود الموجود
 * لا تحتاج لتطبيقه الآن - فقط للمرجع
 */

import { storageManager } from '@/lib/storage';

export interface VideoUploadOptions {
    maxSize?: number;
    allowedTypes?: string[];
    onProgress?: (progress: number) => void;
}

export interface VideoUploadResult {
    url: string;
    name: string;
    size: number;
    type: string;
    path: string;
}

/**
 * رفع فيديو - النسخة الجديدة باستخدام storageManager
 */
export const uploadVideoToSupabase = async (
    file: File,
    userId: string,
    options: VideoUploadOptions = {}
): Promise<VideoUploadResult> => {
    const {
        maxSize = 100 * 1024 * 1024,
        allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov'],
        onProgress
    } = options;

    // التحقق من صحة الملف
    if (!file) {
        throw new Error('ملف الفيديو مطلوب');
    }

    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        throw new Error(`حجم الملف كبير جداً. الحد الأقصى: ${maxSizeMB}MB`);
    }

    if (!allowedTypes.includes(file.type)) {
        throw new Error(`نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}`);
    }

    try {
        const timestamp = Date.now();
        const fileExt = file.name.split('.').pop();
        const fileName = file.name.split('.').slice(0, -1).join('.');
        const filePath = `videos/${userId}/${timestamp}_${fileName.replace(/[^a-zA-Z0-9]/g, '_')}.${fileExt}`;

        console.log('🚀 بدء رفع الفيديو:', {
            filePath,
            fileSize: file.size,
            fileType: file.type
        });

        // استخدام storageManager بدلاً من supabase.storage مباشرة
        const result = await storageManager.upload(
            'videos',
            filePath,
            file,
            {
                cacheControl: '3600',
                upsert: false,
                contentType: file.type
            }
        );

        console.log('✅ تم رفع الفيديو بنجاح:', result.publicUrl);

        return {
            url: result.publicUrl,
            name: fileName,
            size: file.size,
            type: file.type,
            path: result.path
        };

    } catch (error) {
        console.error('❌ خطأ في رفع الفيديو:', error);
        throw error;
    }
};

/**
 * حذف فيديو - النسخة الجديدة
 */
export const deleteVideoFromSupabase = async (videoUrl: string): Promise<void> => {
    try {
        // استخراج المسار من الرابط
        const urlParts = videoUrl.split('/storage/v1/object/public/');
        if (urlParts.length < 2) {
            throw new Error('رابط الفيديو غير صالح');
        }

        const filePath = urlParts[1];
        console.log('🗑️ حذف الفيديو:', filePath);

        // استخدام storageManager
        const result = await storageManager.delete('videos', filePath);

        if (!result.success) {
            throw new Error(result.error || 'فشل في حذف الفيديو');
        }

        console.log('✅ تم حذف الفيديو بنجاح');

    } catch (error) {
        console.error('❌ خطأ في حذف الفيديو:', error);
        throw error;
    }
};

/**
 * التحقق من صحة ملف الفيديو
 */
export const validateVideoFile = (
    file: File,
    options: VideoUploadOptions = {}
): { isValid: boolean; errors: string[] } => {
    const {
        maxSize = 100 * 1024 * 1024,
        allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov']
    } = options;

    const errors: string[] = [];

    if (!file) {
        errors.push('ملف الفيديو مطلوب');
        return { isValid: false, errors };
    }

    if (!allowedTypes.includes(file.type)) {
        errors.push(`نوع الملف غير مدعوم. الأنواع المدعومة: ${allowedTypes.join(', ')}`);
    }

    if (file.size > maxSize) {
        const maxSizeMB = Math.round(maxSize / (1024 * 1024));
        errors.push(`حجم الملف كبير جداً. الحد الأقصى: ${maxSizeMB}MB`);
    }

    if (file.name.length > 100) {
        errors.push('اسم الملف طويل جداً');
    }

    if (file.size === 0) {
        errors.push('الملف فارغ');
    }

    return {
        isValid: errors.length === 0,
        errors
    };
};

/**
 * الحصول على معلومات الفيديو
 */
export const getVideoInfo = (file: File): Promise<{
    duration: number;
    width: number;
    height: number;
    size: number;
    type: string;
    name: string;
    aspectRatio: number;
}> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');

        video.addEventListener('loadedmetadata', () => {
            const info = {
                duration: video.duration,
                width: video.videoWidth,
                height: video.videoHeight,
                size: file.size,
                type: file.type,
                name: file.name,
                aspectRatio: video.videoWidth / video.videoHeight
            };
            resolve(info);
        });

        video.addEventListener('error', (error) => {
            reject(error);
        });

        video.src = URL.createObjectURL(file);
        video.load();
    });
};

/**
 * إنشاء معاينة مصغرة للفيديو
 */
export const generateVideoThumbnail = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');

        if (!ctx) {
            reject(new Error('فشل في إنشاء canvas context'));
            return;
        }

        video.addEventListener('loadedmetadata', () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            video.currentTime = 1;
        });

        video.addEventListener('seeked', () => {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

            canvas.toBlob((blob) => {
                if (blob) {
                    const thumbnailUrl = URL.createObjectURL(blob);
                    resolve(thumbnailUrl);
                } else {
                    reject(new Error('فشل في إنشاء الصورة المصغرة'));
                }
            }, 'image/jpeg', 0.8);
        });

        video.addEventListener('error', (error) => {
            reject(error);
        });

        video.src = URL.createObjectURL(file);
        video.load();
    });
};

export default {
    uploadVideoToSupabase,
    deleteVideoFromSupabase,
    validateVideoFile,
    getVideoInfo,
    generateVideoThumbnail
};
