/**
 * سكريبت لفحص المستخدمين الجدد والتحقق من وجودهم في Firestore
 * يقارن بين Firebase Auth و Firestore Collections
 */

const admin = require('firebase-admin');
const path = require('path');

// تحميل متغيرات البيئة
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
const auth = admin.auth();

// UIDs للفحص من Firebase Auth
const testUIDs = [
    'lF5gRzPlwGUWdmrYA9vugKtmfGL2',
    '5BkBhHiwQvSN9TAc10TwwmbPqd23',
    'EXaUZQEM4qU7j2hmG7UMUvflfGN2',
    'WfBB2z2PWwd4fTdxCumZhCMuuGj2',
    'ViKdefi76yf3FYuJe9ilMpf9kJa2',
    'eGRGsArjQXcvMBULUlJzOxPToUm1',
    'MOizAZ33MUaL6RoS9uObVB3hwcO2',
    'PtgxX3XM7gR7j17K1H1WKbSHBqx2',
    'fZSbS50rifOifT1XyJwW9UFOoeI2',
    '5BER0SdMjhRRXcrBlCdpwSA8RyF2'
];

const COLLECTIONS = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'parents'];

async function checkUserInFirestore(uid) {
    const results = {
        uid,
        foundIn: [],
        notFoundIn: [],
        data: null
    };

    for (const collection of COLLECTIONS) {
        try {
            const docRef = db.collection(collection).doc(uid);
            const doc = await docRef.get();

            if (doc.exists) {
                results.foundIn.push(collection);
                if (!results.data) {
                    results.data = doc.data();
                }
            } else {
                results.notFoundIn.push(collection);
            }
        } catch (error) {
            // تجاهل الأخطاء
        }
    }

    return results;
}

async function checkUserInAuth(uid) {
    try {
        const userRecord = await auth.getUser(uid);
        return {
            exists: true,
            email: userRecord.email,
            phone: userRecord.phoneNumber,
            createdAt: userRecord.metadata?.creationTime,
            lastLogin: userRecord.metadata?.lastSignInTime,
            displayName: userRecord.displayName,
            disabled: userRecord.disabled
        };
    } catch (error) {
        return { exists: false, error: error.message };
    }
}

async function getRecentFirestoreUsers(collection, limit = 20) {
    try {
        const snapshot = await db.collection(collection)
            .orderBy('createdAt', 'desc')
            .limit(limit)
            .get();

        return snapshot.docs.map(doc => ({
            id: doc.id,
            email: doc.data().email,
            name: doc.data().name || doc.data().full_name,
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
            accountType: doc.data().accountType
        }));
    } catch (error) {
        return [];
    }
}

async function main() {
    console.log('\n🔍 فحص المستخدمين الجدد - مقارنة Firebase Auth vs Firestore');
    console.log('═══════════════════════════════════════════════════════════════\n');

    // 1. فحص المستخدمين المحددين
    console.log('📋 فحص UIDs المحددة من Firebase Auth Console:\n');

    const missingUsers = [];
    const foundUsers = [];

    for (const uid of testUIDs) {
        // فحص في Auth
        const authResult = await checkUserInAuth(uid);

        // فحص في Firestore
        const firestoreResult = await checkUserInFirestore(uid);

        const status = firestoreResult.foundIn.length > 0 ? '✅' : '❌';

        console.log(`${status} UID: ${uid.substring(0, 12)}...`);
        console.log(`   📧 Email: ${authResult.email || 'N/A'}`);
        console.log(`   📅 Created: ${authResult.createdAt || 'N/A'}`);
        console.log(`   🗂️ Firestore: ${firestoreResult.foundIn.length > 0 ? firestoreResult.foundIn.join(', ') : '❌ غير موجود في أي Collection!'}`);

        if (firestoreResult.foundIn.length === 0) {
            missingUsers.push({ uid, auth: authResult });
        } else {
            foundUsers.push({ uid, auth: authResult, firestore: firestoreResult });
        }

        console.log('');
    }

    // 2. ملخص
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📊 ملخص الفحص:');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log(`   ✅ موجود في Firestore: ${foundUsers.length}`);
    console.log(`   ❌ غير موجود في Firestore: ${missingUsers.length}`);

    if (missingUsers.length > 0) {
        console.log('\n⚠️ المستخدمين المفقودين (موجودين في Auth لكن ليس في Firestore):');
        console.log('───────────────────────────────────────────────────────────────');
        missingUsers.forEach((u, i) => {
            console.log(`   ${i + 1}. ${u.auth.email || 'No Email'} (UID: ${u.uid.substring(0, 12)}...)`);
        });
    }

    // 3. فحص آخر المستخدمين في Firestore
    console.log('\n📅 آخر 10 مستخدمين مسجلين في كل Collection:');
    console.log('───────────────────────────────────────────────────────────────');

    for (const collection of ['players', 'users']) {
        const recentUsers = await getRecentFirestoreUsers(collection, 10);
        if (recentUsers.length > 0) {
            console.log(`\n🗂️ ${collection}:`);
            recentUsers.forEach((u, i) => {
                const date = u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : 'N/A';
                console.log(`   ${i + 1}. ${u.name || 'N/A'} | ${u.email || 'N/A'} | ${date}`);
            });
        }
    }

    // 4. تحليل المشكلة
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('🔬 تحليل المشكلة:');
    console.log('═══════════════════════════════════════════════════════════════');

    if (missingUsers.length > 0) {
        console.log(`
⚠️ المشكلة: ${missingUsers.length} مستخدم مسجل في Firebase Auth لكنهم غير موجودين في Firestore!

🔍 الأسباب المحتملة:
   1. 🐛 خطأ في كود التسجيل - لا يتم إنشاء document في Firestore
   2. 🔒 Firestore Rules تمنع الكتابة
   3. 🌐 مشكلة في الاتصال أثناء التسجيل
   4. ⏱️ المستخدم أغلق الصفحة قبل اكتمال التسجيل

💡 الحل المقترح:
   1. فحص كود التسجيل في auth-provider.tsx
   2. التأكد من إنشاء document بنفس الـ UID
   3. إضافة error handling أفضل
    `);
    } else {
        console.log('\n✅ جميع المستخدمين موجودين في Firestore!');
        console.log('   المشكلة قد تكون في صفحة الإدارة (الفلاتر أو التحميل)');
    }

    console.log('\n✅ اكتمل الفحص!\n');
    process.exit(0);
}

main().catch(error => {
    console.error('❌ خطأ:', error);
    process.exit(1);
});
