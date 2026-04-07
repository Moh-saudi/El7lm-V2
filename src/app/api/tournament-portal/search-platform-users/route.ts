import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CF_BASE = 'https://assets.el7lm.com';

/** Convert a raw DB image path/URL → publicly accessible Cloudflare R2 URL */
function resolveImageUrl(path: string | null | undefined, bucket: string): string | null {
    if (!path) return null;
    // Already a Cloudflare URL
    if (path.includes('assets.el7lm.com')) return path;
    // Full URL (Google, Firebase, or old Supabase storage)
    if (path.startsWith('http')) {
        if (path.includes('supabase.co/storage/v1/object/public/')) {
            const parts = path.split('supabase.co/storage/v1/object/public/');
            if (parts[1]) return `${CF_BASE}/${parts[1]}`;
        }
        return path; // Google photos, etc. — return as-is
    }
    // Relative path like "abc123.jpg" or "avatars/abc123.jpg"
    const clean = path.startsWith('/') ? path.slice(1) : path;
    if (!clean.includes('/') && bucket) return `${CF_BASE}/${bucket}/${clean}`;
    return `${CF_BASE}/${clean}`;
}

/**
 * GET /api/tournament-portal/search-platform-users?q=&type=club|player|all
 *
 * Uses unified SQL views (v_players_search, v_clubs_search, etc.)
 * Each view exposes: id, display_name, phone, city, avatar_url, account_type
 * Run prisma/migrations/tournament_search_views.sql first.
 */
export async function GET(req: NextRequest) {
    const q    = req.nextUrl.searchParams.get('q')?.trim() || '';
    const type = req.nextUrl.searchParams.get('type') || 'all';

    if (q.length < 2) return NextResponse.json({ results: [] });

    const results: any[] = [];
    const errors: string[] = [];

    async function searchView(view: string, acctType: string, isPlayer: boolean) {
        try {
            // Players view has position + date_of_birth; org views do not
            const cols = isPlayer
                ? 'id, display_name, phone, city, avatar_url, account_type, position, date_of_birth'
                : 'id, display_name, phone, city, avatar_url, account_type';

            const { data, error } = await supa
                .from(view)
                .select(cols)
                .ilike('display_name', `%${q}%`)
                .limit(10);

            if (error) {
                errors.push(`${view}: ${error.message} (run tournament_search_views.sql)`);
                return;
            }

            const imgBucket = isPlayer ? 'avatars' : 'clubavatar';
            (data || []).forEach((row: any) => {
                results.push({
                    [isPlayer ? 'platform_player_id' : 'platform_user_id']: row.id,
                    type:          isPlayer ? 'player' : 'club',
                    account_type:  row.account_type || acctType,
                    name:          row.display_name || '—',
                    phone:         row.phone         || null,
                    city:          row.city          || null,
                    position:      row.position      || null,
                    date_of_birth: row.date_of_birth || null,
                    logo_url:      resolveImageUrl(row.avatar_url, imgBucket),
                });
            });

            // Also search by phone for players
            if (isPlayer && /[\d+]/.test(q)) {
                const { data: byPhone } = await supa
                    .from(view)
                    .select(cols)
                    .ilike('phone', `%${q}%`)
                    .limit(5);
                (byPhone || []).forEach((row: any) => {
                    if (!results.find(r => r.platform_player_id === row.id)) {
                        results.push({
                            platform_player_id: row.id,
                            type:          'player',
                            account_type:  'player',
                            name:          row.display_name || '—',
                            phone:         row.phone         || null,
                            city:          row.city          || null,
                            position:      row.position      || null,
                            date_of_birth: row.date_of_birth || null,
                            logo_url:      resolveImageUrl(row.avatar_url, 'avatars'),
                        });
                    }
                });
            }
        } catch (e: any) {
            errors.push(`${view}: ${e.message}`);
        }
    }

    if (type === 'all' || type === 'player') {
        await searchView('v_players_search', 'player', true);
    }

    if (type === 'all' || type === 'club') {
        await searchView('v_clubs_search',    'club',    false);
        await searchView('v_academies_search','academy', false);
        await searchView('v_trainers_search', 'trainer', false);
    }

    // Deduplicate
    const seen = new Set<string>();
    const unique = results.filter(r => {
        const key = `${r.type}_${r.platform_player_id || r.platform_user_id}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });

    return NextResponse.json({ results: unique.slice(0, 20), errors, total: unique.length });
}
