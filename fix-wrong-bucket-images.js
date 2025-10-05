// سكريبت لإصلاح صور اللاعبين المستقلين المحفوظة في بوكتات خطأ
// هذا السكريبت يحدد اللاعبين المستقلين وينقل صورهم إلى البوكت الصحيح

const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc } = require('firebase/firestore');

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

// دالة لتحديد نوع الحساب من بيانات اللاعب
function getPlayerAccountType(playerData) {
  if (playerData.trainer_id || playerData.trainerId) {
    return 'trainer';
  }
  if (playerData.club_id || playerData.clubId) {
    return 'club';
  }
  if (playerData.agent_id || playerData.agentId) {
    return 'agent';
  }
  if (playerData.academy_id || playerData.academyId) {
    return 'academy';
  }
  return 'independent'; // اللاعبين المستقلين
}

// دالة لتحديد البوكت الصحيح
function getCorrectBucket(accountType) {
  switch (accountType) {
    case 'trainer':
      return 'playertrainer';
    case 'club':
      return 'playerclub';
    case 'agent':
      return 'playeragent';
    case 'academy':
      return 'playeracademy';
    case 'independent':
    default:
      return 'avatars';
  }
}

// دالة للتحقق من وجود صورة في بوكت معين
async function checkImageInBucket(playerId, bucketName) {
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  for (const ext of extensions) {
    const fileName = `${playerId}.${ext}`;
    
    try {
      const { data } = await supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      if (data?.publicUrl) {
        // التحقق من أن الصورة موجودة فعلاً
        const response = await fetch(data.publicUrl, { method: 'HEAD' });
        if (response.ok) {
          return {
            exists: true,
            fileName: fileName,
            url: data.publicUrl,
            bucket: bucketName
          };
        }
      }
    } catch (error) {
      continue;
    }
  }
  
  return { exists: false };
}

// دالة لنقل صورة من بوكت إلى آخر
async function moveImageToCorrectBucket(playerId, sourceBucket, targetBucket, fileName) {
  try {
    console.log(`🔄 نقل صورة ${fileName} من ${sourceBucket} إلى ${targetBucket}`);
    
    // تحميل الصورة من البوكت المصدر
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(sourceBucket)
      .download(fileName);
    
    if (downloadError) {
      console.error(`❌ خطأ في تحميل الصورة من ${sourceBucket}:`, downloadError);
      return false;
    }
    
    // رفع الصورة إلى البوكت الهدف
    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(fileName, downloadData, { upsert: true });
    
    if (uploadError) {
      console.error(`❌ خطأ في رفع الصورة إلى ${targetBucket}:`, uploadError);
      return false;
    }
    
    // حذف الصورة من البوكت المصدر
    const { error: deleteError } = await supabase.storage
      .from(sourceBucket)
      .remove([fileName]);
    
    if (deleteError) {
      console.error(`❌ خطأ في حذف الصورة من ${sourceBucket}:`, deleteError);
      // لا نعيد false هنا لأن الصورة تم نقلها بنجاح
    }
    
    console.log(`✅ تم نقل الصورة بنجاح من ${sourceBucket} إلى ${targetBucket}`);
    return true;
    
  } catch (error) {
    console.error(`❌ خطأ في نقل الصورة:`, error);
    return false;
  }
}

// دالة لتحديث مسار الصورة في قاعدة البيانات
async function updateImagePathInDatabase(playerId, newUrl) {
  try {
    // البحث في مجموعة players
    const playerRef = doc(db, 'players', playerId);
    await updateDoc(playerRef, {
      profile_image_url: newUrl,
      updated_at: new Date()
    });
    
    console.log(`✅ تم تحديث مسار الصورة في قاعدة البيانات للاعب ${playerId}`);
    return true;
  } catch (error) {
    console.error(`❌ خطأ في تحديث قاعدة البيانات للاعب ${playerId}:`, error);
    return false;
  }
}

// الدالة الرئيسية لإصلاح الصور
async function fixWrongBucketImages() {
  console.log('🚀 بدء إصلاح صور اللاعبين المستقلين...\n');
  
  try {
    // جلب جميع اللاعبين من Firebase
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players = [];
    
    playersSnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 تم العثور على ${players.length} لاعب في قاعدة البيانات\n`);
    
    const wrongBucketPlayers = [];
    const allBuckets = ['avatars', 'playerclub', 'playeracademy', 'playertrainer', 'playeragent'];
    
    // فحص كل لاعب
    for (const player of players) {
      const accountType = getPlayerAccountType(player);
      const correctBucket = getCorrectBucket(accountType);
      
      console.log(`🔍 فحص اللاعب: ${player.full_name || player.name || player.id}`);
      console.log(`   نوع الحساب: ${accountType}`);
      console.log(`   البوكت الصحيح: ${correctBucket}`);
      
      // البحث عن الصورة في جميع البوكتات
      let foundInWrongBucket = false;
      let imageInfo = null;
      
      for (const bucket of allBuckets) {
        const imageCheck = await checkImageInBucket(player.id, bucket);
        if (imageCheck.exists) {
          if (bucket === correctBucket) {
            console.log(`   ✅ الصورة في البوكت الصحيح: ${bucket}`);
          } else {
            console.log(`   ❌ الصورة في البوكت الخطأ: ${bucket} (يجب أن تكون في ${correctBucket})`);
            foundInWrongBucket = true;
            imageInfo = imageCheck;
          }
          break;
        }
      }
      
      if (foundInWrongBucket) {
        wrongBucketPlayers.push({
          player: player,
          accountType: accountType,
          correctBucket: correctBucket,
          wrongBucket: imageInfo.bucket,
          imageInfo: imageInfo
        });
      }
      
      console.log(''); // سطر فارغ للفصل
    }
    
    console.log(`\n📋 تم العثور على ${wrongBucketPlayers.length} لاعب لديهم صور في بوكتات خطأ\n`);
    
    if (wrongBucketPlayers.length === 0) {
      console.log('🎉 لا توجد صور في بوكتات خطأ!');
      return;
    }
    
    // عرض اللاعبين الذين يحتاجون إصلاح
    console.log('🔧 اللاعبين الذين يحتاجون إصلاح:');
    wrongBucketPlayers.forEach((item, index) => {
      console.log(`${index + 1}. ${item.player.full_name || item.player.name || item.player.id}`);
      console.log(`   البوكت الحالي: ${item.wrongBucket}`);
      console.log(`   البوكت الصحيح: ${item.correctBucket}`);
      console.log(`   رابط الصورة: ${item.imageInfo.url}`);
      console.log('');
    });
    
    // سؤال المستخدم إذا كان يريد المتابعة
    console.log('❓ هل تريد المتابعة ونقل الصور إلى البوكتات الصحيحة؟ (y/n)');
    
    // في بيئة Node.js، يمكن استخدام readline للحصول على إدخال المستخدم
    // لكن هنا سنعرض التعليمات فقط
    console.log('\n📝 لتنفيذ النقل، قم بتشغيل:');
    console.log('node fix-wrong-bucket-images.js --execute');
    
  } catch (error) {
    console.error('❌ خطأ في إصلاح الصور:', error);
  }
}

// دالة لتنفيذ النقل الفعلي
async function executeImageTransfer() {
  console.log('🚀 بدء نقل الصور إلى البوكتات الصحيحة...\n');
  
  // هنا يمكن إضافة الكود الفعلي للنقل
  // لكن أولاً نحتاج لتحديد اللاعبين الذين يحتاجون إصلاح
  
  console.log('⚠️ هذه الدالة تحتاج إلى تطوير أكثر لتنفيذ النقل الفعلي');
}

// تشغيل السكريبت
if (process.argv.includes('--execute')) {
  executeImageTransfer();
} else {
  fixWrongBucketImages();
}
