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

async function inspectColumns() {
  const tables = ['player_favorites', 'notifications', 'messages', 'conversations', 'opportunities'];
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*').limit(1);
    if (data && data.length > 0) {
      console.log(`Columns for ${t}:`, Object.keys(data[0]));
    } else {
      console.log(`No sample row for ${t}`);
    }
  }
}

inspectColumns();
