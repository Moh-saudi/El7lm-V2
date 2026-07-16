import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const authorization = await authorizeAdmin(request);
    if (!authorization.ok) return authorization.response;
    const supa = getSupabaseAdmin();
    const tables = ['players', 'clubs', 'academies', 'trainers', 'tournament_players'];
    const info: Record<string, any> = {};

    for (const t of tables) {
        const { data, error } = await supa.from(t).select('*').limit(1);
        info[t] = {
            error: error?.message || null,
            columns: data?.[0] ? Object.keys(data[0]) : [],
            sample: data?.[0] || null,
        };
    }

    return NextResponse.json(info);
}
