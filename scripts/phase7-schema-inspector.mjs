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

const TABLES = ['users', 'players', 'clubs', 'academies', 'trainers', 'agents', 'marketers', 'admins'];

async function run() {
  console.log('--- PHASE 7 SCHEMA INSPECTOR ---');
  
  // 1. Check columns and sample rows from Supabase
  const tableMetadata = {};
  for (const t of TABLES) {
    try {
      const { data, count, error } = await supabase.from(t).select('*', { count: 'exact' }).limit(1);
      if (error) {
        tableMetadata[t] = { error: error.message };
        console.error(`Error querying ${t}:`, error.message);
      } else {
        const sample = data && data[0] ? data[0] : {};
        tableMetadata[t] = {
          rowCount: count,
          columns: Object.keys(sample),
          samplePreview: sample
        };
        console.log(`Table ${t}: ${count} rows, ${Object.keys(sample).length} columns detected`);
      }
    } catch (e) {
      tableMetadata[t] = { error: e.message };
    }
  }

  // 2. Parse schema.sql for exact DDL types, defaults, PKs, NOT NULL
  const schemaContent = fs.readFileSync('schema.sql', 'utf8');
  const ddlTables = {};

  for (const t of TABLES) {
    // Regex to match CREATE TABLE IF NOT EXISTS "table" (...)
    const regex = new RegExp(`CREATE TABLE IF NOT EXISTS ["']?${t}["']?\\s*\\((([\\s\\S]*?)(?:\\n\\);|\\n\\);;))`, 'i');
    const match = regex.exec(schemaContent);
    if (match) {
      const body = match[1];
      const columnDefs = [];
      const lines = body.split('\n');
      for (const line of lines) {
        const trimmed = line.trim().replace(/,$/, '');
        if (!trimmed || trimmed.startsWith('--')) continue;
        const colMatch = /^["']?([a-zA-Z0-9_]+)["']?\s+([A-Z0-9_\(\)]+)(.*)$/i.exec(trimmed);
        if (colMatch) {
          const colName = colMatch[1];
          const colType = colMatch[2];
          const rest = colMatch[3] ? colMatch[3].trim() : '';
          const isPK = /PRIMARY KEY/i.test(rest);
          const isNotNull = /NOT NULL/i.test(rest);
          const hasDefault = /DEFAULT\s+([^,]+)/i.exec(rest);
          columnDefs.push({
            name: colName,
            type: colType,
            isPK,
            isNotNull,
            defaultVal: hasDefault ? hasDefault[1] : null,
            raw: trimmed
          });
        }
      }
      ddlTables[t] = columnDefs;
    } else {
      ddlTables[t] = [];
    }
  }

  // 3. Inspect auth.users
  let authUsersTotal = 0;
  let sampleAuthUsers = [];
  try {
    const { data: authData, error: authErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 100 });
    if (authErr) {
      console.warn('auth.admin.listUsers error:', authErr.message);
    } else if (authData && authData.users) {
      sampleAuthUsers = authData.users;
      authUsersTotal = authData.users.length;
      console.log(`Supabase auth.users sample loaded: ${sampleAuthUsers.length} users in page 1`);
    }
  } catch (err) {
    console.warn('auth.admin call failed:', err.message);
  }

  const result = {
    tableMetadata,
    ddlTables,
    authUsersSampleCount: sampleAuthUsers.length,
    sampleAuthUsers: sampleAuthUsers.slice(0, 5).map(u => ({
      id: u.id,
      email: u.email,
      phone: u.phone,
      created_at: u.created_at,
      app_metadata: u.app_metadata,
      user_metadata: u.user_metadata
    }))
  };

  fs.writeFileSync('scratch/schema-inspection.json', JSON.stringify(result, null, 2), 'utf8');
  console.log('✅ Saved scratch/schema-inspection.json');
}

run();
