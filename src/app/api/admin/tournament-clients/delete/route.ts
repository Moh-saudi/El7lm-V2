import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    const { id, supabase_auth_id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    // Delete DB record
    const { error } = await supabaseAdmin
        .from('tournament_clients')
        .delete()
        .eq('id', id);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // Delete Auth user if exists
    if (supabase_auth_id) {
        await supabaseAdmin.auth.admin.deleteUser(supabase_auth_id);
    }

    return NextResponse.json({ ok: true });
}
