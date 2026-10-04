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
  if (!raw) return { normalized: null, country: 'Missing', countryCode: 'None', issue: 'EMPTY', original: raw };
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
    return { normalized: '+20' + str.slice(1), country: 'Egypt', countryCode: '+20', issue: 'MISSING_COUNTRY_CODE', original: raw };
  }

  // Local Saudi format 05xxxxxxxx
  if (/^05\d{8}$/.test(str)) {
    return { normalized: '+966' + str.slice(1), country: 'Saudi Arabia', countryCode: '+966', issue: 'MISSING_COUNTRY_CODE', original: raw };
  }

  if (str.startsWith('+')) {
    return { normalized: str, country: 'Unknown', countryCode: 'Unknown', issue: 'UNKNOWN_COUNTRY_CODE', original: raw };
  }

  return { normalized: str, country: 'Invalid', countryCode: 'None', issue: 'NO_COUNTRY_CODE_MALFORMED', original: raw };
}

const TEST_PATTERNS = [
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

function isTestData(phone, name = '', email = '') {
  const n = (name || '').toLowerCase();
  const e = (email || '').toLowerCase();
  if (n.includes('test') || n.includes('تجربة') || n.includes('تجربه') || n.includes('fake') || n.includes('dummy') || n.includes('اختبار') || n.includes('seed')) return true;
  if (e.includes('@test.com') || e.includes('@example.com') || e.includes('test_') || e.includes('test@') || e.includes('@dev.com') || e.includes('seed_')) return true;
  if (phone) {
    const p = phone.replace(/[\s\-\+]/g, '');
    for (const pat of TEST_PATTERNS) {
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
    let attempts = 0;
    let success = false;
    let data = null;
    while (attempts < 4 && !success) {
      attempts++;
      try {
        const res = await supabase.from(table).select('*').range(page * size, (page + 1) * size - 1);
        if (res.error) {
          console.warn(`[Retry ${attempts}/4] Error fetching ${table}: ${res.error.message}`);
          await new Promise(r => setTimeout(r, 1000 * attempts));
        } else {
          data = res.data;
          success = true;
        }
      } catch (err) {
        console.warn(`[Retry ${attempts}/4] Network error fetching ${table}: ${err.message}`);
        await new Promise(r => setTimeout(r, 1000 * attempts));
      }
    }
    if (!success || !data || data.length === 0) break;
    all.push(...data);
    if (data.length < size) break;
    page++;
  }
  return all;
}

async function run() {
  console.log('Fetching all 8 tables and activity...');
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

  const totalAccountsChecked = allAccounts.length;
  let validPhonesCount = 0;
  let invalidPhonesCount = 0;
  let missingCountryCodeCount = 0;
  let missingPhonesCount = 0;

  const testAccountsList = [];
  const phoneGroups = new Map();

  for (const acc of allAccounts) {
    if (acc.phoneIssue === 'EMPTY') {
      missingPhonesCount++;
      invalidPhonesCount++;
    } else if (acc.phoneIssue === 'MISSING_COUNTRY_CODE') {
      missingCountryCodeCount++;
      validPhonesCount++; // Successfully normalized
    } else if (acc.phoneIssue === null) {
      validPhonesCount++;
    } else {
      invalidPhonesCount++;
    }

    if (isTestData(acc.rawPhone, acc.name, acc.email)) {
      testAccountsList.push({
        id: acc.id,
        table: acc.table,
        name: acc.name,
        email: acc.email,
        rawPhone: acc.rawPhone,
        phoneNormalized: acc.phoneNormalized,
        country: acc.country,
        createdAt: acc.createdAt,
        reason: 'Matches test pattern or development seed data'
      });
    }

    if (acc.phoneNormalized) {
      const key = acc.phoneNormalized;
      if (!phoneGroups.has(key)) phoneGroups.set(key, []);
      phoneGroups.get(key).push(acc);
    }
  }

  const duplicatePhoneList = [];
  let duplicateAccountsTotal = 0;

  for (const [phone, accounts] of phoneGroups.entries()) {
    if (accounts.length > 1) {
      duplicateAccountsTotal += accounts.length;
      duplicatePhoneList.push({
        normalizedPhone: phone,
        country: accounts[0].country,
        countryCode: accounts[0].countryCode,
        accountsCount: accounts.length,
        accounts: accounts.map(a => ({
          accountId: a.id,
          tableName: a.table,
          accountType: a.accountType,
          name: a.name,
          email: a.email,
          rawPhone: a.rawPhone,
          createdAt: a.createdAt,
          activityIndicators: {
            videos: a.videoCount,
            messages: a.msgCount,
            notifications: a.notifCount,
            lastLogin: a.lastLogin,
            activityScore: a.activityScore
          }
        }))
      });
    }
  }

  const phoneIdentityReport = {
    metadata: {
      generatedAt: new Date().toISOString(),
      platform: 'El7lm-V2 / Hagzz',
      phase: 'Phase 6 — Phone Identity Population & Validation Engine',
      auditMode: 'READ_ONLY'
    },
    summary: {
      totalAccountsChecked,
      validPhones: validPhonesCount,
      invalidPhones: invalidPhonesCount,
      missingCountryCode: missingCountryCodeCount,
      missingPhonesTotal: missingPhonesCount,
      uniquePhoneIdentities: phoneGroups.size,
      duplicatePhoneGroups: duplicatePhoneList.length,
      accountsInDuplicateGroups: duplicateAccountsTotal,
      testAccountsIdentified: testAccountsList.length
    },
    tableBreakdown: {
      users: users.length,
      players: players.length,
      clubs: clubs.length,
      academies: academies.length,
      trainers: trainers.length,
      agents: agents.length,
      marketers: marketers.length,
      admins: admins.length
    },
    duplicatePhones: duplicatePhoneList,
    testData: testAccountsList
  };

  const reportJsonPath = path.resolve(process.cwd(), 'docs/review/phone-identity-report.json');
  fs.writeFileSync(reportJsonPath, JSON.stringify(phoneIdentityReport, null, 2), 'utf8');
  console.log(`✅ Saved: docs/review/phone-identity-report.json`);

  return phoneIdentityReport;
}

run();
