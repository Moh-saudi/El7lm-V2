import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

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

// Load dependency map
const depMap = JSON.parse(fs.readFileSync('scratch/dependency-map.json', 'utf8'));
const notifUserSet = new Set(depMap.notifUsers);
const msgUserSet = new Set(depMap.msgUsers);
const convUserSet = new Set(depMap.convUsers);
const favUserSet = new Set(depMap.favUsers);
const oppUserSet = new Set(depMap.oppUsers);

function cleanArabic(str) {
  if (!str) return '';
  return str
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/عبد\s+/g, 'عبد')
    .replace(/[\s\-\_\.]+/g, ' ')
    .trim()
    .toLowerCase();
}

function areNamesSimilar(name1, name2) {
  const n1 = cleanArabic(name1);
  const n2 = cleanArabic(name2);
  if (!n1 || !n2) return false;
  if (n1 === n2) return true;
  if (n1.includes(n2) || n2.includes(n1)) return true;

  const words1 = n1.split(' ').filter(w => w.length > 2);
  const words2 = n2.split(' ').filter(w => w.length > 2);
  if (words1.length === 0 || words2.length === 0) return false;

  let common = 0;
  for (const w of words1) {
    if (words2.includes(w)) common++;
  }
  return common >= 2 || (words1.length === 1 && words2.length === 1 && words1[0] === words2[0]);
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

function normalizePhone(raw) {
  if (!raw) return { normalized: null, country: 'Missing', countryCode: 'None', issue: 'EMPTY' };
  let str = String(raw).trim().replace(/[\s\-\(\)\.]/g, '');
  if (str.startsWith('00')) str = '+' + str.slice(2);

  for (const cc of KNOWN_COUNTRY_CODES) {
    if (str.startsWith(cc.code) || str.startsWith(cc.code.replace('+', ''))) {
      const national = str.startsWith('+') ? str.slice(cc.code.length) : str.slice(cc.code.length - 1);
      const cleanNational = national.replace(/^0+/, '');
      const normalized = cc.code + cleanNational;

      if (cc.code === '+20') {
        if (/^1[0125]\d{8}$/.test(cleanNational)) {
          return { normalized, country: 'Egypt', countryCode: '+20', issue: null };
        } else {
          return { normalized, country: 'Egypt', countryCode: '+20', issue: 'INVALID_EGYPT_LENGTH_OR_PREFIX' };
        }
      }
      return { normalized, country: cc.country, countryCode: cc.code, issue: null };
    }
  }

  if (/^01[0125]\d{8}$/.test(str)) {
    return { normalized: '+20' + str.slice(1), country: 'Egypt', countryCode: '+20', issue: 'MISSING_COUNTRY_CODE' };
  }
  if (/^05\d{8}$/.test(str)) {
    return { normalized: '+966' + str.slice(1), country: 'Saudi Arabia', countryCode: '+966', issue: 'MISSING_COUNTRY_CODE' };
  }

  if (str.startsWith('+')) {
    return { normalized: str, country: 'Unknown', countryCode: 'Unknown', issue: 'UNKNOWN_COUNTRY_CODE' };
  }

  return { normalized: str, country: 'Invalid', countryCode: 'None', issue: 'NO_COUNTRY_CODE_MALFORMED' };
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
  console.log('Loading accounts from all 8 tables...');
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

  const allAccounts = [];

  function processRecord(rec, tableName, defaultType) {
    const rawPhone = rec.phoneNormalized || rec.phone || rec.phoneNumber || rec.originalPhone || '';
    const name = rec.full_name || rec.name || rec.displayName || rec.academy_name || rec.club_name || '';
    const email = rec.email || rec.firebaseEmail || rec.originalEmail || '';
    const accountType = rec.accountType || rec.type || defaultType;
    const createdAt = rec.createdAt || rec.created_at || null;
    const lastLogin = rec.lastLogin || rec.last_login || rec.updatedAt || rec.updated_at || null;
    const uid = rec.uid || rec.id || null;

    let videoCount = 0;
    if (Array.isArray(rec.videos)) videoCount = rec.videos.length;
    else if (rec.videos && typeof rec.videos === 'object') videoCount = Object.keys(rec.videos).length;

    const notifCount = notifUserSet.has(rec.id) ? 1 : 0;
    const msgCount = msgUserSet.has(rec.id) ? 1 : 0;
    const convCount = convUserSet.has(rec.id) ? 1 : 0;
    const favCount = favUserSet.has(rec.id) ? 1 : 0;
    const oppCount = oppUserSet.has(rec.id) ? 1 : 0;

    const hasForeignKeys = notifCount > 0 || msgCount > 0 || convCount > 0 || favCount > 0 || oppCount > 0;
    const norm = normalizePhone(rawPhone);

    const isAuth = tableName === 'users';
    const isProfile = tableName !== 'users';

    allAccounts.push({
      id: rec.id,
      uid,
      table: tableName,
      accountType,
      roleKind: isAuth ? 'AUTHENTICATION' : 'PROFILE_DATA',
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
      convCount,
      favCount,
      oppCount,
      hasForeignKeys,
      foreignKeyDetails: {
        inNotifications: notifUserSet.has(rec.id),
        inMessages: msgUserSet.has(rec.id),
        inConversations: convUserSet.has(rec.id),
        inFavorites: favUserSet.has(rec.id),
        inOpportunities: oppUserSet.has(rec.id)
      },
      activityScore: (videoCount * 10) + (msgCount * 5) + (convCount * 5) + (notifCount * 2) + (favCount * 2) + (lastLogin ? 5 : 0)
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

  console.log(`Total accounts processed: ${allAccounts.length}`);

  // Group by normalized phone
  const phoneGroups = new Map();
  for (const acc of allAccounts) {
    if (acc.phoneNormalized) {
      const key = acc.phoneNormalized;
      if (!phoneGroups.has(key)) phoneGroups.set(key, []);
      phoneGroups.get(key).push(acc);
    }
  }

  const duplicateGroups = [];
  for (const [phone, accounts] of phoneGroups.entries()) {
    if (accounts.length > 1) {
      duplicateGroups.push({ phone, accounts });
    }
  }

  console.log(`Duplicate phone groups: ${duplicateGroups.length}`);

  // Audit classification
  const classA = []; // Safe Duplicates
  const classB = []; // Legacy User/Profile Duplicates
  const classC = []; // Test / Seed Data
  const classD = []; // Real Conflicts (Different people)
  const classE = []; // Invalid / Unresolved

  const safeDeleteRecords = [];
  const preservedRecords = [];
  const manualReviewRecords = [];

  for (const group of duplicateGroups) {
    const { phone, accounts } = group;
    const country = accounts[0].country;

    // Check if group is test data
    const isGroupTest = accounts.every(a => isTestData(a.rawPhone, a.name, a.email)) ||
      accounts.some(a => isTestData(a.phoneNormalized, a.name, a.email) && TEST_PATTERNS.some(p => p.test(phone)));

    if (isGroupTest) {
      classC.push({
        phone,
        country,
        classification: 'Class C — TEST / SEED DATA',
        reason: 'Identified as development/test numbers or synthetic seed accounts',
        accountsCount: accounts.length,
        accounts
      });

      // Assess safe deletion for test accounts
      // A test account is safe to delete ONLY IF it has no foreign key dependencies
      for (const a of accounts) {
        if (!a.hasForeignKeys && a.videoCount === 0) {
          safeDeleteRecords.push({
            id: a.id,
            table: a.table,
            name: a.name,
            phone: a.phoneNormalized,
            reason: 'Test/seed data with 0 foreign keys and 0 videos',
            category: 'TEST_DATA'
          });
        } else {
          // Has foreign keys or videos, must be reviewed or preserved for cleanup cascade
          manualReviewRecords.push({
            id: a.id,
            table: a.table,
            name: a.name,
            phone: a.phoneNormalized,
            reason: 'Test data with existing foreign key references (requires cascade cleanup review)',
            foreignKeys: a.foreignKeyDetails
          });
          preservedRecords.push({
            id: a.id,
            table: a.table,
            name: a.name,
            phone: a.phoneNormalized,
            reason: 'Preserved: has foreign key references'
          });
        }
      }
      continue;
    }

    // Check if invalid/malformed
    const isMalformed = accounts[0].phoneIssue === 'NO_COUNTRY_CODE_MALFORMED' || accounts[0].phoneIssue === 'INVALID_EGYPT_LENGTH_OR_PREFIX';

    // Check same-person vs different-person
    const uniqueUids = new Set(accounts.map(a => a.uid).filter(Boolean));
    const names = accounts.map(a => a.name).filter(Boolean);
    const tables = accounts.map(a => a.table);

    const isSamePersonByName = names.length <= 1 || areNamesSimilar(names[0], names[1]);
    const isUserAndPlayerPair = accounts.length === 2 && tables.includes('users') && tables.includes('players');

    if (isUserAndPlayerPair && (isSamePersonByName || uniqueUids.size === 1)) {
      // Class B: Classic Legacy User/Profile duplicate
      classB.push({
        phone,
        country,
        classification: 'Class B — LEGACY USER/PROFILE DUPLICATE',
        reason: 'Same individual split between users (Auth) and players (Profile). Mandatory preservation.',
        accountsCount: accounts.length,
        accounts
      });

      // BOTH MUST BE PRESERVED!
      for (const a of accounts) {
        preservedRecords.push({
          id: a.id,
          table: a.table,
          name: a.name,
          phone: a.phoneNormalized,
          reason: 'Preserved: Class B legacy user/profile pair (do not delete either)'
        });
      }
      continue;
    }

    // Multi-account same person (e.g. 4 accounts: 2 users + 2 players from re-login)
    const allSameName = names.length > 0 && names.every(n => areNamesSimilar(names[0], n));
    if (allSameName && !isMalformed) {
      // Check if there are pure redundant ghost rows in the SAME table
      const usersRows = accounts.filter(a => a.table === 'users');
      const playersRows = accounts.filter(a => a.table === 'players');

      let hasSafeDelete = false;

      // In usersRows, if one is clearly the active auth identity and others are completely inactive ghosts
      if (usersRows.length > 1) {
        const sortedUsers = [...usersRows].sort((a, b) => b.activityScore - a.activityScore);
        const canonicalUser = sortedUsers[0];
        for (let i = 1; i < sortedUsers.length; i++) {
          const ghost = sortedUsers[i];
          if (!ghost.hasForeignKeys && ghost.videoCount === 0 && !ghost.lastLogin) {
            safeDeleteRecords.push({
              id: ghost.id,
              table: ghost.table,
              name: ghost.name,
              phone: ghost.phoneNormalized,
              reason: 'Unquestionably redundant duplicate user record with zero activity and zero foreign keys',
              category: 'SAFE_DUPLICATE',
              canonicalId: canonicalUser.id
            });
            hasSafeDelete = true;
          } else {
            preservedRecords.push({
              id: ghost.id,
              table: ghost.table,
              name: ghost.name,
              phone: ghost.phoneNormalized,
              reason: 'Preserved: duplicate user row has activity or foreign keys'
            });
          }
        }
        preservedRecords.push({
          id: canonicalUser.id,
          table: canonicalUser.table,
          name: canonicalUser.name,
          phone: canonicalUser.phoneNormalized,
          reason: 'Canonical primary user record'
        });
      } else if (usersRows.length === 1) {
        preservedRecords.push({
          id: usersRows[0].id,
          table: usersRows[0].table,
          name: usersRows[0].name,
          phone: usersRows[0].phoneNormalized,
          reason: 'Canonical user record'
        });
      }

      // In playersRows, same logic
      if (playersRows.length > 1) {
        const sortedPlayers = [...playersRows].sort((a, b) => b.activityScore - a.activityScore);
        const canonicalPlayer = sortedPlayers[0];
        for (let i = 1; i < sortedPlayers.length; i++) {
          const ghost = sortedPlayers[i];
          if (!ghost.hasForeignKeys && ghost.videoCount === 0) {
            safeDeleteRecords.push({
              id: ghost.id,
              table: ghost.table,
              name: ghost.name,
              phone: ghost.phoneNormalized,
              reason: 'Unquestionably redundant duplicate player profile with zero activity and zero foreign keys',
              category: 'SAFE_DUPLICATE',
              canonicalId: canonicalPlayer.id
            });
            hasSafeDelete = true;
          } else {
            preservedRecords.push({
              id: ghost.id,
              table: ghost.table,
              name: ghost.name,
              phone: ghost.phoneNormalized,
              reason: 'Preserved: duplicate player row has activity or foreign keys'
            });
          }
        }
        preservedRecords.push({
          id: canonicalPlayer.id,
          table: canonicalPlayer.table,
          name: canonicalPlayer.name,
          phone: canonicalPlayer.phoneNormalized,
          reason: 'Canonical player record'
        });
      } else if (playersRows.length === 1) {
        preservedRecords.push({
          id: playersRows[0].id,
          table: playersRows[0].table,
          name: playersRows[0].name,
          phone: playersRows[0].phoneNormalized,
          reason: 'Canonical player record'
        });
      }

      if (hasSafeDelete) {
        classA.push({
          phone,
          country,
          classification: 'Class A — SAFE DUPLICATE',
          reason: 'Same real person with redundant ghost account(s) having zero activity and zero foreign keys',
          accountsCount: accounts.length,
          accounts
        });
      } else {
        classB.push({
          phone,
          country,
          classification: 'Class B — LEGACY USER/PROFILE DUPLICATE',
          reason: 'Same real person multi-registration with activity across rows. Requires data consolidation, not deletion.',
          accountsCount: accounts.length,
          accounts
        });
      }
      continue;
    }

    // Check if definitely different people
    if (!isSamePersonByName && uniqueUids.size > 1 && !isMalformed) {
      classD.push({
        phone,
        country,
        classification: 'Class D — REAL DIFFERENT ACCOUNTS USING SAME PHONE',
        reason: 'Different individuals sharing identical phone number. Requires manual review & phone reassignment.',
        accountsCount: accounts.length,
        accounts
      });

      // All preserved, none deleted! Marked for manual review.
      for (const a of accounts) {
        preservedRecords.push({
          id: a.id,
          table: a.table,
          name: a.name,
          phone: a.phoneNormalized,
          reason: 'Preserved: Class D conflict (do not delete real accounts)'
        });
        manualReviewRecords.push({
          id: a.id,
          table: a.table,
          name: a.name,
          phone: a.phoneNormalized,
          reason: 'Real account conflict: distinct identity sharing phone number',
          foreignKeys: a.foreignKeyDetails
        });
      }
      continue;
    }

    // Otherwise Class E (Invalid / Unresolved)
    classE.push({
      phone,
      country,
      classification: 'Class E — INVALID / UNRESOLVED',
      reason: isMalformed ? 'Malformed or invalid phone format' : 'Ambiguous identity relationship',
      accountsCount: accounts.length,
      accounts
    });

    for (const a of accounts) {
      preservedRecords.push({
        id: a.id,
        table: a.table,
        name: a.name,
        phone: a.phoneNormalized,
        reason: 'Preserved: Class E unresolved identity'
      });
      manualReviewRecords.push({
        id: a.id,
        table: a.table,
        name: a.name,
        phone: a.phoneNormalized,
        reason: 'Unresolved or malformed phone record requiring verification',
        foreignKeys: a.foreignKeyDetails
      });
    }
  }

  console.log('\n--- AUDIT SUMMARY BY CLASS ---');
  console.log(`Class A (Safe Duplicate Groups): ${classA.length}`);
  console.log(`Class B (Legacy User/Profile Duplicate Groups): ${classB.length}`);
  console.log(`Class C (Test / Seed Data Groups): ${classC.length}`);
  console.log(`Class D (Real Conflict Groups): ${classD.length}`);
  console.log(`Class E (Invalid / Unresolved Groups): ${classE.length}`);
  console.log(`Total Duplicate Groups: ${classA.length + classB.length + classC.length + classD.length + classE.length}`);

  console.log('\n--- RECORDS DISPOSITION ---');
  console.log(`Safe Delete Candidate Records: ${safeDeleteRecords.length}`);
  console.log(`Preserved Records: ${preservedRecords.length}`);
  console.log(`Manual Review Records: ${manualReviewRecords.length}`);
}

run();
