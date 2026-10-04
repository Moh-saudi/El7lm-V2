import fs from 'fs';
import path from 'path';

const manifestData = JSON.parse(fs.readFileSync('docs/review/phase10-2-final-commit-manifest.json', 'utf8'));
const allUsers = manifestData.manifest;
const affectedUsers = allUsers.filter(m => m.new_supabase_uid !== null || m.new_phone_e164 !== null || m.new_country_code !== null);
const untargetedUsers = allUsers.filter(m => m.new_supabase_uid === null && m.new_phone_e164 === null && m.new_country_code === null);

const testPhoneIds = allUsers.filter(m => m.phone_status === 'BLOCKED_TEST_PHONE').map(m => m.id);
const conflictPhoneIds = allUsers.filter(m => [
  'BLOCKED_REAL_CONFLICT',
  'BLOCKED_CONFLICT',
  'BLOCKED_DUPLICATE_USERS',
  'BLOCKED_AMBIGUOUS',
  'BLOCKED_MISSING_COUNTRY',
  'BLOCKED_DIFFERENT_IDENTITY',
  'BLOCKED_INVALID',
  'BLOCKED_INVALID_LENGTH'
].includes(m.phone_status)).map(m => m.id);

console.log(`Loaded manifest:`);
console.log(`- Total users: ${allUsers.length}`);
console.log(`- Affected (targeted) users: ${affectedUsers.length}`);
console.log(`- Untargeted users: ${untargetedUsers.length}`);
console.log(`- Blocked test phone IDs: ${testPhoneIds.length}`);
console.log(`- Blocked conflict/duplicate phone IDs: ${conflictPhoneIds.length}`);

let countSupabaseUid = 0;
let countPhoneE164 = 0;
let countCountryCode = 0;

const sqlLines = [];

sqlLines.push('-- ==============================================================================');
sqlLines.push('-- Phase 10.3: Safe Canonical Identity Population Commit');
sqlLines.push('-- Project: El7lm-V2 / Hagzz');
sqlLines.push('-- File: docs/review/phase10-3-population-commit.sql');
sqlLines.push(`-- Generated At: ${new Date().toISOString()}`);
sqlLines.push('-- Execution Mode: Strictly Atomic Transaction — Rollback on ANY assertion failure');
sqlLines.push('-- Operation: Scoped Column Population for public.users');
sqlLines.push('-- Baseline Target: 8 verified tables, 2,623 accounts');
sqlLines.push('-- ==============================================================================\n');

sqlLines.push('BEGIN;\n');

// 1. Pre-execution Safety Invariant Checks
sqlLines.push('-- ------------------------------------------------------------------------------');
sqlLines.push('-- STEP 1: Pre-Execution Safety Invariant Checks (8 Baseline Tables)');
sqlLines.push('-- ------------------------------------------------------------------------------');
sqlLines.push('DO $$');
sqlLines.push('DECLARE');
sqlLines.push('  v_users_count INT;');
sqlLines.push('  v_players_count INT;');
sqlLines.push('  v_clubs_count INT;');
sqlLines.push('  v_academies_count INT;');
sqlLines.push('  v_trainers_count INT;');
sqlLines.push('  v_agents_count INT;');
sqlLines.push('  v_marketers_count INT;');
sqlLines.push('  v_admins_count INT;');
sqlLines.push('  v_total_count INT;');
sqlLines.push('BEGIN');
sqlLines.push('  SELECT count(*) INTO v_users_count FROM public.users;');
sqlLines.push('  IF v_users_count != 1357 THEN');
sqlLines.push('    RAISE EXCEPTION \'Pre-flight check failed: public.users count expected 1357, got %\', v_users_count;');
sqlLines.push('  END IF;\n');
sqlLines.push('  SELECT count(*) INTO v_players_count FROM public.players;');
sqlLines.push('  IF v_players_count != 1079 THEN');
sqlLines.push('    RAISE EXCEPTION \'Pre-flight check failed: public.players count expected 1079, got %\', v_players_count;');
sqlLines.push('  END IF;\n');
sqlLines.push('  SELECT count(*) INTO v_clubs_count FROM public.clubs;');
sqlLines.push('  IF v_clubs_count != 39 THEN');
sqlLines.push('    RAISE EXCEPTION \'Pre-flight check failed: public.clubs count expected 39, got %\', v_clubs_count;');
sqlLines.push('  END IF;\n');
sqlLines.push('  SELECT count(*) INTO v_academies_count FROM public.academies;');
sqlLines.push('  IF v_academies_count != 39 THEN');
sqlLines.push('    RAISE EXCEPTION \'Pre-flight check failed: public.academies count expected 39, got %\', v_academies_count;');
sqlLines.push('  END IF;\n');
sqlLines.push('  SELECT count(*) INTO v_trainers_count FROM public.trainers;');
sqlLines.push('  IF v_trainers_count != 50 THEN');
sqlLines.push('    RAISE EXCEPTION \'Pre-flight check failed: public.trainers count expected 50, got %\', v_trainers_count;');
sqlLines.push('  END IF;\n');
sqlLines.push('  SELECT count(*) INTO v_agents_count FROM public.agents;');
sqlLines.push('  IF v_agents_count != 29 THEN');
sqlLines.push('    RAISE EXCEPTION \'Pre-flight check failed: public.agents count expected 29, got %\', v_agents_count;');
sqlLines.push('  END IF;\n');
sqlLines.push('  SELECT count(*) INTO v_marketers_count FROM public.marketers;');
sqlLines.push('  IF v_marketers_count != 27 THEN');
sqlLines.push('    RAISE EXCEPTION \'Pre-flight check failed: public.marketers count expected 27, got %\', v_marketers_count;');
sqlLines.push('  END IF;\n');
sqlLines.push('  SELECT count(*) INTO v_admins_count FROM public.admins;');
sqlLines.push('  IF v_admins_count != 3 THEN');
sqlLines.push('    RAISE EXCEPTION \'Pre-flight check failed: public.admins count expected 3, got %\', v_admins_count;');
sqlLines.push('  END IF;\n');
sqlLines.push('  v_total_count := v_users_count + v_players_count + v_clubs_count + v_academies_count +');
sqlLines.push('                   v_trainers_count + v_agents_count + v_marketers_count + v_admins_count;');
sqlLines.push('  IF v_total_count != 2623 THEN');
sqlLines.push('    RAISE EXCEPTION \'Pre-flight check failed: total accounts across 8 tables expected 2623, got %\', v_total_count;');
sqlLines.push('  END IF;\n');
sqlLines.push('  RAISE NOTICE \'Pre-flight baseline checks passed: exactly 2,623 records across 8 verified tables.\';');
sqlLines.push('END $$;\n');

// 2. Pre-update state capture (to verify exact changes without guessing)
sqlLines.push('-- ------------------------------------------------------------------------------');
sqlLines.push('-- STEP 2: Pre-Update Snapshot Capture for Accurate Delta Accounting');
sqlLines.push('-- ------------------------------------------------------------------------------');
sqlLines.push('CREATE TEMP TABLE _phase10_pre_state ON COMMIT DROP AS');
sqlLines.push('SELECT id, supabase_uid, phone_e164, country_code');
sqlLines.push('FROM public.users;\n');

// 3. Targeted atomic UPDATE statements
sqlLines.push('-- ------------------------------------------------------------------------------');
sqlLines.push(`-- STEP 3: Manifest-Driven Atomic UPDATE Statements (${affectedUsers.length} accounts)`);
sqlLines.push('-- Scoped strictly to WHERE id = <users.id> with No-Overwrite Guards');
sqlLines.push('-- ------------------------------------------------------------------------------\n');

for (const m of affectedUsers) {
  const sets = [];
  const guards = [`id = '${m.id.replace(/'/g, "''")}'`];

  if (m.new_supabase_uid) {
    sets.push(`supabase_uid = '${m.new_supabase_uid}'::uuid`);
    guards.push(`(supabase_uid IS NULL OR supabase_uid = '${m.new_supabase_uid}'::uuid)`);
    countSupabaseUid++;
  }
  if (m.new_phone_e164) {
    sets.push(`phone_e164 = '${m.new_phone_e164.replace(/'/g, "''")}'`);
    guards.push(`(phone_e164 IS NULL OR phone_e164 = '${m.new_phone_e164.replace(/'/g, "''")}')`);
    countPhoneE164++;
  }
  if (m.new_country_code) {
    sets.push(`country_code = '${m.new_country_code.replace(/'/g, "''")}'`);
    guards.push(`(country_code IS NULL OR country_code = '${m.new_country_code.replace(/'/g, "''")}')`);
    countCountryCode++;
  }

  sqlLines.push(`UPDATE public.users SET ${sets.join(', ')} WHERE ${guards.join(' AND ')};`);
}

// 4. Post-execution Safety Assertions
sqlLines.push('\n-- ------------------------------------------------------------------------------');
sqlLines.push('-- STEP 4: Post-Execution Safety Assertions');
sqlLines.push('-- Verifies delta accounting, untouched accounts, phone validity, and auth match');
sqlLines.push('-- ------------------------------------------------------------------------------');
sqlLines.push('DO $$');
sqlLines.push('DECLARE');
sqlLines.push('  v_users_touched INT;');
sqlLines.push('  v_supabase_uid_changed INT;');
sqlLines.push('  v_phone_e164_changed INT;');
sqlLines.push('  v_country_code_changed INT;');
sqlLines.push('  v_untargeted_modified INT;');
sqlLines.push('  v_invalid_e164_count INT;');
sqlLines.push('  v_phone_collisions INT;');
sqlLines.push('  v_test_phone_count INT;');
sqlLines.push('  v_conflict_phone_count INT;');
sqlLines.push('  v_invalid_auth_count INT;');
sqlLines.push('  v_uid_collisions INT;');
sqlLines.push('BEGIN');
sqlLines.push('  -- 4.1 Verify exact accounting of changed rows based on pre-state delta');
sqlLines.push('  SELECT count(*) INTO v_users_touched');
sqlLines.push('  FROM public.users curr');
sqlLines.push('  JOIN _phase10_pre_state pre ON curr.id = pre.id');
sqlLines.push('  WHERE curr.supabase_uid IS DISTINCT FROM pre.supabase_uid');
sqlLines.push('     OR curr.phone_e164 IS DISTINCT FROM pre.phone_e164');
sqlLines.push('     OR curr.country_code IS DISTINCT FROM pre.country_code;');
sqlLines.push(`  IF v_users_touched != ${affectedUsers.length} THEN`);
sqlLines.push(`    RAISE EXCEPTION 'Assertion failed: expected ${affectedUsers.length} users touched, got %', v_users_touched;`);
sqlLines.push('  END IF;\n');

sqlLines.push('  SELECT count(*) INTO v_supabase_uid_changed');
sqlLines.push('  FROM public.users curr');
sqlLines.push('  JOIN _phase10_pre_state pre ON curr.id = pre.id');
sqlLines.push('  WHERE curr.supabase_uid IS DISTINCT FROM pre.supabase_uid;');
sqlLines.push(`  IF v_supabase_uid_changed != ${countSupabaseUid} THEN`);
sqlLines.push(`    RAISE EXCEPTION 'Assertion failed: expected ${countSupabaseUid} supabase_uid changed, got %', v_supabase_uid_changed;`);
sqlLines.push('  END IF;\n');

sqlLines.push('  SELECT count(*) INTO v_phone_e164_changed');
sqlLines.push('  FROM public.users curr');
sqlLines.push('  JOIN _phase10_pre_state pre ON curr.id = pre.id');
sqlLines.push('  WHERE curr.phone_e164 IS DISTINCT FROM pre.phone_e164;');
sqlLines.push(`  IF v_phone_e164_changed != ${countPhoneE164} THEN`);
sqlLines.push(`    RAISE EXCEPTION 'Assertion failed: expected ${countPhoneE164} phone_e164 changed, got %', v_phone_e164_changed;`);
sqlLines.push('  END IF;\n');

sqlLines.push('  SELECT count(*) INTO v_country_code_changed');
sqlLines.push('  FROM public.users curr');
sqlLines.push('  JOIN _phase10_pre_state pre ON curr.id = pre.id');
sqlLines.push('  WHERE curr.country_code IS DISTINCT FROM pre.country_code;');
sqlLines.push(`  IF v_country_code_changed != ${countCountryCode} THEN`);
sqlLines.push(`    RAISE EXCEPTION 'Assertion failed: expected ${countCountryCode} country_code changed, got %', v_country_code_changed;`);
sqlLines.push('  END IF;\n');

// 4.2 Verify untargeted users remain completely untouched
const untargetedIdList = untargetedUsers.map(u => `'${u.id.replace(/'/g, "''")}'`).join(',\n      ');
sqlLines.push('  -- 4.2 Verify untargeted users (269 accounts) were NOT touched');
sqlLines.push('  SELECT count(*) INTO v_untargeted_modified');
sqlLines.push('  FROM public.users curr');
sqlLines.push('  JOIN _phase10_pre_state pre ON curr.id = pre.id');
sqlLines.push('  WHERE curr.id IN (');
sqlLines.push(`      ${untargetedIdList}`);
sqlLines.push('  ) AND (');
sqlLines.push('    curr.supabase_uid IS DISTINCT FROM pre.supabase_uid');
sqlLines.push('    OR curr.phone_e164 IS DISTINCT FROM pre.phone_e164');
sqlLines.push('    OR curr.country_code IS DISTINCT FROM pre.country_code');
sqlLines.push('  );');
sqlLines.push('  IF v_untargeted_modified > 0 THEN');
sqlLines.push('    RAISE EXCEPTION \'Assertion failed: % untargeted accounts were modified\', v_untargeted_modified;');
sqlLines.push('  END IF;\n');

// 4.3 Critical phone validation
sqlLines.push('  -- 4.3 Critical phone validation (E.164 syntax, zero collisions, zero test/conflict phones)');
sqlLines.push('  SELECT count(*) INTO v_invalid_e164_count');
sqlLines.push('  FROM public.users');
sqlLines.push('  WHERE phone_e164 IS NOT NULL');
sqlLines.push('    AND phone_e164 !~ \'^\\+[1-9][0-9]{6,14}$\';');
sqlLines.push('  IF v_invalid_e164_count > 0 THEN');
sqlLines.push('    RAISE EXCEPTION \'Assertion failed: % phone numbers violate E.164 regex\', v_invalid_e164_count;');
sqlLines.push('  END IF;\n');

sqlLines.push('  SELECT count(*) INTO v_phone_collisions FROM (');
sqlLines.push('    SELECT phone_e164 FROM public.users WHERE phone_e164 IS NOT NULL GROUP BY phone_e164 HAVING count(*) > 1');
sqlLines.push('  ) t;');
sqlLines.push('  IF v_phone_collisions > 0 THEN');
sqlLines.push('    RAISE EXCEPTION \'Assertion failed: % phone collisions detected in phone_e164\', v_phone_collisions;');
sqlLines.push('  END IF;\n');

const testPhoneIdList = testPhoneIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',\n      ');
sqlLines.push('  -- Assert zero phones assigned to known test accounts (22 accounts)');
sqlLines.push('  SELECT count(*) INTO v_test_phone_count');
sqlLines.push('  FROM public.users');
sqlLines.push('  WHERE id IN (');
sqlLines.push(`      ${testPhoneIdList}`);
sqlLines.push('  ) AND phone_e164 IS NOT NULL;');
sqlLines.push('  IF v_test_phone_count > 0 THEN');
sqlLines.push('    RAISE EXCEPTION \'Assertion failed: % test accounts received phone_e164\', v_test_phone_count;');
sqlLines.push('  END IF;\n');

const conflictPhoneIdList = conflictPhoneIds.map(id => `'${id.replace(/'/g, "''")}'`).join(',\n      ');
sqlLines.push('  -- Assert zero phones assigned to blocked conflict / duplicate accounts');
sqlLines.push('  SELECT count(*) INTO v_conflict_phone_count');
sqlLines.push('  FROM public.users');
sqlLines.push('  WHERE id IN (');
sqlLines.push(`      ${conflictPhoneIdList}`);
sqlLines.push('  ) AND phone_e164 IS NOT NULL;');
sqlLines.push('  IF v_conflict_phone_count > 0 THEN');
sqlLines.push('    RAISE EXCEPTION \'Assertion failed: % blocked conflict/duplicate accounts received phone_e164\', v_conflict_phone_count;');
sqlLines.push('  END IF;\n');

// 4.4 Critical supabase_uid validation
sqlLines.push('  -- 4.4 Critical supabase_uid validation (auth.users match and zero duplicates)');
sqlLines.push('  SELECT count(*) INTO v_invalid_auth_count');
sqlLines.push('  FROM public.users u');
sqlLines.push('  WHERE u.supabase_uid IS NOT NULL');
sqlLines.push('    AND NOT EXISTS (');
sqlLines.push('      SELECT 1 FROM auth.users a');
sqlLines.push('      WHERE a.id = u.supabase_uid');
sqlLines.push('        AND a.id::text = u.uid');
sqlLines.push('    );');
sqlLines.push('  IF v_invalid_auth_count > 0 THEN');
sqlLines.push('    RAISE EXCEPTION \'Assertion failed: % supabase_uid values do not match auth.users.id / users.uid\', v_invalid_auth_count;');
sqlLines.push('  END IF;\n');

sqlLines.push('  SELECT count(*) INTO v_uid_collisions FROM (');
sqlLines.push('    SELECT supabase_uid FROM public.users WHERE supabase_uid IS NOT NULL GROUP BY supabase_uid HAVING count(*) > 1');
sqlLines.push('  ) t;');
sqlLines.push('  IF v_uid_collisions > 0 THEN');
sqlLines.push('    RAISE EXCEPTION \'Assertion failed: % duplicate supabase_uid values detected\', v_uid_collisions;');
sqlLines.push('  END IF;\n');

sqlLines.push('  RAISE NOTICE \'All Post-Execution Safety Assertions PASSED successfully.\';');
sqlLines.push(`  RAISE NOTICE 'Delta summary: % users touched, % supabase_uid changed, % phone_e164 changed, % country_code changed.', v_users_touched, v_supabase_uid_changed, v_phone_e164_changed, v_country_code_changed;`);
sqlLines.push('END $$;\n');

sqlLines.push('COMMIT;\n');

const fullSql = sqlLines.join('\n');
const targetFile = 'docs/review/phase10-3-population-commit.sql';
fs.writeFileSync(targetFile, fullSql);

console.log(`✅ Saved ${targetFile} (${(fs.statSync(targetFile).size / 1024).toFixed(2)} KB)`);
console.log('--- GENERATION SUMMARY ---');
console.log(`1. Total UPDATE statements: ${affectedUsers.length}`);
console.log(`2. Total users to be modified: ${affectedUsers.length}`);
console.log(`3. Total supabase_uid updates: ${countSupabaseUid}`);
console.log(`4. Total phone_e164 updates: ${countPhoneE164}`);
console.log(`5. Total country_code updates: ${countCountryCode}`);
