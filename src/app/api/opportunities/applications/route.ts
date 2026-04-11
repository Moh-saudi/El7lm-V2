import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get('opportunityId');
  const playerId = searchParams.get('playerId');
  const status = searchParams.get('status');

  try {
    const db = getSupabaseAdmin();
    let query = db.from('opportunity_applications').select('*');

    if (opportunityId) {
      query = query.eq('opportunityId', opportunityId) as typeof query;
    } else if (playerId) {
      query = query.eq('playerId', playerId) as typeof query;
    } else {
      return NextResponse.json({ error: 'opportunityId or playerId required' }, { status: 400 });
    }

    if (status) query = query.eq('status', status) as typeof query;

    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ data: data ?? [] });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { id, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const db = getSupabaseAdmin();
    const { error } = await db
      .from('opportunity_applications')
      .update({ ...updates, updatedAt: new Date().toISOString() })
      .eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
