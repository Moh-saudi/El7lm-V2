import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(request: NextRequest) {
  try {
    const { opportunityId, playerId, ...data } = await request.json();
    if (!opportunityId || !playerId) {
      return NextResponse.json({ error: 'opportunityId and playerId required' }, { status: 400 });
    }

    const db = getSupabaseAdmin();

    // Check duplicate
    const { data: dupData } = await db
      .from('opportunity_applications')
      .select('id')
      .eq('opportunityId', opportunityId)
      .eq('playerId', playerId)
      .limit(1)
      .maybeSingle();

    if (dupData) {
      return NextResponse.json({ error: 'لقد تقدمت لهذه الفرصة مسبقاً' }, { status: 409 });
    }

    const now = new Date().toISOString();
    const id = crypto.randomUUID();

    const { error: insertError } = await db.from('opportunity_applications').insert({
      id, opportunityId, playerId, ...data, status: 'pending', appliedAt: now, updatedAt: now,
    });

    if (insertError) {
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Increment currentApplicants
    const { data: oppData } = await db
      .from('opportunities').select('currentApplicants').eq('id', opportunityId).limit(1).maybeSingle();
    const current = Number((oppData as any)?.currentApplicants || 0);
    await db.from('opportunities').update({ currentApplicants: current + 1 }).eq('id', opportunityId);

    return NextResponse.json({ id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
