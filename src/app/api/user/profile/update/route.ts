import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

const ALLOWED_TABLES = new Set([
  'players',
  'clubs',
  'academies',
  'agents',
  'trainers',
  'marketers',
  'users',
]);

const NON_COLUMN_KEYS = new Set([
  'userId',
  'accountType',
  'values',
  'rawPayload',
  'editRequestStatus',
  'edit_request_status',
  'is_edit_pending',
  'edit_request_date',
  '_organization',
  'email', // Protected, updated via dedicated email flow
]);

export async function POST(request: NextRequest) {
  try {
    const admin = getSupabaseAdmin();
    const body = await request.json();

    const {
      userId,
      accountType,
      table: requestedTable,
      updates = {},
    } = body;

    const targetTable = (requestedTable || (accountType === 'player' ? 'players' : `${accountType}s`)).toLowerCase();

    if (!ALLOWED_TABLES.has(targetTable)) {
      return NextResponse.json(
        { success: false, error: `Invalid table: ${targetTable}` },
        { status: 400 }
      );
    }

    // 1. Resolve Authentication (Optional Bearer token verification)
    let authenticatedUserId: string | null = null;
    const authHeader = request.headers.get('authorization') || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7).trim();
      if (token) {
        try {
          const { data: { user } } = await admin.auth.getUser(token);
          if (user) {
            authenticatedUserId = user.id;
          }
        } catch {
          // Token expired or invalid, fall back to body userId
        }
      }
    }

    const effectiveUserId = (authenticatedUserId || userId || '').trim();
    if (!effectiveUserId) {
      return NextResponse.json(
        { success: false, error: 'User identifier is required' },
        { status: 400 }
      );
    }

    // 2. Prepare payload
    const payload: Record<string, any> = {};
    for (const [key, val] of Object.entries(updates)) {
      if (!key.startsWith('_') && !NON_COLUMN_KEYS.has(key)) {
        payload[key] = val;
      }
    }

    const nowIso = new Date().toISOString();
    payload.updated_at = nowIso;
    payload.updatedAt = nowIso;

    // Field normalizations for players
    if (targetTable === 'players') {
      if (payload.name && !payload.full_name) {
        payload.full_name = payload.name;
      }
      if (payload.full_name && !payload.name) {
        payload.name = payload.full_name;
      }
      if (payload.position && !payload.primary_position) {
        payload.primary_position = payload.position;
      }
      if (payload.chronic_diseases !== undefined) {
        const cd = `${payload.chronic_diseases || ''}`.trim();
        const hasCondition = cd.length > 0 && cd !== 'لا يوجد' && cd.toLowerCase() !== 'none';
        payload.chronic_details = cd;
        payload.chronic_conditions = hasCondition;
        payload.has_chronic_conditions = hasCondition;
      }
    }

    // 3. Find existing record by id, uid, or user_id
    let existingRow: any = null;
    const candidates = Array.from(new Set([effectiveUserId, userId, authenticatedUserId].filter(Boolean) as string[]));
    for (const cand of candidates) {
      if (existingRow) break;
      const lookupQueries = [
        admin.from(targetTable).select('*').eq('id', cand).maybeSingle(),
        admin.from(targetTable).select('*').eq('uid', cand).maybeSingle(),
      ];
      if (targetTable === 'players') {
        lookupQueries.push(admin.from(targetTable).select('*').eq('user_id', cand).maybeSingle());
      }

      for (const q of lookupQueries) {
        const { data, error } = await q;
        if (!error && data) {
          existingRow = data;
          break;
        }
      }
    }

    const recordId = existingRow?.id || effectiveUserId || userId;

    // 4. Update or Upsert resiliently (strip unknown columns if schema cache mismatch)
    const currentPayload = { ...payload };
    let saved = false;
    let lastError: any = null;
    let savedData: any = null;

    while (!saved && Object.keys(currentPayload).length > 0) {
      try {
        if (existingRow) {
          const { data, error } = await admin
            .from(targetTable)
            .update(currentPayload)
            .eq('id', recordId)
            .select();

          if (error) throw error;
          savedData = data?.[0] || { id: recordId, ...currentPayload };
          saved = true;
        } else {
          // If no existing row found, upsert with id = recordId
          const upsertPayload = { id: recordId, ...currentPayload };
          const { data, error } = await admin
            .from(targetTable)
            .upsert(upsertPayload)
            .select();

          if (error) throw error;
          savedData = data?.[0] || upsertPayload;
          saved = true;
        }
      } catch (err: any) {
        lastError = err;
        const errStr = err?.message || String(err);
        const match = errStr.match(
          /(?:Could not find the '([a-zA-Z0-9_]+)' column|column (?:public\.)?[a-zA-Z0-9_]+\.([a-zA-Z0-9_]+) does not exist|column "([a-zA-Z0-9_]+)" of relation "[^"]+" does not exist)/i
        );
        const missingCol = match ? (match[1] || match[2] || match[3]) : null;

        if (missingCol && missingCol in currentPayload) {
          console.warn(`[Profile Update API] Dropping unknown column "${missingCol}" and retrying...`);
          delete currentPayload[missingCol];
          continue;
        }

        break;
      }
    }

    if (!saved) {
      console.error(`[Profile Update API] Failed to update ${targetTable}:`, lastError);
      return NextResponse.json(
        { success: false, error: lastError?.message || 'Database update failed' },
        { status: 500 }
      );
    }

    // 5. Also sync basic info to 'users' table if relevant
    try {
      const userSyncPayload: Record<string, any> = { updatedAt: nowIso };
      if (payload.full_name || payload.name) {
        userSyncPayload.displayName = payload.full_name || payload.name;
      }
      if (payload.phone || payload.phoneNumber) {
        userSyncPayload.phoneNumber = payload.phone || payload.phoneNumber;
      }
      if (Object.keys(userSyncPayload).length > 1) {
        await admin.from('users').update(userSyncPayload).eq('id', recordId);
      }
    } catch (uErr) {
      // Non-fatal sync error
      console.warn('[Profile Update API] Non-fatal users table sync warning:', uErr);
    }

    return NextResponse.json({
      success: true,
      table: targetTable,
      data: savedData,
    });
  } catch (error: any) {
    console.error('[Profile Update API] Unexpected error:', error);
    return NextResponse.json(
      { success: false, error: error?.message || 'Internal server error' },
      { status: 500 }
    );
  }
}
