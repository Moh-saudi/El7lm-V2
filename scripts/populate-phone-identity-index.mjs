/**
 * Phase 6: Phone Identity Population & Validation Engine
 * Mode: Generates Migration Data, Validates Classification, Produces Reports
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

// Load Supabase credentials
const envPath = path.resolve(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
    const idx = trimmed.indexOf('=');
    env[trimmed.substring(0, idx).trim()] = trimmed.substring(idx + 1).trim().replace(/^['"]|['"]$/g, '');
  }
}

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

function cleanArabic(str) {
  if (!str) return '';
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/عبد\s+/g, 'عبد')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function isSyntheticEmail(email) {
  if (!email) return false;
  return /^([pcatm]|ag|ad|user_)\d+.*@el7lm\.com$/i.test(email);
}

const KNOWN_COUNTRY_CODES = [
  { code: '+20', country: 'Egypt', regex: /^(\+?20|0020)/ },
  { code: '+966', country: 'Saudi Arabia', regex: /^(\+?966|00966)/ },
  { code: '+974', country: 'Qatar', regex: /^(\+?974|00974)/ },
  { code: '+971', country: 'UAE', regex: /^(\+?971|00971)/ },
  { code: '+965', country: 'Kuwait', regex: /^(\+?965|00965)/ },
  { code: '+968', country: 'Oman', regex: /^(\+?968|00968)/ },
  { code: '+973', country: 'Bahrain', regex: /^(\+?973|00973)/ },
  { code: '+962', country: 'Jordan', regex: /^(\+?962|00962)/ },
  { code: '+212', country: 'Morocco', regex: /^(\+?212|00212)/ },
  { code: '+216', country: 'Tunisia', regex: /^(\+?216|00216)/ },
  { code: '+213', country: 'Algeria', regex: /^(\+?213|00213)/ },
  { code: '+249', country: 'Sudan', regex: /^(\+?249|00249)/ },
  { code: '+964', country: 'Iraq', regex: /^(\+?964|00964)/ },
  { code: '+961', country: 'Lebanon', regex: /^(\+?961|00961)/ },
  { code: '+963', country: 'Syria', regex: /^(\+?963|00963)/ },
  { code: '+967', country: 'Yemen', regex: /^(\+?967|00967)/ },
  { code: '+970', country: 'Palestine', regex: /^(\+?970|00970)/ },
  { code: '+234', country: 'Nigeria', regex: /^(\+?234|00234)/ },
  { code: '+233', country: 'Ghana', regex: /^(\+?233|00233)/ },
  { code: '+225', country: 'Cote d\'Ivoire', regex: /^(\+?225|00225)/ },
  { code: '+237', country: 'Cameroon', regex: /^(\+?237|00237)/ },
  { code: '+221', country: 'Senegal', regex: /^(\+?221|00221)/ },
  { code: '+44', country: 'United Kingdom', regex: /^(\+?44|0044)/ },
  { code: '+49', country: 'Germany', regex: /^(\+?49|0049)/ },
  { code: '+33', country: 'France', regex: /^(\+?33|0033)/ },
  { code: '+34', country: 'Spain', regex: /^(\+?34|0034)/ },
  { code: '+39', country: 'Italy', regex: /^(\+?39|0039)/ },
  { code: '+90', country: 'Turkey', regex: /^(\+?90|0090)/ },
  { code: '+55', country: 'Brazil', regex: /^(\+?55|0055)/ },
  { code: '+1', country: 'USA/Canada', regex: /^(\+?1|001)/ }
];

function normalizePhone(raw, countryHint = '') {
  if (!raw) return { normalized: null, country: null, countryCode: null, issue: 'EMPTY', original: raw };
  let str = String(raw).trim().replace(/[\s\-\(\)\.]/g, '');
  if (str.startsWith('00')) str = '+' + str.slice(2);

  for (const cc of KNOWN_COUNTRY_CODES) {
    if (str.startsWith(cc.code) || str.startsWith(cc.code.replace('+', ''))) {
      const national = str.startsWith('+') ? str.slice(cc.code.length) : str.slice(cc.code.length - 1);
      const cleanNational = national.replace(/^0+/, '');
      const normalized = cc.code + cleanNational;

      if (cc.code === '+20') {
        if (/^1[0125]\d{8}$/.test(cleanNational)) {
          return { normalized, country: 'Egypt', countryCode: '+20', issue: null, original: raw };
        } else {
          return { normalized, country: 'Egypt', countryCode: '+20', issue: 'INVALID_EGYPT_LENGTH_OR_PREFIX', original: raw };
        }
      }
      return { normalized, country: cc.country, countryCode: cc.code, issue: null, original: raw };
    }
  }

  // Local Egyptian format 01[0125]xxxxxxxx
  if (/^01[0125]\d{8}$/.test(str)) {
    return { normalized: '+20' + str.slice(1), country: 'Egypt', countryCode: '+20', issue: null, original: raw };
  }

  // Local Saudi format 05xxxxxxxx
  if (/^05\d{8}$/.test(str)) {
    return { normalized: '+966' + str.slice(1), country: 'Saudi Arabia', countryCode: '+966', issue: null, original: raw };
  }

  if (str.startsWith('+')) {
    return { normalized: str, country: 'Unknown', countryCode: 'Unknown', issue: 'UNKNOWN_COUNTRY_CODE', original: raw };
  }

  return { normalized: str, country: 'Invalid', countryCode: 'None', issue: 'NO_COUNTRY_CODE_MALFORMED', original: raw };
}

const TEST_PHONE_PATTERNS = [
  /^\+?111111111/,
  /^\+?199999999/,
  /^\+?966500000000/,
  /^\+?17799580/,
  /^\+?70542458/,
  /^\+?705424366/,
  /^\+?97472053188/,
  /^\+?9747205318$/,
  /^\+?201017799580/,
  /000000/,
  /1234567/,
  /^(.)\1{6,}$/
];

function isTestAccount(phone, name = '', email = '') {
  const n = (name || '').toLowerCase();
  const e = (email || '').toLowerCase();
  if (n.includes('test') || n.includes('تجربة') || n.includes('تجربه') || n.includes('fake') || n.includes('dummy') || n.includes('اختبار')) return true;
  if (e.includes('@test.com') || e.includes('@example.com') || e.includes('test_') || e.includes('test@') || e.includes('@dev.com')) return true;
  if (phone) {
    const p = phone.replace(/[\s\-\+]/g, '');
    for (const pat of TEST_PHONE_PATTERNS) {
      if (pat.test(phone) || pat.test(p)) return true;
    }
  }
  return false;
}

async function fetchAll(table) {
  const all = [];
  let page = 0;
  const size = 1000;
  while (true) {
    const { data, error } = await supabase.from(table).select('*').range(page * size, (page + 1) * size - 1);
    if (error) {
      console.error(`Error fetching ${table}:`, error.message);
      break;
    }
    if (!data || data.length === 0) break;
    all.push(...data);
    if (data.length < size) break;
    page++;
  }
  return all;
}

async function buildPhoneIdentityIndex() {
  console.log('================================================================');
  console.log('🚀 PHASE 6: BUILDING PHONE IDENTITY LAYER INDEX DATA');
  console.log('================================================================\n');

  console.log('Fetching all records across 8 account tables...');
  const [users, players, clubs, academies, trainers, agents, marketers, admins, notifs, msgs] = await Promise.all([
    fetchAll('users'),
    fetchAll('players'),
    fetchAll('clubs'),
    fetchAll('academies'),
    fetchAll('trainers'),
    fetchAll('agents'),
    fetchAll('marketers'),
    fetchAll('admins'),
    fetchAll('notifications'),
    fetchAll('messages')
  ]);

  const notifCountByUser = new Map();
  for (const n of notifs) {
    if (n.userId) notifCountByUser.set(n.userId, (notifCountByUser.get(n.userId) || 0) + 1);
  }

  const msgCountByUser = new Map();
  for (const m of msgs) {
    if (m.senderId) msgCountByUser.set(m.senderId, (msgCountByUser.get(m.senderId) || 0) + 1);
    if (m.receiverId) msgCountByUser.set(m.receiverId, (msgCountByUser.get(m.receiverId) || 0) + 1);
  }

  const allAccounts = [];

  function processRecord(rec, tableName, defaultType) {
    const rawPhone = rec.phoneNormalized || rec.phone || rec.phoneNumber || rec.originalPhone || '';
    const name = rec.full_name || rec.name || rec.displayName || rec.academy_name || rec.club_name || 'غير مسجل';
    const email = rec.email || rec.firebaseEmail || rec.originalEmail || '';
    const accountType = rec.accountType || rec.type || defaultType;
    const createdAt = rec.createdAt || rec.created_at || null;
    const lastLogin = rec.lastLogin || rec.last_login || rec.updatedAt || rec.updated_at || null;

    let videoCount = 0;
    if (Array.isArray(rec.videos)) videoCount = rec.videos.length;
    else if (rec.videos && typeof rec.videos === 'object') videoCount = Object.keys(rec.videos).length;

    const notifCount = notifCountByUser.get(rec.id) || 0;
    const msgCount = msgCountByUser.get(rec.id) || 0;
    const norm = normalizePhone(rawPhone, rec.countryCode || rec.country);

    allAccounts.push({
      id: rec.id,
      table: tableName,
      accountType,
      name,
      email,
      rawPhone,
      phoneNormalized: norm.normalized,
      country: norm.country,
      countryCode: norm.countryCode,
      phoneIssue: norm.issue,
      createdAt,
      lastLogin,
      videoCount,
      notifCount,
      msgCount,
      activityScore: (videoCount * 10) + (msgCount * 5) + notifCount + (lastLogin ? 5 : 0)
    });
  }

  users.forEach(r => processRecord(r, 'users', 'user'));
  players.forEach(r => processRecord(r, 'players', 'player'));
  clubs.forEach(r => processRecord(r, 'clubs', 'club'));
  academies.forEach(r => processRecord(r, 'academies', 'academy'));
  trainers.forEach(r => processRecord(r, 'trainers', 'trainer'));
  agents.forEach(r => processRecord(r, 'agents', 'agent'));
  marketers.forEach(r => processRecord(r, 'marketers', 'marketer'));
  admins.forEach(r => processRecord(r, 'admins', 'admin'));

  // Group by E.164 phone
  const phoneGroups = new Map();
  for (const acc of allAccounts) {
    if (!acc.phoneNormalized || acc.phoneIssue === 'EMPTY') continue;
    const key = acc.phoneNormalized;
    if (!phoneGroups.has(key)) phoneGroups.set(key, []);
    phoneGroups.get(key).push(acc);
  }

  const indexRecords = [];
  const conflictsReport = [];
  const stats = {
    classA_archived: 0,
    classB_active_same_user: 0,
    classC_conflict_different_users: 0,
    classD_unverified_malformed: 0,
    classE_active_unique: 0,
    totalIndexedPhones: 0,
    totalCoveredAccounts: 0
  };

  for (const [phoneE164, accounts] of phoneGroups.entries()) {
    const sample = accounts[0];
    const isTest = accounts.some(a => isTestAccount(a.rawPhone, a.name, a.email));
    const isMalformed = sample.phoneIssue !== null;

    // Sort accounts by activity score and recency to select primary
    accounts.sort((a, b) => {
      if (b.activityScore !== a.activityScore) return b.activityScore - a.activityScore;
      const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return dateB - dateA;
    });

    const primary = accounts[0];
    let status = 'active';
    let verificationStatus = 'verified';
    let reviewNotes = '';

    if (isTest) {
      status = 'archived';
      verificationStatus = 'unverified';
      reviewNotes = 'Class A: Test or development dummy account.';
      stats.classA_archived++;
    } else if (isMalformed) {
      status = 'active';
      verificationStatus = 'unverified';
      reviewNotes = `Class D: Non-standard phone format (${sample.phoneIssue}).`;
      stats.classD_unverified_malformed++;
    } else if (accounts.length > 1) {
      // Compare names across accounts
      const names = accounts.map(a => a.name);
      const baseName = cleanArabic(names[0]);
      let sameUser = true;

      for (let i = 1; i < names.length; i++) {
        const nextName = cleanArabic(names[i]);
        if (baseName && nextName && baseName !== 'غير مسجل' && nextName !== 'غير مسجل') {
          const w1 = baseName.split(' ');
          const w2 = nextName.split(' ');
          const overlap = w1.filter(w => w2.includes(w) && w.length > 2);
          if (overlap.length === 0 && baseName !== nextName) {
            sameUser = false;
            break;
          }
        }
      }

      if (sameUser) {
        status = 'active';
        verificationStatus = 'verified';
        reviewNotes = `Class B: Same user duplicated across ${accounts.length} records. Primary selected by activity score (${primary.table}:${primary.id}).`;
        stats.classB_active_same_user++;
      } else {
        status = 'conflict';
        verificationStatus = 'unverified';
        reviewNotes = `Class C: Conflict between ${accounts.length} distinct users. Requires OTP disambiguation.`;
        stats.classC_conflict_different_users++;

        conflictsReport.push({
          phone: phoneE164,
          country: sample.country,
          countryCode: sample.countryCode,
          conflictType: 'different_users',
          accountCount: accounts.length,
          accounts: accounts.map(a => ({
            id: a.id,
            table: a.table,
            name: a.name,
            email: a.email,
            accountType: a.accountType,
            activityScore: a.activityScore,
            createdAt: a.createdAt,
            lastLogin: a.lastLogin
          }))
        });
      }
    } else {
      status = 'active';
      verificationStatus = 'verified';
      reviewNotes = 'Class E: Clean, unique trusted phone identity.';
      stats.classE_active_unique++;
    }

    stats.totalIndexedPhones++;
    stats.totalCoveredAccounts += accounts.length;

    indexRecords.push({
      phone_e164: phoneE164,
      country_code: sample.countryCode || '+20',
      phone_normalized: phoneE164,
      primary_account_id: primary.id,
      primary_account_type: primary.table,
      status,
      verification_status: verificationStatus,
      verified_at: verificationStatus === 'verified' ? new Date().toISOString() : null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      linked_accounts: accounts.map(a => ({
        id: a.id,
        table: a.table,
        accountType: a.accountType,
        name: a.name,
        email: a.email,
        activityScore: a.activityScore,
        createdAt: a.createdAt,
        lastLogin: a.lastLogin
      })),
      review_notes: reviewNotes
    });
  }

  console.log('\n================================================================');
  console.log('📊 PHONE IDENTITY INDEX SUMMARY:');
  console.log('================================================================');
  console.log(`- Total Unique Phone Identities Created: ${stats.totalIndexedPhones}`);
  console.log(`- Total Accounts Covered & Linked: ${stats.totalCoveredAccounts}`);
  console.log(`- Class A (Archived Test Numbers): ${stats.classA_archived}`);
  console.log(`- Class B (Active Same-User Groups): ${stats.classB_active_same_user}`);
  console.log(`- Class C (Conflict Disambiguation Required): ${stats.classC_conflict_different_users}`);
  console.log(`- Class D (Unverified Malformed): ${stats.classD_unverified_malformed}`);
  console.log(`- Class E (Active Clean Unique): ${stats.classE_active_unique}`);

  // Write outputs
  const validationReportPath = path.resolve(process.cwd(), 'docs/review/phone-index-validation.json');
  fs.writeFileSync(validationReportPath, JSON.stringify({
    metadata: {
      generatedAt: new Date().toISOString(),
      platform: 'El7lm-V2 / Hagzz',
      phase: 'Phase 6 — Phone Identity Layer Validation'
    },
    metrics: stats,
    sampleIndexedRecords: indexRecords.slice(0, 10)
  }, null, 2), 'utf8');
  console.log(`\n✅ Saved: docs/review/phone-index-validation.json`);

  const conflictsPath = path.resolve(process.cwd(), 'docs/review/phone-conflicts-report.json');
  fs.writeFileSync(conflictsPath, JSON.stringify(conflictsReport, null, 2), 'utf8');
  console.log(`✅ Saved: docs/review/phone-conflicts-report.json (${conflictsReport.length} unresolved conflict groups)`);

  // Write SQL seed file for phone_accounts_index
  const seedPath = path.resolve(process.cwd(), 'supabase/migrations/seed_phone_accounts_index.sql');
  const sqlStatements = [
    '-- ==============================================================================',
    '-- SEED: seed_phone_accounts_index.sql',
    '-- Populates phone_accounts_index from the audited single trusted identity data',
    '-- ==============================================================================\n'
  ];

  for (const r of indexRecords) {
    const escapedPhone = r.phone_e164.replace(/'/g, "''");
    const escapedCountry = r.country_code.replace(/'/g, "''");
    const escapedId = r.primary_account_id.replace(/'/g, "''");
    const escapedType = r.primary_account_type.replace(/'/g, "''");
    const escapedStatus = r.status.replace(/'/g, "''");
    const escapedVerif = r.verification_status.replace(/'/g, "''");
    const verifiedAtStr = r.verified_at ? `'${r.verified_at}'` : 'NULL';
    const escapedLinked = JSON.stringify(r.linked_accounts).replace(/'/g, "''");
    const escapedNotes = r.review_notes ? `'${r.review_notes.replace(/'/g, "''")}'` : 'NULL';

    sqlStatements.push(
      `INSERT INTO public.phone_accounts_index (` +
      `phone_e164, country_code, phone_normalized, primary_account_id, primary_account_type, ` +
      `status, verification_status, verified_at, linked_accounts, review_notes` +
      `) VALUES (` +
      `'${escapedPhone}', '${escapedCountry}', '${escapedPhone}', '${escapedId}', '${escapedType}', ` +
      `'${escapedStatus}', '${escapedVerif}', ${verifiedAtStr}, '${escapedLinked}'::jsonb, ${escapedNotes}` +
      `) ON CONFLICT (phone_e164) DO UPDATE SET ` +
      `primary_account_id = EXCLUDED.primary_account_id, ` +
      `primary_account_type = EXCLUDED.primary_account_type, ` +
      `status = EXCLUDED.status, ` +
      `verification_status = EXCLUDED.verification_status, ` +
      `verified_at = EXCLUDED.verified_at, ` +
      `linked_accounts = EXCLUDED.linked_accounts, ` +
      `review_notes = EXCLUDED.review_notes, ` +
      `updated_at = NOW();`
    );
  }

  fs.writeFileSync(seedPath, sqlStatements.join('\n'), 'utf8');
  console.log(`✅ Saved: supabase/migrations/seed_phone_accounts_index.sql (${indexRecords.length} records ready to insert)`);

  return { stats, indexRecords, conflictsReport };
}

buildPhoneIdentityIndex();
