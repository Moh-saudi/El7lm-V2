/**
 * سكريبت فحص بيانات Firebase
 * يعرض إحصائيات شاملة عن جميع Collections
 */

const admin = require('firebase-admin');
const path = require('path');

// تحميل متغيرات البيئة
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// التحقق من المتغيرات المطلوبة
const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

if (!projectId || !clientEmail || !privateKey) {
    console.error('❌ Firebase credentials not found in .env.local');
    process.exit(1);
}

// تهيئة Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId,
            clientEmail,
            privateKey,
        }),
    });
}

const db = admin.firestore();

// Collections المعروفة للفحص
const KNOWN_COLLECTIONS = [
    'users',
    'players',
    'admins',
    'marketers',
    'academies',
    'clubs',
    'agents',
    'parents',
    'payments',
    'invoices',
    'receipts',
    'subscriptions',
    'notifications',
    'messages',
    'conversations',
    'ads',
    'videos',
    'offers',
    'pricing',
    'settings',
    'tournaments',
    'teams',
    'referrals',
    'logs',
    'action_logs',
    'support_tickets',
    'otp_codes',
    'branding',
    'partners',
    'success_stories',
    'slider',
    'stats',
    'chataman_config',
    'payment_methods',
    '_meta'
];

async function getCollectionStats(collectionName) {
    try {
        const snapshot = await db.collection(collectionName).limit(1000).get();
        const count = snapshot.size;

        if (count === 0) return null;

        // جلب عينة من المستندات
        const sampleDocs = [];
        snapshot.docs.slice(0, 3).forEach(doc => {
            const data = doc.data();
            sampleDocs.push({
                id: doc.id,
                fields: Object.keys(data).slice(0, 10)
            });
        });

        // حساب حجم تقريبي
        let estimatedSize = 0;
        snapshot.docs.forEach(doc => {
            estimatedSize += JSON.stringify(doc.data()).length;
        });

        return {
            name: collectionName,
            count,
            estimatedSizeKB: Math.round(estimatedSize / 1024),
            sampleFields: sampleDocs[0]?.fields || [],
            hasMore: count >= 1000
        };
    } catch (error) {
        // Collection غير موجود أو خطأ في الوصول
        return null;
    }
}

async function getAllCollections() {
    try {
        const collections = await db.listCollections();
        return collections.map(col => col.id);
    } catch (error) {
        console.error('Error listing collections:', error.message);
        return KNOWN_COLLECTIONS;
    }
}

async function main() {
    console.log('\n🔥 فحص قاعدة بيانات Firebase Firestore');
    console.log('═══════════════════════════════════════════════════════════\n');
    console.log(`📁 Project ID: ${projectId}`);
    console.log(`📧 Service Account: ${clientEmail}\n`);

    // جلب قائمة Collections
    console.log('⏳ جاري جلب قائمة Collections...\n');
    const allCollections = await getAllCollections();

    // دمج مع المعروفة
    const collectionsToCheck = [...new Set([...allCollections, ...KNOWN_COLLECTIONS])];

    console.log('📊 إحصائيات Collections:\n');
    console.log('┌─────────────────────────────┬──────────┬────────────┬─────────────────────────────────────────┐');
    console.log('│ Collection                  │ Documents│ Size (KB)  │ Sample Fields                           │');
    console.log('├─────────────────────────────┼──────────┼────────────┼─────────────────────────────────────────┤');

    let totalDocs = 0;
    let totalSize = 0;
    const activeCollections = [];

    for (const name of collectionsToCheck.sort()) {
        const stats = await getCollectionStats(name);
        if (stats) {
            activeCollections.push(stats);
            totalDocs += stats.count;
            totalSize += stats.estimatedSizeKB;

            const countStr = (stats.hasMore ? '1000+' : stats.count.toString()).padStart(8);
            const sizeStr = stats.estimatedSizeKB.toString().padStart(10);
            const fieldsStr = stats.sampleFields.slice(0, 5).join(', ').substring(0, 39).padEnd(39);

            console.log(`│ ${name.padEnd(27)} │ ${countStr} │ ${sizeStr} │ ${fieldsStr} │`);
        }
    }

    console.log('└─────────────────────────────┴──────────┴────────────┴─────────────────────────────────────────┘');

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('📈 ملخص إجمالي:');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`   📂 عدد Collections النشطة: ${activeCollections.length}`);
    console.log(`   📄 إجمالي المستندات: ${totalDocs.toLocaleString()}`);
    console.log(`   💾 الحجم التقريبي: ${(totalSize / 1024).toFixed(2)} MB`);

    // تفاصيل أكبر Collections
    console.log('\n🔝 أكبر 10 Collections:');
    console.log('───────────────────────────────────────────────────────────');

    activeCollections
        .sort((a, b) => b.count - a.count)
        .slice(0, 10)
        .forEach((col, idx) => {
            const bar = '█'.repeat(Math.min(30, Math.round(col.count / 50)));
            console.log(`   ${(idx + 1).toString().padStart(2)}. ${col.name.padEnd(20)} ${col.count.toString().padStart(6)} docs ${bar}`);
        });

    // فحص المستخدمين
    console.log('\n👥 تفاصيل حسابات المستخدمين:');
    console.log('───────────────────────────────────────────────────────────');

    const userTypes = ['players', 'admins', 'marketers', 'academies', 'clubs', 'agents', 'parents'];
    for (const type of userTypes) {
        const stats = activeCollections.find(c => c.name === type);
        if (stats) {
            console.log(`   • ${type}: ${stats.count} accounts`);
        }
    }

    // فحص المدفوعات
    console.log('\n💰 تفاصيل المدفوعات:');
    console.log('───────────────────────────────────────────────────────────');

    const paymentTypes = ['payments', 'invoices', 'receipts', 'subscriptions'];
    for (const type of paymentTypes) {
        const stats = activeCollections.find(c => c.name === type);
        if (stats) {
            console.log(`   • ${type}: ${stats.count} records`);
        }
    }

    // حساب تكلفة Firebase المتوقعة
    console.log('\n💵 تقدير تكلفة Firebase الشهرية:');
    console.log('───────────────────────────────────────────────────────────');

    // تقدير بناءً على الاستخدام
    const estimatedReads = totalDocs * 100; // افتراض 100 قراءة لكل مستند شهرياً
    const estimatedWrites = totalDocs * 10; // افتراض 10 كتابة لكل مستند شهرياً

    const readCost = (estimatedReads / 100000) * 0.06; // $0.06 per 100K reads
    const writeCost = (estimatedWrites / 100000) * 0.18; // $0.18 per 100K writes
    const storageCost = (totalSize / 1024 / 1024) * 0.18; // $0.18 per GB

    console.log(`   📖 قراءات متوقعة/شهر: ${estimatedReads.toLocaleString()}`);
    console.log(`   ✏️ كتابات متوقعة/شهر: ${estimatedWrites.toLocaleString()}`);
    console.log(`   💾 تخزين: ${(totalSize / 1024).toFixed(2)} MB`);
    console.log(`   ───────────────────────────────────`);
    console.log(`   💰 تكلفة القراءات: $${readCost.toFixed(2)}`);
    console.log(`   💰 تكلفة الكتابات: $${writeCost.toFixed(2)}`);
    console.log(`   💰 تكلفة التخزين: $${storageCost.toFixed(2)}`);
    console.log(`   ═══════════════════════════════════`);
    console.log(`   💵 التكلفة الإجمالية المتوقعة: $${(readCost + writeCost + storageCost).toFixed(2)}/شهر`);

    console.log('\n✅ اكتمل الفحص!\n');

    process.exit(0);
}

main().catch(error => {
    console.error('❌ خطأ:', error);
    process.exit(1);
});
