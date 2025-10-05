// سكريبت شامل لإصلاح صورة اللاعب Hussam Alomari
// ينقل الصورة من بوكت playertrainer إلى بوكت avatars ويحدث قاعدة البيانات

const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

// إعدادات Supabase
const SUPABASE_URL = 'https://ekyerljzfokqimbabzxm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVreWVybGp6Zm9rcWltYmFienhtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY2NTcyODMsImV4cCI6MjA2MjIzMzI4M30.Xd6Cg8QUISHyCG-qbgo9HtWUZz6tvqAqG6KKXzuetBY';

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBvOkBwJ1Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4",
  authDomain: "el7lm25.firebaseapp.com",
  projectId: "el7lm25",
  storageBucket: "el7lm25.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// تهيئة العملاء
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// بيانات اللاعب
const PLAYER_ID = '9Kdp3IhbyKPAozGUKdPLxEEtkME3';
const PLAYER_NAME = 'Hussam Alomari';
const SOURCE_BUCKET = 'playertrainer';
const TARGET_BUCKET = 'avatars';
const FILE_NAME = '9Kdp3IhbyKPAozGUKdPLxEEtkME3.jpeg';

async function completeImageFix() {
  console.log(`🚀 بدء الإصلاح الشامل لصورة اللاعب ${PLAYER_NAME}...\n`);
  
  try {
    // المرحلة 1: التحقق من وجود الصورة في البوكت المصدر
    console.log(`📋 المرحلة 1: التحقق من وجود الصورة في البوكت المصدر`);
    console.log(`🔍 البحث في البوكت ${SOURCE_BUCKET}...`);
    
    const { data: sourceUrl } = supabase.storage
      .from(SOURCE_BUCKET)
      .getPublicUrl(FILE_NAME);
    
    if (!sourceUrl?.publicUrl) {
      console.error(`❌ لم يتم العثور على الصورة في البوكت ${SOURCE_BUCKET}`);
      return;
    }
    
    console.log(`✅ تم العثور على الصورة: ${sourceUrl.publicUrl}`);
    
    // المرحلة 2: تحميل الصورة من البوكت المصدر
    console.log(`\n📋 المرحلة 2: تحميل الصورة من البوكت المصدر`);
    console.log(`📥 تحميل الصورة من ${SOURCE_BUCKET}...`);
    
    const { data: imageData, error: downloadError } = await supabase.storage
      .from(SOURCE_BUCKET)
      .download(FILE_NAME);
    
    if (downloadError) {
      console.error(`❌ خطأ في تحميل الصورة:`, downloadError);
      return;
    }
    
    console.log(`✅ تم تحميل الصورة بنجاح`);
    
    // المرحلة 3: رفع الصورة إلى البوكت الهدف
    console.log(`\n📋 المرحلة 3: رفع الصورة إلى البوكت الهدف`);
    console.log(`📤 رفع الصورة إلى ${TARGET_BUCKET}...`);
    
    const { error: uploadError } = await supabase.storage
      .from(TARGET_BUCKET)
      .upload(FILE_NAME, imageData, { upsert: true });
    
    if (uploadError) {
      console.error(`❌ خطأ في رفع الصورة:`, uploadError);
      return;
    }
    
    console.log(`✅ تم رفع الصورة إلى ${TARGET_BUCKET} بنجاح`);
    
    // المرحلة 4: الحصول على الرابط الجديد
    console.log(`\n📋 المرحلة 4: الحصول على الرابط الجديد`);
    
    const { data: newUrl } = supabase.storage
      .from(TARGET_BUCKET)
      .getPublicUrl(FILE_NAME);
    
    console.log(`🔗 الرابط الجديد: ${newUrl.publicUrl}`);
    
    // المرحلة 5: تحديث قاعدة البيانات Firebase
    console.log(`\n📋 المرحلة 5: تحديث قاعدة البيانات Firebase`);
    console.log(`🔍 البحث عن اللاعب في قاعدة البيانات...`);
    
    const playerRef = doc(db, 'players', PLAYER_ID);
    const playerSnap = await getDoc(playerRef);
    
    if (!playerSnap.exists()) {
      console.error(`❌ لم يتم العثور على اللاعب ${PLAYER_ID} في قاعدة البيانات`);
      return;
    }
    
    const playerData = playerSnap.data();
    console.log(`✅ تم العثور على اللاعب: ${playerData.full_name || playerData.name || 'غير محدد'}`);
    
    console.log(`🔄 تحديث مسار الصورة في قاعدة البيانات...`);
    
    const updateData = {
      profile_image_url: newUrl.publicUrl,
      updated_at: new Date()
    };
    
    // إضافة profile_image إذا لم يكن موجوداً
    if (!playerData.profile_image) {
      updateData.profile_image = newUrl.publicUrl;
    }
    
    await updateDoc(playerRef, updateData);
    console.log(`✅ تم تحديث قاعدة البيانات بنجاح`);
    
    // المرحلة 6: حذف الصورة من البوكت المصدر
    console.log(`\n📋 المرحلة 6: حذف الصورة من البوكت المصدر`);
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
    
    // المرحلة 7: التحقق النهائي
    console.log(`\n📋 المرحلة 7: التحقق النهائي`);
    
    const finalSnap = await getDoc(playerRef);
    const finalData = finalSnap.data();
    
    console.log(`📋 البيانات النهائية:`);
    console.log(`   - profile_image_url: ${finalData.profile_image_url}`);
    console.log(`   - profile_image: ${finalData.profile_image || 'غير محدد'}`);
    console.log(`   - updated_at: ${finalData.updated_at}`);
    
    console.log(`\n🎉 تم إصلاح صورة اللاعب ${PLAYER_NAME} بنجاح!`);
    console.log(`📋 ملخص العملية:`);
    console.log(`   - البوكت المصدر: ${SOURCE_BUCKET}`);
    console.log(`   - البوكت الهدف: ${TARGET_BUCKET}`);
    console.log(`   - الرابط الجديد: ${newUrl.publicUrl}`);
    console.log(`   - قاعدة البيانات: تم التحديث`);
    
  } catch (error) {
    console.error('❌ خطأ في الإصلاح الشامل:', error);
  }
}

// تشغيل السكريبت
completeImageFix();
