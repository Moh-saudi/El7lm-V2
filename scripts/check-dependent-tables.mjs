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

async function inspectForeignKeys() {
  console.log('Inspecting foreign key relationships and dependent tables...');
  
  // Query information_schema via RPC or direct tables if available
  const tables = [
    'notifications',
    'messages',
    'conversations',
    'player_favorites',
    'favorites',
    'opportunities',
    'applications',
    'videos',
    'comments',
    'likes',
    'clubs',
    'academies',
    'trainers',
    'agents',
    'marketers',
    'admins'
  ];

  for (const t of tables) {
    try {
      const { count, error } = await supabase.from(t).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table ${t}: NOT FOUND or Error (${error.message})`);
      } else {
        console.log(`Table ${t}: EXISTS with ${count} rows`);
      }
    } catch (e) {
      console.log(`Table ${t}: Error (${e.message})`);
    }
  }
}

inspectForeignKeys();
