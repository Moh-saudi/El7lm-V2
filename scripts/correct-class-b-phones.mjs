/**
 * Script: correct-class-b-phones.mjs
 * Description: Phase 2.7 — Safe Phone Normalization for Class B phones (+10... / +12... -> +20...)
 * Constraints: Strictly NO delete, NO merge, NO account alteration other than phone field normalization.
 * Modes:
 *   --dry-run (default): Simulates all updates without modifying the database.
 *   --commit: Executes the updates to the database with full safety logging.
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Parse arguments
const args = process.argv.slice(2);
const isCommit = args.includes('--commit');
const isDryRun = !isCommit || args.includes('--dry-run');

// Setup audit logging
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logDir = path.resolve(process.cwd(), 'docs/review');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });
const logFilePath = path.join(logDir, `class-b-correction-${timestamp}.log`);
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

// Target accounts loaded from verified preview data
const previewPath = path.resolve(process.cwd(), 'scratch/class_b_detailed_fields.json');
if (!fs.existsSync(previewPath)) {
  console.error(`❌ Preview data not found at ${previewPath}`);
  process.exit(1);
}

const targetAccounts = JSON.parse(fs.readFileSync(previewPath, 'utf8'));

async function main() {
  log('================================================================');
  log(`🚀 Starting Phase 2.7: Class B Phone Normalization Execution`);
  log(`Mode: ${isDryRun ? 'DRY-RUN (Simulation - Read Only)' : 'COMMIT (Applying to Database)'}`);
  log(`Target Accounts: ${targetAccounts.length}`);
  log(`Audit Log: ${logFilePath}`);
  log('================================================================\n');

  let successCount = 0;
  let failCount = 0;

  for (const item of targetAccounts) {
    const { table, account_id, old_phone, new_phone, name } = item;
    const cleanNewDigits = new_phone.replace(/\D/g, ''); // e.g. 20101499936

    log(`Processing ${table} ID: ${account_id} ("${name}"):`);
    log(`  Old: ${old_phone} -> New: ${new_phone}`);

    if (isDryRun) {
      log(`  [SIMULATION] Would update ${table}.phone to "${cleanNewDigits}" and phoneNormalized to "${new_phone}".`);
      successCount++;
    } else {
      const updatePayload = {
        phone: cleanNewDigits,
        phoneNormalized: new_phone,
        updatedAt: new Date().toISOString()
      };

      const { data, error } = await supabase.from(table).update(updatePayload).eq('id', account_id).select('id, phone, phoneNormalized');

      if (error) {
        log(`  ❌ Error updating ${account_id}: ${error.message}`);
        failCount++;
      } else {
        log(`  ✅ Successfully updated ${account_id}: phone="${cleanNewDigits}", phoneNormalized="${new_phone}".`);
        successCount++;
      }
    }
  }

  log('\n================================================================');
  log(`Finished: ${successCount} successful, ${failCount} failed.`);
  log('================================================================');
  logStream.end();
}

main();
