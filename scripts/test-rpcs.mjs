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

async function testRpcs() {
  const testNames = ['exec_sql', 'execute_sql', 'query', 'sql', 'run_sql', 'get_indexes'];
  for (const name of testNames) {
    try {
      const { data, error } = await supabase.rpc(name, { query: 'SELECT 1' });
      console.log(`RPC ${name}:`, error ? error.message : 'SUCCESS');
    } catch (e) {
      console.log(`RPC ${name} catch:`, e.message);
    }
  }
}

testRpcs();
