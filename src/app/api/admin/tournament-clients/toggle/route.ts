import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';
import { toggleLocalTournamentClient } from '@/lib/tournament-clients-store';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;
    const { id, is_active } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

    try {
        await supabaseAdmin
            .from('tournament_clients')
            .update({ is_active })
            .eq('id', id);
    } catch {}

    toggleLocalTournamentClient(id, is_active);

    return NextResponse.json({ ok: true, is_active });
}
