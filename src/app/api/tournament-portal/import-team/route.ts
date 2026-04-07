import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { tournament_id, name, city, contact_phone, logo_url, category_id, notes } = body;

    if (!tournament_id || !name) {
        return NextResponse.json({ error: 'tournament_id and name required' }, { status: 400 });
    }

    // ── Duplicate check ───────────────────────────────────────
    const { data: existing } = await supa
        .from('tournament_teams')
        .select('id, name')
        .eq('tournament_id', tournament_id)
        .ilike('name', name.trim())
        .limit(1)
        .single();

    if (existing) {
        return NextResponse.json({ error: `الفريق "${existing.name}" مسجل مسبقاً في هذه البطولة` }, { status: 409 });
    }

    const { data, error } = await supa
        .from('tournament_teams')
        .insert({
            tournament_id,
            name:          name.trim(),
            city:          city          || null,
            contact_phone: contact_phone || null,
            logo_url:      logo_url      || null,
            category_id:   category_id   || null,
            status:        'approved',
            notes:         notes || 'مستورد من المنصة',
        })
        .select('id, name')
        .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ team: data });
}
