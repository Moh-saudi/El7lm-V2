import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeTournamentClient } from '@/lib/api/tournament-auth';

export const dynamic = 'force-dynamic';

/**
 * POST /api/tournament-portal/update-last-login
 * Updates last_login_at for the authenticated tournament client.
 */
export async function POST(req: NextRequest) {
    try {
        const authorization = await authorizeTournamentClient(req);
        if (!authorization.user) return authorization.response;

        const supabaseAdmin = getSupabaseAdmin();
        const now = new Date().toISOString();

        const { error } = await supabaseAdmin
            .from('tournament_clients')
            .update({
                last_login_at: now,
                updated_at: now,
            })
            .eq('supabase_auth_id', authorization.user.id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Failed to update last login' }, { status: 500 });
    }
}
