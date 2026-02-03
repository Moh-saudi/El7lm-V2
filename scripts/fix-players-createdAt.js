/**
 * سكريبت لتصحيح حقل createdAt للاعبين فقط (الباقي تم تصحيحه)
 */

const admin = require('firebase-admin');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({ projectId, clientEmail, privateKey }),
    });
}

const db = admin.firestore();

async function fixPlayersCreatedAt() {
    console.log('\n🔧 تصحيح حقل createdAt للاعبين');
    console.log('═══════════════════════════════════════════════════════════════\n');

    const snapshot = await db.collection('players').get();
    console.log(`📂 عدد اللاعبين: ${snapshot.size}`);

    let fixed = 0;
    let alreadyOk = 0;
    let missing = 0;

    // Process in smaller batches
    const batchSize = 300;
    let currentBatch = db.batch();
    let batchCount = 0;

    for (const doc of snapshot.docs) {
        const data = doc.data();

        if (data.createdAt) {
            alreadyOk++;
            continue;
        }

        if (data.created_at) {
            currentBatch.update(doc.ref, {
                createdAt: data.created_at
            });
            batchCount++;
            fixed++;

            if (batchCount >= batchSize) {
                await currentBatch.commit();
                console.log(`   💾 تم حفظ ${batchCount} تحديث...`);
                currentBatch = db.batch(); // إنشاء batch جديد
                batchCount = 0;
            }
        } else {
            missing++;
        }
    }

    // حفظ الباقي
    if (batchCount > 0) {
        await currentBatch.commit();
        console.log(`   💾 تم حفظ ${batchCount} تحديث أخير...`);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 ملخص اللاعبين:');
    console.log(`   ✅ كان صحيح: ${alreadyOk}`);
    console.log(`   ✅ تم تصحيحه: ${fixed}`);
    if (missing > 0) console.log(`   ⚠️ بدون تاريخ: ${missing}`);
    console.log('\n✅ اكتمل!\n');
}

fixPlayersCreatedAt().then(() => process.exit(0)).catch(e => {
    console.error('❌ خطأ:', e);
    process.exit(1);
});
