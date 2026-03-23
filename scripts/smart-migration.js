/**
 * Smart Firebase → Supabase Migration Script
 * - يفحص البيانات الموجودة في Supabase
 * - يكشف التكرارات ويزيلها
 * - يستورد فقط البيانات الناقصة
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

// الجداول التي تحتاج استيراد (Firebase > Supabase)
const TABLES_NEEDING_IMPORT = [
  'users',              // 167 missing
  'messages',           // 217 missing
  'geidea_payments',    // 99 missing
  'subscriptions',      // 35 missing
  'analytics',          // 3197 missing
  'analytics_visits',   // 4077 missing
  'tournament_registrations', // 14 missing
  'tournamentRegistrations',  // 5 missing
  'payment_results',    // 2 missing
  'admins',             // 2 missing
  'payment_action_logs',// 1 missing
  'support_notifications', // 1 missing
  'private_sessions_requests', // 1 missing
  'dream_academy_categories',  // 1 missing (6 in SB vs 7 in FB)
];

// الجداول التي يجب فحص التكرارات فيها
const ALL_TABLES = [
  'email_logs', 'geidea_payments', 'admin_notifications', 'referrals', 'otp_verifications',
  'tournaments', 'join_request_notifications', 'ads', 'receipts', 'subscriptions', 'academies',
  'partners', 'payment_settings', 'player_stats', 'security_logs', 'real-time-updates',
  'customers', 'real-time-stats', 'otps', 'settings', 'otp_codes', 'employees', 'payment_results',
  'employee_activities', 'countries', 'admins', 'geidea_settings', 'interaction_notifications',
  'players', 'analytics', 'subscription_plans', 'bulkPayments', 'backup_otps', 'content',
  'trainers', 'tournament_registrations', 'smart_notifications', 'player_rewards', 'invoices',
  'tournamentRegistrations', 'system_configs', 'academys', 'dream_academy_sources',
  'adminLogs', 'support_notifications', 'support_conversations', 'cities', 'passwordResetTokens',
  'video_action_logs', 'clubs', 'messages', 'player_action_logs', 'support_messages', 'agents',
  'organization_referrals', 'careers_applications', 'dream_academy_categories', 'payment_action_logs',
  'dream_academy_stats', 'player_join_requests', 'analytics_visits', 'users', 'marketers', 'roles',
  'careerApplications', 'player_notifications', 'notifications', 'conversations', 'private_sessions_requests'
];

function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function cleanDoc(doc) {
  const cleaned = { ...doc };
  function processVal(obj) {
    if (!obj || typeof obj !== 'object') return;
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val === undefined) {
        obj[key] = null;
      } else if (val && typeof val === 'object') {
        if (typeof val.toDate === 'function') {
          obj[key] = val.toDate().toISOString();
        } else if (val.seconds !== undefined && val.nanoseconds !== undefined) {
          obj[key] = new Date(val.seconds * 1000).toISOString();
        } else if (val._methodName === 'serverTimestamp' ||
                   (typeof val === 'object' && !Array.isArray(val) && Object.keys(val).length === 0)) {
          obj[key] = new Date().toISOString();
        } else {
          processVal(val);
        }
      }
    }
  }
  processVal(cleaned);
  return cleaned;
}

async function checkDuplicatesInTable(tableName) {
  // جلب كل الـ IDs
  const { data, error } = await supabase
    .from(tableName)
    .select('id')
    .order('id');

  if (error) return { duplicates: 0, error: error.message };
  if (!data || data.length === 0) return { duplicates: 0 };

  const idCounts = {};
  for (const row of data) {
    const id = row.id;
    if (id) idCounts[id] = (idCounts[id] || 0) + 1;
  }

  const duplicateIds = Object.entries(idCounts).filter(([, count]) => count > 1);
  return { duplicates: duplicateIds.length, duplicateIds: duplicateIds.map(([id]) => id) };
}

async function removeDuplicatesFromTable(tableName, duplicateIds) {
  let removed = 0;
  for (const id of duplicateIds) {
    // جلب جميع الصفوف المكررة
    const { data } = await supabase.from(tableName).select('*').eq('id', id);
    if (!data || data.length <= 1) continue;

    // احتفظ بالأول فقط، احذف الباقي (نحذف كل شيء ثم نعيد إدراج واحد)
    const keepRow = data[0];

    // حذف الكل
    await supabase.from(tableName).delete().eq('id', id);

    // إعادة إدراج واحد
    await supabase.from(tableName).insert(keepRow);
    removed += data.length - 1;
  }
  return removed;
}

async function importMissingData(tableName, firebaseData) {
  if (!firebaseData || firebaseData.length === 0) return { imported: 0, skipped: 0 };

  // جلب الـ IDs الموجودة في Supabase
  let existingIds = new Set();

  // جلب بدفعات لأن بعض الجداول كبيرة
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

  // تصفية البيانات غير الموجودة فقط
  const missingDocs = firebaseData.filter(doc => doc.id && !existingIds.has(doc.id));
  const cleanedDocs = missingDocs.map(cleanDoc);

  if (cleanedDocs.length === 0) {
    return { imported: 0, skipped: firebaseData.length };
  }

  // استيراد بدفعات
  const BATCH_SIZE = 100;
  const batches = chunkArray(cleanedDocs, BATCH_SIZE);
  let imported = 0;
  let errors = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const { error } = await supabase
      .from(tableName)
      .upsert(batch, { onConflict: 'id', ignoreDuplicates: true });

    if (error) {
      // محاولة إدراج واحد بواحد عند الخطأ
      for (const doc of batch) {
        const { error: singleError } = await supabase
          .from(tableName)
          .upsert(doc, { onConflict: 'id', ignoreDuplicates: true });
        if (singleError) {
          errors++;
        } else {
          imported++;
        }
      }
    } else {
      imported += batch.length;
    }

    process.stdout.write(`\r  [${tableName}] Batch ${i+1}/${batches.length} - Imported: ${imported}/${cleanedDocs.length}`);
    await new Promise(r => setTimeout(r, 100));
  }

  return {
    imported,
    skipped: firebaseData.length - missingDocs.length,
    errors,
    total_firebase: firebaseData.length,
    total_missing: missingDocs.length
  };
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║   Smart Firebase → Supabase Migration                ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');

  // ═══════════════════════════════════════════
  // STEP 1: فحص وإزالة التكرارات
  // ═══════════════════════════════════════════
  console.log('📋 STEP 1: فحص التكرارات في Supabase...');
  console.log('-'.repeat(55));

  let totalDuplicatesFound = 0;
  let totalDuplicatesRemoved = 0;

  // فحص جداول البيانات المهمة فقط (الكبيرة)
  const tablesToCheckDups = ['users', 'players', 'customers', 'notifications',
    'interaction_notifications', 'referrals', 'conversations', 'support_messages',
    'player_rewards', 'video_action_logs', 'player_action_logs', 'security_logs'];

  for (const table of tablesToCheckDups) {
    const result = await checkDuplicatesInTable(table);
    if (result.error) {
      console.log(`  ${table.padEnd(35)} ⚠️  Error: ${result.error}`);
      continue;
    }
    if (result.duplicates > 0) {
      console.log(`  ${table.padEnd(35)} 🔴 ${result.duplicates} duplicate IDs found!`);
      const removed = await removeDuplicatesFromTable(table, result.duplicateIds);
      console.log(`  ${table.padEnd(35)} ✅ Removed ${removed} duplicate rows`);
      totalDuplicatesFound += result.duplicates;
      totalDuplicatesRemoved += removed;
    } else {
      console.log(`  ${table.padEnd(35)} ✅ No duplicates`);
    }
  }

  console.log('');
  console.log(`✅ Duplicate check complete: Found ${totalDuplicatesFound}, Removed ${totalDuplicatesRemoved}`);
  console.log('');

  // ═══════════════════════════════════════════
  // STEP 2: استيراد البيانات الناقصة
  // ═══════════════════════════════════════════
  console.log('📥 STEP 2: استيراد البيانات الناقصة من Firebase...');
  console.log('-'.repeat(55));

  const firebaseData = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), 'firebase_full_export.json'), 'utf-8'));

  const importResults = {};
  let grandTotalImported = 0;

  for (const tableName of TABLES_NEEDING_IMPORT) {
    const fbData = firebaseData[tableName];
    if (!fbData || fbData.length === 0) {
      console.log(`\n  ⏭️  Skipping ${tableName} - no data in Firebase`);
      continue;
    }

    console.log(`\n  🔄 Processing [${tableName}] - ${fbData.length} Firebase docs...`);
    const result = await importMissingData(tableName, fbData);
    importResults[tableName] = result;
    grandTotalImported += result.imported;

    console.log(`\n  ✅ [${tableName}]: Imported ${result.imported} new | Skipped ${result.skipped} existing${result.errors > 0 ? ` | ❌ ${result.errors} errors` : ''}`);
  }

  // ═══════════════════════════════════════════
  // FINAL REPORT
  // ═══════════════════════════════════════════
  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║                  MIGRATION REPORT                    ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log('');
  console.log('Table'.padEnd(35), 'Firebase'.padEnd(10), 'Imported'.padEnd(10), 'Skipped');
  console.log('-'.repeat(65));

  for (const [table, result] of Object.entries(importResults)) {
    console.log(
      table.padEnd(35),
      String(result.total_firebase).padEnd(10),
      String(result.imported).padEnd(10),
      String(result.skipped)
    );
  }

  console.log('');
  console.log(`🎉 DONE! Total new rows imported: ${grandTotalImported}`);
  console.log(`🧹 Duplicates cleaned: ${totalDuplicatesRemoved} rows removed`);
}

main().catch(err => {
  console.error('\n❌ Fatal Error:', err.message);
  process.exit(1);
});
