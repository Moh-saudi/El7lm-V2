// سكريبت سريع لفحص اللاعبين المستقلين الذين يخزنون الصور في bucket خاطئ
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

async function quickCheckIndependentPlayers() {
  console.log('🔍 فحص سريع للاعبين المستقلين الذين لديهم صور في bucket خاطئ...\n');
  
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
    
    console.log(`📊 تم العثور على ${players.length} لاعب في قاعدة البيانات`);
    console.log(`🎯 تم العثور على ${independentPlayers.length} لاعب مستقل\n`);
    
    const wrongBuckets = ['playertrainer', 'playerclub', 'playeracademy', 'playeragent'];
    const wrongBucketPlayers = [];
    const correctBucketPlayers = [];
    const noImagePlayers = [];
    
    // فحص كل لاعب مستقل
    for (let i = 0; i < independentPlayers.length; i++) {
      const player = independentPlayers[i];
      
      console.log(`[${i + 1}/${independentPlayers.length}] ${player.full_name || player.name || player.id}`);
      
      // التحقق من وجود الصورة في bucket avatars (الصحيح)
      const correctImageCheck = await checkImageInBucket(player.id, 'avatars');
      
      if (correctImageCheck.exists) {
        console.log(`   ✅ صورة في البوكت الصحيح: avatars`);
        correctBucketPlayers.push({
          player: player,
          bucket: 'avatars',
          url: correctImageCheck.url
        });
      } else {
        // البحث في البوكتات الخطأ
        let foundInWrongBucket = false;
        for (const bucket of wrongBuckets) {
          const imageCheck = await checkImageInBucket(player.id, bucket);
          if (imageCheck.exists) {
            console.log(`   ❌ صورة في البوكت الخطأ: ${bucket} (يجب أن تكون في avatars)`);
            foundInWrongBucket = true;
            wrongBucketPlayers.push({
              player: player,
              wrongBucket: bucket,
              url: imageCheck.url
            });
            break;
          }
        }
        
        if (!foundInWrongBucket) {
          console.log(`   ⚪ لا توجد صورة`);
          noImagePlayers.push({
            player: player
          });
        }
      }
    }
    
    // عرض التقرير النهائي
    console.log('\n' + '='.repeat(60));
    console.log('📋 تقرير الفحص السريع - اللاعبين المستقلين');
    console.log('='.repeat(60));
    
    console.log(`\n📊 الإحصائيات:`);
    console.log(`   - إجمالي اللاعبين المستقلين: ${independentPlayers.length}`);
    console.log(`   - لديهم صور في البوكت الصحيح (avatars): ${correctBucketPlayers.length}`);
    console.log(`   - لديهم صور في بوكتات خطأ: ${wrongBucketPlayers.length}`);
    console.log(`   - بدون صور: ${noImagePlayers.length}`);
    
    if (wrongBucketPlayers.length > 0) {
      console.log(`\n❌ اللاعبين المستقلين الذين لديهم صور في بوكتات خطأ (${wrongBucketPlayers.length}):`);
      wrongBucketPlayers.forEach((item, index) => {
        console.log(`${index + 1}. ${item.player.full_name || item.player.name || item.player.id}`);
        console.log(`   البوكت الحالي: ${item.wrongBucket}`);
        console.log(`   البوكت الصحيح: avatars`);
        console.log(`   رابط الصورة: ${item.url}`);
        console.log('');
      });
      
      console.log('🔧 لتنفيذ الإصلاح، قم بتشغيل:');
      console.log('node check-independent-players-buckets.js --execute');
    } else {
      console.log('\n🎉 ممتاز! جميع اللاعبين المستقلين لديهم صور في البوكت الصحيح (avatars).');
    }
    
    if (noImagePlayers.length > 0) {
      console.log(`\n⚪ اللاعبين المستقلين بدون صور (${noImagePlayers.length}):`);
      noImagePlayers.slice(0, 10).forEach((item, index) => {
        console.log(`${index + 1}. ${item.player.full_name || item.player.name || item.player.id}`);
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
quickCheckIndependentPlayers();




