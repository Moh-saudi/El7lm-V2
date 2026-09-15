import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { isUuid } from '@/lib/tournament-portal/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const body = await req.json();
    const { tournament_id, name, city, contact_phone, logo_url, category_id, notes } = body;

    if (!tournament_id || !name) {
        return NextResponse.json({ error: 'tournament_id and name required' }, { status: 400 });
    }

    if (!isUuid(tournament_id)) {
        return NextResponse.json({
            team: {
                id: `team-${Date.now()}`,
                tournament_id,
                name: name.trim(),
                city: city || null,
                contact_phone: contact_phone || null,
                logo_url: logo_url || null,
                category_id: category_id || null,
                status: 'approved',
                registered_at: new Date().toISOString(),
                approved_at: new Date().toISOString(),
                notes: notes || 'مستورد من المنصة',
            }
        });
    }

    // ── Duplicate check ───────────────────────────────────────
    const supa = getSupabaseAdmin();

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
