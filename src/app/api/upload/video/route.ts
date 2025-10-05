import { ensureVideosBucket } from '@/lib/supabase/ensure-buckets';
import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// إعدادات Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ متغيرات Supabase غير محددة');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// إعدادات الرفع
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'];

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 استلام طلب رفع فيديو');

    // التحقق من وجود Supabase
    if (!supabase) {
      console.error('❌ Supabase غير متاح');
      return NextResponse.json(
        { error: 'خدمة التخزين غير متاحة حالياً' },
        { status: 503 }
      );
    }

    // التحقق من وجود bucket للفيديوهات
    const bucketExists = await ensureVideosBucket();
    if (!bucketExists) {
      console.error('❌ فشل في التحقق من وجود bucket الفيديوهات');
      console.warn('💡 محاولة استخدام bucket بديل أو إنشاء bucket بسيط...');
      
      // محاولة استخدام bucket موجود بالفعل
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      if (!listError && buckets) {
        const availableBuckets = buckets.map(b => b.name);
        console.log('📋 Buckets المتاحة:', availableBuckets);
        
        // البحث عن أي bucket يمكن استخدامه للفيديوهات
        const fallbackBuckets = ['videos', 'player-videos', 'club-videos', 'academy-videos', 'avatars', 'profile-images'];
        const usableBucket = fallbackBuckets.find(bucket => availableBuckets.includes(bucket));
        
        if (usableBucket) {
          console.log(`✅ سيتم استخدام bucket بديل: ${usableBucket}`);
          // سنستخدم هذا bucket في عملية الرفع
        } else {
          return NextResponse.json(
            { error: 'لا يوجد bucket مناسب للفيديوهات' },
            { status: 503 }
          );
        }
      } else {
        return NextResponse.json(
          { error: 'فشل في إعداد التخزين' },
          { status: 503 }
        );
      }
    }

    // الحصول على البيانات من الطلب
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const userId = formData.get('userId') as string;

    console.log('📁 بيانات الملف:', {
      fileName: file?.name,
      fileSize: file?.size,
      fileType: file?.type,
      userId: userId
    });

    // التحقق من وجود الملف
    if (!file) {
      return NextResponse.json(
        { error: 'ملف الفيديو مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من معرف المستخدم
    if (!userId) {
      return NextResponse.json(
        { error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      );
    }

    // التحقق من نوع الملف
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // التحقق من حجم الملف
    if (file.size > MAX_FILE_SIZE) {
      const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
      const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);

      console.warn(`⚠️ حجم الملف كبير جداً: ${fileSizeMB}MB (الحد الأقصى: ${maxSizeMB}MB)`);

      return NextResponse.json(
        {
          error: `حجم الملف كبير جداً!\n\nحجم الملف: ${fileSizeMB} ميجابايت\nالحد الأقصى المسموح: ${maxSizeMB} ميجابايت\n\n💡 نصائح:\n• جرب ضغط الفيديو قبل الرفع\n• اختر فيديو أقصر مدة\n• استخدم برامج ضغط الفيديو مثل HandBrake`,
          fileSize: file.size,
          maxSize: MAX_FILE_SIZE
        },
        { status: 413 }
      );
    }

    // إنشاء اسم فريد للملف
    const timestamp = Date.now();
    const fileExt = file.name.split('.').pop() || 'mp4';
    const fileName = file.name.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '_');
    const filePath = `videos/${userId}/${timestamp}_${fileName}.${fileExt}`;

    console.log('📤 بدء رفع الفيديو:', {
      bucket: 'videos',
      filePath,
      fileSize: file.size,
      fileType: file.type
    });

    // تحديد bucket للرفع
    let bucketName = 'videos';
    
    // إذا فشل التحقق من bucket، نستخدم bucket بديل
    if (!bucketExists) {
      const { data: buckets } = await supabase.storage.listBuckets();
      if (buckets) {
        const fallbackBuckets = ['videos', 'player-videos', 'club-videos', 'academy-videos', 'avatars', 'profile-images'];
        const usableBucket = fallbackBuckets.find(bucket => buckets.some(b => b.name === bucket));
        if (usableBucket) {
          bucketName = usableBucket;
          console.log(`🔄 استخدام bucket بديل: ${bucketName}`);
        }
      }
    }

    console.log(`📤 رفع الفيديو إلى bucket: ${bucketName}`);

    // رفع الملف إلى Supabase Storage
    const { data, error } = await supabase.storage
      .from(bucketName)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      });

    if (error) {
      console.error('❌ خطأ في رفع الفيديو:', error);

      // معالجة أخطاء محددة
      if (error.message.includes('File size exceeds maximum allowed size')) {
        return NextResponse.json(
          { error: 'حجم الملف يتجاوز الحد المسموح في التخزين السحابي' },
          { status: 413 }
        );
      }

      if (error.message.includes('Bucket not found')) {
        return NextResponse.json(
          { error: 'مجلد التخزين غير متاح' },
          { status: 503 }
        );
      }

      return NextResponse.json(
        { error: `فشل في رفع الفيديو: ${error.message}` },
        { status: 500 }
      );
    }

    // الحصول على الرابط العام
    const { data: urlData } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    if (!urlData?.publicUrl) {
      console.error('❌ فشل في الحصول على رابط الفيديو');
      return NextResponse.json(
        { error: 'فشل في الحصول على رابط الفيديو' },
        { status: 500 }
      );
    }

    console.log('✅ تم رفع الفيديو بنجاح:', urlData.publicUrl);

    // إرجاع النتيجة
    return NextResponse.json({
      success: true,
      url: urlData.publicUrl,
      name: file.name,
      size: file.size,
      type: file.type,
      path: filePath,
      message: 'تم رفع الفيديو بنجاح'
    });

  } catch (error: any) {
    console.error('❌ خطأ في معالجة طلب رفع الفيديو:', error);

    // معالجة أخطاء محددة
    if (error.message?.includes('Request entity too large')) {
      return NextResponse.json(
        { error: 'حجم الطلب كبير جداً. يرجى تقليل حجم الفيديو' },
        { status: 413 }
      );
    }

    if (error.message?.includes('timeout')) {
      return NextResponse.json(
        { error: 'انتهت مهلة الرفع. يرجى المحاولة مرة أخرى' },
        { status: 408 }
      );
    }

    return NextResponse.json(
      { error: 'حدث خطأ غير متوقع في رفع الفيديو' },
      { status: 500 }
    );
  }
}

// دعم OPTIONS للـ CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
