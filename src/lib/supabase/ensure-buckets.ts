import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ متغيرات Supabase الأساسية غير محددة');
}

// عميل للعمليات العامة (قراءة فقط)
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

// عميل للعمليات الإدارية (إنشاء buckets)
const supabaseAdmin = supabaseUrl && supabaseServiceKey ? createClient(supabaseUrl, supabaseServiceKey) : null;

/**
 * التحقق من وجود bucket للفيديوهات
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
      console.warn('💡 تأكد من إعدادات Supabase أو أن bucket موجود بالفعل');
      return false;
    }

    console.log('📋 Buckets الموجودة:', buckets?.map(b => b.name) || []);

    // البحث عن bucket للفيديوهات (قد يكون له أسماء مختلفة)
    const videoBucketNames = ['videos', 'player-videos', 'club-videos', 'academy-videos'];
    const videosBucket = buckets?.find(bucket => videoBucketNames.includes(bucket.name));
    
    if (videosBucket) {
      console.log(`✅ bucket الفيديوهات موجود بالفعل: ${videosBucket.name}`);
      console.log(`📊 تفاصيل bucket:`, {
        name: videosBucket.name,
        public: videosBucket.public,
        created_at: videosBucket.created_at
      });
      return true;
    }

    // إذا لم يكن bucket موجود، نحاول إنشاءه
    console.log('📦 محاولة إنشاء bucket الفيديوهات...');

    // إذا لم يكن لدينا Service Role Key، نحاول إنشاء bucket بسيط
    if (!supabaseAdmin) {
      console.warn('⚠️ لا يوجد Service Role Key، نحاول إنشاء bucket بسيط...');

      const { data, error } = await supabase.storage.createBucket('videos', {
        public: true
      });

      if (error) {
        console.error('❌ خطأ في إنشاء bucket الفيديوهات:', error);
        console.warn('💡 تأكد من وجود Service Role Key في متغيرات البيئة أو أن bucket موجود بالفعل');
        return false;
      }

      console.log('✅ تم إنشاء bucket الفيديوهات بنجاح (بسيط)');
      return true;
    }

    // إنشاء bucket مع إعدادات متقدمة باستخدام Service Role Key
    const { data, error } = await supabaseAdmin.storage.createBucket('videos', {
      public: true,
      allowedMimeTypes: ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'],
      fileSizeLimit: 100 * 1024 * 1024 // 100MB
    });

    if (error) {
      console.error('❌ خطأ في إنشاء bucket الفيديوهات:', error);
      return false;
    }

    console.log('✅ تم إنشاء bucket الفيديوهات بنجاح (متقدم)');
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

    // إذا لم يكن لدينا Service Role Key، نحاول إنشاء bucket بسيط
    if (!supabaseAdmin) {
      console.warn('⚠️ لا يوجد Service Role Key، نحاول إنشاء bucket بسيط...');

      const { data, error } = await supabase.storage.createBucket('images', {
        public: true
      });

      if (error) {
        console.error('❌ خطأ في إنشاء bucket الصور:', error);
        console.warn('💡 تأكد من وجود Service Role Key في متغيرات البيئة');
        return false;
      }

      console.log('✅ تم إنشاء bucket الصور بنجاح (بسيط)');
      return true;
    }

    // إنشاء bucket مع إعدادات متقدمة باستخدام Service Role Key
    const { data, error } = await supabaseAdmin.storage.createBucket('images', {
      public: true,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
      fileSizeLimit: 10 * 1024 * 1024 // 10MB
    });

    if (error) {
      console.error('❌ خطأ في إنشاء bucket الصور:', error);
      return false;
    }

    console.log('✅ تم إنشاء bucket الصور بنجاح (متقدم)');
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
