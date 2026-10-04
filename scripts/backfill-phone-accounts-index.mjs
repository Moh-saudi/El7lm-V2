/**
 * Script: backfill-phone-accounts-index.mjs
 * Description: آمن وبلا حذف لملء جدول phone_accounts_index من جداول الحسابات
 * Supports: --dry-run (default), --commit
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load .env.local if present
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

// Centralized phone normalization function (matching src/lib/validation/phone-validation.ts)
function normalizePhone(rawPhone) {
  if (!rawPhone) return '';
  const trimmed = String(rawPhone).trim();
  if (!trimmed) return '';

  let digits = trimmed.replace(/\D/g, '');
  if (!digits) return '';

  if (digits.startsWith('00')) {
    digits = digits.substring(2);
  }

  // Egypt (+20)
  if (digits.startsWith('01') && digits.length === 11) {
    return `+20${digits.substring(1)}`;
  }
  if (digits.startsWith('201') && digits.length === 12) {
    return `+${digits}`;
  }
  if (digits.length === 10 && ['10', '11', '12', '15'].some(p => digits.startsWith(p))) {
    return `+20${digits}`;
  }

  // Saudi (+966)
  if (digits.startsWith('05') && digits.length === 10) {
    return `+966${digits.substring(1)}`;
  }
  if (digits.startsWith('5') && digits.length === 9) {
    return `+966${digits}`;
  }
  if (digits.startsWith('9665') && digits.length === 12) {
    return `+${digits}`;
  }

  // UAE (+971)
  if (digits.startsWith('05') && digits.length === 10 && trimmed.includes('+971')) {
    return `+971${digits.substring(1)}`;
  }
  if (digits.startsWith('971') && digits.length >= 11) {
    return `+${digits}`;
  }

  digits = digits.replace(/^0+/, '');
  return digits ? `+${digits}` : '';
}

const SOURCES = [
  { table: 'players', accountType: 'player', phoneFields: ['phone', 'phoneNumber', 'originalPhone', 'phoneNormalized', 'whatsapp'] },
  { table: 'clubs', accountType: 'club', phoneFields: ['phone', 'originalPhone', 'phoneNormalized', 'whatsapp'] },
  { table: 'academies', accountType: 'academy', phoneFields: ['phone', 'whatsapp'] },
  { table: 'agents', accountType: 'agent', phoneFields: ['phone', 'originalPhone', 'phoneNormalized', 'whatsapp'] },
  { table: 'trainers', accountType: 'trainer', phoneFields: ['phone', 'originalPhone', 'phoneNormalized', 'whatsapp'] },
  { table: 'marketers', accountType: 'marketer', phoneFields: ['phone', 'originalPhone', 'phoneNormalized'] },
  { table: 'admins', accountType: 'admin', phoneFields: ['phone'] },
  { table: 'users', accountType: 'player', phoneFields: ['phone', 'phoneNumber', 'originalPhone', 'phoneNormalized', 'whatsapp'] },
];

async function runBackfill() {
  const isCommit = process.argv.includes('--commit');
  console.log(`🚀 Starting Phone Accounts Index Backfill [Mode: ${isCommit ? 'COMMIT (Write to DB)' : 'DRY-RUN (Simulate)'}]...\n`);

  const indexedRecords = new Map(); // phone_normalized -> Record
  const conflicts = []; // Duplicate phone detected across different accounts
  let totalRowsRead = 0;

  for (const src of SOURCES) {
    console.log(`Reading table: ${src.table}...`);
    try {
      const { data, error } = await supabase.from(src.table).select('*').limit(2000);
      if (error) {
        console.warn(`  ⚠️ Could not read ${src.table} (${error.message}). Skipping.`);
        continue;
      }
      if (!data || data.length === 0) {
        console.log(`  Table ${src.table} is empty.`);
        continue;
      }

      totalRowsRead += data.length;

      for (const row of data) {
        if (row.isDeleted === true || row.deletedAt) continue;

        const accountId = String(row.id || '').trim();
        if (!accountId) continue;

        const uid = row.uid || row.supabase_uid || null;
        const actualType = String(row.accountType || src.accountType).toLowerCase();

        // Extract and normalize phones from known phone fields
        const phonesFound = new Set();
        for (const field of src.phoneFields) {
          const val = row[field];
          if (val && typeof val === 'string') {
            const norm = normalizePhone(val);
            if (norm && norm.length >= 8) phonesFound.add(norm);
          }
        }

        for (const phoneNorm of phonesFound) {
          if (!indexedRecords.has(phoneNorm)) {
            indexedRecords.set(phoneNorm, {
              phone_normalized: phoneNorm,
              account_id: accountId,
              account_type: actualType,
              source_table: src.table,
              supabase_uid: uid,
            });
          } else {
            const existing = indexedRecords.get(phoneNorm);
            if (existing.account_id !== accountId) {
              conflicts.push({
                phone: phoneNorm,
                account1: { id: existing.account_id, type: existing.account_type, table: existing.source_table },
                account2: { id: accountId, type: actualType, table: src.table },
              });
            } else if (!existing.supabase_uid && uid) {
              // Update with UID if available
              existing.supabase_uid = uid;
            }
          }
        }
      }
      console.log(`  Processed ${data.length} rows from ${src.table}.`);
    } catch (err) {
      console.warn(`  ⚠️ Exception reading ${src.table}:`, err?.message || err);
    }
  }

  console.log(`\n📊 Backfill Scan Summary:`);
  console.log(`  Total Source Rows Evaluated: ${totalRowsRead}`);
  console.log(`  Unique Normalized Phones Ready to Index: ${indexedRecords.size}`);
  console.log(`  Conflicts Detected: ${conflicts.length}`);

  // Write conflicts report
  const conflictsReportPath = path.resolve(process.cwd(), 'docs/review/phone_conflicts_report.json');
  fs.writeFileSync(conflictsReportPath, JSON.stringify(conflicts, null, 2), 'utf8');
  console.log(`  Conflicts report saved to: ${conflictsReportPath}`);

  if (isCommit && indexedRecords.size > 0) {
    console.log(`\nWriting to table public.phone_accounts_index...`);
    const records = Array.from(indexedRecords.values());
    const batchSize = 100;
    let inserted = 0;

    for (let i = 0; i < records.length; i += batchSize) {
      const batch = records.slice(i, i + batchSize);
      const { error } = await supabase.from('phone_accounts_index').upsert(batch, {
        onConflict: 'phone_normalized',
      });
      if (error) {
        console.error(`  ❌ Batch error:`, error.message);
      } else {
        inserted += batch.length;
      }
    }
    console.log(`✅ Successfully committed ${inserted} records to phone_accounts_index.`);
  } else if (!isCommit) {
    console.log(`\nℹ️ Dry-run completed. No changes written to database.`);
    console.log(`To commit to database, run: node scripts/backfill-phone-accounts-index.mjs --commit`);
  }
}

runBackfill().catch(err => {
  console.error('Fatal error during backfill:', err);
  process.exit(1);
});
