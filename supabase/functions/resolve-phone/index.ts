import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, errorResponse } from '../_shared/messages.ts';

const ACCOUNT_TABLES = [
  'players',
  'clubs',
  'academies',
  'agents',
  'trainers',
  'marketers',
  'users',
] as const;

const TABLE_ACCOUNT_TYPE: Record<(typeof ACCOUNT_TABLES)[number], string> = {
  players: 'player',
  clubs: 'club',
  academies: 'academy',
  agents: 'agent',
  trainers: 'trainer',
  marketers: 'marketer',
  users: 'player',
};

const TABLE_PHONE_FIELDS: Record<(typeof ACCOUNT_TABLES)[number], string[]> = {
  players: ['phone', 'originalPhone', 'phoneNumber', 'phoneNormalized', 'whatsapp'],
  clubs: ['phone', 'originalPhone', 'phoneNormalized', 'whatsapp'],
  academies: ['phone', 'whatsapp'],
  agents: ['phone', 'originalPhone', 'phoneNormalized', 'whatsapp'],
  trainers: ['phone', 'originalPhone', 'phoneNormalized', 'whatsapp'],
  marketers: ['phone', 'originalPhone', 'phoneNormalized'],
  users: ['phone', 'originalPhone', 'phoneNumber', 'phoneNormalized', 'whatsapp'],
};

function normalizeDigits(raw: string): string {
  return raw
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 1632))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 1776))
    .replace(/[^\d+]/g, '');
}

function generatePhoneVariants(rawPhone: string): string[] {
  const cleaned = normalizeDigits(rawPhone);
  if (!cleaned) return [];

  const variants = new Set<string>();
  variants.add(cleaned);

  const withoutPlus = cleaned.startsWith('+') ? cleaned.slice(1) : cleaned;
  variants.add(withoutPlus);
  variants.add(`+${withoutPlus}`);

  // Egypt
  if (withoutPlus.startsWith('20') && withoutPlus.length === 12) {
    const local = `0${withoutPlus.slice(2)}`;
    variants.add(local);
    variants.add(withoutPlus.slice(2));
  } else if (withoutPlus.startsWith('01') && withoutPlus.length === 11) {
    variants.add(`20${withoutPlus.slice(1)}`);
    variants.add(`+20${withoutPlus.slice(1)}`);
    variants.add(withoutPlus.slice(1));
  }

  // Saudi Arabia
  if (withoutPlus.startsWith('966') && withoutPlus.length === 12) {
    const local = `0${withoutPlus.slice(3)}`;
    variants.add(local);
    variants.add(withoutPlus.slice(3));
  } else if (withoutPlus.startsWith('05') && withoutPlus.length === 10) {
    variants.add(`966${withoutPlus.slice(1)}`);
    variants.add(`+966${withoutPlus.slice(1)}`);
    variants.add(withoutPlus.slice(1));
  }

  return Array.from(variants).filter(Boolean);
}

function isUnavailable(row: Record<string, unknown>): boolean {
  return (
    row.isDeleted === true ||
    row.isDeleted === 'true' ||
    row.isActive === false ||
    Boolean(row.deletedAt || row.deletedBy)
  );
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch (_) {
      body = {};
    }

    const phoneNumber = String(body?.phoneNumber ?? body?.phone ?? '').trim();
    if (!phoneNumber) {
      return errorResponse(req, 'accountLookupUnavailable', 400);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ??
      Deno.env.get('SUPABASE_ANON_KEY') ??
      '';

    if (!supabaseUrl || !supabaseServiceKey) {
      return errorResponse(req, 'serviceUnavailable', 500);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const variants = generatePhoneVariants(phoneNumber);

    if (variants.length === 0) {
      return errorResponse(req, 'accountLookupUnavailable', 400);
    }

    const queries: Promise<{
      table: (typeof ACCOUNT_TABLES)[number];
      data: any[] | null;
      error: any;
    }>[] = [];

    for (const table of ACCOUNT_TABLES) {
      const fields = TABLE_PHONE_FIELDS[table] ?? ['phone'];
      for (const field of fields) {
        queries.push(
          (async () => {
            const { data, error } = await supabase
              .from(table)
              .select(
                'id, uid, email, name, full_name, displayName, accountType, isDeleted, isActive, deletedAt, deletedBy',
              )
              .in(field, variants)
              .limit(3);
            return { table, data, error };
          })(),
        );
      }
    }

    const results = await Promise.all(queries);

    for (const { table, data, error } of results) {
      if (error) continue;
      for (const rawRow of data ?? []) {
        const row = rawRow as Record<string, unknown>;
        if (isUnavailable(row)) continue;
        const id = String(row.id ?? '').trim();
        if (!id) continue;

        const rawType = String(row.accountType ?? '').trim().toLowerCase();
        const accountType = rawType || TABLE_ACCOUNT_TYPE[table];

        return new Response(
          JSON.stringify({
            success: true,
            found: true,
            canLogin: true,
            canRegister: false,
            accountType,
          }),
          {
            status: 200,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json; charset=utf-8',
            },
          },
        );
      }
    }

    // Auth fallback
    try {
      const { data, error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      if (!error && data?.users) {
        const wanted = new Set(variants);
        const match = data.users.find((user: any) => {
          const metadataPhone = String(
            user.app_metadata?.phone ?? user.user_metadata?.phone ?? '',
          );
          return wanted.has(user.phone ?? '') || wanted.has(metadataPhone);
        });

        if (match) {
          const accountType = String(
            match.app_metadata?.accountType ??
              match.user_metadata?.accountType ??
              'player',
          ).trim().toLowerCase();

          return new Response(
            JSON.stringify({
              success: true,
              found: true,
              canLogin: true,
              canRegister: false,
              accountType,
            }),
            {
              status: 200,
              headers: {
                ...corsHeaders,
                'Content-Type': 'application/json; charset=utf-8',
              },
            },
          );
        }
      }
    } catch (_) {}

    // Not found
    return new Response(
      JSON.stringify({
        success: true,
        found: false,
        canLogin: false,
        canRegister: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json; charset=utf-8',
        },
      },
    );
  } catch (err) {
    console.error('[resolve-phone error]', err);
    return errorResponse(req, 'accountLookupUnavailable', 500);
  }
});
