/**
 * فحص تنسيق createdAt للمستخدم الجديد
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

async function checkCreatedAtFormat() {
    const userId = 'lbsj8fUxYGcmt59JGMDTkm82o8E2';

    console.log(`\n🔍 فحص تنسيق createdAt للمستخدم: ${userId}`);
    console.log('═══════════════════════════════════════════════════════════════\n');

    const userDoc = await db.collection('users').doc(userId).get();

    if (!userDoc.exists) {
        console.log('❌ المستخدم غير موجود!');
        return;
    }

    const data = userDoc.data();

    console.log('📋 بيانات المستخدم:');
    console.log(`   Name: ${data.full_name || data.name}`);
    console.log(`   Phone: ${data.phone}`);
    console.log(`   Email: ${data.email}`);
    console.log(`   isActive: ${data.isActive}`);
    console.log(`   isDeleted: ${data.isDeleted}`);

    console.log('\n📅 فحص حقول التاريخ:');

    // createdAt
    console.log('\n   createdAt:');
    console.log(`      Type: ${typeof data.createdAt}`);
    console.log(`      Value: ${JSON.stringify(data.createdAt)}`);
    if (data.createdAt) {
        console.log(`      Is Timestamp: ${data.createdAt._seconds !== undefined}`);
        if (data.createdAt._seconds) {
            console.log(`      As Date: ${new Date(data.createdAt._seconds * 1000).toLocaleString('ar-EG')}`);
        } else if (data.createdAt.toDate) {
            console.log(`      As Date (toDate): ${data.createdAt.toDate().toLocaleString('ar-EG')}`);
        }
    }

    // created_at
    console.log('\n   created_at:');
    console.log(`      Type: ${typeof data.created_at}`);
    console.log(`      Value: ${JSON.stringify(data.created_at)}`);
    if (data.created_at) {
        console.log(`      Is Timestamp: ${data.created_at._seconds !== undefined}`);
        if (data.created_at._seconds) {
            console.log(`      As Date: ${new Date(data.created_at._seconds * 1000).toLocaleString('ar-EG')}`);
        } else if (data.created_at.toDate) {
            console.log(`      As Date (toDate): ${data.created_at.toDate().toLocaleString('ar-EG')}`);
        }
    }

    // تصحيح التاريخ إذا كان خاطئ
    console.log('\n🔧 تصحيح التاريخ...');

    // استخدام تاريخ Firebase Auth كمرجع
    const auth = admin.auth();
    const userRecord = await auth.getUser(userId);
    const authCreatedAt = new Date(userRecord.metadata.creationTime);

    console.log(`   📅 تاريخ التسجيل من Firebase Auth: ${authCreatedAt.toLocaleString('ar-EG')}`);

    // تحديث المستخدم بالتاريخ الصحيح
    await db.collection('users').doc(userId).update({
        createdAt: authCreatedAt,
        created_at: authCreatedAt
    });

    await db.collection('players').doc(userId).update({
        createdAt: authCreatedAt,
        created_at: authCreatedAt
    });

    console.log('   ✅ تم تصحيح التاريخ بنجاح!');

    console.log('\n✅ اكتمل الفحص!\n');
}

checkCreatedAtFormat().then(() => process.exit(0)).catch(e => {
    console.error('❌ خطأ:', e);
    process.exit(1);
});
