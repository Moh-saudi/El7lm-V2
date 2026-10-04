/**
 * Script: execute-phase-2-7.mjs
 * Description: Phase 2.7 — Safe Phone Normalization Execution with Safety Checkpoints
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Setup audit logging
const timestamp = new Date().toISOString();
const fileTimestamp = timestamp.replace(/[:.]/g, '-');
const logDir = path.resolve(process.cwd(), 'docs/review');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFilePath = path.join(logDir, `phase-2-7-execution-${fileTimestamp}.log`);
const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`;
  console.log(line);
  logStream.write(line + '\n');
}

// Load Supabase credentials
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

// Centralized phone normalization
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

async function run() {
  log('================================================================');
  log('🚀 Starting Phase 2.7 Execution with Safety Checkpoints');
  log(`Timestamp: ${timestamp}`);
  log('================================================================\n');

  // Load preview data
  const previewPath = path.resolve(process.cwd(), 'scratch/class_b_detailed_fields.json');
  const targetAccounts = JSON.parse(fs.readFileSync(previewPath, 'utf8'));

  // ==============================================================
  // CHECKPOINT 1: Create Backup Audit File
  // ==============================================================
  log('--- CHECKPOINT 1: Creating Backup Audit File ---');
  const backupRecords = [];

  for (const item of targetAccounts) {
    const { data, error } = await supabase
      .from(item.table)
      .select('id, phone, phoneNumber, originalPhone, phoneNormalized, name, email')
      .eq('id', item.account_id)
      .single();

    if (error || !data) {
      log(`⚠️ Could not fetch current DB state for ${item.table}:${item.account_id}: ${error?.message}`);
    }

    backupRecords.push({
      account_id: item.account_id,
      table: item.table,
      old_phone: item.old_phone,
      new_phone: item.new_phone,
      timestamp: timestamp,
      db_snapshot_before: data || null
    });
  }

  const backupFilePath = path.resolve(process.cwd(), 'docs/review/phone-normalization-backup.json');
  fs.writeFileSync(backupFilePath, JSON.stringify(backupRecords, null, 2), 'utf8');
  log(`✅ Created backup audit file: docs/review/phone-normalization-backup.json (${backupRecords.length} records backed up)\n`);

  // ==============================================================
  // CHECKPOINT 2: Execute ONLY Class B phone corrections
  // ==============================================================
  log('--- CHECKPOINT 2: Executing Class B Phone Corrections ---');
  let affectedRowsCount = 0;
  const updateErrors = [];

  for (const item of targetAccounts) {
    const cleanDigits = item.new_phone.replace(/\D/g, ''); // 20101499936
    const normalizedE164 = item.new_phone; // +20101499936

    const updatePayload = {
      phone: cleanDigits,
      phoneNormalized: normalizedE164,
      updatedAt: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from(item.table)
      .update(updatePayload)
      .eq('id', item.account_id)
      .select('id, phone, phoneNormalized');

    if (error) {
      log(`❌ Error updating ${item.table}:${item.account_id}: ${error.message}`);
      updateErrors.push({ account_id: item.account_id, error: error.message });
    } else {
      affectedRowsCount++;
      log(`✅ Updated ${item.table} ID: ${item.account_id} -> phone: "${cleanDigits}", phoneNormalized: "${normalizedE164}"`);
    }
  }

  log(`\nExecution Summary: ${affectedRowsCount} rows successfully updated, ${updateErrors.length} errors.\n`);

  if (updateErrors.length > 0) {
    log('⚠️ Halting further execution due to update errors.');
    process.exit(1);
  }

  // ==============================================================
  // CHECKPOINT 3: Post-Commit Validation
  // ==============================================================
  log('--- CHECKPOINT 3: Post-Commit Validation ---');

  // 3.1 Verify updated records from live DB
  let verifiedCount = 0;
  let e164ValidCount = 0;
  let otpCompatibleCount = 0;

  for (const item of targetAccounts) {
    const { data } = await supabase
      .from(item.table)
      .select('id, phone, phoneNormalized')
      .eq('id', item.account_id)
      .single();

    if (data) {
      const cleanDigits = item.new_phone.replace(/\D/g, '');
      const isCorrect = data.phone === cleanDigits && data.phoneNormalized === item.new_phone;
      if (isCorrect) verifiedCount++;

      // E.164 regex verification
      const isE164 = /^\+[1-9]\d{8,14}$/.test(data.phoneNormalized);
      if (isE164) e164ValidCount++;

      // OTP normalization verification
      const normalizedOtp = normalizePhone(data.phoneNormalized);
      if (normalizedOtp === item.new_phone) otpCompatibleCount++;
    }
  }

  log(`Validation: Corrected Records Verified in DB: ${verifiedCount} / ${targetAccounts.length}`);
  log(`Validation: E.164 Format Valid: ${e164ValidCount} / ${targetAccounts.length}`);
  log(`Validation: OTP Normalization Compatibility: ${otpCompatibleCount} / ${targetAccounts.length}`);

  // ==============================================================
  // CHECKPOINT 4: Rebuild phone_accounts_index & Conflict Analysis
  // ==============================================================
  log('\n--- CHECKPOINT 4: Rebuilding phone_accounts_index & Conflict Analysis ---');

  // Scan all tables
  const indexedRecords = new Map();
  const conflicts = [];
  const uniqueConflictPhones = new Set();
  let totalSourceRows = 0;

  for (const src of SOURCES) {
    try {
      const { data, error } = await supabase.from(src.table).select('*').limit(3000);
      if (error) {
        log(`⚠️ Error reading ${src.table}: ${error.message}`);
        continue;
      }
      if (!data) continue;
      totalSourceRows += data.length;

      for (const row of data) {
        if (row.isDeleted === true || row.deletedAt) continue;
        const accountId = String(row.id || '').trim();
        const actualType = String(row.accountType || src.accountType || '').trim();
        const uid = row.supabaseUid || row.supabase_uid || row.authUid || null;

        const candidatePhones = new Set();
        for (const field of src.phoneFields) {
          const val = row[field];
          if (val) {
            const norm = normalizePhone(val);
            if (norm && /^\+[0-9]{8,15}$/.test(norm)) {
              candidatePhones.add(norm);
            }
          }
        }

        for (const phoneNorm of candidatePhones) {
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
                account2: { id: accountId, type: actualType, table: src.table }
              });
              uniqueConflictPhones.add(phoneNorm);
            }
          }
        }
      }
    } catch (err) {
      log(`⚠️ Exception processing ${src.table}: ${err.message}`);
    }
  }

  // Isolate conflicting phones from phone_accounts_index to ensure NO arbitrary primary account selection
  for (const cPhone of uniqueConflictPhones) {
    indexedRecords.delete(cPhone);
  }

  // Compare with before
  const beforeReportPath = path.resolve(process.cwd(), 'docs/review/phone_conflicts_report.json');
  const beforeConflicts = JSON.parse(fs.readFileSync(beforeReportPath, 'utf8'));
  const beforeUniquePhones = new Set(beforeConflicts.map(c => c.phone));

  const afterUniquePhones = uniqueConflictPhones;

  // Detect any new conflicts
  const newConflicts = Array.from(afterUniquePhones).filter(p => !beforeUniquePhones.has(p));

  log(`\nConflict Analysis Summary:`);
  log(`  Source Rows Evaluated: ${totalSourceRows}`);
  log(`  Conflict Pairs Before: ${beforeConflicts.length}`);
  log(`  Conflict Pairs After: ${conflicts.length}`);
  log(`  Unique Conflicting Phones Before: ${beforeUniquePhones.size}`);
  log(`  Unique Conflicting Phones After: ${afterUniquePhones.size}`);
  log(`  Net Reduction in Conflicting Phones: ${beforeUniquePhones.size - afterUniquePhones.size}`);
  log(`  New Conflicts Detected: ${newConflicts.length > 0 ? newConflicts.join(', ') : '0 (None)'}`);

  // Save new conflicts report
  fs.writeFileSync(beforeReportPath, JSON.stringify(conflicts, null, 2), 'utf8');
  log(`✅ Updated docs/review/phone_conflicts_report.json`);

  // Write clean records to phone_accounts_index in DB
  log(`\nWriting clean records to public.phone_accounts_index (Conflicting phones strictly isolated)...`);
  const cleanRecords = Array.from(indexedRecords.values());
  log(`  Total Clean Non-Conflicting Records to Index: ${cleanRecords.length}`);

  // Clear existing index and insert fresh
  const { error: delErr } = await supabase.from('phone_accounts_index').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (delErr) {
    log(`⚠️ Note clearing index: ${delErr.message}`);
  }

  const batchSize = 100;
  let committedCount = 0;
  for (let i = 0; i < cleanRecords.length; i += batchSize) {
    const batch = cleanRecords.slice(i, i + batchSize);
    const { error: insErr } = await supabase.from('phone_accounts_index').upsert(batch, { onConflict: 'phone_normalized' });
    if (insErr) {
      log(`❌ Batch insert error: ${insErr.message}`);
    } else {
      committedCount += batch.length;
    }
  }

  log(`✅ Successfully committed ${committedCount} records to phone_accounts_index.`);
  log('================================================================');
  log('Phase 2.7 Completed Successfully.');
  log('================================================================');
  logStream.end();

  // Save execution summary to json
  const summaryResult = {
    timestamp,
    affectedRowsCount,
    before: {
      totalConflicts: beforeConflicts.length,
      uniqueConflictingPhones: beforeUniquePhones.size
    },
    after: {
      totalConflicts: conflicts.length,
      uniqueConflictingPhones: afterUniquePhones.size
    },
    newConflicts,
    validation: {
      targetAccountsCount: targetAccounts.length,
      verifiedCount,
      e164ValidCount,
      otpCompatibleCount
    },
    indexedRecordsCount: committedCount
  };

  fs.writeFileSync('scratch/phase_2_7_summary.json', JSON.stringify(summaryResult, null, 2), 'utf8');
}

run().catch(err => {
  console.error('Fatal execution error:', err);
  process.exit(1);
});
