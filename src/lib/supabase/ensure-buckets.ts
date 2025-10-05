import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ متغيرات Supabase غير محددة');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

/**
 * ضمان وجود bucket للفيديوهات
 */
export const ensureVideosBucket = async (): Promise<boolean> => {
  if (!supabase) {
    console.error('❌ Supabase غير متاح');
    return false;
  }

  try {
    console.log('🔍 التحقق من وجود bucket الفيديوهات...');

    // التحقق من وجود bucket
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ خطأ في جلب قائمة buckets:', listError);
      return false;
    }

    const videosBucket = buckets?.find(bucket => bucket.name === 'videos');
    
    if (videosBucket) {
      console.log('✅ bucket الفيديوهات موجود بالفعل');
      return true;
    }

    console.log('📦 إنشاء bucket الفيديوهات...');

    // إنشاء bucket جديد
    const { data, error } = await supabase.storage.createBucket('videos', {
      public: true,
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'],
      fileSizeLimit: 100 * 1024 * 1024 // 100MB
    });

    if (error) {
      console.error('❌ خطأ في إنشاء bucket الفيديوهات:', error);
      return false;
    }

    console.log('✅ تم إنشاء bucket الفيديوهات بنجاح');
    return true;

  } catch (error) {
    console.error('❌ خطأ في ضمان وجود bucket الفيديوهات:', error);
    return false;
  }
};

/**
 * ضمان وجود bucket للصور
 */
export const ensureImagesBucket = async (): Promise<boolean> => {
  if (!supabase) {
    console.error('❌ Supabase غير متاح');
    return false;
  }

  try {
    console.log('🔍 التحقق من وجود bucket الصور...');

    // التحقق من وجود bucket
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.error('❌ خطأ في جلب قائمة buckets:', listError);
      return false;
    }

    const imagesBucket = buckets?.find(bucket => bucket.name === 'images');
    
    if (imagesBucket) {
      console.log('✅ bucket الصور موجود بالفعل');
      return true;
    }

    console.log('📦 إنشاء bucket الصور...');

    // إنشاء bucket جديد
    const { data, error } = await supabase.storage.createBucket('images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 10 * 1024 * 1024 // 10MB
    });

    if (error) {
      console.error('❌ خطأ في إنشاء bucket الصور:', error);
      return false;
    }

    console.log('✅ تم إنشاء bucket الصور بنجاح');
    return true;

  } catch (error) {
    console.error('❌ خطأ في ضمان وجود bucket الصور:', error);
    return false;
  }
};

/**
 * تهيئة جميع buckets المطلوبة
 */
export const initializeBuckets = async (): Promise<boolean> => {
  console.log('🚀 تهيئة buckets التخزين...');

  try {
    const videosBucketOk = await ensureVideosBucket();
    const imagesBucketOk = await ensureImagesBucket();

    if (videosBucketOk && imagesBucketOk) {
      console.log('✅ تم تهيئة جميع buckets بنجاح');
      return true;
    } else {
      console.error('❌ فشل في تهيئة بعض buckets');
      return false;
    }
  } catch (error) {
    console.error('❌ خطأ في تهيئة buckets:', error);
    return false;
  }
};
