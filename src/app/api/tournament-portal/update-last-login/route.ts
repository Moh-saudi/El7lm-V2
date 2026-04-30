import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * POST /api/tournament-portal/update-last-login
 * Body: { supabase_auth_id }
 * يُحدَّث last_login_at في tournament_clients عند كل تسجيل دخول ناجح.
 */
export async function POST(req: NextRequest) {
    try {
        const { supabase_auth_id } = await req.json();
        if (!supabase_auth_id) {
            return NextResponse.json({ error: 'supabase_auth_id مطلوب' }, { status: 400 });
        }

        const { error } = await supabaseAdmin
            .from('tournament_clients')
            .update({
                last_login_at: new Date().toISOString(),
                updated_at:    new Date().toISOString(),
            })
            .eq('supabase_auth_id', supabase_auth_id);

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ ok: true });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
