import { toast } from 'sonner';

// حد أقصى لحجم الملف (5 MB)
export const MAX_FILE_SIZE = 5 * 1024 * 1024;

// أنواع الملفات المدعومة
export const SUPPORTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
export const SUPPORTED_DOCUMENT_TYPES = ['application/pdf'];

/**
 * التحقق من صحة ملف الصورة
 */
export function validateImageFile(file: File): { isValid: boolean; error?: string } {
  // التحقق من وجود الملف
  if (!file) {
    return { isValid: false, error: 'لم يتم اختيار ملف' };
  }

  // التحقق من نوع الملف
  const isImage = SUPPORTED_IMAGE_TYPES.includes(file.type);
  const isDocument = SUPPORTED_DOCUMENT_TYPES.includes(file.type);

  if (!isImage && !isDocument) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);

    toast.error(`نوع الملف غير مدعوم! 
    📄 نوع الملف المحدد: ${file.type}
    📊 حجم الملف: ${fileSizeMB} MB
    
    ✅ الأنواع المدعومة:
    • الصور: JPG, PNG, GIF, WebP
    • المستندات: PDF
    
    💡 تأكد من اختيار ملف صورة صالح`, {
      duration: 6000,
      style: {
        maxWidth: '380px',
        fontSize: '14px',
        lineHeight: '1.4'
      }
    });

    return { isValid: false, error: 'نوع ملف غير مدعوم' };
  }

  // التحقق من حجم الملف
  if (file.size > MAX_FILE_SIZE) {
    const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
    const maxSizeMB = (MAX_FILE_SIZE / 1024 / 1024).toFixed(0);

    console.error(`❌ ملف كبير جداً: ${fileSizeMB}MB (الحد الأقصى: ${maxSizeMB}MB)`);

    toast.error(`حجم الملف كبير جداً! 
    📊 حجم الملف: ${fileSizeMB} ميجابايت
    ⚠️ الحد الأقصى المسموح: ${maxSizeMB} ميجابايت
    
    💡 نصائح لتقليل حجم الصورة:
    • استخدم أدوات ضغط الصور online مثل TinyPNG
    • قم بتغيير حجم الصورة إلى 800x800 بكسل
    • احفظ بصيغة JPG بدلاً من PNG للصور العادية
    • تجنب الصور عالية الدقة للملفات الشخصية`, {
      duration: 10000,
      style: {
        maxWidth: '420px',
        fontSize: '14px',
        lineHeight: '1.4'
      }
    });

    return { isValid: false, error: 'حجم الملف كبير جداً' };
  }

  return { isValid: true };
}

/**
 * تحويل حجم الملف إلى نص قابل للقراءة
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

/**
 * إنشاء اسم ملف فريد
 */
export function generateUniqueFileName(originalName: string, userId: string, type: string): string {
  const timestamp = Date.now();
  const fileExt = originalName.split('.').pop()?.toLowerCase() || 'jpg';
  return `trainer-${type}-${userId}-${timestamp}.${fileExt}`;
}

/**
 * معاينة الصورة قبل الرفع
 */
export function createImagePreview(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(e.target.result as string);
      } else {
        reject(new Error('فشل في قراءة الملف'));
      }
    };

    reader.onerror = () => {
      reject(new Error('خطأ في قراءة الملف'));
    };

    reader.readAsDataURL(file);
  });
}

/**
 * عرض رسالة نجاح مخصصة حسب نوع الرفع
 */
export function showUploadSuccessMessage(type: 'profile' | 'cover' | 'document', bucketUsed: string) {
  const typeNames = {
    profile: 'الصورة الشخصية',
    cover: 'صورة الغلاف',
    document: 'المستند'
  };

  const typeName = typeNames[type];

  const successMessage = bucketUsed === 'trainer'
    ? `🎯 تم رفع ${typeName} بنجاح في Trainer bucket الأساسي!`
    : `✅ تم رفع ${typeName} بنجاح في ${bucketUsed}!`;

  toast.success(successMessage, {
    duration: 4000,
    style: {
      fontSize: '14px'
    }
  });
}

/**
 * عرض رسالة خطأ في الرفع
 */
export function showUploadErrorMessage(error: string) {
  console.error('💥 خطأ في رفع الملف:', error);

  toast.error(`فشل في رفع الملف
  ❌ السبب: ${error}
  
  🔧 جرب هذه الحلول:
  • تأكد من اتصال الإنترنت
  • جرب ملف أصغر حجماً
  • تأكد من نوع الملف المدعوم
  • أعد المحاولة بعد قليل`, {
    duration: 8000,
    style: {
      maxWidth: '380px',
      fontSize: '14px',
      lineHeight: '1.4'
    }
  });
}

// دوال مساعدة لمعالجة الصور وتحسين الأداء

/**
 * ضغط الصورة لتحسين الأداء
 */
export const compressImage = (file: File, quality: number = 0.8): Promise<File> => {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // تحديد الأبعاد المثلى
      const maxWidth = 800;
      const maxHeight = 600;

      let { width, height } = img;

      // إعادة تحجيم الصورة إذا كانت كبيرة
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width *= ratio;
        height *= ratio;
      }

      canvas.width = width;
      canvas.height = height;

      // رسم الصورة المضغوطة
      ctx?.drawImage(img, 0, 0, width, height);

      canvas.toBlob((blob) => {
        if (blob) {
          const compressedFile = new File([blob], file.name, {
            type: 'image/jpeg',
            lastModified: Date.now()
          });
          resolve(compressedFile);
        } else {
          resolve(file);
        }
      }, 'image/jpeg', quality);
    };

    img.src = URL.createObjectURL(file);
  });
};

/**
 * إنشاء صورة مصغرة من الفيديو
 */
export const generateVideoThumbnail = (videoUrl: string, time: number = 1): Promise<string> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    video.addEventListener('loadedmetadata', () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      video.currentTime = time;
    });

    video.addEventListener('seeked', () => {
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.8);
        resolve(thumbnail);
      } else {
        reject(new Error('Could not get canvas context'));
      }
    });

    video.addEventListener('error', reject);

    video.src = videoUrl;
    video.load();
  });
};

/**
 * تحسين تحميل الصور مع Lazy Loading
 */
export const lazyLoadImage = (src: string, placeholder?: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();

    img.onload = () => resolve(src);
    img.onerror = () => {
      if (placeholder) {
        resolve(placeholder);
      } else {
        reject(new Error('Image failed to load'));
      }
    };

    img.src = src;
  });
};

/**
 * تحويل Base64 إلى Blob
 */
export const base64ToBlob = (base64: string, mimeType: string = 'image/jpeg'): Blob => {
  const byteCharacters = atob(base64.split(',')[1]);
  const byteNumbers = new Array(byteCharacters.length);

  for (let i = 0; i < byteCharacters.length; i++) {
    byteNumbers[i] = byteCharacters.charCodeAt(i);
  }

  const byteArray = new Uint8Array(byteNumbers);
  return new Blob([byteArray], { type: mimeType });
};

/**
 * البحث العميق في كائنات الصور لاستخراج الروابط
 */
export const deepExtractImageUrl = (obj: unknown, depth: number = 0): string | null => {
  if (depth > 5) return null; // زيادة عمق البحث

  // إذا كان نص عادي وصالح
  if (typeof obj === 'string' && obj.trim()) {
    const trimmed = obj.trim();
    // التحقق من أنه URL صالح
    if (trimmed.startsWith('http') || trimmed.startsWith('/') ||
      trimmed.startsWith('data:') || trimmed.includes('.')) {
      return trimmed;
    }
  }

  // إذا كان Array، ابحث في العناصر
  if (Array.isArray(obj)) {
    for (const item of obj) {
      const result = deepExtractImageUrl(item, depth + 1);
      if (result) return result;
    }
    return null;
  }

  if (typeof obj === 'object' && obj !== null) {
    // البحث في الخصائص المعروفة بترتيب الأولوية
    const knownKeys = [
      'url', 'downloadURL', 'src', 'href', 'path', 'link', 'uri',
      'imageUrl', 'image_url', 'photoURL', 'photo_url',
      'fullPath', 'mediaLink', 'publicUrl', 'secure_url'
    ];

    for (const key of knownKeys) {
      if (obj.hasOwnProperty(key) && (obj as Record<string, unknown>)[key] != null) {
        const result = deepExtractImageUrl((obj as Record<string, unknown>)[key], depth + 1);
        if (result) return result;
      }
    }

    // البحث في جميع الخصائص الأخرى
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (value != null && !knownKeys.includes(key)) {
        // إذا كان string مباشر وصالح
        if (typeof value === 'string' && value.trim()) {
          const trimmed = value.trim();
          if (trimmed.startsWith('http') || trimmed.startsWith('/') ||
            trimmed.startsWith('data:') || trimmed.includes('.')) {
            return trimmed;
          }
        }
        // إذا كان كائن، ابحث بداخله
        else if (typeof value === 'object') {
          const result = deepExtractImageUrl(value, depth + 1);
          if (result) return result;
        }
      }
    }
  }

  return null;
};

/**
 * إنشاء URL آمن للصورة مع معالجة الأخطاء والبحث العميق
 */
export const createSafeImageUrl = (imageUrl: string | object | null | undefined, fallback: string = '/default-player-avatar.png'): string => {
  if (!imageUrl) {
    return fallback;
  }

  // إذا كان نص عادي
  if (typeof imageUrl === 'string') {
    const trimmed = imageUrl.trim();
    if (!trimmed) return fallback;

    // التحقق من URL صالح (مطلق أو نسبي)
    if (trimmed.startsWith('http') || trimmed.startsWith('/') ||
      trimmed.startsWith('data:') || trimmed.includes('.')) {
      try {
        // محاولة إنشاء URL للتحقق من الصحة (للمطلقة فقط)
        if (trimmed.startsWith('http')) {
          new URL(trimmed);
        }
        return trimmed;
      } catch {
        // إذا فشل، استخدم المسار النسبي أو fallback
        if (trimmed.startsWith('/') || trimmed.startsWith('./')) {
          return trimmed;
        }
        return fallback;
      }
    }

    return fallback;
  }

  // إذا كان كائن معقد، استخدم البحث العميق
  if (typeof imageUrl === 'object') {
    try {
      const extractedUrl = deepExtractImageUrl(imageUrl);
      if (extractedUrl) {
        return createSafeImageUrl(extractedUrl, fallback); // استدعاء متكرر للتحقق من الصحة
      }

      // معلومات تشخيصية محسنة (تم تقليل مستوى التحذير)
      const keys = Array.isArray(imageUrl) ?
        `[Array with ${imageUrl.length} items]` :
        Object.keys(imageUrl).join(', ');

      // تحويل إلى debug بدلاً من warn لتقليل الضجيج في console
      console.debug('Could not extract URL from complex object, using fallback. Object keys:', keys);

      // محاولة أخيرة للعثور على أي string يحتوي على http أو /
      const jsonStr = JSON.stringify(imageUrl);
      const urlMatches = [
        /"(https?:\/\/[^"]+)"/,  // رابط HTTP كامل
        /"(\/[^"\s]+\.(jpg|jpeg|png|gif|webp))"/, // مسار نسبي بامتداد صورة
        /"(data:image[^"]+)"/, // Base64 image data
      ];

      for (const pattern of urlMatches) {
        const match = jsonStr.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }

      return fallback;
    } catch (error) {
      console.error('Error processing image object:', error);
      return fallback;
    }
  }

  return fallback;
};

/**
 * تحسين جودة الفيديو حسب سرعة الاتصال
 */
export const getOptimalVideoQuality = (): 'low' | 'medium' | 'high' => {
  if (!(navigator as any).connection) {
    return 'medium'; // القيمة الافتراضية
  }

  const connection = (navigator as any).connection;
  const effectiveType = connection.effectiveType;

  switch (effectiveType) {
    case 'slow-2g':
    case '2g':
      return 'low';
    case '3g':
      return 'medium';
    case '4g':
    default:
      return 'high';
  }
};

/**
 * تحسين تحميل الفيديوهات مع preloading
 */
export const preloadVideo = (videoUrl: string): Promise<HTMLVideoElement> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');

    video.addEventListener('canplaythrough', () => resolve(video));
    video.addEventListener('error', reject);

    video.preload = 'metadata';
    video.src = videoUrl;
    video.load();
  });
};

/**
 * حساب نسبة العرض إلى الارتفاع للفيديو
 */
export const getVideoAspectRatio = (videoElement: HTMLVideoElement): number => {
  if (videoElement.videoWidth && videoElement.videoHeight) {
    return videoElement.videoWidth / videoElement.videoHeight;
  }
  return 16 / 9; // القيمة الافتراضية
};

/**
 * تنسيق المدة الزمنية
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
};

/**
 * تحسين استخدام الذاكرة بإزالة المراجع غير المستخدمة
 */
export const cleanupVideoResources = (videoElement: HTMLVideoElement) => {
  videoElement.pause();
  videoElement.removeAttribute('src');
  videoElement.load();
};

/**
 * تحسين تحميل الصور للأجهزة المختلفة
 */
export const getResponsiveImageUrl = (
  baseUrl: string,
  deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop'
): string => {
  if (!baseUrl) return '/default-player-avatar.png';

  const qualityParams = {
    mobile: 'w_400,h_400,c_fill,q_auto:low',
    tablet: 'w_600,h_600,c_fill,q_auto:good',
    desktop: 'w_800,h_800,c_fill,q_auto:best'
  };

  // إذا كان URL يحتوي على معاملات Cloudinary، أضف التحسينات
  if (baseUrl.includes('cloudinary.com')) {
    const insertIndex = baseUrl.indexOf('/upload/') + 8;
    return baseUrl.slice(0, insertIndex) + qualityParams[deviceType] + '/' + baseUrl.slice(insertIndex);
  }

  return baseUrl;
};

/**
 * كشف نوع الجهاز
 */
export const detectDeviceType = (): 'mobile' | 'tablet' | 'desktop' => {
  const width = window.innerWidth;

  if (width < 768) {
    return 'mobile';
  } else if (width < 1024) {
    return 'tablet';
  } else {
    return 'desktop';
  }
}; 
