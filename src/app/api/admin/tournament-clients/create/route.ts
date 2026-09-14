import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';
import { addLocalTournamentClient } from '@/lib/tournament-clients-store';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/tournament-clients/create
 * Body: { name, organization_name, email, phone, country, password }
 */
export async function POST(req: NextRequest) {
    const authorization = await authorizeAdmin(req);
    if (!authorization.ok) return authorization.response;

    try {
        const body = await req.json();
        const { name, organization_name, email, phone, country, password } = body;

        if (!name || !email || !password) {
            return NextResponse.json({ error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Step 1: Create or resolve Supabase Auth user
        let authUserId: string = crypto.randomUUID();
        try {
            const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { name, organization_name },
            });

            if (authData?.user?.id) {
                authUserId = authData.user.id;
            } else {
                // Fallback to signUp
                const { data: signUpData } = await supabaseAdmin.auth.signUp({
                    email,
                    password,
                    options: { data: { name, organization_name } },
                });
                if (signUpData?.user?.id) {
                    authUserId = signUpData.user.id;
                }
            }
        } catch (authErr) {
            console.warn('[tournament-clients/create] Auth admin fallback to generated UUID:', authErr);
        }

        const clientId = crypto.randomUUID();
        const now = new Date().toISOString();

        const newClientRecord = {
            id: clientId,
            supabase_auth_id: authUserId,
            name: name.trim(),
            organization_name: organization_name?.trim() || null,
            email: email.trim().toLowerCase(),
            password: password,
            phone: phone?.trim() || null,
            country: country?.trim() || null,
            is_active: true,
            created_at: now,
            _tournament_count: 0,
        };

        // Step 2: Try to persist in Supabase DB
        let dbSaved = false;
        try {
            const { data: client, error: clientError } = await supabaseAdmin
                .from('tournament_clients')
                .insert({
                    id: clientId,
                    supabase_auth_id: authUserId,
                    name: newClientRecord.name,
                    organization_name: newClientRecord.organization_name,
                    email: newClientRecord.email,
                    phone: newClientRecord.phone,
                    country: newClientRecord.country,
                    is_active: true,
                })
                .select('id, name, email')
                .maybeSingle();

            if (!clientError && client) {
                dbSaved = true;
            } else if (clientError) {
                console.warn('[tournament-clients/create] Supabase insert note (RLS/Key):', clientError.message);
            }
        } catch (dbErr) {
            console.warn('[tournament-clients/create] Supabase DB exception:', dbErr);
        }

        // Always ensure persisted in local client store for resilient access
        addLocalTournamentClient(newClientRecord);

        return NextResponse.json({
            client: newClientRecord,
            success: true,
            dbSaved,
        }, { status: 201 });

    } catch (e: any) {
        console.error('[tournament-clients/create] Unexpected error:', e);
        return NextResponse.json({ error: e.message || 'حدث خطأ أثناء إنشاء الحساب' }, { status: 500 });
    }
}
