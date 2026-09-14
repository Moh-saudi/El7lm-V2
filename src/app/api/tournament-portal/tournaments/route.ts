import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

const DEV_TOURNAMENTS_FILE = path.join(process.cwd(), '.next', 'dev_tournaments.json');

function getDevTournaments(): any[] {
    try {
        if (fs.existsSync(DEV_TOURNAMENTS_FILE)) {
            const raw = fs.readFileSync(DEV_TOURNAMENTS_FILE, 'utf-8');
            const data = JSON.parse(raw);
            if (Array.isArray(data)) return data;
        }
    } catch {}
    return [];
}

function saveDevTournament(t: any) {
    try {
        const dir = path.dirname(DEV_TOURNAMENTS_FILE);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        const list = getDevTournaments();
        const updated = [t, ...list.filter(item => item.id !== t.id)];
        fs.writeFileSync(DEV_TOURNAMENTS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
    } catch {}
}

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const clientId = searchParams.get('client_id');
        const tournamentId = searchParams.get('id');

        let dbTournaments: any[] = [];
        try {
            const isUuid = !!tournamentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tournamentId);
            if (!tournamentId || isUuid) {
                const supabase = getSupabaseAdmin();
                let query = supabase.from('tournament_new').select('*');
                if (tournamentId && isUuid) {
                    query = query.eq('id', tournamentId);
                } else if (clientId) {
                    query = query.eq('client_id', clientId);
                }
                const { data } = await query.order('created_at', { ascending: false });
                if (data) dbTournaments = data;
            }
        } catch (dbErr) {
            console.warn('[tournament-portal/tournaments] Supabase fetch note:', dbErr);
        }

        // Merge with locally created tournaments
        const devTournaments = getDevTournaments();
        let filteredDev = devTournaments;
        if (tournamentId) {
            filteredDev = devTournaments.filter(t => t.id === tournamentId);
        } else if (clientId) {
            filteredDev = devTournaments.filter(t => t.client_id === clientId);
        }

        const map = new Map<string, any>();
        for (const t of dbTournaments) map.set(t.id, t);
        for (const t of filteredDev) {
            if (!map.has(t.id)) map.set(t.id, t);
        }

        const all = Array.from(map.values()).sort(
            (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
        );

        if (tournamentId) {
            return NextResponse.json({ tournament: all[0] || null });
        }

        return NextResponse.json({ tournaments: all });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Failed to fetch tournaments' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const isBodyUuid = !!body.id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id);
        const id = isBodyUuid ? body.id : (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `00000000-0000-4000-8000-${Date.now().toString(16).padStart(12, '0')}`);
        const slug = body.slug || `${body.name || 'tournament'}-${Date.now()}`.toLowerCase().replace(/[^a-z0-9]+/g, '-');

        const tournamentRecord = {
            ...body,
            id,
            slug,
            created_at: body.created_at || new Date().toISOString(),
            status: body.status || 'draft',
        };

        // 1. Attempt insertion into Supabase
        let insertedInDb = false;
        try {
            const supabase = getSupabaseAdmin();
            const { data, error } = await supabase
                .from('tournament_new')
                .insert(tournamentRecord)
                .select('id')
                .single();

            if (!error && data?.id) {
                insertedInDb = true;
            }
        } catch (dbErr) {
            console.warn('[tournament-portal/tournaments] DB insert note:', dbErr);
        }

        // 2. Always persist to local dev store as well for safety
        saveDevTournament(tournamentRecord);

        return NextResponse.json({
            success: true,
            data: { id: tournamentRecord.id, slug: tournamentRecord.slug },
            dbSaved: insertedInDb,
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Failed to create tournament' }, { status: 500 });
    }
}
