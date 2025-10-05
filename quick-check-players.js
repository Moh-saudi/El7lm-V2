// سكريبت سريع لفحص اللاعبين الذين لديهم صور في بوكتات خطأ
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

// دالة لتحديد نوع الحساب
function getPlayerAccountType(playerData) {
  if (playerData.trainer_id || playerData.trainerId) return 'trainer';
  if (playerData.club_id || playerData.clubId) return 'club';
  if (playerData.agent_id || playerData.agentId) return 'agent';
  if (playerData.academy_id || playerData.academyId) return 'academy';
  return 'independent';
}

// دالة لتحديد البوكت الصحيح
function getCorrectBucket(accountType) {
  switch (accountType) {
    case 'trainer': return 'playertrainer';
    case 'club': return 'playerclub';
    case 'agent': return 'playeragent';
    case 'academy': return 'playeracademy';
    case 'independent': return 'avatars';
    default: return 'avatars';
  }
}

// دالة للتحقق من وجود صورة في بوكت
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

async function quickCheckPlayers() {
  console.log('🔍 فحص سريع للاعبين الذين لديهم صور في بوكتات خطأ...\n');
  
  try {
    // جلب جميع اللاعبين
    const playersSnapshot = await getDocs(collection(db, 'players'));
    const players = [];
    
    playersSnapshot.forEach((doc) => {
      players.push({ id: doc.id, ...doc.data() });
    });
    
    console.log(`📊 تم العثور على ${players.length} لاعب في قاعدة البيانات\n`);
    
    const allBuckets = ['avatars', 'playerclub', 'playeracademy', 'playertrainer', 'playeragent'];
    const wrongBucketPlayers = [];
    const correctBucketPlayers = [];
    const noImagePlayers = [];
    
    // فحص كل لاعب
    for (let i = 0; i < players.length; i++) {
      const player = players[i];
      const accountType = getPlayerAccountType(player);
      const correctBucket = getCorrectBucket(accountType);
      
      console.log(`[${i + 1}/${players.length}] ${player.full_name || player.name || player.id} (${accountType})`);
      
      // البحث عن الصورة
      let foundImage = false;
      for (const bucket of allBuckets) {
        const imageCheck = await checkImageInBucket(player.id, bucket);
        if (imageCheck.exists) {
          foundImage = true;
          if (bucket === correctBucket) {
            console.log(`   ✅ صورة في البوكت الصحيح: ${bucket}`);
            correctBucketPlayers.push({
              player: player,
              accountType: accountType,
              bucket: bucket,
              url: imageCheck.url
            });
          } else {
            console.log(`   ❌ صورة في البوكت الخطأ: ${bucket} (يجب أن تكون في ${correctBucket})`);
            wrongBucketPlayers.push({
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
        noImagePlayers.push({
          player: player,
          accountType: accountType
        });
      }
    }
    
    // عرض التقرير النهائي
    console.log('\n' + '='.repeat(60));
    console.log('📋 تقرير الفحص السريع');
    console.log('='.repeat(60));
    
    console.log(`\n📊 الإحصائيات:`);
    console.log(`   - إجمالي اللاعبين: ${players.length}`);
    console.log(`   - لديهم صور في البوكت الصحيح: ${correctBucketPlayers.length}`);
    console.log(`   - لديهم صور في البوكت الخطأ: ${wrongBucketPlayers.length}`);
    console.log(`   - بدون صور: ${noImagePlayers.length}`);
    
    if (wrongBucketPlayers.length > 0) {
      console.log(`\n❌ اللاعبين الذين لديهم صور في بوكتات خطأ (${wrongBucketPlayers.length}):`);
      wrongBucketPlayers.forEach((item, index) => {
        console.log(`${index + 1}. ${item.player.full_name || item.player.name || item.player.id}`);
        console.log(`   نوع الحساب: ${item.accountType}`);
        console.log(`   البوكت الحالي: ${item.wrongBucket}`);
        console.log(`   البوكت الصحيح: ${item.correctBucket}`);
        console.log(`   رابط الصورة: ${item.url}`);
        console.log('');
      });
      
      console.log('🔧 لتنفيذ الإصلاح، قم بتشغيل:');
      console.log('node fix-all-players-buckets.js --execute');
    } else {
      console.log('\n🎉 ممتاز! جميع اللاعبين لديهم صور في البوكتات الصحيحة.');
    }
    
    if (noImagePlayers.length > 0) {
      console.log(`\n⚪ اللاعبين بدون صور (${noImagePlayers.length}):`);
      noImagePlayers.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.player.full_name || item.player.name || item.player.id} (${item.accountType})`);
      });
      
      if (noImagePlayers.length > 10) {
        console.log(`   ... و ${noImagePlayers.length - 10} لاعب آخر`);
      }
    }
    
  } catch (error) {
    console.error('❌ خطأ في الفحص السريع:', error);
  }
}

// تشغيل الفحص السريع
quickCheckPlayers();
