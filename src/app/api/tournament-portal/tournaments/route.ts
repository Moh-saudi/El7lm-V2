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

        const map = new Map<string, any>();

        try {
            const supabase = getSupabaseAdmin();

            // 1. Fetch from primary `tournaments` table (Admin & unified registration source)
            let mainQuery = supabase.from('tournaments').select('*');
            if (tournamentId) {
                mainQuery = mainQuery.eq('id', tournamentId);
            }
            const { data: mainData, error: mainErr } = await mainQuery.order('createdAt', { ascending: false });
            if (!mainErr && mainData) {
                for (const row of mainData) {
                    const fee = row.entryFee ?? row.fee ?? row.price ?? 0;
                    map.set(row.id, {
                        ...row,
                        id: row.id,
                        name: row.title || row.name || 'بطولة',
                        title: row.title || row.name || 'بطولة',
                        description: row.description || '',
                        location: row.location || row.city || row.country || '',
                        city: row.city || row.location || '',
                        country: row.country || '',
                        startDate: row.startDate || row.start_date || '',
                        endDate: row.endDate || row.end_date || '',
                        registrationDeadline: row.registrationDeadline || row.registration_deadline || '',
                        fee: fee,
                        entryFee: fee,
                        registrationFee: fee,
                        currency: row.currency || 'SAR',
                        isPaid: row.isPaid === true || fee > 0,
                        isActive: row.isActive === true,
                        status: row.status || (row.isActive ? 'active' : 'upcoming'),
                        currentParticipants: row.currentParticipants || 0,
                        maxParticipants: row.maxParticipants || 0,
                        logo: row.logo || row.logo_url || '',
                        logo_url: row.logo || row.logo_url || '',
                        prizes: row.prizes || '',
                        rules: row.rules || '',
                        ageGroups: row.ageGroups || [],
                        categories: row.categories || [],
                        createdAt: row.createdAt || row.created_at,
                    });
                }
            }

            // 2. Fetch from `tournament_new` table
            const isUuid = !!tournamentId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tournamentId);
            if (!tournamentId || isUuid) {
                let newQuery = supabase.from('tournament_new').select('*');
                if (tournamentId && isUuid) {
                    newQuery = newQuery.eq('id', tournamentId);
                } else if (clientId) {
                    newQuery = newQuery.eq('client_id', clientId);
                }
                const { data: newData } = await newQuery.order('created_at', { ascending: false });
                if (newData) {
                    for (const row of newData) {
                        if (!map.has(row.id)) {
                            const fee = row.entry_fee ?? row.fee ?? 0;
                            map.set(row.id, {
                                ...row,
                                id: row.id,
                                name: row.name || row.title || 'بطولة',
                                title: row.name || row.title || 'بطولة',
                                startDate: row.start_date || row.startDate || '',
                                endDate: row.end_date || row.endDate || '',
                                fee: fee,
                                entryFee: fee,
                                registrationFee: fee,
                                currency: row.currency || 'SAR',
                                isPaid: row.is_paid === true || fee > 0,
                                isActive: row.is_active !== false && row.status !== 'draft',
                                status: row.status || 'open',
                            });
                        }
                    }
                }
            }
        } catch (dbErr) {
            console.warn('[tournament-portal/tournaments] Supabase fetch note:', dbErr);
        }

        // 3. Merge with dev/fallback tournaments
        const devTournaments = getDevTournaments();
        for (const t of devTournaments) {
            if (!map.has(t.id)) {
                map.set(t.id, t);
            }
        }

        const all = Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt || b.created_at || 0).getTime() - new Date(a.createdAt || a.created_at || 0).getTime()
        );

        if (tournamentId) {
            return NextResponse.json(
                { tournament: all[0] || null },
                { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
            );
        }

        return NextResponse.json(
            { tournaments: all },
            { headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120' } }
        );
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
