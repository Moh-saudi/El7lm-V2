// سكريبت سريع محسن لفحص جميع اللاعبين مع تجنب استنفاد الموارد
// يستخدم معالجة مجمعة وتأخير بين الطلبات

const { createClient } = require('@supabase/supabase-js');
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, getDocs } = require('firebase/firestore');

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
const BATCH_SIZE = 15; // حجم أكبر للفحص السريع
const DELAY_BETWEEN_BATCHES = 1500; // تأخير أقل للفحص السريع
const DELAY_BETWEEN_REQUESTS = 300; // تأخير أقل بين الطلبات

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

// دالة لتحديد نوع الحساب
function getPlayerAccountType(playerData) {
  if (playerData.trainer_id || playerData.trainerId) return 'trainer';
  if (playerData.club_id || playerData.clubId) return 'club';
  if (playerData.agent_id || playerData.agentId) return 'agent';
  if (playerData.academy_id || playerData.academyId) return 'academy';
  return 'independent';
}

// دالة للحصول على البوكت الصحيح
function getCorrectBucket(accountType) {
  return CORRECT_BUCKETS[accountType] || 'avatars';
}

// دالة للتحقق من وجود صورة في bucket مع إعادة المحاولة
async function checkImageInBucket(playerId, bucketName, retries = 2) {
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  for (const ext of extensions) {
    const fileName = `${playerId}.${ext}`;
    
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        const { data } = await supabase.storage
          .from(bucketName)
          .getPublicUrl(fileName);
        
        if (data?.publicUrl) {
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
          continue; // جرب الامتداد التالي
        }
        await delay(500 * attempt);
      }
    }
  }
  
  return { exists: false };
}

// دالة لمعالجة دفعة من اللاعبين للفحص السريع
async function processBatchQuick(players, batchNumber, totalBatches) {
  console.log(`📦 الدفعة ${batchNumber}/${totalBatches} (${players.length} لاعب)`);
  
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
    
    // البحث عن الصورة في البوكت الصحيح أولاً
    const correctImageCheck = await checkImageInBucket(player.id, correctBucket);
    
    if (correctImageCheck.exists) {
      batchResults.correct++;
    } else {
      // البحث في البوكتات الأخرى
      let foundInWrongBucket = false;
      for (const bucket of ALL_BUCKETS) {
        if (bucket !== correctBucket) {
          const imageCheck = await checkImageInBucket(player.id, bucket);
          if (imageCheck.exists) {
            foundInWrongBucket = true;
            batchResults.wrong++;
            batchResults.wrongBucketPlayers.push({
              player: player,
              accountType: accountType,
              correctBucket: correctBucket,
              wrongBucket: bucket,
              url: imageCheck.url
            });
            break;
          }
        }
        
        // تأخير قصير بين الطلبات
        await delay(DELAY_BETWEEN_REQUESTS);
      }
      
      if (!foundInWrongBucket) {
        batchResults.noImage++;
      }
    }
  }
  
  return batchResults;
}

async function quickCheckAllPlayersOptimized() {
  console.log('🔍 فحص سريع محسن لجميع اللاعبين الذين يخزنون الوسائط في buckets خاطئة...\n');
  console.log(`⚙️ إعدادات التحسين:`);
  console.log(`   - حجم الدفعة: ${BATCH_SIZE} لاعب`);
  console.log(`   - تأخير بين الدفعات: ${DELAY_BETWEEN_BATCHES}ms`);
  console.log(`   - تأخير بين الطلبات: ${DELAY_BETWEEN_REQUESTS}ms\n`);
  
  try {
    // جلب جميع اللاعبين
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players = [];
    
    playersSnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 تم العثور على ${players.length} لاعب في قاعدة البيانات\n`);
    
    const results = {
      total: players.length,
      byAccountType: {
        independent: { total: 0, correct: 0, wrong: 0, noImage: 0 },
        trainer: { total: 0, correct: 0, wrong: 0, noImage: 0 },
        club: { total: 0, correct: 0, wrong: 0, noImage: 0 },
        agent: { total: 0, correct: 0, wrong: 0, noImage: 0 },
        academy: { total: 0, correct: 0, wrong: 0, noImage: 0 }
      },
      wrongBucketPlayers: []
    };
    
    // تقسيم اللاعبين إلى دفعات
    const batches = [];
    for (let i = 0; i < players.length; i += BATCH_SIZE) {
      batches.push(players.slice(i, i + BATCH_SIZE));
    }
    
    console.log(`📦 تم تقسيم اللاعبين إلى ${batches.length} دفعة\n`);
    
    // معالجة كل دفعة
    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex];
      const batchResults = await processBatchQuick(batch, batchIndex + 1, batches.length);
      
      // تحديث النتائج الإجمالية
      results.wrongBucketPlayers.push(...batchResults.wrongBucketPlayers);
      
      // تحديث إحصائيات نوع الحساب
      batch.forEach(player => {
        const accountType = getPlayerAccountType(player);
        results.byAccountType[accountType].total++;
      });
      
      // تأخير بين الدفعات
      if (batchIndex < batches.length - 1) {
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
    console.log('📋 تقرير الفحص السريع المحسن - جميع اللاعبين');
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
    
  } catch (error) {
    console.error('❌ خطأ في الفحص السريع:', error);
  }
}

// تشغيل الفحص السريع
quickCheckAllPlayersOptimized();


