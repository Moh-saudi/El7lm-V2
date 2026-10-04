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
        if (!res.error) {
          data = res.data;
          success = true;
        } else {
          attempts++;
          await new Promise(r => setTimeout(r, 1000));
        }
      } catch {
        attempts++;
        await new Promise(r => setTimeout(r, 1000));
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
  const [users, clubs, academies, trainers, agents, marketers, admins] = await Promise.all([
    fetchAll('users'),
    fetchAll('clubs'),
    fetchAll('academies'),
    fetchAll('trainers'),
    fetchAll('agents'),
    fetchAll('marketers'),
    fetchAll('admins')
  ]);

  const usersById = new Map(users.map(u => [u.id, u]));
  const usersByUid = new Map(users.filter(u => u.uid).map(u => [u.uid, u]));
  const usersByPhone = new Map(users.filter(u => u.phoneNormalized || u.phone).map(u => [u.phoneNormalized || u.phone, u]));

  const otherTables = [
    { name: 'clubs', rows: clubs },
    { name: 'academies', rows: academies },
    { name: 'trainers', rows: trainers },
    { name: 'agents', rows: agents },
    { name: 'marketers', rows: marketers },
    { name: 'admins', rows: admins }
  ];

  const results = {};

  for (const t of otherTables) {
    let exactIdMatch = 0;
    let uidMatch = 0;
    let phoneMatch = 0;
    let standalone = 0;

    for (const r of t.rows) {
      const id = r.id;
      const uid = r.uid;
      const phone = r.phoneNormalized || r.phone;

      if (usersById.has(id)) {
        exactIdMatch++;
      } else if (uid && usersByUid.has(uid)) {
        uidMatch++;
      } else if (phone && usersByPhone.has(phone)) {
        phoneMatch++;
      } else {
        standalone++;
      }
    }

    results[t.name] = {
      totalRows: t.rows.length,
      sharesIdWithUsers: exactIdMatch,
      sharesUidWithUsers: uidMatch,
      sharesPhoneWithUsers: phoneMatch,
      standaloneNoMatch: standalone
    };
  }

  console.log('--- OTHER TABLES OVERLAP WITH USERS ---');
  console.table(results);

  fs.writeFileSync('scratch/other-tables-overlap.json', JSON.stringify(results, null, 2), 'utf8');
}

run();
