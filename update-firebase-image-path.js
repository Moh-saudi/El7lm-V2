// سكريبت لتحديث مسار الصورة في قاعدة البيانات Firebase
// للاعب Hussam Alomari بعد نقل الصورة إلى البوكت الصحيح

const { initializeApp } = require('firebase/app');
const { getFirestore, doc, updateDoc, getDoc } = require('firebase/firestore');

// إعدادات Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBvOkBwJ1Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4Z4",
  authDomain: "el7lm25.firebaseapp.com",
  projectId: "el7lm25",
  storageBucket: "el7lm25.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456789"
};

// تهيئة Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// بيانات اللاعب
const PLAYER_ID = '9Kdp3IhbyKPAozGUKdPLxEEtkME3';
const PLAYER_NAME = 'Hussam Alomari';
const NEW_IMAGE_URL = 'https://ekyerljzfokqimbabzxm.supabase.co/storage/v1/object/public/avatars/9Kdp3IhbyKPAozGUKdPLxEEtkME3.jpeg';

async function updatePlayerImagePath() {
  console.log(`🚀 بدء تحديث مسار الصورة للاعب ${PLAYER_NAME}...\n`);
  
  try {
    // 1. التحقق من وجود اللاعب في قاعدة البيانات
    console.log(`🔍 البحث عن اللاعب في قاعدة البيانات...`);
    
    const playerRef = doc(db, 'players', PLAYER_ID);
    const playerSnap = await getDoc(playerRef);
    
    if (!playerSnap.exists()) {
      console.error(`❌ لم يتم العثور على اللاعب ${PLAYER_ID} في قاعدة البيانات`);
      return;
    }
    
    const playerData = playerSnap.data();
    console.log(`✅ تم العثور على اللاعب: ${playerData.full_name || playerData.name || 'غير محدد'}`);
    console.log(`📋 البيانات الحالية:`);
    console.log(`   - profile_image_url: ${playerData.profile_image_url || 'غير محدد'}`);
    console.log(`   - profile_image: ${playerData.profile_image || 'غير محدد'}`);
    
    // 2. تحديث مسار الصورة
    console.log(`\n🔄 تحديث مسار الصورة...`);
    
    const updateData = {
      profile_image_url: NEW_IMAGE_URL,
      updated_at: new Date()
    };
    
    // إضافة profile_image إذا لم يكن موجوداً
    if (!playerData.profile_image) {
      updateData.profile_image = NEW_IMAGE_URL;
    }
    
    await updateDoc(playerRef, updateData);
    
    console.log(`✅ تم تحديث مسار الصورة بنجاح`);
    console.log(`🔗 الرابط الجديد: ${NEW_IMAGE_URL}`);
    
    // 3. التحقق من التحديث
    console.log(`\n🔍 التحقق من التحديث...`);
    
    const updatedSnap = await getDoc(playerRef);
    const updatedData = updatedSnap.data();
    
    console.log(`📋 البيانات المحدثة:`);
    console.log(`   - profile_image_url: ${updatedData.profile_image_url}`);
    console.log(`   - profile_image: ${updatedData.profile_image || 'غير محدد'}`);
    console.log(`   - updated_at: ${updatedData.updated_at}`);
    
    console.log(`\n🎉 تم تحديث مسار الصورة للاعب ${PLAYER_NAME} بنجاح!`);
    
  } catch (error) {
    console.error('❌ خطأ في تحديث مسار الصورة:', error);
  }
}

// تشغيل السكريبت
updatePlayerImagePath();
