/**
 * سكريبت لإثراء سجلات geidea_payments القديمة بمعلومات الباقة
 * 
 * يقوم هذا السكريبت بـ:
 * 1. البحث عن جميع سجلات geidea_payments التي لا تحتوي على plan_name
 * 2. محاولة استخراج معلومات الباقة من بيانات المستخدم
 * 3. تحديث السجلات بالمعلومات الجديدة
 */

const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
    });
}

const db = admin.firestore();

/**
 * استخراج معلومات الباقة من بيانات المستخدم
 */
async function getPackageInfoForUser(merchantReferenceId, customerEmail, customerPhone) {
    try {
        let userId = null;

        // 1️⃣ محاولة استخراج UID من merchantReferenceId
        // Format: EL7LM-{uid}-{timestamp}
        if (merchantReferenceId) {
            const parts = merchantReferenceId.split('-');
            if (parts.length >= 2) {
                userId = parts[1];
                console.log(`  🔍 Extracted UID from merchantRef: ${userId}`);
            }
        }

        // 2️⃣ إذا لم ننجح، ابحث باستخدام email
        if (!userId && customerEmail) {
            console.log(`  🔍 Searching for user by email: ${customerEmail}`);
            const usersSnapshot = await db
                .collection('users')
                .where('email', '==', customerEmail)
                .limit(1)
                .get();

            if (!usersSnapshot.empty) {
                userId = usersSnapshot.docs[0].id;
                console.log(`  ✅ Found user by email, UID: ${userId}`);
            }
        }

        // 3️⃣ إذا لم ننجح، ابحث باستخدام phone
        if (!userId && customerPhone) {
            console.log(`  🔍 Searching for user by phone: ${customerPhone}`);
            const usersSnapshot = await db
                .collection('users')
                .where('phone', '==', customerPhone)
                .limit(1)
                .get();

            if (!usersSnapshot.empty) {
                userId = usersSnapshot.docs[0].id;
                console.log(`  ✅ Found user by phone, UID: ${userId}`);
            }
        }

        // 4️⃣ إذا لم نجد المستخدم
        if (!userId) {
            console.warn(`  ⚠️ Could not find user`);
            return null;
        }

        // 5️⃣ جلب بيانات المستخدم
        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) {
            console.warn(`  ⚠️ User document not found: ${userId}`);
            return null;
        }

        const userData = userDoc.data();
        if (!userData) {
            return null;
        }

        // 6️⃣ استخراج معلومات الباقة
        const packageType = userData.selectedPackage || userData.packageType || userData.package_type || null;
        const plan_name = userData.plan_name || packageType || null;
        const full_name = userData.full_name || userData.name || userData.displayName || null;

        console.log(`  📦 Retrieved package info:`, {
            userId,
            packageType,
            plan_name,
            full_name,
        });

        return {
            plan_name,
            packageType,
            package_type: packageType,
            selectedPackage: packageType,
            full_name,
        };
    } catch (error) {
        console.error(`  ❌ Error getting package info:`, error);
        return null;
    }
}

/**
 * إثراء جميع سجلات geidea_payments
 */
async function enrichGeideaPayments() {
    console.log('🚀 Starting enrichment of geidea_payments records...\n');

    try {
        // جلب جميع سجلات geidea_payments
        const geideaSnapshot = await db.collection('geidea_payments').get();

        console.log(`📊 Found ${geideaSnapshot.size} total records\n`);

        let enrichedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const doc of geideaSnapshot.docs) {
            const data = doc.data();
            const docId = doc.id;

            console.log(`\n📝 Processing: ${docId}`);
            console.log(`  Status: ${data.status}`);
            console.log(`  Email: ${data.customerEmail || 'N/A'}`);
            console.log(`  Phone: ${data.customerPhone || 'N/A'}`);
            console.log(`  Current plan_name: ${data.plan_name || 'N/A'}`);

            // تخطي السجلات التي لديها معلومات الباقة بالفعل
            if (data.plan_name) {
                console.log(`  ⏭️ Skipping - already has plan_name`);
                skippedCount++;
                continue;
            }

            // محاولة الحصول على معلومات الباقة
            const packageInfo = await getPackageInfoForUser(
                data.merchantReferenceId || data.ourMerchantReferenceId,
                data.customerEmail,
                data.customerPhone
            );

            if (!packageInfo || !packageInfo.plan_name) {
                console.log(`  ⚠️ Could not retrieve package info`);
                failedCount++;
                continue;
            }

            // تحديث السجل
            try {
                const updateData = {
                    plan_name: packageInfo.plan_name,
                    packageType: packageInfo.packageType,
                    package_type: packageInfo.package_type,
                    selectedPackage: packageInfo.selectedPackage,
                    enrichedAt: admin.firestore.FieldValue.serverTimestamp(),
                };

                // تحديث الاسم أيضاً إذا كان فارغاً
                if (!data.customerName && packageInfo.full_name) {
                    updateData.customerName = packageInfo.full_name;
                }

                await db.collection('geidea_payments').doc(docId).update(updateData);

                console.log(`  ✅ Updated successfully with plan: ${packageInfo.plan_name}`);
                enrichedCount++;
            } catch (updateError) {
                console.error(`  ❌ Failed to update document:`, updateError);
                failedCount++;
            }
        }

        console.log('\n\n═══════════════════════════════════════════════════════');
        console.log('📊 ENRICHMENT SUMMARY');
        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ Enriched: ${enrichedCount}`);
        console.log(`⏭️ Skipped (already have data): ${skippedCount}`);
        console.log(`❌ Failed: ${failedCount}`);
        console.log(`📝 Total: ${geideaSnapshot.size}`);
        console.log('═══════════════════════════════════════════════════════\n');

    } catch (error) {
        console.error('❌ Fatal error during enrichment:', error);
        throw error;
    }
}

// تشغيل السكريبت
enrichGeideaPayments()
    .then(() => {
        console.log('✅ Enrichment completed successfully!');
        process.exit(0);
    })
    .catch((error) => {
        console.error('❌ Enrichment failed:', error);
        process.exit(1);
    });
