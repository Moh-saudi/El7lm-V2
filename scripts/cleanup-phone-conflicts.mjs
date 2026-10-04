/**
 * Script: cleanup-phone-conflicts.mjs
 * Description: معالجة وتنظيف تعارضات أرقام الهواتف بأمان وتدقيق كامل
 * 
 * Flags:
 *   --dry-run      : الوضع الافتراضي - محاكاة بدون أي تعديل في قاعدة البيانات
 *   --commit       : تطبيق التغييرات على قاعدة البيانات
 *   --fix-formatting : تصحيح أرقام الصنف B الناقصة لكود الدولة +20 (افتراضي عند --commit)
 *   --allow-delete : يسمح بتفريغ/أرشفة حسابات الاختبار المؤكدة (الصنف A) - ممنوع الحذف بدونه!
 *   --help         : عرض إرشادات الاستخدام
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse arguments
const args = process.argv.slice(2);
const isHelp = args.includes('--help');

if (isHelp) {
  console.log(`
الاستخدام:
  node scripts/cleanup-phone-conflicts.mjs [options]

الخيارات:
  --dry-run         تشغيل محاكاة فقط (الوضع الافتراضي) - لا يُعدل قاعدة البيانات
  --commit          تطبيق التعديلات المعتمدة فعلياً في قاعدة البيانات
  --fix-formatting  تطبيق تصحيح صيغ أرقام الصنف B الناقصة (+10... -> +2010...)
  --allow-delete    السماح الصريح بأرشفة/تفريغ هواتف حسابات الاختبار المؤكدة (الصنف A)
                    [تنبيه أمان: لن يتم المساس بحسابات الصنف A نهائياً بدون هذا العلم]
`);
  process.exit(0);
}

const isCommit = args.includes('--commit');
const isDryRun = !isCommit || args.includes('--dry-run');
const allowDelete = args.includes('--allow-delete');
const fixFormatting = !args.includes('--no-fix-formatting');

// Setup Audit Logger
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logDir = path.resolve(process.cwd(), 'docs/review');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFilePath = path.join(logDir, `cleanup-audit-${timestamp}.log`);
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// Load Supabase credentials from .env.local
const envPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.substring(0, idx).trim();
      const val = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  log('================================================================');
  log(`🚀 Starting Safe Phone Conflicts Cleanup`);
  log(`Mode: ${isDryRun ? 'DRY-RUN (Simulation - Read Only)' : 'COMMIT (Applying to Database)'}`);
  log(`Fix Formatting (Class B): ${fixFormatting ? 'ENABLED' : 'DISABLED'}`);
  log(`Allow Deletion / Archive (Class A): ${allowDelete ? 'ENABLED' : 'STRICTLY DISABLED'}`);
  log(`Audit Log File: ${logFilePath}`);
  log('================================================================\n');

  // Load analysis
  const analysisPath = path.resolve(process.cwd(), 'scratch/phase2_6_analysis.json');
  if (!fs.existsSync(analysisPath)) {
    log(`❌ Analysis file not found at ${analysisPath}. Please run detection first.`);
    process.exit(1);
  }

  const analysisData = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

  let fixedCount = 0;
  let archivedTestCount = 0;
  let skippedTestCount = 0;
  let preservedCount = 0;

  for (const phoneGroup of analysisData) {
    log(`\n--- Processing Phone Group: ${phoneGroup.phone} (${phoneGroup.accounts.length} accounts) ---`);

    for (const acc of phoneGroup.accounts) {
      if (acc.table === 'not_found') {
        log(`  [SKIPPED] Account ${acc.account_id} not found in database.`);
        continue;
      }

      // ── Handle Class B: Real accounts with bad formatting ─────────────
      if (acc.classification === 'B') {
        if (!fixFormatting) {
          log(`  [CLASS-B SKIPPED] ${acc.table} ID: ${acc.account_id} (${acc.name}) - --fix-formatting not enabled.`);
          continue;
        }

        // e.g., +106078056 -> +20106078056
        let correctedPhone = phoneGroup.phone;
        if (correctedPhone.startsWith('+1') && correctedPhone.length === 10) {
          correctedPhone = '+20' + correctedPhone.substring(1);
        } else if (correctedPhone.startsWith('+1') && correctedPhone.length === 11) {
          correctedPhone = '+20' + correctedPhone.substring(2);
        } else {
          correctedPhone = '+20' + correctedPhone.replace(/^\+/, '');
        }

        log(`  [CLASS-B ACTION] Fixing phone format for ${acc.table} ID: ${acc.account_id} (${acc.name}):`);
        log(`     Old: ${phoneGroup.phone} -> Corrected: ${correctedPhone}`);

        if (!isDryRun) {
          const updatePayload = {
            phone: correctedPhone,
            phoneNormalized: correctedPhone,
            updatedAt: new Date().toISOString()
          };
          const { error } = await supabase.from(acc.table).update(updatePayload).eq('id', acc.account_id);
          if (error) {
            log(`     ❌ Error updating: ${error.message}`);
          } else {
            log(`     ✅ Successfully updated in ${acc.table}.`);
            fixedCount++;
          }
        } else {
          log(`     [SIMULATION] Would update ${acc.table}.${acc.account_id} phone to ${correctedPhone}`);
          fixedCount++;
        }
      }

      // ── Handle Class A: Safe test accounts ────────────────────────────
      else if (acc.classification === 'A') {
        if (!allowDelete) {
          log(`  [CLASS-A PROTECTED] ${acc.table} ID: ${acc.account_id} ("${acc.name}") is a safe test account.`);
          log(`     ⚠️ SKIPPED deletion/clearing because --allow-delete was NOT explicitly passed.`);
          skippedTestCount++;
          continue;
        }

        log(`  [CLASS-A ACTION] Archiving test account / clearing phone for ${acc.table} ID: ${acc.account_id} ("${acc.name}")`);
        if (!isDryRun) {
          // Safe soft-archive: clear conflicting phone and mark test record
          const updatePayload = {
            previousPhone: phoneGroup.phone,
            phone: null,
            phoneNormalized: null,
            isDeleted: true,
            deletedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          };
          const { error } = await supabase.from(acc.table).update(updatePayload).eq('id', acc.account_id);
          if (error) {
            log(`     ❌ Error archiving test record: ${error.message}`);
          } else {
            log(`     ✅ Successfully cleared conflicting phone and marked test account as archived.`);
            archivedTestCount++;
          }
        } else {
          log(`     [SIMULATION] Would safely clear phone and mark test account archived in ${acc.table}`);
          archivedTestCount++;
        }
      }

      // ── Handle Class C: Unknown / Duplicate Accounts ──────────────────
      else if (acc.classification === 'C') {
        log(`  [CLASS-C PRESERVED] ${acc.table} ID: ${acc.account_id} ("${acc.name}", email: ${acc.email}):`);
        log(`     🛡️ PRESERVED WITHOUT MODIFICATION. Data preserved 100%. Handled via index primary resolution.`);
        preservedCount++;
      }
    }
  }

  log('\n================================================================');
  log(`🏁 Safe Phone Cleanup Execution Finished`);
  log(`Summary:`);
  log(`  - Class B Format Corrections: ${fixedCount} (${isDryRun ? 'Simulated' : 'Executed'})`);
  log(`  - Class A Test Records Cleared/Archived: ${archivedTestCount} (${isDryRun ? 'Simulated' : 'Executed'})`);
  log(`  - Class A Test Records Protected (Skipped): ${skippedTestCount}`);
  log(`  - Class C Records Safely Preserved As-Is: ${preservedCount}`);
  log(`Audit log written to: ${logFilePath}`);
  log('================================================================');

  logStream.end();
}

main().catch(err => {
  log(`❌ Fatal error: ${err.message}`);
  logStream.end();
  process.exit(1);
});
