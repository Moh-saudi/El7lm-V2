import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Service role client — bypasses RLS, admin only
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * POST /api/admin/tournament-clients/create
 * Body: { name, organization_name, email, phone, country, password }
 *
 * 1. Creates a Supabase Auth user
 * 2. Creates a tournament_clients record linked to that auth user
 */
export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { name, organization_name, email, phone, country, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'name, email, and password are required' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
        }

        // Step 1: Create Supabase Auth user
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
            email,
            password,
            email_confirm: true, // auto-confirm
            user_metadata: { name, organization_name },
        });

        if (authError || !authData.user) {
            return NextResponse.json({ error: authError?.message || 'Failed to create auth user' }, { status: 400 });
        }

        // Step 2: Create tournament_clients record
        const { data: client, error: clientError } = await supabaseAdmin
            .from('tournament_clients')
            .insert({
                supabase_auth_id:  authData.user.id,
                name,
                organization_name: organization_name || null,
                email,
                phone:             phone || null,
                country:           country || null,
                is_active:         true,
            })
            .select('id, name, email')
            .single();

        if (clientError) {
            // Rollback: delete the auth user
            await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
            return NextResponse.json({ error: clientError.message }, { status: 500 });
        }

        return NextResponse.json({ client }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
