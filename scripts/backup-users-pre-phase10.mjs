import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const envContent = fs.readFileSync('.env.local', 'utf8');
const env = {};
envContent.split('\n').forEach(l => {
  const trimmed = l.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function createBackup() {
  console.log('--- CREATING USERS TABLE PRE-PHASE 10 BACKUP ---');
  const allUsers = [];
  let page = 0;
  const size = 1000;

  while (true) {
    const { data, error } = await supabase.from('users').select('*').range(page * size, (page + 1) * size - 1);
    if (error || !data || data.length === 0) break;
    allUsers.push(...data);
    if (data.length < size) break;
    page++;
  }

  console.log(`Fetched ${allUsers.length} records from users table.`);
  if (allUsers.length !== 1357) {
    console.error(`WARNING: Expected 1357 records, but got ${allUsers.length}`);
  }

  const backupMeta = {
    timestamp: new Date().toISOString(),
    phase: 'Phase 10 — Pre-Execution Snapshot',
    totalRecords: allUsers.length,
    tableName: 'users',
    records: allUsers
  };

  const backupPath = path.resolve('docs/review/backup_users_pre_phase10_20260925.json');
  fs.writeFileSync(backupPath, JSON.stringify(backupMeta, null, 2));
  console.log(`✅ Saved backup to: ${backupPath} (${(fs.statSync(backupPath).size / 1024 / 1024).toFixed(2)} MB)`);
}

createBackup();
