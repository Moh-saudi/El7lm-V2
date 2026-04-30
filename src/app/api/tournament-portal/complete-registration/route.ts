import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * POST /api/tournament-portal/complete-registration
 *
 * يُستدعى بعد تسجيل المنظم في Supabase Auth لإنشاء سجل tournament_clients.
 * يمكن استخدامه أيضاً لربط مستخدم قائم بالجدول.
 *
 * Body: { supabase_auth_id, name, organization_name?, email, phone?, country? }
 */
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function POST(req: NextRequest) {
    try {
        const { supabase_auth_id, name, organization_name, email, phone, country } = await req.json();

        if (!supabase_auth_id || !name || !email) {
            return NextResponse.json({ error: 'supabase_auth_id و name و email مطلوبة' }, { status: 400 });
        }

        // تحقق إن كان السجل موجوداً أصلاً
        const { data: existing } = await supabaseAdmin
            .from('tournament_clients')
            .select('id')
            .eq('supabase_auth_id', supabase_auth_id)
            .maybeSingle();

        if (existing) {
            return NextResponse.json({ client: existing, already_exists: true });
        }

        // أنشئ السجل
        const { data: client, error } = await supabaseAdmin
            .from('tournament_clients')
            .insert({
                supabase_auth_id,
                name,
                organization_name: organization_name || null,
                email,
                phone:   phone   || null,
                country: country || null,
                is_active: true,
            })
            .select()
            .single();

        if (error) return NextResponse.json({ error: error.message }, { status: 500 });

        return NextResponse.json({ client }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
