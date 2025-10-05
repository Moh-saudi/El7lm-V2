// سكريبت محدد لإصلاح صورة اللاعب Hussam Alomari
// نقل الصورة من بوكت playertrainer إلى بوكت avatars

const { createClient } = require('@supabase/supabase-js');

// إعدادات Supabase
const SUPABASE_URL = 'https://ekyerljzfokqimbabzxm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVreWVybGp6Zm9rcWltYmFienhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NTcyODMsImV4cCI6MjA2MjIzMzI4M30.Xd6Cg8QUISHyCG-qbgo9HtWUZz6tvqAqG6KKXzuetBY';

// تهيئة العميل
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// بيانات اللاعب
const PLAYER_ID = '9Kdp3IhbyKPAozGUKdPLxEEtkME3';
const PLAYER_NAME = 'Hussam Alomari';
const SOURCE_BUCKET = 'playertrainer';
const TARGET_BUCKET = 'avatars';
const FILE_NAME = '9Kdp3IhbyKPAozGUKdPLxEEtkME3.jpeg';

async function fixHussamAlomariImage() {
  console.log(`🚀 بدء إصلاح صورة اللاعب ${PLAYER_NAME}...\n`);
  
  try {
    // 1. التحقق من وجود الصورة في البوكت المصدر
    console.log(`🔍 التحقق من وجود الصورة في البوكت ${SOURCE_BUCKET}...`);
    
    const { data: sourceUrl } = supabase.storage
      .from(SOURCE_BUCKET)
      .getPublicUrl(FILE_NAME);
    
    if (!sourceUrl?.publicUrl) {
      console.error(`❌ لم يتم العثور على الصورة في البوكت ${SOURCE_BUCKET}`);
      return;
    }
    
    console.log(`✅ تم العثور على الصورة: ${sourceUrl.publicUrl}`);
    
    // 2. تحميل الصورة من البوكت المصدر
    console.log(`📥 تحميل الصورة من ${SOURCE_BUCKET}...`);
    
    const { data: imageData, error: downloadError } = await supabase.storage
      .from(SOURCE_BUCKET)
      .download(FILE_NAME);
    
    if (downloadError) {
      console.error(`❌ خطأ في تحميل الصورة:`, downloadError);
      return;
    }
    
    console.log(`✅ تم تحميل الصورة بنجاح`);
    
    // 3. رفع الصورة إلى البوكت الهدف
    console.log(`📤 رفع الصورة إلى ${TARGET_BUCKET}...`);
    
    const { error: uploadError } = await supabase.storage
      .from(TARGET_BUCKET)
      .upload(FILE_NAME, imageData, { upsert: true });
    
    if (uploadError) {
      console.error(`❌ خطأ في رفع الصورة:`, uploadError);
      return;
    }
    
    console.log(`✅ تم رفع الصورة إلى ${TARGET_BUCKET} بنجاح`);
    
    // 4. الحصول على الرابط الجديد
    const { data: newUrl } = supabase.storage
      .from(TARGET_BUCKET)
      .getPublicUrl(FILE_NAME);
    
    console.log(`🔗 الرابط الجديد: ${newUrl.publicUrl}`);
    
    // 5. حذف الصورة من البوكت المصدر
    console.log(`🗑️ حذف الصورة من ${SOURCE_BUCKET}...`);
    
    const { error: deleteError } = await supabase.storage
      .from(SOURCE_BUCKET)
      .remove([FILE_NAME]);
    
    if (deleteError) {
      console.error(`❌ خطأ في حذف الصورة من ${SOURCE_BUCKET}:`, deleteError);
      console.log(`⚠️ الصورة تم نقلها بنجاح لكن لم يتم حذفها من البوكت المصدر`);
    } else {
      console.log(`✅ تم حذف الصورة من ${SOURCE_BUCKET} بنجاح`);
    }
    
    console.log(`\n🎉 تم إصلاح صورة اللاعب ${PLAYER_NAME} بنجاح!`);
    console.log(`📋 ملخص العملية:`);
    console.log(`   - البوكت المصدر: ${SOURCE_BUCKET}`);
    console.log(`   - البوكت الهدف: ${TARGET_BUCKET}`);
    console.log(`   - الرابط الجديد: ${newUrl.publicUrl}`);
    console.log(`\n⚠️ تذكر تحديث مسار الصورة في قاعدة البيانات Firebase!`);
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح الصورة:', error);
  }
}

// تشغيل السكريبت
fixHussamAlomariImage();
