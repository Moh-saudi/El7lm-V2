const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// تحميل المتغيرات البيئية
require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase URL or Service Role Key in .env.local');
  process.exit(1);
}

// تهيئة عميل Supabase بصلاحيات Service Role لتخطي حماية RLS أثناء الرفع
const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const inputFile = path.resolve(process.cwd(), 'firebase_full_export.json');

// تقسيم البيانات إلى دفعات (Batches) لتجنب أخطاء حظر الحجم الزائد (Payload too large)
function chunkArray(array, size) {
    const chunked = [];
    for (let i = 0; i < array.length; i += size) {
        chunked.push(array.slice(i, i + size));
    }
    return chunked;
}

// تنظيف البيانات (إزالة أي حقول غير مدعومة أو ضبط التنسيق قبل الرفع)
function cleanData(doc) {
    const cleaned = { ...doc };
    Object.keys(cleaned).forEach(key => {
        let val = cleaned[key];
        
        // معالجة مشكلة Timestamps (تجنب خطأ serverTimestamp)
        if (val && typeof val === 'object') {
            // إذا كان كائن Firestore Timestamp يحتوي على ثوانٍ
            if (val.seconds !== undefined) {
                cleaned[key] = new Date(val.seconds * 1000).toISOString();
            } 
            // إذا كان كائن serverTimestamp() من فايربيز
            else if (val._methodName === 'serverTimestamp' || Object.keys(val).length === 0) {
                cleaned[key] = new Date().toISOString(); // استبداله بالوقت الحالي
            }
        }
        
        if (cleaned[key] === undefined) {
            cleaned[key] = null;
        }
    });
    return cleaned;
}

async function runImport() {
    if (!fs.existsSync(inputFile)) {
        console.error('❌ File not found: firebase_full_export.json');
        process.exit(1);
    }

    console.log('⏳ Reading JSON export file (24MB)...');
    const rawData = fs.readFileSync(inputFile, 'utf-8');
    const db = JSON.parse(rawData);

    // حجم الدفعة: قللناه من 500 إلى 100 لتفادي أخطاء 502
    const BATCH_SIZE = 100; 

    for (const [collectionName, documents] of Object.entries(db)) {
        if (!documents || documents.length === 0) {
            console.log(`⏭️ Skipping empty collection: ${collectionName}`);
            continue;
        }

        console.log(`\n🚀 Migrating table [${collectionName}]: ${documents.length} rows`);
        const cleanedDocs = documents.map(cleanData);
        
        // إزالة التكرار بناءً على الـ ID قبل التقسيم لدفعات
        const uniqueDocsMap = new Map();
        cleanedDocs.forEach(doc => {
            if (doc.id) uniqueDocsMap.set(doc.id, doc);
        });
        const uniqueDocs = Array.from(uniqueDocsMap.values());
        
        const batches = chunkArray(uniqueDocs, BATCH_SIZE);

        let successCount = 0;

        for (let i = 0; i < batches.length; i++) {
            const batch = batches[i];
            let retryCount = 0;
            const maxRetries = 3;
            let batchSuccess = false;

            while (retryCount < maxRetries && !batchSuccess) {
                const { error } = await supabase
                    .from(collectionName)
                    .upsert(batch, { onConflict: 'id' });

                if (error) {
                    retryCount++;
                    console.error(`\n⚠️ Attempt ${retryCount} failed for batch ${i + 1}/${batches.length} in ${collectionName}: ${error.message}`);
                    
                    if (retryCount < maxRetries) {
                        const waitTime = retryCount * 2000; // انتظر وقت أطول مع كل محاولة فاشلة
                        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                    } else {
                        console.error(`❌ Permanent failure for batch ${i + 1} after ${maxRetries} attempts.`);
                    }
                } else {
                    successCount += batch.length;
                    batchSuccess = true;
                    process.stdout.write(`\r✅ Progress: ${successCount}/${documents.length} rows inserted. (Batch ${i+1}/${batches.length})`);
                }
            }

            // تأخير بين الدفعات لتخفيف الحمل
            await new Promise(resolve => setTimeout(resolve, 200));
        }
        console.log(`\n🎉 Completed table [${collectionName}]`);
    }

    console.log('\n=============================================');
    console.log('🏁 SUPERB! ALL DATABASE MIGRATION COMPLETED!');
    console.log('=============================================');
}

runImport().catch(console.error);
