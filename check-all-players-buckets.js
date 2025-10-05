// سكريبت شامل لفحص وإصلاح جميع اللاعبين الذين يخزنون الوسائط في buckets خاطئة
// يفحص جميع أنواع اللاعبين (مستقلين، تابعين للمدربين، الأندية، الأكاديميات، الوكلاء)

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

// تعريف البوكتات الصحيحة لكل نوع لاعب
const CORRECT_BUCKETS = {
  independent: 'avatars',
  trainer: 'playertrainer',
  club: 'playerclub',
  agent: 'playeragent',
  academy: 'playeracademy'
};

// جميع البوكتات المتاحة
const ALL_BUCKETS = ['avatars', 'playertrainer', 'playerclub', 'playeracademy', 'playeragent'];

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

// دالة للحصول على البوكت الصحيح لنوع اللاعب
function getCorrectBucket(accountType) {
  return CORRECT_BUCKETS[accountType] || 'avatars';
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

// دالة للتحقق من وجود فيديو في bucket معين
async function checkVideoInBucket(playerId, bucketName) {
  const extensions = ['mp4', 'mov', 'avi', 'webm'];
  
  for (const ext of extensions) {
    const fileName = `${playerId}.${ext}`;
    
    try {
      const { data } = await supabase.storage
        .from(bucketName)
        .getPublicUrl(fileName);
      
      if (data?.publicUrl) {
        // التحقق من أن الفيديو موجود فعلاً
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

// دالة لنقل صورة من bucket إلى bucket صحيح
async function moveImageToCorrectBucket(playerId, sourceBucket, targetBucket, fileName) {
  try {
    console.log(`🔄 نقل صورة ${fileName} من ${sourceBucket} إلى ${targetBucket}`);
    
    // تحميل الصورة من البوكت المصدر
    const { data: downloadData, error: downloadError } = await supabase.storage
      .from(sourceBucket)
      .download(fileName);
    
    if (downloadError) {
      console.error(`❌ خطأ في تحميل الصورة من ${sourceBucket}:`, downloadError);
      return { success: false, error: downloadError };
    }
    
    // رفع الصورة إلى البوكت الهدف
    const { error: uploadError } = await supabase.storage
      .from(targetBucket)
      .upload(fileName, downloadData, { upsert: true });
    
    if (uploadError) {
      console.error(`❌ خطأ في رفع الصورة إلى ${targetBucket}:`, uploadError);
      return { success: false, error: uploadError };
    }
    
    // الحصول على الرابط الجديد
    const { data: newUrl } = supabase.storage
      .from(targetBucket)
      .getPublicUrl(fileName);
    
    // حذف الصورة من البوكت المصدر
    const { error: deleteError } = await supabase.storage
      .from(sourceBucket)
      .remove([fileName]);
    
    if (deleteError) {
      console.error(`❌ خطأ في حذف الصورة من ${sourceBucket}:`, deleteError);
      // لا نعيد false هنا لأن الصورة تم نقلها بنجاح
    }
    
    console.log(`✅ تم نقل الصورة بنجاح من ${sourceBucket} إلى ${targetBucket}`);
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

// الدالة الرئيسية لفحص جميع اللاعبين
async function checkAllPlayersBuckets() {
  console.log('🔍 فحص جميع اللاعبين الذين يخزنون الوسائط في buckets خاطئة...\n');
  
  const results = {
    total: 0,
    byAccountType: {
      independent: { total: 0, correct: 0, wrong: 0, noImage: 0 },
      trainer: { total: 0, correct: 0, wrong: 0, noImage: 0 },
      club: { total: 0, correct: 0, wrong: 0, noImage: 0 },
      agent: { total: 0, correct: 0, wrong: 0, noImage: 0 },
      academy: { total: 0, correct: 0, wrong: 0, noImage: 0 }
    },
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
    
    results.total = players.length;
    console.log(`📊 تم العثور على ${players.length} لاعب في قاعدة البيانات\n`);
    
    // فحص كل لاعب
    console.log('🔍 فحص جميع اللاعبين...\n');
    
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const accountType = getPlayerAccountType(player);
      const correctBucket = getCorrectBucket(accountType);
      
      console.log(`[${i + 1}/${players.length}] فحص اللاعب: ${player.full_name || player.name || player.id}`);
      console.log(`   نوع الحساب: ${accountType}`);
      console.log(`   البوكت الصحيح: ${correctBucket}`);
      
      // تحديث إحصائيات نوع الحساب
      results.byAccountType[accountType].total++;
      
      // البحث عن الصورة في جميع البوكتات
      let foundInCorrectBucket = false;
      let foundInWrongBucket = false;
      let imageInfo = null;
      
      for (const bucket of ALL_BUCKETS) {
        const imageCheck = await checkImageInBucket(player.id, bucket);
        if (imageCheck.exists) {
          if (bucket === correctBucket) {
            console.log(`   ✅ الصورة في البوكت الصحيح: ${bucket}`);
            foundInCorrectBucket = true;
            results.byAccountType[accountType].correct++;
          } else {
            console.log(`   ❌ الصورة في البوكت الخطأ: ${bucket} (يجب أن تكون في ${correctBucket})`);
            foundInWrongBucket = true;
            imageInfo = imageCheck;
            results.byAccountType[accountType].wrong++;
          }
          break;
        }
      }
      
      if (!foundInCorrectBucket && !foundInWrongBucket) {
        console.log(`   ⚪ لا توجد صورة للاعب`);
        results.byAccountType[accountType].noImage++;
      }
      
      if (foundInWrongBucket) {
        results.wrongBucketPlayers.push({
          player: player,
          accountType: accountType,
          correctBucket: correctBucket,
          wrongBucket: imageInfo.bucket,
          imageInfo: imageInfo
        });
      }
      
      results.details.push({
        playerId: player.id,
        playerName: player.full_name || player.name || 'غير محدد',
        accountType: accountType,
        correctBucket: correctBucket,
        hasImage: foundInCorrectBucket || foundInWrongBucket,
        imageInCorrectBucket: foundInCorrectBucket,
        imageInWrongBucket: foundInWrongBucket,
        wrongBucket: foundInWrongBucket ? imageInfo.bucket : null
      });
      
      console.log(''); // سطر فارغ للفصل
    }
    
    // عرض التقرير النهائي
    console.log('\n' + '='.repeat(80));
    console.log('📋 تقرير فحص جميع اللاعبين');
    console.log('='.repeat(80));
    
    console.log(`\n📊 الإحصائيات العامة:`);
    console.log(`   - إجمالي اللاعبين: ${results.total}`);
    
    let totalCorrect = 0, totalWrong = 0, totalNoImage = 0;
    
    console.log(`\n📊 الإحصائيات حسب نوع الحساب:`);
    Object.entries(results.byAccountType).forEach(([accountType, stats]) => {
      if (stats.total > 0) {
        console.log(`\n   ${accountType.toUpperCase()}:`);
        console.log(`     - إجمالي: ${stats.total}`);
        console.log(`     - في البوكت الصحيح: ${stats.correct}`);
        console.log(`     - في بوكت خاطئ: ${stats.wrong}`);
        console.log(`     - بدون صور: ${stats.noImage}`);
        console.log(`     - البوكت الصحيح: ${CORRECT_BUCKETS[accountType]}`);
        
        totalCorrect += stats.correct;
        totalWrong += stats.wrong;
        totalNoImage += stats.noImage;
      }
    });
    
    console.log(`\n📊 الإجمالي العام:`);
    console.log(`   - في البوكتات الصحيحة: ${totalCorrect}`);
    console.log(`   - في بوكتات خاطئة: ${totalWrong}`);
    console.log(`   - بدون صور: ${totalNoImage}`);
    
    if (results.wrongBucketPlayers.length > 0) {
      console.log(`\n❌ اللاعبين الذين لديهم صور في بوكتات خاطئة (${results.wrongBucketPlayers.length}):`);
      
      // تجميع حسب نوع الحساب
      const groupedByType = {};
      results.wrongBucketPlayers.forEach(item => {
        if (!groupedByType[item.accountType]) {
          groupedByType[item.accountType] = [];
        }
        groupedByType[item.accountType].push(item);
      });
      
      Object.entries(groupedByType).forEach(([accountType, players]) => {
        console.log(`\n   ${accountType.toUpperCase()} (${players.length} لاعب):`);
        players.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.player.full_name || item.player.name || item.player.id}`);
          console.log(`      البوكت الحالي: ${item.wrongBucket}`);
          console.log(`      البوكت الصحيح: ${item.correctBucket}`);
          console.log(`      رابط الصورة: ${item.imageInfo.url}`);
        });
      });
      
      console.log('\n🔧 لتنفيذ الإصلاح، قم بتشغيل:');
      console.log('node check-all-players-buckets.js --execute');
    } else {
      console.log('\n🎉 ممتاز! جميع اللاعبين لديهم صور في البوكتات الصحيحة.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ خطأ في فحص اللاعبين:', error);
    return results;
  }
}

// دالة لتنفيذ الإصلاح الفعلي
async function executeAllPlayersFix() {
  console.log('🚀 بدء إصلاح جميع اللاعبين الذين لديهم صور في بوكتات خاطئة...\n');
  
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    byAccountType: {
      independent: { total: 0, successful: 0, failed: 0 },
      trainer: { total: 0, successful: 0, failed: 0 },
      club: { total: 0, successful: 0, failed: 0 },
      agent: { total: 0, successful: 0, failed: 0 },
      academy: { total: 0, successful: 0, failed: 0 }
    },
    details: []
  };
  
  try {
    // جلب جميع اللاعبين
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players = [];
    
    playersSnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    
    const wrongBucketPlayers = [];
    
    // تحديد اللاعبين الذين يحتاجون إصلاح
    console.log('🔍 تحديد اللاعبين الذين يحتاجون إصلاح...');
    
    for (const player of players) {
      const accountType = getPlayerAccountType(player);
      const correctBucket = getCorrectBucket(accountType);
      
      for (const bucket of ALL_BUCKETS) {
        const imageCheck = await checkImageInBucket(player.id, bucket);
        if (imageCheck.exists && bucket !== correctBucket) {
          wrongBucketPlayers.push({
            player: player,
            accountType: accountType,
            correctBucket: correctBucket,
            wrongBucket: bucket,
            imageInfo: imageCheck
          });
          break;
        }
      }
    }
    
    results.total = wrongBucketPlayers.length;
    console.log(`📊 تم العثور على ${wrongBucketPlayers.length} لاعب يحتاج إصلاح\n`);
    
    if (wrongBucketPlayers.length === 0) {
      console.log('🎉 لا توجد صور في بوكتات خاطئة!');
      return results;
    }
    
    // نقل الصور
    for (let i = 0; i < wrongBucketPlayers.length; i++) {
      const item = wrongBucketPlayers[i];
      const player = item.player;
      const accountType = item.accountType;
      
      console.log(`[${i + 1}/${wrongBucketPlayers.length}] إصلاح اللاعب: ${player.full_name || player.name || player.id}`);
      console.log(`   نوع الحساب: ${accountType}`);
      console.log(`   نقل من: ${item.wrongBucket} إلى: ${item.correctBucket}`);
      
      results.byAccountType[accountType].total++;
      
      try {
        // نقل الصورة
        const moveResult = await moveImageToCorrectBucket(
          player.id,
          item.wrongBucket,
          item.correctBucket,
          item.imageInfo.fileName
        );
        
        if (moveResult.success) {
          // تحديث قاعدة البيانات
          const updateResult = await updateImagePathInDatabase(player.id, moveResult.newUrl);
          
          if (updateResult.success) {
            console.log(`   ✅ تم الإصلاح بنجاح`);
            results.successful++;
            results.byAccountType[accountType].successful++;
            results.details.push({
              playerId: player.id,
              playerName: player.full_name || player.name || 'غير محدد',
              accountType: accountType,
              success: true,
              oldBucket: item.wrongBucket,
              newBucket: item.correctBucket,
              newUrl: moveResult.newUrl
            });
          } else {
            console.log(`   ⚠️ تم نقل الصورة لكن فشل تحديث قاعدة البيانات`);
            results.failed++;
            results.byAccountType[accountType].failed++;
            results.details.push({
              playerId: player.id,
              playerName: player.full_name || player.name || 'غير محدد',
              accountType: accountType,
              success: false,
              error: 'Database update failed',
              oldBucket: item.wrongBucket,
              newBucket: item.correctBucket
            });
          }
        } else {
          console.log(`   ❌ فشل نقل الصورة: ${moveResult.error}`);
          results.failed++;
          results.byAccountType[accountType].failed++;
          results.details.push({
            playerId: player.id,
            playerName: player.full_name || player.name || 'غير محدد',
            accountType: accountType,
            success: false,
            error: moveResult.error,
            oldBucket: item.wrongBucket,
            newBucket: item.correctBucket
          });
        }
      } catch (error) {
        console.log(`   ❌ خطأ في الإصلاح: ${error.message}`);
        results.failed++;
        results.byAccountType[accountType].failed++;
        results.details.push({
          playerId: player.id,
          playerName: player.full_name || player.name || 'غير محدد',
          accountType: accountType,
          success: false,
          error: error.message,
          oldBucket: item.wrongBucket,
          newBucket: item.correctBucket
        });
      }
      
      console.log(''); // سطر فارغ للفصل
    }
    
    console.log(`\n📋 ملخص النتائج:`);
    console.log(`   - إجمالي اللاعبين: ${results.total}`);
    console.log(`   - تم إصلاحهم بنجاح: ${results.successful}`);
    console.log(`   - فشل الإصلاح: ${results.failed}`);
    
    console.log(`\n📊 النتائج حسب نوع الحساب:`);
    Object.entries(results.byAccountType).forEach(([accountType, stats]) => {
      if (stats.total > 0) {
        console.log(`   ${accountType.toUpperCase()}: ${stats.successful}/${stats.total} نجح`);
      }
    });
    
    if (results.successful > 0) {
      console.log(`\n✅ تم إصلاح ${results.successful} لاعب بنجاح!`);
    }
    
    if (results.failed > 0) {
      console.log(`\n❌ فشل إصلاح ${results.failed} لاعب. راجع السجلات أعلاه.`);
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ خطأ في تنفيذ الإصلاح:', error);
    return results;
  }
}

// تشغيل السكريبت
if (process.argv.includes('--execute')) {
  executeAllPlayersFix();
} else {
  checkAllPlayersBuckets();
}




