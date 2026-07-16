import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const authorization = await authorizeAdmin(request);
    if (!authorization.ok) return authorization.response;
    const supabaseAdmin = getSupabaseAdmin();

    const { data: clients, error } = await supabaseAdmin
        .from('tournament_clients')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Tournament counts per client
    const { data: counts } = await supabaseAdmin
        .from('tournament_new')
        .select('client_id');

    const countMap: Record<string, number> = {};
    for (const t of (counts || [])) {
        if (t.client_id) countMap[t.client_id] = (countMap[t.client_id] || 0) + 1;
    }

    const result = (clients || []).map((c: any) => ({
        ...c,
        _tournament_count: countMap[c.id] || 0,
    }));

    return NextResponse.json({ clients: result });
}
