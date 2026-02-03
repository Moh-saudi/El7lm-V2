/**
 * فحص المستخدم الجديد برقم الهاتف
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
const auth = admin.auth();

const PHONE_TO_FIND = '1233323212';
const COLLECTIONS = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'parents'];

async function findUserByPhone() {
    console.log(`\n🔍 البحث عن المستخدم برقم: ${PHONE_TO_FIND}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    let found = false;

    // البحث في جميع المجموعات
    for (const collectionName of COLLECTIONS) {
        try {
            // البحث باستخدام أشكال مختلفة من الرقم
            const phoneVariants = [
                PHONE_TO_FIND,
                `+${PHONE_TO_FIND}`,
                `+966${PHONE_TO_FIND}`,
                `+20${PHONE_TO_FIND}`,
                `+212${PHONE_TO_FIND}`,
                `966${PHONE_TO_FIND}`,
                `20${PHONE_TO_FIND}`,
                `212${PHONE_TO_FIND}`,
                `+974${PHONE_TO_FIND}`,
                `974${PHONE_TO_FIND}`
            ];

            for (const phoneVariant of phoneVariants) {
                const snapshot = await db.collection(collectionName)
                    .where('phone', '==', phoneVariant)
                    .get();

                if (!snapshot.empty) {
                    found = true;
                    console.log(`✅ وجد في ${collectionName}:`);
                    snapshot.forEach(doc => {
                        const data = doc.data();
                        console.log(`   📋 ID: ${doc.id}`);
                        console.log(`   📧 Email: ${data.email || 'N/A'}`);
                        console.log(`   📱 Phone: ${data.phone || 'N/A'}`);
                        console.log(`   👤 Name: ${data.full_name || data.name || 'N/A'}`);
                        console.log(`   🏷️ Type: ${data.accountType || 'N/A'}`);
                        console.log(`   📅 createdAt: ${data.createdAt ? new Date(data.createdAt._seconds * 1000).toLocaleString('ar-EG') : 'غير موجود'}`);
                        console.log(`   📅 created_at: ${data.created_at ? new Date(data.created_at._seconds * 1000).toLocaleString('ar-EG') : 'غير موجود'}`);
                        console.log(`   ✓ isActive: ${data.isActive}`);
                        console.log(`   ✗ isDeleted: ${data.isDeleted || false}`);
                        console.log('');
                    });
                }
            }
        } catch (error) {
            console.log(`   ❌ خطأ في ${collectionName}: ${error.message}`);
        }
    }

    // البحث بالبريد الإلكتروني المُنشأ من الرقم
    console.log('\n📧 البحث بالبريد الإلكتروني المُنشأ:');
    const possibleEmails = [
        `${PHONE_TO_FIND}@el7lm.com`,
        `966${PHONE_TO_FIND}@el7lm.com`,
        `20${PHONE_TO_FIND}@el7lm.com`,
        `212${PHONE_TO_FIND}@el7lm.com`,
        `974${PHONE_TO_FIND}@el7lm.com`
    ];

    for (const email of possibleEmails) {
        try {
            const snapshot = await db.collection('users')
                .where('email', '==', email)
                .get();

            if (!snapshot.empty) {
                found = true;
                console.log(`✅ وجد بالبريد ${email}:`);
                snapshot.forEach(doc => {
                    const data = doc.data();
                    console.log(`   📋 ID: ${doc.id}`);
                    console.log(`   📧 Email: ${data.email}`);
                    console.log(`   📱 Phone: ${data.phone || 'N/A'}`);
                    console.log(`   👤 Name: ${data.full_name || data.name || 'N/A'}`);
                    console.log(`   🏷️ Type: ${data.accountType || 'N/A'}`);
                    console.log(`   📅 createdAt: ${data.createdAt ? (data.createdAt._seconds ? new Date(data.createdAt._seconds * 1000).toLocaleString('ar-EG') : data.createdAt) : 'غير موجود'}`);
                    console.log(`   ✓ isActive: ${data.isActive}`);
                    console.log(`   ✗ isDeleted: ${data.isDeleted || false}`);
                });
            }
        } catch (e) { }
    }

    // البحث في Firebase Auth
    console.log('\n🔐 البحث في Firebase Auth:');
    for (const email of possibleEmails) {
        try {
            const userRecord = await auth.getUserByEmail(email);
            found = true;
            console.log(`✅ وجد في Auth:`);
            console.log(`   📋 UID: ${userRecord.uid}`);
            console.log(`   📧 Email: ${userRecord.email}`);
            console.log(`   📱 Phone: ${userRecord.phoneNumber || 'N/A'}`);
            console.log(`   📅 Created: ${userRecord.metadata.creationTime}`);
            console.log(`   🔒 Disabled: ${userRecord.disabled}`);
        } catch (e) {
            // Not found
        }
    }

    // البحث في آخر 20 مستخدم في Firestore
    console.log('\n📅 آخر 20 مستخدم مسجل في users:');
    try {
        const recentSnapshot = await db.collection('users')
            .orderBy('createdAt', 'desc')
            .limit(20)
            .get();

        if (recentSnapshot.empty) {
            // Try with created_at
            const recentSnapshot2 = await db.collection('users').limit(20).get();
            console.log(`   📊 عدد المستخدمين: ${recentSnapshot2.size}`);
            recentSnapshot2.forEach((doc, index) => {
                const data = doc.data();
                if (data.phone && data.phone.includes(PHONE_TO_FIND)) {
                    console.log(`   ⭐ ${index + 1}. ${data.full_name || data.name || 'N/A'} | ${data.email || 'N/A'} | ${data.phone || 'N/A'}`);
                }
            });
        } else {
            recentSnapshot.forEach((doc, index) => {
                const data = doc.data();
                const date = data.createdAt ?
                    (data.createdAt._seconds ? new Date(data.createdAt._seconds * 1000).toLocaleString('ar-EG') : data.createdAt) :
                    'N/A';
                console.log(`   ${index + 1}. ${data.full_name || data.name || '-'} | ${data.phone || '-'} | ${date}`);
            });
        }
    } catch (e) {
        console.log(`   ⚠️ خطأ في جلب آخر المستخدمين: ${e.message}`);
    }

    if (!found) {
        console.log('\n❌ لم يتم العثور على المستخدم!');
        console.log('   السبب المحتمل:');
        console.log('   1. الرقم غير مكتمل أو بصيغة مختلفة');
        console.log('   2. فشل التسجيل قبل حفظ البيانات في Firestore');
        console.log('   3. المستخدم في Collection مختلف');
    }

    console.log('\n✅ اكتمل البحث!\n');
}

findUserByPhone().then(() => process.exit(0)).catch(e => {
    console.error('❌ خطأ:', e);
    process.exit(1);
});
