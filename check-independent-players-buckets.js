// سكريبت لفحص وإصلاح صور اللاعبين المستقلين الذين يخزنون الصور في bucket خاطئ
// يفحص فقط اللاعبين المستقلين وينقل صورهم إلى bucket avatars الصحيح

const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs, doc, updateDoc, getDoc } = require('firebase/firestore');

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

// دالة للتحقق من وجود صورة في bucket معين
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

// دالة لنقل صورة من bucket إلى bucket avatars
async function moveImageToAvatarsBucket(playerId, sourceBucket, fileName) {
  try {
    console.log(`🔄 نقل صورة ${fileName} من ${sourceBucket} إلى avatars`);
    
    // تحميل الصورة من البوكت المصدر
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(sourceBucket)
      .download(fileName);
    
    if (downloadError) {
      console.error(`❌ خطأ في تحميل الصورة من ${sourceBucket}:`, downloadError);
      return { success: false, error: downloadError };
    }
    
    // رفع الصورة إلى bucket avatars
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(fileName, downloadData, { upsert: true });
    
    if (uploadError) {
      console.error(`❌ خطأ في رفع الصورة إلى avatars:`, uploadError);
      return { success: false, error: uploadError };
    }
    
    // الحصول على الرابط الجديد
    const { data: newUrl } = supabase.storage
      .from('avatars')
      .getPublicUrl(fileName);
    
    // حذف الصورة من البوكت المصدر
    const { error: deleteError } = await supabase.storage
      .from(sourceBucket)
      .remove([fileName]);
    
    if (deleteError) {
      console.error(`❌ خطأ في حذف الصورة من ${sourceBucket}:`, deleteError);
      // لا نعيد false هنا لأن الصورة تم نقلها بنجاح
    }
    
    console.log(`✅ تم نقل الصورة بنجاح من ${sourceBucket} إلى avatars`);
    return { 
      success: true, 
      newUrl: newUrl.publicUrl,
      deleteError: deleteError 
    };
    
  } catch (error) {
    console.error(`❌ خطأ في نقل الصورة:`, error);
    return { success: false, error: error };
  }
}

// دالة لتحديث مسار الصورة في قاعدة البيانات
async function updateImagePathInDatabase(playerId, newUrl) {
  try {
    const playerRef = doc(db, 'players', playerId);
    const playerSnap = await getDoc(playerRef);
    
    if (!playerSnap.exists()) {
      return { success: false, error: 'Player not found in database' };
    }
    
    const playerData = playerSnap.data();
    
    const updateData = {
      profile_image_url: newUrl,
      updated_at: new Date()
    };
    
    // إضافة profile_image إذا لم يكن موجوداً
    if (!playerData.profile_image) {
      updateData.profile_image = newUrl;
    }
    
    await updateDoc(playerRef, updateData);
    
    console.log(`✅ تم تحديث قاعدة البيانات للاعب ${playerId}`);
    return { success: true };
    
  } catch (error) {
    console.error(`❌ خطأ في تحديث قاعدة البيانات للاعب ${playerId}:`, error);
    return { success: false, error: error };
  }
}

// الدالة الرئيسية لفحص اللاعبين المستقلين
async function checkIndependentPlayers() {
  console.log('🔍 فحص اللاعبين المستقلين الذين يخزنون الصور في bucket خاطئ...\n');
  
  const results = {
    totalIndependent: 0,
    correctBucket: 0,
    wrongBucket: 0,
    noImage: 0,
    wrongBucketPlayers: [],
    details: []
  };
  
  try {
    // جلب جميع اللاعبين من Firebase
    console.log('📥 جلب جميع اللاعبين من قاعدة البيانات...');
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players = [];
    
    playersSnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 تم العثور على ${players.length} لاعب في قاعدة البيانات\n`);
    
    // تصفية اللاعبين المستقلين فقط
    const independentPlayers = players.filter(player => {
      const accountType = getPlayerAccountType(player);
      return accountType === 'independent';
    });
    
    results.totalIndependent = independentPlayers.length;
    console.log(`🎯 تم العثور على ${independentPlayers.length} لاعب مستقل\n`);
    
    const wrongBuckets = ['playertrainer', 'playerclub', 'playeracademy', 'playeragent'];
    
    // فحص كل لاعب مستقل
    console.log('🔍 فحص اللاعبين المستقلين...\n');
    
    for (let i = 0; i < independentPlayers.length; i++) {
      const player = independentPlayers[i];
      
      console.log(`[${i + 1}/${independentPlayers.length}] فحص اللاعب: ${player.full_name || player.name || player.id}`);
      
      // التحقق من وجود الصورة في bucket avatars (الصحيح)
      const correctImageCheck = await checkImageInBucket(player.id, 'avatars');
      
      if (correctImageCheck.exists) {
        console.log(`   ✅ الصورة في البوكت الصحيح: avatars`);
        results.correctBucket++;
      } else {
        // البحث في البوكتات الخطأ
        let foundInWrongBucket = false;
        let wrongImageInfo = null;
        
        for (const bucket of wrongBuckets) {
          const imageCheck = await checkImageInBucket(player.id, bucket);
          if (imageCheck.exists) {
            console.log(`   ❌ الصورة في البوكت الخطأ: ${bucket} (يجب أن تكون في avatars)`);
            foundInWrongBucket = true;
            wrongImageInfo = imageCheck;
            results.wrongBucket++;
            break;
          }
        }
        
        if (!foundInWrongBucket) {
          console.log(`   ⚪ لا توجد صورة للاعب`);
          results.noImage++;
        } else {
          results.wrongBucketPlayers.push({
            player: player,
            wrongBucket: wrongImageInfo.bucket,
            imageInfo: wrongImageInfo
          });
        }
      }
      
      results.details.push({
        playerId: player.id,
        playerName: player.full_name || player.name || 'غير محدد',
        hasImageInCorrectBucket: correctImageCheck.exists,
        hasImageInWrongBucket: results.wrongBucketPlayers.some(wp => wp.player.id === player.id),
        wrongBucket: results.wrongBucketPlayers.find(wp => wp.player.id === player.id)?.wrongBucket || null
      });
      
      console.log(''); // سطر فارغ للفصل
    }
    
    // عرض التقرير النهائي
    console.log('\n' + '='.repeat(60));
    console.log('📋 تقرير فحص اللاعبين المستقلين');
    console.log('='.repeat(60));
    
    console.log(`\n📊 الإحصائيات:`);
    console.log(`   - إجمالي اللاعبين المستقلين: ${results.totalIndependent}`);
    console.log(`   - لديهم صور في البوكت الصحيح (avatars): ${results.correctBucket}`);
    console.log(`   - لديهم صور في بوكتات خطأ: ${results.wrongBucket}`);
    console.log(`   - بدون صور: ${results.noImage}`);
    
    if (results.wrongBucketPlayers.length > 0) {
      console.log(`\n❌ اللاعبين المستقلين الذين لديهم صور في بوكتات خطأ (${results.wrongBucketPlayers.length}):`);
      results.wrongBucketPlayers.forEach((item, index) => {
        console.log(`${index + 1}. ${item.player.full_name || item.player.name || item.player.id}`);
        console.log(`   البوكت الحالي: ${item.wrongBucket}`);
        console.log(`   البوكت الصحيح: avatars`);
        console.log(`   رابط الصورة: ${item.imageInfo.url}`);
        console.log('');
      });
      
      console.log('🔧 لتنفيذ الإصلاح، قم بتشغيل:');
      console.log('node check-independent-players-buckets.js --execute');
    } else {
      console.log('\n🎉 ممتاز! جميع اللاعبين المستقلين لديهم صور في البوكت الصحيح (avatars).');
    }
    
    if (results.noImage > 0) {
      console.log(`\n⚪ اللاعبين المستقلين بدون صور (${results.noImage}):`);
      const noImagePlayers = results.details.filter(d => !d.hasImageInCorrectBucket && !d.hasImageInWrongBucket);
      noImagePlayers.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.playerName}`);
      });
      
      if (noImagePlayers.length > 10) {
        console.log(`   ... و ${noImagePlayers.length - 10} لاعب آخر`);
      }
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ خطأ في فحص اللاعبين المستقلين:', error);
    return results;
  }
}

// دالة لتنفيذ الإصلاح الفعلي
async function executeIndependentPlayersFix() {
  console.log('🚀 بدء إصلاح صور اللاعبين المستقلين...\n');
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    details: []
  };
  
  try {
    // جلب جميع اللاعبين
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players = [];
    
    playersSnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    
    // تصفية اللاعبين المستقلين فقط
    const independentPlayers = players.filter(player => {
      const accountType = getPlayerAccountType(player);
      return accountType === 'independent';
    });
    
    const wrongBuckets = ['playertrainer', 'playerclub', 'playeracademy', 'playeragent'];
    const wrongBucketPlayers = [];
    
    // تحديد اللاعبين الذين يحتاجون إصلاح
    console.log('🔍 تحديد اللاعبين المستقلين الذين يحتاجون إصلاح...');
    
    for (const player of independentPlayers) {
      // التحقق من وجود الصورة في bucket avatars
      const correctImageCheck = await checkImageInBucket(player.id, 'avatars');
      
      if (!correctImageCheck.exists) {
        // البحث في البوكتات الخطأ
        for (const bucket of wrongBuckets) {
          const imageCheck = await checkImageInBucket(player.id, bucket);
          if (imageCheck.exists) {
            wrongBucketPlayers.push({
              player: player,
              wrongBucket: bucket,
              imageInfo: imageCheck
            });
            break;
          }
        }
      }
    }
    
    results.total = wrongBucketPlayers.length;
    console.log(`📊 تم العثور على ${wrongBucketPlayers.length} لاعب مستقل يحتاج إصلاح\n`);
    
    if (wrongBucketPlayers.length === 0) {
      console.log('🎉 لا توجد صور في بوكتات خطأ! جميع اللاعبين المستقلين لديهم صور في البوكت الصحيح.');
      return results;
    }
    
    // نقل الصور
    for (let i = 0; i < wrongBucketPlayers.length; i++) {
      const item = wrongBucketPlayers[i];
      const player = item.player;
      
      console.log(`[${i + 1}/${wrongBucketPlayers.length}] إصلاح اللاعب: ${player.full_name || player.name || player.id}`);
      console.log(`   نقل من: ${item.wrongBucket} إلى: avatars`);
      
      try {
        // نقل الصورة
        const moveResult = await moveImageToAvatarsBucket(
          player.id,
          item.wrongBucket,
          item.imageInfo.fileName
        );
        
        if (moveResult.success) {
          // تحديث قاعدة البيانات
          const updateResult = await updateImagePathInDatabase(player.id, moveResult.newUrl);
          
          if (updateResult.success) {
            console.log(`   ✅ تم الإصلاح بنجاح`);
            results.successful++;
            results.details.push({
              playerId: player.id,
              playerName: player.full_name || player.name || 'غير محدد',
              success: true,
              oldBucket: item.wrongBucket,
              newBucket: 'avatars',
              newUrl: moveResult.newUrl
            });
          } else {
            console.log(`   ⚠️ تم نقل الصورة لكن فشل تحديث قاعدة البيانات`);
            results.failed++;
            results.details.push({
              playerId: player.id,
              playerName: player.full_name || player.name || 'غير محدد',
              success: false,
              error: 'Database update failed',
              oldBucket: item.wrongBucket,
              newBucket: 'avatars'
            });
          }
        } else {
          console.log(`   ❌ فشل نقل الصورة: ${moveResult.error}`);
          results.failed++;
          results.details.push({
            playerId: player.id,
            playerName: player.full_name || player.name || 'غير محدد',
            success: false,
            error: moveResult.error,
            oldBucket: item.wrongBucket,
            newBucket: 'avatars'
          });
        }
      } catch (error) {
        console.log(`   ❌ خطأ في الإصلاح: ${error.message}`);
        results.failed++;
        results.details.push({
          playerId: player.id,
          playerName: player.full_name || player.name || 'غير محدد',
          success: false,
          error: error.message,
          oldBucket: item.wrongBucket,
          newBucket: 'avatars'
        });
      }
      
      console.log(''); // سطر فارغ للفصل
    }
    
    console.log(`\n📋 ملخص النتائج:`);
    console.log(`   - إجمالي اللاعبين المستقلين: ${results.total}`);
    console.log(`   - تم إصلاحهم بنجاح: ${results.successful}`);
    console.log(`   - فشل الإصلاح: ${results.failed}`);
    
    if (results.successful > 0) {
      console.log(`\n✅ تم إصلاح ${results.successful} لاعب مستقل بنجاح!`);
    }
    
    if (results.failed > 0) {
      console.log(`\n❌ فشل إصلاح ${results.failed} لاعب مستقل. راجع السجلات أعلاه.`);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ خطأ في تنفيذ الإصلاح:', error);
    return results;
  }
}

// تشغيل السكريبت
if (process.argv.includes('--execute')) {
  executeIndependentPlayersFix();
} else {
  checkIndependentPlayers();
}




