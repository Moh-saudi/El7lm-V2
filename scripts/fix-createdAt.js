/**
 * سكريبت لتصحيح حقل createdAt للمستخدمين
 * يضيف createdAt لمن لديهم created_at فقط
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

const COLLECTIONS = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'parents'];

async function fixCreatedAt() {
    console.log('\n🔧 تصحيح حقل createdAt للمستخدمين');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let totalFixed = 0;
    let totalMissing = 0;

    for (const collectionName of COLLECTIONS) {
        console.log(`📂 فحص ${collectionName}...`);

        try {
            const snapshot = await db.collection(collectionName).get();
            let fixedInCollection = 0;
            let missingInCollection = 0;

            const batch = db.batch();
            let batchCount = 0;

            for (const doc of snapshot.docs) {
                const data = doc.data();

                // تحقق إذا كان createdAt موجود
                if (data.createdAt) {
                    continue; // لديه createdAt بالفعل
                }

                // تحقق إذا كان created_at موجود
                if (data.created_at) {
                    // انسخ من created_at إلى createdAt
                    batch.update(doc.ref, {
                        createdAt: data.created_at
                    });
                    batchCount++;
                    fixedInCollection++;

                    if (batchCount >= 400) {
                        await batch.commit();
                        console.log(`   💾 حفظ ${batchCount} تحديث...`);
                        batchCount = 0;
                    }
                } else {
                    // لا يوجد أي حقل تاريخ
                    missingInCollection++;
                }
            }

            // حفظ الباقي
            if (batchCount > 0) {
                await batch.commit();
            }

            if (fixedInCollection > 0 || missingInCollection > 0) {
                console.log(`   ✅ تم تصحيح: ${fixedInCollection}`);
                if (missingInCollection > 0) {
                    console.log(`   ⚠️ بدون تاريخ: ${missingInCollection}`);
                }
            } else {
                console.log(`   ✅ جميع المستندات صحيحة`);
            }

            totalFixed += fixedInCollection;
            totalMissing += missingInCollection;

        } catch (error) {
            console.log(`   ❌ خطأ: ${error.message}`);
        }
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 ملخص:');
    console.log(`   ✅ تم تصحيح: ${totalFixed} مستند`);
    console.log(`   ⚠️ بدون تاريخ: ${totalMissing} مستند`);
    console.log('\n✅ اكتمل التصحيح!\n');
}

fixCreatedAt().then(() => process.exit(0)).catch(e => {
    console.error('❌ خطأ:', e);
    process.exit(1);
});
