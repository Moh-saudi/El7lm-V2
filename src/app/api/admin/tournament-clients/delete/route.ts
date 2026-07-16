import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;
    const { id, supabase_auth_id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const supabaseAdmin = getSupabaseAdmin();

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
