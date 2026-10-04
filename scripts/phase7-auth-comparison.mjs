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

async function fetchAllAuthUsers() {
  const allAuth = [];
  let page = 1;
  const perPage = 1000;
  while (true) {
    try {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error('Error fetching auth users:', error.message);
        break;
      }
      if (!data || !data.users || data.users.length === 0) break;
      allAuth.push(...data.users);
      if (data.users.length < perPage) break;
      page++;
    } catch (e) {
      console.error('Exception fetching auth users:', e.message);
      break;
    }
  }
  return allAuth;
}

async function run() {
  console.log('Fetching all accounts and all auth.users...');
  const [users, players, clubs, academies, trainers, agents, marketers, admins, authUsers] = await Promise.all([
    fetchAll('users'),
    fetchAll('players'),
    fetchAll('clubs'),
    fetchAll('academies'),
    fetchAll('trainers'),
    fetchAll('agents'),
    fetchAll('marketers'),
    fetchAll('admins'),
    fetchAllAuthUsers()
  ]);

  console.log(`Fetched:
- users: ${users.length}
- players: ${players.length}
- clubs: ${clubs.length}
- academies: ${academies.length}
- trainers: ${trainers.length}
- agents: ${agents.length}
- marketers: ${marketers.length}
- admins: ${admins.length}
- auth.users: ${authUsers.length}`);

  // Build maps of account tables by id and uid
  const allTables = [
    { name: 'users', rows: users },
    { name: 'players', rows: players },
    { name: 'clubs', rows: clubs },
    { name: 'academies', rows: academies },
    { name: 'trainers', rows: trainers },
    { name: 'agents', rows: agents },
    { name: 'marketers', rows: marketers },
    { name: 'admins', rows: admins }
  ];

  const uidMap = new Map(); // uid -> [{ table, id, email, phone, name }]
  const idMap = new Map();  // id -> [{ table, uid, email, phone, name }]

  for (const t of allTables) {
    for (const r of t.rows) {
      const id = String(r.id || '').trim();
      const uid = String(r.uid || '').trim();
      const email = String(r.email || r.firebaseEmail || '').trim();
      const phone = String(r.phoneNormalized || r.phone || r.phoneNumber || '').trim();
      const name = String(r.full_name || r.name || r.displayName || r.academy_name || r.club_name || '').trim();

      const item = { table: t.name, id, uid, email, phone, name };

      if (id) {
        if (!idMap.has(id)) idMap.set(id, []);
        idMap.get(id).push(item);
      }

      if (uid) {
        if (!uidMap.has(uid)) uidMap.set(uid, []);
        uidMap.get(uid).push(item);
      }
    }
  }

  // Check auth.users cross-reference
  const authUidSet = new Set(authUsers.map(u => u.id));
  const authEmailSet = new Map(authUsers.map(u => [u.email ? u.email.toLowerCase() : '', u.id]));
  const authPhoneSet = new Map(authUsers.map(u => [u.phone ? u.phone.trim() : '', u.id]));

  let authWithProfile = 0;
  let authWithoutProfile = 0;
  let authUidInUsers = 0;
  let authUidInPlayers = 0;
  let authUidInBoth = 0;
  let authUidInOtherTables = 0;

  const authAnalysis = [];

  for (const u of authUsers) {
    const uid = u.id;
    const inTables = uidMap.get(uid) || [];
    const inIdTables = idMap.get(uid) || [];

    // All matching records whether by uid or by id
    const combined = [...inTables, ...inIdTables.filter(x => !inTables.some(y => y.table === x.table && y.id === x.id))];

    const tablesFound = Array.from(new Set(combined.map(c => c.table)));

    if (tablesFound.length > 0) {
      authWithProfile++;
    } else {
      authWithoutProfile++;
    }

    if (tablesFound.includes('users') && tablesFound.includes('players')) {
      authUidInBoth++;
    } else if (tablesFound.includes('users')) {
      authUidInUsers++;
    } else if (tablesFound.includes('players')) {
      authUidInPlayers++;
    } else if (tablesFound.length > 0) {
      authUidInOtherTables++;
    }

    authAnalysis.push({
      authUid: uid,
      email: u.email,
      phone: u.phone,
      tablesFound,
      recordsCount: combined.length
    });
  }

  // Cross-check accounts having / not having auth uid
  let totalAccounts = 0;
  let accountsWithAuthUid = 0;
  let accountsWithoutAuthUid = 0;
  let accountsWithEmptyUidField = 0;

  const tableAuthBreakdown = {};

  for (const t of allTables) {
    let withAuth = 0;
    let withoutAuth = 0;
    let emptyUid = 0;

    for (const r of t.rows) {
      totalAccounts++;
      const uid = String(r.uid || '').trim();
      const id = String(r.id || '').trim();

      if (!uid) {
        emptyUid++;
      }

      if (authUidSet.has(uid) || authUidSet.has(id)) {
        withAuth++;
        accountsWithAuthUid++;
      } else {
        withoutAuth++;
        accountsWithoutAuthUid++;
      }
    }

    tableAuthBreakdown[t.name] = {
      total: t.rows.length,
      withAuthUidMatch: withAuth,
      withoutAuthUidMatch: withoutAuth,
      emptyUidField: emptyUid
    };
  }

  // Check relationship between users and players specifically
  // Are they same person?
  const usersById = new Map(users.map(u => [u.id, u]));
  const playersById = new Map(players.map(p => [p.id, p]));

  let exactIdMatch = 0;
  let uidMatch = 0;
  let phoneMatchOnly = 0;
  let usersOnly = 0;
  let playersOnly = 0;

  for (const u of users) {
    const id = u.id;
    const uid = u.uid;
    const phone = u.phoneNormalized || u.phone;

    if (playersById.has(id)) {
      exactIdMatch++;
    } else if (uid && players.some(p => p.uid === uid || p.id === uid)) {
      uidMatch++;
    } else if (phone && players.some(p => (p.phoneNormalized || p.phone) === phone)) {
      phoneMatchOnly++;
    } else {
      usersOnly++;
    }
  }

  for (const p of players) {
    const id = p.id;
    const uid = p.uid;
    const phone = p.phoneNormalized || p.phone;

    if (!usersById.has(id) && !(uid && users.some(u => u.uid === uid || u.id === uid)) && !(phone && users.some(u => (u.phoneNormalized || u.phone) === phone))) {
      playersOnly++;
    }
  }

  const results = {
    totals: {
      authUsersCount: authUsers.length,
      totalPublicAccounts: totalAccounts,
      authWithProfile,
      authWithoutProfile,
      authUidInBothUsersAndPlayers: authUidInBoth,
      authUidInUsersOnly: authUidInUsers,
      authUidInPlayersOnly: authUidInPlayers,
      authUidInOtherTables: authUidInOtherTables,
      accountsWithAuthUid,
      accountsWithoutAuthUid
    },
    tableAuthBreakdown,
    usersPlayersOverlap: {
      totalUsers: users.length,
      totalPlayers: players.length,
      exactSameDocumentId: exactIdMatch,
      sameUidDifferentId: uidMatch,
      samePhoneDifferentIdAndUid: phoneMatchOnly,
      usersOnlyAccounts: usersOnly,
      playersOnlyAccounts: playersOnly
    }
  };

  fs.writeFileSync('scratch/auth-comparison.json', JSON.stringify(results, null, 2), 'utf8');
  console.log('✅ Saved scratch/auth-comparison.json:');
  console.log(JSON.stringify(results, null, 2));
}

run();
