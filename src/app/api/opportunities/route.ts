/**
 * Opportunities API — uses admin client to bypass RLS
 */
import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';
import { translateOpportunityFields } from '@/lib/services/translation-service';

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
  const targetLang = (searchParams.get('locale') || searchParams.get('lang') || request.headers.get('accept-language')?.slice(0, 2) || '').toLowerCase();

  try {
    const db = getSupabaseAdmin();
    let query = db.from('opportunities').select('*');

    if (id) {
      query = query.eq('id', id).eq('status', 'active').eq('isActive', true) as typeof query;
    } else if (explore) {
      // Public explore: only active opportunities
      query = query.eq('status', 'active').eq('isActive', true) as typeof query;
    } else if (organizerId) {
      query = query.eq('organizerId', organizerId) as typeof query;
      if (status) query = query.eq('status', status) as typeof query;
    }

    if (type) query = query.eq('opportunityType', type) as typeof query;
    if (country) query = query.eq('country', country) as typeof query;

    const { data, error } = await query.order('createdAt', { ascending: false });

    if (error) {
      console.error('[/api/opportunities GET] error:', error);
      if (explore) {
        return NextResponse.json({ data: [] });
      }
      return NextResponse.json({ error: error.message, code: error.code }, { status: 500 });
    }

    // دمج metadata مع root لتوافق الـ UI وتطبيق الترجمة المطلوبة
    const merged = (data ?? []).map((row: any) => {
      const item = { ...(row.metadata || {}), ...row };
      if (targetLang && targetLang !== 'ar' && item.translations) {
        const tr = item.translations[targetLang] || item.translations['en'];
        if (tr) {
          if (tr.title) item.title = tr.title;
          if (tr.description) item.description = tr.description;
          if (tr.requirements) item.requirements = tr.requirements;
        }
      }
      return item;
    });

    return NextResponse.json({ data: merged });
  } catch (err: any) {
    if (explore) {
      return NextResponse.json({ data: [] });
    }
    console.error('[/api/opportunities] unexpected error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;
  try {
    const body = await request.json();
    const db = getSupabaseAdmin();
    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    // Auto-generate translations for non-Arabic locales
    let translations = body.metadata?.translations || body.translations;
    if (!translations && body.title) {
      try {
        translations = await translateOpportunityFields(body.title, body.description, body.requirements);
      } catch (tErr) {
        console.warn('[/api/opportunities POST] auto-translate error:', tErr);
      }
    }

    const metadata = {
      ...(body.metadata || {}),
      ...(translations ? { translations } : {}),
    };

    const raw = {
      id,
      ...body,
      metadata,
      organizerId: authorization.user.id,
      currentApplicants: 0,
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };
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
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id, organizerId: _ignoredOrganizerId, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const db = getSupabaseAdmin();

    // Auto-generate translations if title/description changed
    let translations = updates.metadata?.translations || updates.translations;
    if (!translations && (updates.title || updates.description)) {
      try {
        translations = await translateOpportunityFields(updates.title || '', updates.description, updates.requirements);
      } catch (tErr) {
        console.warn('[/api/opportunities PATCH] auto-translate error:', tErr);
      }
    }

    const metadata = {
      ...(updates.metadata || {}),
      ...(translations ? { translations } : {}),
    };

    const payload = buildPayload({ ...updates, metadata, updatedAt: new Date().toISOString() });
    const { data, error } = await db
      .from('opportunities')
      .update(payload)
      .eq('id', id)
      .eq('organizerId', authorization.user.id)
      .select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const db = getSupabaseAdmin();
    const { data, error } = await db
      .from('opportunities')
      .delete()
      .eq('id', id)
      .eq('organizerId', authorization.user.id)
      .select('id');
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data?.length) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
