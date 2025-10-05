// سكريبت سريع لفحص جميع اللاعبين الذين يخزنون الوسائط في buckets خاطئة
// يعرض تقرير سريع بدون تنفيذ أي تغييرات

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

// دالة للتحقق من وجود صورة في bucket
async function checkImageInBucket(playerId, bucketName) {
  const extensions = ['jpg', 'jpeg', 'png', 'webp'];
  
  for (const ext of extensions) {
    const fileName = `${playerId}.${ext}`;
    
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
    } catch (error) {
      continue;
    }
  }
  
  return { exists: false };
}

async function quickCheckAllPlayers() {
  console.log('🔍 فحص سريع لجميع اللاعبين الذين يخزنون الوسائط في buckets خاطئة...\n');
  
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
    
    // فحص كل لاعب
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const accountType = getPlayerAccountType(player);
      const correctBucket = getCorrectBucket(accountType);
      
      console.log(`[${i + 1}/${players.length}] ${player.full_name || player.name || player.id} (${accountType})`);
      
      // تحديث إحصائيات نوع الحساب
      results.byAccountType[accountType].total++;
      
      // البحث عن الصورة
      let foundImage = false;
      for (const bucket of ALL_BUCKETS) {
        const imageCheck = await checkImageInBucket(player.id, bucket);
        if (imageCheck.exists) {
          foundImage = true;
          if (bucket === correctBucket) {
            console.log(`   ✅ صورة في البوكت الصحيح: ${bucket}`);
            results.byAccountType[accountType].correct++;
          } else {
            console.log(`   ❌ صورة في البوكت الخطأ: ${bucket} (يجب أن تكون في ${correctBucket})`);
            results.byAccountType[accountType].wrong++;
            results.wrongBucketPlayers.push({
              player: player,
              accountType: accountType,
              correctBucket: correctBucket,
              wrongBucket: bucket,
              url: imageCheck.url
            });
          }
          break;
        }
      }
      
      if (!foundImage) {
        console.log(`   ⚪ لا توجد صورة`);
        results.byAccountType[accountType].noImage++;
      }
    }
    
    // عرض التقرير النهائي
    console.log('\n' + '='.repeat(80));
    console.log('📋 تقرير الفحص السريع - جميع اللاعبين');
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
        players.slice(0, 5).forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.player.full_name || item.player.name || item.player.id}`);
          console.log(`      البوكت الحالي: ${item.wrongBucket}`);
          console.log(`      البوكت الصحيح: ${item.correctBucket}`);
        });
        
        if (players.length > 5) {
          console.log(`      ... و ${players.length - 5} لاعب آخر`);
        }
      });
      
      console.log('\n🔧 لتنفيذ الإصلاح، قم بتشغيل:');
      console.log('node check-all-players-buckets.js --execute');
    } else {
      console.log('\n🎉 ممتاز! جميع اللاعبين لديهم صور في البوكتات الصحيحة.');
    }
    
  } catch (error) {
    console.error('❌ خطأ في الفحص السريع:', error);
  }
}

// تشغيل الفحص السريع
quickCheckAllPlayers();




