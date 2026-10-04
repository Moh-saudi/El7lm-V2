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
  if (!raw) return { normalized: null, country: null, issue: 'EMPTY', original: raw };
  let str = String(raw).trim();
  // Remove spaces, hyphens, brackets
  str = str.replace(/[\s\-\(\)\.]/g, '');

  // Handle leading 00 as +
  if (str.startsWith('00')) {
    str = '+' + str.slice(2);
  }

  // Check matching known country code
  for (const cc of KNOWN_COUNTRY_CODES) {
    if (str.startsWith(cc.code) || str.startsWith(cc.code.replace('+', ''))) {
      const national = str.startsWith('+') ? str.slice(cc.code.length) : str.slice(cc.code.length - 1);
      const cleanNational = national.replace(/^0+/, ''); // strip leading 0
      const normalized = cc.code + cleanNational;

      // Validate Egypt specific length (10 digits after +20: 10/11/12/15)
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

  // Check missing country code for Egypt local format: 010..., 011..., 012..., 015... (11 digits)
  if (/^01[0125]\d{8}$/.test(str)) {
    const cleanNational = str.slice(1);
    return {
      normalized: '+20' + cleanNational,
      country: 'Egypt',
      countryCode: '+20',
      issue: 'MISSING_COUNTRY_CODE',
      original: raw
    };
  }

  // Check missing country code for Saudi local format: 05... (10 digits)
  if (/^05\d{8}$/.test(str)) {
    const cleanNational = str.slice(1);
    return {
      normalized: '+966' + cleanNational,
      country: 'Saudi Arabia',
      countryCode: '+966',
      issue: 'MISSING_COUNTRY_CODE',
      original: raw
    };
  }

  // Malformed or unknown
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
  /^(.)\1{6,}$/ // same digit repeated 7+ times
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
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .range(page * size, (page + 1) * size - 1);
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

async function runAudit() {
  console.log('================================================================');
  console.log('🚀 PHASE 5: PHONE DATA CLEANUP AUDIT (READ-ONLY)');
  console.log('================================================================\n');

  console.log('1. Loading all accounts across 8 tables...');
  const [users, players, clubs, academies, trainers, agents, marketers, admins] = await Promise.all([
    fetchAll('users'),
    fetchAll('players'),
    fetchAll('clubs'),
    fetchAll('academies'),
    fetchAll('trainers'),
    fetchAll('agents'),
    fetchAll('marketers'),
    fetchAll('admins')
  ]);

  console.log(`Loaded:
  - users: ${users.length}
  - players: ${players.length}
  - clubs: ${clubs.length}
  - academies: ${academies.length}
  - trainers: ${trainers.length}
  - agents: ${agents.length}
  - marketers: ${marketers.length}
  - admins: ${admins.length}
  Total: ${users.length + players.length + clubs.length + academies.length + trainers.length + agents.length + marketers.length + admins.length}`);

  console.log('2. Loading activity metrics (messages & notifications)...');
  const [notifs, msgs] = await Promise.all([
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

  console.log(`Loaded ${notifs.length} notifications and ${msgs.length} messages.`);

  // Normalize and flatten all accounts
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
      totalActivity: videoCount + notifCount + msgCount
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

  console.log(`Total flattened accounts: ${allAccounts.length}`);

  // Group by normalized phone
  const phoneGroups = new Map();
  for (const acc of allAccounts) {
    const key = acc.phoneNormalized || `NO_PHONE_${acc.id}`;
    if (!phoneGroups.has(key)) phoneGroups.set(key, []);
    phoneGroups.get(key).push(acc);
  }

  console.log(`Total unique phone keys: ${phoneGroups.size}`);

  const duplicates = [];
  const testNumbers = [];
  const invalidNumbers = [];
  const healthyNumbers = [];

  const categoryCounts = { A: 0, B: 0, C: 0, D: 0, E: 0 };

  for (const [phoneKey, accounts] of phoneGroups.entries()) {
    const sample = accounts[0];
    const hasNoPhone = phoneKey.startsWith('NO_PHONE_');
    const isTest = accounts.some(a => isTestAccount(a.rawPhone, a.name, a.email));
    const isMalformed = hasNoPhone || (sample.phoneIssue !== null && sample.phoneIssue !== 'MISSING_COUNTRY_CODE');

    // If duplicate (accounts.length > 1) and has a phone
    if (accounts.length > 1 && !hasNoPhone) {
      let category = 'C';
      if (isTest) {
        category = 'A';
      } else if (isMalformed) {
        category = 'D';
      } else {
        // Compare names and emails
        const names = accounts.map(a => a.name);
        const emails = accounts.map(a => a.email).filter(e => e && !isSyntheticEmail(e));

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
        category = sameUser ? 'B' : 'C';
      }

      categoryCounts[category]++;

      const dupItem = {
        phone: phoneKey,
        expectedCountry: sample.country || 'Unknown',
        countryCode: sample.countryCode,
        category,
        accountCount: accounts.length,
        accounts: accounts.map(a => ({
          id: a.id,
          name: a.name,
          email: a.email,
          accountType: a.accountType,
          table: a.table,
          rawPhone: a.rawPhone,
          createdAt: a.createdAt,
          lastActivity: {
            videos: a.videoCount,
            messages: a.msgCount,
            notifications: a.notifCount,
            lastLogin: a.lastLogin
          }
        }))
      };

      duplicates.push(dupItem);
      if (isTest) testNumbers.push(dupItem);
      if (isMalformed) invalidNumbers.push(dupItem);
    } else {
      // Single account or missing phone
      if (isTest) {
        categoryCounts.A++;
        testNumbers.push({
          phone: hasNoPhone ? 'MISSING_PHONE' : phoneKey,
          expectedCountry: sample.country || 'Unknown',
          countryCode: sample.countryCode || 'None',
          category: 'A',
          accountCount: accounts.length,
          accounts: accounts.map(a => ({
            id: a.id,
            name: a.name,
            email: a.email,
            accountType: a.accountType,
            table: a.table,
            rawPhone: a.rawPhone,
            createdAt: a.createdAt,
            lastActivity: {
              videos: a.videoCount,
              messages: a.msgCount,
              notifications: a.notifCount,
              lastLogin: a.lastLogin
            }
          }))
        });
      } else if (isMalformed) {
        categoryCounts.D++;
        invalidNumbers.push({
          phone: hasNoPhone ? 'MISSING_PHONE' : phoneKey,
          expectedCountry: sample.country || 'Unknown',
          countryCode: sample.countryCode || 'None',
          category: 'D',
          accountCount: accounts.length,
          accounts: accounts.map(a => ({
            id: a.id,
            name: a.name,
            email: a.email,
            accountType: a.accountType,
            table: a.table,
            rawPhone: a.rawPhone,
            createdAt: a.createdAt,
            lastActivity: {
              videos: a.videoCount,
              messages: a.msgCount,
              notifications: a.notifCount,
              lastLogin: a.lastLogin
            }
          }))
        });
      } else {
        categoryCounts.E++;
        healthyNumbers.push(phoneKey);
      }
    }
  }

  console.log('\n================================================================');
  console.log('📊 AUDIT SUMMARY METRICS:');
  console.log('================================================================');
  console.log(`- Total Duplicate Groups: ${duplicates.length}`);
  console.log(`- Total Test Numbers: ${testNumbers.length}`);
  console.log(`- Category A (Test/Dummy): ${categoryCounts.A}`);
  console.log(`- Category B (Same User Duplicated): ${categoryCounts.B}`);
  console.log(`- Category C (Distinct Users Conflict): ${categoryCounts.C}`);
  console.log(`- Category D (Invalid/Malformed): ${categoryCounts.D}`);
  console.log(`- Category E (Healthy & Unique): ${categoryCounts.E}`);

  // Write JSON files
  const dupPath = path.resolve(process.cwd(), 'docs/review/duplicate-phone-accounts.json');
  fs.writeFileSync(dupPath, JSON.stringify(duplicates, null, 2), 'utf8');
  console.log(`\n✅ Saved: docs/review/duplicate-phone-accounts.json (${duplicates.length} duplicate groups)`);

  const testPath = path.resolve(process.cwd(), 'docs/review/test-phone-numbers.json');
  fs.writeFileSync(testPath, JSON.stringify(testNumbers, null, 2), 'utf8');
  console.log(`✅ Saved: docs/review/test-phone-numbers.json (${testNumbers.length} test numbers)`);

  return { duplicates, testNumbers, invalidNumbers, categoryCounts, allAccountsCount: allAccounts.length };
}

runAudit();
