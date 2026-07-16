import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeUser } from '@/lib/api/user-auth';

export async function GET(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;
  const { searchParams } = new URL(request.url);
  const opportunityId = searchParams.get('opportunityId');
  const playerId = searchParams.get('playerId');
  const status = searchParams.get('status');

  try {
    const db = getSupabaseAdmin();
    let query = db.from('opportunity_applications').select('*');

    if (opportunityId) {
      const { data: opportunity } = await db
        .from('opportunities')
        .select('organizerId')
        .eq('id', opportunityId)
        .maybeSingle();
      if (opportunity?.organizerId !== authorization.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query = query.eq('opportunityId', opportunityId) as typeof query;
    } else if (playerId) {
      if (playerId !== authorization.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
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
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;
  try {
    const { id, playerId: _ignoredPlayerId, opportunityId: _ignoredOpportunityId, ...updates } = await request.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const db = getSupabaseAdmin();
    const { data: application } = await db
      .from('opportunity_applications')
      .select('opportunityId')
      .eq('id', id)
      .maybeSingle();
    if (!application?.opportunityId) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 });
    }
    const { data: opportunity } = await db
      .from('opportunities')
      .select('organizerId')
      .eq('id', application.opportunityId)
      .maybeSingle();
    if (opportunity?.organizerId !== authorization.user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
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
