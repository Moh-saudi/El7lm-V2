/**
 * Smart Firebase → Supabase Migration v2
 * - يفحص schema Supabase لكل جدول
 * - يحذف الأعمدة الزائدة قبل الاستيراد
 * - يستورد فقط الصفوف الناقصة (لا تكرار)
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

require('dotenv').config({ path: path.resolve(process.cwd(), '.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// الجداول التي تحتاج استيراد (بناءً على الفحص)
const TABLES_NEEDING_IMPORT = [
  'users',
  'messages',
  'geidea_payments',
  'subscriptions',
  'analytics',
  'analytics_visits',
  'tournament_registrations',
  'tournamentRegistrations',
  'payment_results',
  'admins',
  'payment_action_logs',
  'support_notifications',
  'private_sessions_requests',
  'dream_academy_categories',
];

// جلب أعمدة Supabase عبر OpenAPI
async function getSupabaseColumns(tableName) {
  const resp = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/?apikey=${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } }
  );
  const json = await resp.json();
  const def = json.definitions && json.definitions[tableName];
  if (!def) return null;
  return new Set(Object.keys(def.properties || {}));
}

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) chunks.push(array.slice(i, i + size));
  return chunks;
}

// تنظيف قيم Firestore الخاصة
function cleanValue(val) {
  if (val === undefined) return null;
  if (val && typeof val === 'object') {
    if (typeof val.toDate === 'function') return val.toDate().toISOString();
    if (val.seconds !== undefined && val.nanoseconds !== undefined) {
      return new Date(val.seconds * 1000).toISOString();
    }
    if (val._methodName === 'serverTimestamp') return new Date().toISOString();
    if (!Array.isArray(val) && Object.keys(val).length === 0) return null;
  }
  return val;
}

// تنظيف document وحذف الأعمدة الزائدة
function cleanAndFilterDoc(doc, allowedColumns) {
  const cleaned = {};
  for (const [key, val] of Object.entries(doc)) {
    if (allowedColumns && !allowedColumns.has(key)) continue; // حذف الأعمدة غير الموجودة
    cleaned[key] = cleanValue(val);
  }
  // تأكد من وجود id
  if (doc.id && !cleaned.id) cleaned.id = doc.id;
  return cleaned;
}

async function importMissingData(tableName, firebaseData, allowedColumns) {
  if (!firebaseData || firebaseData.length === 0) return { imported: 0, skipped: 0, errors: 0 };

  // جلب الـ IDs الموجودة في Supabase
  const existingIds = new Set();
  let offset = 0;
  const PAGE_SIZE = 1000;
  while (true) {
    const { data, error } = await supabase
      .from(tableName)
      .select('id')
      .range(offset, offset + PAGE_SIZE - 1);
    if (error || !data || data.length === 0) break;
    data.forEach(row => { if (row.id) existingIds.add(row.id); });
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }

  // استخراج الصفوف الناقصة فقط
  const missingDocs = firebaseData.filter(doc => doc.id && !existingIds.has(doc.id));

  if (missingDocs.length === 0) {
    return { imported: 0, skipped: firebaseData.length, errors: 0, total_firebase: firebaseData.length };
  }

  // تنظيف وتصفية الأعمدة
  const cleanedDocs = missingDocs.map(doc => cleanAndFilterDoc(doc, allowedColumns));

  const BATCH_SIZE = 50;
  const batches = chunkArray(cleanedDocs, BATCH_SIZE);
  let imported = 0;
  let errors = 0;
  const errorDetails = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      // محاولة واحدة بواحدة لتحديد المشكلة
      for (const doc of batch) {
        const { error: sErr } = await supabase
          .from(tableName)
          .upsert(doc, { onConflict: 'id', ignoreDuplicates: true });
        if (sErr) {
          errors++;
          if (errorDetails.length < 3) {
            errorDetails.push({ id: doc.id, msg: sErr.message });
          }
        } else {
          imported++;
        }
      }
    } else {
      imported += batch.length;
    }

    process.stdout.write(
      `\r  [${tableName}] ${i + 1}/${batches.length} batches | ✅ ${imported} imported | ❌ ${errors} errors`
    );
    await new Promise(r => setTimeout(r, 80));
  }

  return {
    imported,
    skipped: firebaseData.length - missingDocs.length,
    errors,
    total_firebase: firebaseData.length,
    total_missing: missingDocs.length,
    errorDetails,
  };
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   Smart Firebase → Supabase Migration v2                 ║');
  console.log('║   Column-aware | Dedup-safe | Clean data                 ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  // تحميل بيانات Firebase
  console.log('📂 Loading firebase_full_export.json...');
  const firebaseData = JSON.parse(
    fs.readFileSync(path.resolve(process.cwd(), 'firebase_full_export.json'), 'utf-8')
  );
  console.log('✅ Loaded', Object.keys(firebaseData).length, 'collections');
  console.log('');

  // ═══════════════════════════════════════════
  // STEP 1: جلب schemas وفحص الفرق
  // ═══════════════════════════════════════════
  console.log('📋 STEP 1: جلب Supabase schemas...');
  const schemaCache = {};
  for (const tableName of TABLES_NEEDING_IMPORT) {
    schemaCache[tableName] = await getSupabaseColumns(tableName);
  }
  console.log('✅ Schemas loaded\n');

  // ═══════════════════════════════════════════
  // STEP 2: استيراد البيانات الناقصة
  // ═══════════════════════════════════════════
  console.log('📥 STEP 2: استيراد البيانات الناقصة...');
  console.log('─'.repeat(60));

  const results = {};
  let grandTotal = 0;

  for (const tableName of TABLES_NEEDING_IMPORT) {
    const fbData = firebaseData[tableName];
    const allowedCols = schemaCache[tableName];

    if (!fbData || fbData.length === 0) {
      console.log(`\n  ⏭️  Skip [${tableName}] - لا توجد بيانات في Firebase`);
      continue;
    }

    if (!allowedCols) {
      console.log(`\n  ⚠️  Skip [${tableName}] - لا يوجد schema في Supabase`);
      continue;
    }

    console.log(`\n  🔄 [${tableName}] Firebase: ${fbData.length} docs | Schema cols: ${allowedCols.size}`);

    const result = await importMissingData(tableName, fbData, allowedCols);
    results[tableName] = result;
    grandTotal += result.imported;

    let line = `\n  ✅ [${tableName}]: Imported ${result.imported} | Skipped ${result.skipped} existing`;
    if (result.errors > 0) {
      line += ` | ❌ ${result.errors} errors`;
      if (result.errorDetails && result.errorDetails.length > 0) {
        result.errorDetails.forEach(e => {
          line += `\n      → id: ${e.id} | ${e.msg}`;
        });
      }
    }
    console.log(line);
  }

  // ═══════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║                    MIGRATION REPORT                      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Table'.padEnd(32) + 'FB Total'.padEnd(12) + 'Missing'.padEnd(12) + 'Imported'.padEnd(12) + 'Errors');
  console.log('─'.repeat(72));

  for (const [table, r] of Object.entries(results)) {
    const status = r.errors === 0 ? '✅' : r.imported > 0 ? '⚠️' : '❌';
    console.log(
      status + ' ' + table.padEnd(30),
      String(r.total_firebase).padEnd(12),
      String(r.total_missing).padEnd(12),
      String(r.imported).padEnd(12),
      String(r.errors)
    );
  }

  console.log('');
  console.log(`🎉 المجموع الكلي للصفوف المستوردة: ${grandTotal}`);
  console.log('');
  console.log('✅ Migration Complete!');
}

main().catch(err => {
  console.error('\n❌ Fatal Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
