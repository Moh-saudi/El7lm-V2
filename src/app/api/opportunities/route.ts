/**
 * Opportunities API — uses admin client to bypass RLS
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

// الأعمدة الموجودة فعلاً في الجدول
const DB_COLUMNS = new Set([
  'id', 'organizerId', 'organizerName', 'organizerType', 'organizerAvatar',
  'title', 'description', 'opportunityType', 'country', 'city', 'salary',
  'contractDuration', 'requirements', 'positions', 'ageRange', 'deadline',
  'status', 'isActive', 'isFeatured', 'viewCount', 'currentApplicants',
  'maxApplicants', 'tags', 'metadata', 'createdAt', 'updatedAt',
  'ageMax', 'ageMin', 'applicationDeadline', 'durationDays',
]);

function buildPayload(data: Record<string, unknown>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  const metadata: Record<string, unknown> = (data.metadata as Record<string, unknown>) || {};

  for (const [key, value] of Object.entries(data)) {
    if (key === 'metadata') continue;
    if (DB_COLUMNS.has(key)) {
      payload[key] = value;
    } else {
      // تحويل targetPositions → positions
      if (key === 'targetPositions') {
        payload['positions'] = value;
      } else {
        metadata[key] = value;
      }
    }
  }

  if (Object.keys(metadata).length > 0) {
    payload['metadata'] = metadata;
  }

  return payload;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const organizerId = searchParams.get('organizerId');
  const explore = searchParams.get('explore') === 'true';
  const status = searchParams.get('status');
  const type = searchParams.get('type');
  const country = searchParams.get('country');
  const id = searchParams.get('id');

  try {
    const db = getSupabaseAdmin();
    let query = db.from('opportunities').select('*');

    if (id) {
      query = query.eq('id', id) as typeof query;
    } else if (explore) {
      // Public explore: only active opportunities
      query = query.eq('status', 'active').eq('isActive', true) as typeof query;
      if (type) query = query.eq('opportunityType', type) as typeof query;
      if (country) query = query.eq('country', country) as typeof query;
    } else if (organizerId) {
      // Publisher view: my opportunities
      query = query.eq('organizerId', organizerId) as typeof query;
      if (status) query = query.eq('status', status) as typeof query;
    } else {
      return NextResponse.json({ error: 'id, organizerId, or explore required' }, { status: 400 });
    }

    const { data, error } = await query;
    if (error) {
      console.error('[/api/opportunities] error:', error);
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    // دمج metadata مع root لتوافق الـ UI
    const merged = (data ?? []).map((row: any) => ({ ...(row.metadata || {}), ...row }));
    return NextResponse.json({ data: merged });
  } catch (err: any) {
    console.error('[/api/opportunities] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const db = getSupabaseAdmin();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();
    const raw = { id, ...body, currentApplicants: 0, viewCount: 0, createdAt: now, updatedAt: now };
    const payload = buildPayload(raw);
    const { error } = await db.from('opportunities').insert(payload);
    if (error) {
      console.error('[/api/opportunities POST] Supabase error:', JSON.stringify(error));
      return NextResponse.json({ error: error.message, code: error.code, hint: error.hint }, { status: 500 });
    }
    return NextResponse.json({ id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const db = getSupabaseAdmin();
    const payload = buildPayload({ ...updates, updatedAt: new Date().toISOString() });
    const { error } = await db.from('opportunities').update(payload).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const db = getSupabaseAdmin();
    const { error } = await db.from('opportunities').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
