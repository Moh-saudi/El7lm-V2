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

async function runPreCheck() {
  console.log('--- PHASE 10 PRE-EXECUTION AUDIT ---');
  
  // 1. Row count check
  const { count, error: countErr } = await supabase.from('users').select('*', { count: 'exact', head: true });
  console.log('users row count:', count, 'error:', countErr);

  // 2. Fetch sample rows to inspect existing columns
  const { data: sampleRows, error: sampleErr } = await supabase.from('users').select('*').limit(10);
  if (!sampleRows || sampleRows.length === 0) {
    console.error('Failed to fetch sample rows:', sampleErr);
    return;
  }

  const columns = Object.keys(sampleRows[0]);
  console.log('Total columns in users:', columns.length);
  console.log('All users columns in production:', columns);

  // 3. Inspect target fields
  const targetFields = [
    'supabase_uid',
    'phone_e164',
    'country_code',
    'account_type',
    'is_active',
    'is_verified',
    'updated_at',
    'last_login_at'
  ];

  console.log('\n--- TARGET FIELDS DETAILED AUDIT ---');
  const results = {};
  for (const tf of targetFields) {
    const existsExact = columns.includes(tf);
    const camelCase = tf.replace(/_([a-z])/g, (_, g) => g.toUpperCase());
    const existsCamel = columns.includes(camelCase);
    
    // Check alternatives
    let alternative = null;
    if (tf === 'account_type' && columns.includes('accountType')) alternative = 'accountType';
    if (tf === 'account_type' && columns.includes('role')) alternative = (alternative ? alternative + ', ' : '') + 'role';
    if (tf === 'supabase_uid' && columns.includes('uid')) alternative = 'uid';
    if (tf === 'country_code' && columns.includes('countryCode')) alternative = 'countryCode';
    if (tf === 'is_active' && columns.includes('isActive')) alternative = 'isActive';
    if (tf === 'is_verified' && columns.includes('isVerified')) alternative = 'isVerified';
    if (tf === 'is_verified' && columns.includes('phoneVerified')) alternative = (alternative ? alternative + ', ' : '') + 'phoneVerified';
    if (tf === 'updated_at' && columns.includes('updatedAt')) alternative = 'updatedAt';
    if (tf === 'last_login_at' && columns.includes('lastLogin')) alternative = 'lastLogin';
    if (tf === 'last_login_at' && columns.includes('last_login')) alternative = (alternative ? alternative + ', ' : '') + 'last_login';

    results[tf] = {
      exactMatchExists: existsExact,
      camelCaseExists: existsCamel,
      existingAlternative: alternative,
      actionRequired: existsExact ? 'SKIP_ALREADY_EXISTS' : (alternative && ['account_type', 'is_active', 'is_verified', 'updated_at', 'last_login_at'].includes(tf) ? 'EVALUATE_MAPPING' : 'ADD_COLUMN')
    };
    console.log(`${tf}: exact=${existsExact}, camelCase=${existsCamel}, alternative=[${alternative}], action=${results[tf].actionRequired}`);
  }

  // 4. Check other tables row count to ensure 0 changes since 9.1
  console.log('\n--- OTHER ACCOUNT TABLES ROW COUNT CHECK ---');
  const tables = ['players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'admins'];
  for (const t of tables) {
    const { count: tCount } = await supabase.from(t).select('*', { count: 'exact', head: true });
    console.log(`Table ${t}: count = ${tCount}`);
  }
}

runPreCheck();
