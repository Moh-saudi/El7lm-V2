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

async function run() {
  console.log('Fetching foreign key / relational records...');
  const [notifs, msgs, convs, favs, opps] = await Promise.all([
    fetchAll('notifications'),
    fetchAll('messages'),
    fetchAll('conversations'),
    fetchAll('player_favorites'),
    fetchAll('opportunities')
  ]);

  console.log(`Fetched: ${notifs.length} notifs, ${msgs.length} msgs, ${convs.length} convs, ${favs.length} favs, ${opps.length} opps`);

  const notifUsers = new Set();
  notifs.forEach(n => { if (n.userId) notifUsers.add(String(n.userId).trim()); });

  const msgUsers = new Set();
  msgs.forEach(m => {
    if (m.senderId) msgUsers.add(String(m.senderId).trim());
    if (m.receiverId) msgUsers.add(String(m.receiverId).trim());
  });

  const convUsers = new Set();
  convs.forEach(c => {
    if (Array.isArray(c.participants)) {
      c.participants.forEach(p => convUsers.add(String(p).trim()));
    } else if (typeof c.participants === 'string') {
      try {
        const parsed = JSON.parse(c.participants);
        if (Array.isArray(parsed)) parsed.forEach(p => convUsers.add(String(p).trim()));
      } catch {
        convUsers.add(c.participants.trim());
      }
    }
  });

  const favUsers = new Set();
  favs.forEach(f => {
    if (f.owner_id) favUsers.add(String(f.owner_id).trim());
    if (f.player_id) favUsers.add(String(f.player_id).trim());
  });

  const oppUsers = new Set();
  opps.forEach(o => {
    if (o.organizerId) oppUsers.add(String(o.organizerId).trim());
  });

  console.log(`Unique dependent IDs:
- Notifications: ${notifUsers.size}
- Messages: ${msgUsers.size}
- Conversations: ${convUsers.size}
- Player Favorites: ${favUsers.size}
- Opportunities: ${oppUsers.size}`);

  const depMap = {
    notifUsers: Array.from(notifUsers),
    msgUsers: Array.from(msgUsers),
    convUsers: Array.from(convUsers),
    favUsers: Array.from(favUsers),
    oppUsers: Array.from(oppUsers)
  };

  fs.writeFileSync('scratch/dependency-map.json', JSON.stringify(depMap, null, 2), 'utf8');
  console.log('✅ Saved scratch/dependency-map.json');
}

run();
