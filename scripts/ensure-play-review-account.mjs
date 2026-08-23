import 'dotenv/config';
import crypto from 'node:crypto';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const REVIEW_PHONE = '+201017799580';
const REVIEW_OTP = process.env.PLAY_REVIEW_OTP || '2026';
const REVIEW_NAME = 'Google Play Review Player';
const DEMO_OTP = process.env.DEMO_OTP || '123456';

const DEMO_ACCOUNTS = [
  { phone: '01000000001', accountType: 'club', table: 'clubs', name: 'Demo Club Account' },
  { phone: '01000000002', accountType: 'academy', table: 'academies', name: 'Demo Academy Account' },
  { phone: '01000000003', accountType: 'trainer', table: 'trainers', name: 'Demo Trainer Account' },
  { phone: '01000000004', accountType: 'player', table: 'players', name: 'Demo Player Account' },
  { phone: '01000000005', accountType: 'agent', table: 'agents', name: 'Demo Agent Account' },
  { phone: '01000000006', accountType: 'marketer', table: 'marketers', name: 'Demo Marketer Account' },
];

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function normalizePhone(phone) {
  return String(phone).replace(/\D/g, '');
}

async function rest(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
      ...options,
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
        Prefer: 'return=representation',
        ...(options.headers || {}),
      },
      signal: controller.signal,
    });
    const text = await response.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }
    return { ok: response.ok, status: response.status, body };
  } finally {
    clearTimeout(timer);
  }
}

function phoneOrFilter(phone) {
  const digits = normalizePhone(phone);
  const variants = [
    phone,
    digits,
    phone.startsWith('+') ? phone.slice(1) : `+2${digits}`,
  ];
  const fields = ['phone', 'originalPhone', 'phoneNumber', 'phoneNormalized', 'mobile', 'whatsapp'];
  return fields
    .flatMap((field) => variants.map((value) => `${field}.eq.${encodeURIComponent(value)}`))
    .join(',');
}

async function findAccount(table, phone) {
  const filter = phoneOrFilter(phone);
  const result = await rest(
    `${table}?select=id,uid,email,full_name,name,accountType,isActive,isDeleted&or=(${filter})&limit=10`,
  );
  if (!result.ok) {
    throw new Error(`Unable to read ${table}: ${JSON.stringify(result.body)}`);
  }
  return (Array.isArray(result.body) ? result.body : []).find((row) => row?.isDeleted !== true) || null;
}

async function ensurePlayer() {
  const existing = await findAccount('players', REVIEW_PHONE);
  if (existing) return { created: false, player: existing };

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const cleanPhone = normalizePhone(REVIEW_PHONE);
  const doc = {
    id,
    uid: id,
    email: `${cleanPhone}@el7lm.com`,
    phone: REVIEW_PHONE,
    phoneNumber: REVIEW_PHONE,
    originalPhone: REVIEW_PHONE,
    phoneNormalized: cleanPhone,
    full_name: REVIEW_NAME,
    name: REVIEW_NAME,
    accountType: 'player',
    country: 'Egypt',
    nationality: 'Egyptian',
    isActive: true,
    isDeleted: false,
    isVerifiedLocal: true,
    profileCompleted: false,
    createdAt: now,
    updatedAt: now,
  };

  const player = await insertAccountRow('players', doc);
  await insertAccountRow('users', doc, true);

  return { created: true, player };
}

async function insertAccountRow(table, doc, ignoreFailure = false) {
  const insert = await rest(table, {
    method: 'POST',
    body: JSON.stringify(doc),
  });
  if (!insert.ok) {
    if (ignoreFailure) return doc;
    throw new Error(`Unable to create ${table} row: ${JSON.stringify(insert.body)}`);
  }
  return Array.isArray(insert.body) ? insert.body[0] : doc;
}

async function ensureFixedOtp(phone, otp) {
  const now = new Date().toISOString();
  const credential = {
    phone_hash: sha256(normalizePhone(phone)),
    otp_hash: sha256(otp),
    is_active: true,
    failed_attempts: 0,
    locked_until: null,
    updated_at: now,
  };

  const result = await rest('play_review_credentials?on_conflict=phone_hash', {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=representation' },
    body: JSON.stringify(credential),
  });
  if (!result.ok) {
    throw new Error(`Unable to upsert fixed OTP: ${JSON.stringify(result.body)}`);
  }
}

async function ensureDemoAccount(account) {
  const existing = await findAccount(account.table, account.phone);
  if (existing) {
    await ensureFixedOtp(account.phone, DEMO_OTP);
    return { created: false, account: existing };
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const cleanPhone = normalizePhone(account.phone);
  const e164Phone = `+2${cleanPhone}`;
  const doc = {
    id,
    uid: id,
    email: `${cleanPhone}@el7lm.com`,
    phone: account.phone,
    phoneNumber: account.phone,
    originalPhone: account.phone,
    phoneNormalized: cleanPhone,
    full_name: account.name,
    name: account.name,
    accountType: account.accountType,
    country: 'Egypt',
    nationality: 'Egyptian',
    isActive: true,
    isDeleted: false,
    isVerifiedLocal: true,
    profileCompleted: account.accountType !== 'player',
    createdAt: now,
    updatedAt: now,
    ...(account.accountType === 'player'
      ? {
          primary_position: 'Forward',
          height: '180',
          weight: '75',
          birth_date: '2006-01-01',
        }
      : {}),
    ...(account.accountType === 'club' ? { club_name: account.name } : {}),
    ...(account.accountType === 'academy' ? { academy_name: account.name } : {}),
    ...(account.accountType === 'agent' ? { agency_name: account.name } : {}),
    ...(account.accountType === 'trainer' ? { specialization: 'Football Training' } : {}),
    ...(account.accountType === 'marketer' ? { company_name: account.name } : {}),
  };

  const created = await insertAccountRow(account.table, doc);
  await insertAccountRow('users', { ...doc, phone: e164Phone }, true);
  await ensureFixedOtp(account.phone, DEMO_OTP);
  return { created: true, account: created };
}

async function main() {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment.');
  }

  const { created, player } = await ensurePlayer();
  await ensureFixedOtp(REVIEW_PHONE, REVIEW_OTP);
  const demoResults = [];
  for (const account of DEMO_ACCOUNTS) {
    const result = await ensureDemoAccount(account);
    demoResults.push({
      phone: account.phone,
      otp: DEMO_OTP,
      accountType: account.accountType,
      created: result.created,
    });
  }

  console.log(JSON.stringify({
    ok: true,
    created,
    account: {
      phone: REVIEW_PHONE,
      otp: REVIEW_OTP,
      type: 'player',
      name: player.full_name || player.name || REVIEW_NAME,
      email: player.email || `${normalizePhone(REVIEW_PHONE)}@el7lm.com`,
      isActive: player.isActive !== false,
    },
    demoAccounts: demoResults,
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exitCode = 1;
});
