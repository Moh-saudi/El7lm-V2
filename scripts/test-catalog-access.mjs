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

async function testCatalogAccess() {
  console.log('Testing access to information_schema...');
  try {
    const { data, error } = await supabase.from('information_schema.columns').select('*').limit(1);
    console.log('from information_schema.columns:', error ? error.message : 'SUCCESS');
  } catch (e) {
    console.log('from information_schema.columns catch:', e.message);
  }

  try {
    const { data, error } = await supabase.rpc('pg_indexes');
    console.log('rpc pg_indexes:', error ? error.message : 'SUCCESS');
  } catch (e) {
    console.log('rpc pg_indexes catch:', e.message);
  }
}

testCatalogAccess();
