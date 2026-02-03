/**
 * تصحيح createdAt للحسابات القديمة باستخدام تاريخ Firebase Auth
 */

const admin = require('firebase-admin');
const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n')
        })
    });
}

const db = admin.firestore();
const auth = admin.auth();

const COLLECTIONS = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'parents'];

async function fixAllCreatedAt() {
    console.log('\n🔧 تصحيح createdAt للحسابات القديمة');
    console.log('═══════════════════════════════════════════════════════════════\n');

    let totalFixed = 0;
    let totalSkipped = 0;
    let totalErrors = 0;

    for (const collectionName of COLLECTIONS) {
        console.log(`📂 ${collectionName}...`);

        const snapshot = await db.collection(collectionName).get();
        let fixed = 0;
        let skipped = 0;
        let errors = 0;

        for (const doc of snapshot.docs) {
            const data = doc.data();

            // تحقق إذا كان createdAt صحيح (له _seconds)
            if (data.createdAt && data.createdAt._seconds) {
                skipped++;
                continue;
            }

            // createdAt فارغ أو غير موجود - نحتاج تصحيحه
            try {
                // جلب تاريخ التسجيل من Firebase Auth
                const userRecord = await auth.getUser(doc.id);
                const authCreatedAt = new Date(userRecord.metadata.creationTime);

                // تحديث المستند
                await db.collection(collectionName).doc(doc.id).update({
                    createdAt: authCreatedAt,
                    created_at: authCreatedAt
                });

                fixed++;
            } catch (e) {
                // المستخدم غير موجود في Auth أو خطأ آخر
                errors++;
            }
        }

        if (fixed > 0 || errors > 0) {
            console.log(`   ✅ تم تصحيح: ${fixed} | ⏭️ تم تخطي: ${skipped} | ❌ أخطاء: ${errors}`);
        } else {
            console.log(`   ✅ جميع المستندات صحيحة (${skipped})`);
        }

        totalFixed += fixed;
        totalSkipped += skipped;
        totalErrors += errors;
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 ملخص:');
    console.log(`   ✅ تم تصحيح: ${totalFixed}`);
    console.log(`   ⏭️ تم تخطي (صحيح): ${totalSkipped}`);
    console.log(`   ❌ أخطاء: ${totalErrors}`);
    console.log('\n✅ اكتمل!\n');
}

fixAllCreatedAt().then(() => process.exit(0)).catch(e => {
    console.error('❌ خطأ:', e);
    process.exit(1);
});
