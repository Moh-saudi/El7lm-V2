import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeAdmin } from '@/lib/api/admin-auth';
import { getLocalTournamentClients } from '@/lib/tournament-clients-store';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const authorization = await authorizeAdmin(request);
    if (!authorization.ok) return authorization.response;

    try {
        const supabaseAdmin = getSupabaseAdmin();

        // 1. Fetch from Supabase DB
        let dbClients: any[] = [];
        try {
            const { data, error } = await supabaseAdmin
                .from('tournament_clients')
                .select('*')
                .order('created_at', { ascending: false });

            if (!error && Array.isArray(data)) {
                dbClients = data;
            }
        } catch (dbErr) {
            console.warn('[tournament-clients/list] Supabase DB fetch note:', dbErr);
        }

        // 2. Fetch local/dev store clients
        const localClients = getLocalTournamentClients();

        // 3. Merge: Start with local clients, then add any DB clients not present
        const mergedMap = new Map<string, any>();
        
        // Add local clients first (so newest created appear on top)
        for (const c of localClients) {
            mergedMap.set(c.id, c);
            if (c.email) mergedMap.set(c.email.toLowerCase(), c);
        }

        // Add Supabase DB clients
        for (const c of dbClients) {
            const existing = mergedMap.get(c.id) || (c.email ? mergedMap.get(c.email.toLowerCase()) : null);
            if (existing) {
                // Merge fields
                Object.assign(existing, c);
            } else {
                mergedMap.set(c.id, c);
                if (c.email) mergedMap.set(c.email.toLowerCase(), c);
            }
        }

        // Deduplicate to distinct objects
        const clientList = Array.from(new Set(mergedMap.values()));

        // 4. Tournament counts per client
        try {
            const { data: counts } = await supabaseAdmin
                .from('tournament_new')
                .select('client_id');

            const countMap: Record<string, number> = {};
            for (const t of (counts || [])) {
                if (t.client_id) countMap[t.client_id] = (countMap[t.client_id] || 0) + 1;
            }

            for (const c of clientList) {
                if (countMap[c.id] !== undefined) {
                    c._tournament_count = countMap[c.id];
                } else if (c._tournament_count === undefined) {
                    c._tournament_count = 1;
                }
            }
        } catch {}

        return NextResponse.json({ clients: clientList });
    } catch (e: any) {
        console.warn('Exception in tournament-clients list API:', e?.message);
        return NextResponse.json({ clients: getLocalTournamentClients() });
    }
}
