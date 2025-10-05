import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// إعدادات Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ متغيرات Supabase غير محددة');
}

const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

// إعدادات الرفع المقسم
const CHUNK_SIZE = 4 * 1024 * 1024; // 4MB لكل جزء (أقل من حد Vercel)
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB الحد الأقصى
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/ogg', 'video/avi', 'video/mov', 'video/quicktime'];

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 استلام طلب رفع فيديو مقسم');

    // التحقق من وجود Supabase
    if (!supabase) {
      console.error('❌ Supabase غير متاح');
      return NextResponse.json(
        { error: 'خدمة التخزين غير متاحة حالياً' },
        { status: 503 }
      );
    }

    // التحقق من وجود bucket للفيديوهات
    console.log('🔍 التحقق من وجود bucket الفيديوهات...');

    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    if (listError) {
      console.error('❌ خطأ في جلب قائمة buckets:', listError);
      return NextResponse.json(
        { error: 'فشل في الاتصال بخدمة التخزين' },
        { status: 503 }
      );
    }

    console.log('📋 Buckets المتاحة:', buckets?.map(b => b.name) || []);

    // البحث عن bucket للفيديوهات
    const videoBucketNames = ['videos', 'player-videos', 'club-videos', 'academy-videos'];
    const videosBucket = buckets?.find(bucket => videoBucketNames.includes(bucket.name));

    if (!videosBucket) {
      console.error('❌ لا يوجد bucket للفيديوهات');
      return NextResponse.json(
        { error: 'لا يوجد bucket مناسب للفيديوهات' },
        { status: 503 }
      );
    }

    console.log(`✅ تم العثور على bucket الفيديوهات: ${videosBucket.name}`);

    // الحصول على البيانات من الطلب
    const formData = await request.formData();
    const chunk = formData.get('chunk') as File;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string);
    const totalChunks = parseInt(formData.get('totalChunks') as string);
    const fileName = formData.get('fileName') as string;
    const userId = formData.get('userId') as string;
    const fileSize = parseInt(formData.get('fileSize') as string);

    console.log('📁 بيانات الجزء:', {
      chunkIndex,
      totalChunks,
      fileName,
      fileSize,
      chunkSize: chunk?.size
    });

    // التحقق من البيانات المطلوبة
    if (!chunk || chunkIndex === undefined || totalChunks === undefined || !fileName || !userId) {
      return NextResponse.json(
        { error: 'بيانات الجزء مطلوبة' },
        { status: 400 }
      );
    }

    // التحقق من حجم الملف الكلي
    if (fileSize > MAX_FILE_SIZE) {
      const maxSizeMB = Math.round(MAX_FILE_SIZE / (1024 * 1024));
      const fileSizeMB = (fileSize / (1024 * 1024)).toFixed(2);

      return NextResponse.json(
        {
          error: `حجم الملف كبير جداً!\n\nحجم الملف: ${fileSizeMB} ميجابايت\nالحد الأقصى المسموح: ${maxSizeMB} ميجابايت`,
          fileSize,
          maxSize: MAX_FILE_SIZE
        },
        { status: 413 }
      );
    }

    // التحقق من نوع الملف
    if (!ALLOWED_TYPES.includes(chunk.type)) {
      return NextResponse.json(
        { error: `نوع الملف غير مدعوم. الأنواع المدعومة: ${ALLOWED_TYPES.join(', ')}` },
        { status: 400 }
      );
    }

    // إنشاء مسار فريد للملف
    const timestamp = Date.now();
    const fileExt = fileName.split('.').pop() || 'mp4';
    const baseFileName = fileName.split('.').slice(0, -1).join('.').replace(/[^a-zA-Z0-9]/g, '_');
    const chunkPath = `videos/${userId}/${timestamp}_${baseFileName}_chunk_${chunkIndex}.${fileExt}`;

    console.log(`📤 رفع الجزء ${chunkIndex + 1}/${totalChunks} إلى bucket: ${videosBucket.name}`);

    // رفع الجزء إلى Supabase Storage
    const { data, error } = await supabase.storage
      .from(videosBucket.name)
      .upload(chunkPath, chunk, {
        cacheControl: '3600',
        upsert: false,
        contentType: chunk.type
      });

    if (error) {
      console.error('❌ خطأ في رفع الجزء:', error);
      return NextResponse.json(
        { error: `فشل في رفع الجزء ${chunkIndex + 1}: ${error.message}` },
        { status: 500 }
      );
    }

    console.log(`✅ تم رفع الجزء ${chunkIndex + 1}/${totalChunks} بنجاح`);

    // إذا كان هذا آخر جزء، قم بدمج الأجزاء
    if (chunkIndex === totalChunks - 1) {
      console.log('🔄 بدء دمج الأجزاء...');

      try {
        // جلب جميع الأجزاء
        const chunks: Blob[] = [];
        for (let i = 0; i < totalChunks; i++) {
          const partPath = `videos/${userId}/${timestamp}_${baseFileName}_chunk_${i}.${fileExt}`;
          const { data: chunkData, error: downloadError } = await supabase.storage
            .from(videosBucket.name)
            .download(partPath);

          if (downloadError) {
            console.error(`❌ خطأ في جلب الجزء ${i + 1}:`, downloadError);
            return NextResponse.json(
              { error: `فشل في جلب الجزء ${i + 1}` },
              { status: 500 }
            );
          }

          chunks.push(chunkData);
        }

        // دمج الأجزاء
        const mergedFile = new Blob(chunks, { type: chunk.type });

        // رفع الملف المدمج
        const finalPath = `videos/${userId}/${timestamp}_${baseFileName}.${fileExt}`;
        const { data: finalData, error: finalError } = await supabase.storage
          .from(videosBucket.name)
          .upload(finalPath, mergedFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: chunk.type
          });

        if (finalError) {
          console.error('❌ خطأ في رفع الملف المدمج:', finalError);
          return NextResponse.json(
            { error: 'فشل في دمج الأجزاء' },
            { status: 500 }
          );
        }

        // حذف الأجزاء المؤقتة
        for (let i = 0; i < totalChunks; i++) {
          const partPath = `videos/${userId}/${timestamp}_${baseFileName}_chunk_${i}.${fileExt}`;
          await supabase.storage.from(videosBucket.name).remove([partPath]);
        }

        // الحصول على الرابط العام
        const { data: urlData } = supabase.storage
          .from(videosBucket.name)
          .getPublicUrl(finalPath);

        if (!urlData?.publicUrl) {
          console.error('❌ فشل في الحصول على رابط الفيديو');
          return NextResponse.json(
            { error: 'فشل في الحصول على رابط الفيديو' },
            { status: 500 }
          );
        }

        console.log('✅ تم دمج الأجزاء ورفع الفيديو بنجاح:', urlData.publicUrl);

        return NextResponse.json({
          success: true,
          url: urlData.publicUrl,
          name: fileName,
          size: fileSize,
          type: chunk.type,
          path: finalPath,
          message: 'تم رفع الفيديو بنجاح'
        });

      } catch (mergeError) {
        console.error('❌ خطأ في دمج الأجزاء:', mergeError);
        return NextResponse.json(
          { error: 'فشل في دمج الأجزاء' },
          { status: 500 }
        );
      }
    }

    // إرجاع نجاح رفع الجزء
    return NextResponse.json({
      success: true,
      chunkIndex,
      totalChunks,
      message: `تم رفع الجزء ${chunkIndex + 1}/${totalChunks} بنجاح`
    });

  } catch (error: any) {
    console.error('❌ خطأ في معالجة طلب رفع الفيديو المقسم:', error);

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
