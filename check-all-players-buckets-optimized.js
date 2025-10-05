// سكريبت محسن لفحص وإصلاح جميع اللاعبين مع تجنب استنفاد الموارد
// يستخدم معالجة مجمعة وتأخير بين الطلبات لتجنب ERR_INSUFFICIENT_RESOURCES

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

// إعدادات التحسين
const BATCH_SIZE = 10; // عدد اللاعبين في كل دفعة
const DELAY_BETWEEN_BATCHES = 2000; // تأخير 2 ثانية بين الدفعات
const DELAY_BETWEEN_REQUESTS = 500; // تأخير 500ms بين الطلبات

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

// دالة للتأخير
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

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
  return 'independent';
}

// دالة للحصول على البوكت الصحيح لنوع اللاعب
function getCorrectBucket(accountType) {
  return CORRECT_BUCKETS[accountType] || 'avatars';
}

// دالة للتحقق من وجود صورة في bucket معين مع إعادة المحاولة
async function checkImageInBucket(playerId, bucketName, retries = 3) {
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  for (const ext of extensions) {
    const fileName = `${playerId}.${ext}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
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
        break; // إذا نجح الطلب، اخرج من حلقة إعادة المحاولة
      } catch (error) {
        if (attempt === retries) {
          console.warn(`⚠️ فشل في التحقق من ${fileName} في ${bucketName} بعد ${retries} محاولات`);
          continue; // جرب الامتداد التالي
        }
        // انتظر قبل إعادة المحاولة
        await delay(1000 * attempt);
      }
    }
  }
  
  return { exists: false };
}

// دالة لنقل صورة من bucket إلى bucket صحيح مع إعادة المحاولة
async function moveImageToCorrectBucket(playerId, sourceBucket, targetBucket, fileName, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 نقل صورة ${fileName} من ${sourceBucket} إلى ${targetBucket} (محاولة ${attempt})`);
      
      // تحميل الصورة من البوكت المصدر
      const { data: downloadData, error: downloadError } = await supabase.storage
        .from(sourceBucket)
        .download(fileName);
      
      if (downloadError) {
        throw new Error(`خطأ في تحميل الصورة: ${downloadError.message}`);
      }
      
      // رفع الصورة إلى البوكت الهدف
      const { error: uploadError } = await supabase.storage
        .from(targetBucket)
        .upload(fileName, downloadData, { upsert: true });
      
      if (uploadError) {
        throw new Error(`خطأ في رفع الصورة: ${uploadError.message}`);
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
        console.warn(`⚠️ تحذير: فشل في حذف الصورة من ${sourceBucket}: ${deleteError.message}`);
      }
      
      console.log(`✅ تم نقل الصورة بنجاح من ${sourceBucket} إلى ${targetBucket}`);
      return { 
        success: true, 
        newUrl: newUrl.publicUrl,
        deleteError: deleteError 
      };
      
    } catch (error) {
      if (attempt === retries) {
        console.error(`❌ فشل في نقل الصورة بعد ${retries} محاولات: ${error.message}`);
        return { success: false, error: error.message };
      }
      
      console.warn(`⚠️ محاولة ${attempt} فشلت، إعادة المحاولة...`);
      await delay(2000 * attempt); // تأخير متزايد
    }
  }
}

// دالة لتحديث مسار الصورة في قاعدة البيانات مع إعادة المحاولة
async function updateImagePathInDatabase(playerId, newUrl, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const playerRef = doc(db, 'players', playerId);
      const playerSnap = await getDoc(playerRef);
      
      if (!playerSnap.exists()) {
        throw new Error('Player not found in database');
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
      if (attempt === retries) {
        console.error(`❌ فشل في تحديث قاعدة البيانات للاعب ${playerId} بعد ${retries} محاولات: ${error.message}`);
        return { success: false, error: error.message };
      }
      
      console.warn(`⚠️ محاولة ${attempt} فشلت، إعادة المحاولة...`);
      await delay(1000 * attempt);
    }
  }
}

// دالة لمعالجة دفعة من اللاعبين
async function processBatch(players, batchNumber, totalBatches) {
  console.log(`\n📦 معالجة الدفعة ${batchNumber}/${totalBatches} (${players.length} لاعب)`);
  
  const batchResults = {
    correct: 0,
    wrong: 0,
    noImage: 0,
    wrongBucketPlayers: []
  };
  
  for (let i = 0; i < players.length; i++) {
    const player = players[i];
    const accountType = getPlayerAccountType(player);
    const correctBucket = getCorrectBucket(accountType);
    
    console.log(`   [${i + 1}/${players.length}] ${player.full_name || player.name || player.id} (${accountType})`);
    
    // البحث عن الصورة في جميع البوكتات
    let foundInCorrectBucket = false;
    let foundInWrongBucket = false;
    let imageInfo = null;
    
    for (const bucket of ALL_BUCKETS) {
      const imageCheck = await checkImageInBucket(player.id, bucket);
      if (imageCheck.exists) {
        if (bucket === correctBucket) {
          console.log(`      ✅ الصورة في البوكت الصحيح: ${bucket}`);
          foundInCorrectBucket = true;
          batchResults.correct++;
        } else {
          console.log(`      ❌ الصورة في البوكت الخطأ: ${bucket} (يجب أن تكون في ${correctBucket})`);
          foundInWrongBucket = true;
          imageInfo = imageCheck;
          batchResults.wrong++;
        }
        break;
      }
      
      // تأخير بين الطلبات لتجنب استنفاد الموارد
      await delay(DELAY_BETWEEN_REQUESTS);
    }
    
    if (!foundInCorrectBucket && !foundInWrongBucket) {
      console.log(`      ⚪ لا توجد صورة للاعب`);
      batchResults.noImage++;
    }
    
    if (foundInWrongBucket) {
      batchResults.wrongBucketPlayers.push({
        player: player,
        accountType: accountType,
        correctBucket: correctBucket,
        wrongBucket: imageInfo.bucket,
        imageInfo: imageInfo
      });
    }
  }
  
  return batchResults;
}

// الدالة الرئيسية لفحص جميع اللاعبين مع معالجة مجمعة
async function checkAllPlayersBucketsOptimized() {
  console.log('🔍 فحص محسن لجميع اللاعبين الذين يخزنون الوسائط في buckets خاطئة...\n');
  console.log(`⚙️ إعدادات التحسين:`);
  console.log(`   - حجم الدفعة: ${BATCH_SIZE} لاعب`);
  console.log(`   - تأخير بين الدفعات: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log(`   - تأخير بين الطلبات: ${DELAY_BETWEEN_REQUESTS}ms\n`);
  
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
    
    // تقسيم اللاعبين إلى دفعات
    const batches = [];
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      batches.push(players.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 تم تقسيم اللاعبين إلى ${batches.length} دفعة\n`);
    
    // معالجة كل دفعة
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchResults = await processBatch(batch, batchIndex + 1, batches.length);
      
      // تحديث النتائج الإجمالية
      results.wrongBucketPlayers.push(...batchResults.wrongBucketPlayers);
      
      // تحديث إحصائيات نوع الحساب
      batch.forEach(player => {
        const accountType = getPlayerAccountType(player);
        results.byAccountType[accountType].total++;
      });
      
      // تأخير بين الدفعات لتجنب استنفاد الموارد
      if (batchIndex < batches.length - 1) {
        console.log(`⏳ انتظار ${DELAY_BETWEEN_BATCHES}ms قبل الدفعة التالية...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }
    
    // حساب الإحصائيات النهائية
    results.wrongBucketPlayers.forEach(item => {
      results.byAccountType[item.accountType].wrong++;
    });
    
    // حساب الصحيح والبدون صور
    Object.keys(results.byAccountType).forEach(accountType => {
      const stats = results.byAccountType[accountType];
      const total = stats.total;
      const wrong = stats.wrong;
      stats.correct = total - wrong - stats.noImage;
    });
    
    // عرض التقرير النهائي
    console.log('\n' + '='.repeat(80));
    console.log('📋 تقرير فحص جميع اللاعبين (محسن)');
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
        players.slice(0, 3).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.player.full_name || item.player.name || item.player.id}`);
          console.log(`      البوكت الحالي: ${item.wrongBucket}`);
          console.log(`      البوكت الصحيح: ${item.correctBucket}`);
        });
        
        if (players.length > 3) {
          console.log(`      ... و ${players.length - 3} لاعب آخر`);
        }
      });
      
      console.log('\n🔧 لتنفيذ الإصلاح، قم بتشغيل:');
      console.log('node check-all-players-buckets-optimized.js --execute');
    } else {
      console.log('\n🎉 ممتاز! جميع اللاعبين لديهم صور في البوكتات الصحيحة.');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ خطأ في فحص اللاعبين:', error);
    return results;
  }
}

// دالة لتنفيذ الإصلاح الفعلي مع معالجة مجمعة
async function executeAllPlayersFixOptimized() {
  console.log('🚀 بدء إصلاح محسن لجميع اللاعبين الذين لديهم صور في بوكتات خاطئة...\n');
  console.log(`⚙️ إعدادات التحسين:`);
  console.log(`   - حجم الدفعة: ${BATCH_SIZE} لاعب`);
  console.log(`   - تأخير بين الدفعات: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log(`   - تأخير بين الطلبات: ${DELAY_BETWEEN_REQUESTS}ms\n`);
  
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
    
    // تقسيم إلى دفعات للفحص
    const batches = [];
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      batches.push(players.slice(i, i + BATCH_SIZE));
    }
    
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      console.log(`📦 فحص الدفعة ${batchIndex + 1}/${batches.length}...`);
      
      for (const player of batch) {
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
          
          await delay(DELAY_BETWEEN_REQUESTS);
        }
      }
      
      if (batchIndex < batches.length - 1) {
        await delay(DELAY_BETWEEN_BATCHES);
      }
    }
    
    results.total = wrongBucketPlayers.length;
    console.log(`📊 تم العثور على ${wrongBucketPlayers.length} لاعب يحتاج إصلاح\n`);
    
    if (wrongBucketPlayers.length === 0) {
      console.log('🎉 لا توجد صور في بوكتات خاطئة!');
      return results;
    }
    
    // تقسيم اللاعبين الذين يحتاجون إصلاح إلى دفعات
    const fixBatches = [];
    for (let i = 0; i < wrongBucketPlayers.length; i += BATCH_SIZE) {
      fixBatches.push(wrongBucketPlayers.slice(i, i + BATCH_SIZE));
    }
    
    // إصلاح كل دفعة
    for (let batchIndex = 0; batchIndex < fixBatches.length; batchIndex++) {
      const batch = fixBatches[batchIndex];
      console.log(`\n🔧 إصلاح الدفعة ${batchIndex + 1}/${fixBatches.length} (${batch.length} لاعب)`);
      
      for (let i = 0; i < batch.length; i++) {
        const item = batch[i];
        const player = item.player;
        const accountType = item.accountType;
        
        console.log(`   [${i + 1}/${batch.length}] إصلاح اللاعب: ${player.full_name || player.name || player.id}`);
        console.log(`      نوع الحساب: ${accountType}`);
        console.log(`      نقل من: ${item.wrongBucket} إلى: ${item.correctBucket}`);
        
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
              console.log(`      ✅ تم الإصلاح بنجاح`);
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
              console.log(`      ⚠️ تم نقل الصورة لكن فشل تحديث قاعدة البيانات`);
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
            console.log(`      ❌ فشل نقل الصورة: ${moveResult.error}`);
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
          console.log(`      ❌ خطأ في الإصلاح: ${error.message}`);
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
        
        // تأخير بين الطلبات
        await delay(DELAY_BETWEEN_REQUESTS);
      }
      
      // تأخير بين الدفعات
      if (batchIndex < fixBatches.length - 1) {
        console.log(`⏳ انتظار ${DELAY_BETWEEN_BATCHES}ms قبل الدفعة التالية...`);
        await delay(DELAY_BETWEEN_BATCHES);
      }
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
  executeAllPlayersFixOptimized();
} else {
  checkAllPlayersBucketsOptimized();
}