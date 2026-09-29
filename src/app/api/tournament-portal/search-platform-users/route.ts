import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { authorizeTournamentClient } from '@/lib/api/tournament-auth';

export const dynamic = 'force-dynamic';

const CF = 'https://assets.el7lm.com';

/** Bucket الفعلي لكل نوع حساب — يطابق upload route */
const BUCKET: Record<string, string> = {
    player:  'avatars',
    club:    'clubs',
    academy: 'academies',
    trainer: 'trainers',
    agent:   'agents',
};

const KNOWN_BUCKETS = [
    'clubs','academies','trainers','agents','marketers',
    'avatars','playeravatar','clubavatar','academyavatar','traineravatar','agentavatar',
    'images','el7lmplatform','profile-images','tournaments',
];

/** حوّل أي مسار مخزَّن في قاعدة البيانات → رابط Cloudflare R2 عام */
function resolveImageUrl(path: string | null | undefined, bucket: string): string | null {
    if (!path?.trim()) return null;
    const p = path.trim();

    if (p.includes('assets.el7lm.com')) return p;

    if (p.startsWith('http')) {
        const fbMatch = p.match(/\/o\/([^?#]+)/);
        if (fbMatch) return `${CF}/${decodeURIComponent(fbMatch[1])}`;

        if (p.includes('supabase.co')) {
            const after = p.split('/object/')[1];
            if (after) {
                const clean = after.replace(/^(public|authenticated)\//, '').split('?')[0];
                return `${CF}/${clean}`;
            }
            const file = p.split('?')[0].split('/').pop();
            if (file) return `${CF}/${bucket}/${file}`;
        }

        return p;
    }

    const clean = p.startsWith('/') ? p.slice(1) : p;
    if (KNOWN_BUCKETS.some(b => clean.startsWith(`${b}/`))) return `${CF}/${clean}`;
    if (clean.includes('/')) return `${CF}/${clean}`;
    return `${CF}/${bucket}/${clean}`;
}

export async function GET(req: NextRequest) {
    const authorization = await authorizeTournamentClient(req);
    if (!authorization.user) return authorization.response!;

    const q    = req.nextUrl.searchParams.get('q')?.trim() || '';
    const type = req.nextUrl.searchParams.get('type') || 'all';

    if (q.length < 2) return NextResponse.json({ results: [] });

    const supa = getSupabaseAdmin();
    const results: any[] = [];
    const errors: string[] = [];

    async function searchView(view: string, acctType: string, isPlayer: boolean) {
        try {
            const cols = isPlayer
                ? 'id, display_name, phone, city, avatar_url, account_type, position, date_of_birth'
                : 'id, display_name, phone, city, avatar_url, account_type';

            const { data, error } = await supa
                .from(view)
                .select(cols)
                .ilike('display_name', `%${q}%`)
                .limit(10);

            if (error) {
                errors.push(`${view}: ${error.message}`);
                return;
            }

            (data || []).forEach((row: any) => {
                const resolvedType = row.account_type || acctType;
                const imgBucket = BUCKET[resolvedType] || (isPlayer ? 'playeravatar' : 'clubavatar');
                results.push({
                    [isPlayer ? 'platform_player_id' : 'platform_user_id']: row.id,
                    type:          isPlayer ? 'player' : 'club',
                    account_type:  resolvedType,
                    name:          row.display_name || '—',
                    phone:         row.phone         || null,
                    city:          row.city          || null,
                    position:      row.position      || null,
                    date_of_birth: row.date_of_birth || null,
                    logo_url:      resolveImageUrl(row.avatar_url, imgBucket),
                });
            });

            // Also search by phone for players and organizations
            if (/[\d+]/.test(q)) {
                const digits = q.replace(/\D/g, '');
                const coreDigits = digits.length >= 7
                    ? (digits.startsWith('20') ? digits.slice(2) : digits.startsWith('0') ? digits.slice(1) : digits)
                    : digits;

                const { data: byPhone } = await supa
                    .from(view)
                    .select(cols)
                    .or(`phone.ilike.%${q}%,phone.ilike.%${coreDigits}%`)
                    .limit(10);

                (byPhone || []).forEach((row: any) => {
                    const existingId = isPlayer ? row.id : row.id;
                    const alreadyFound = results.some(r => (isPlayer ? r.platform_player_id : r.platform_user_id) === existingId);
                    if (!alreadyFound) {
                        const resolvedType = row.account_type || acctType;
                        const imgBucket = BUCKET[resolvedType] || (isPlayer ? 'playeravatar' : 'clubavatar');
                        results.push({
                            [isPlayer ? 'platform_player_id' : 'platform_user_id']: row.id,
                            type:          isPlayer ? 'player' : 'club',
                            account_type:  resolvedType,
                            name:          row.display_name || '—',
                            phone:         row.phone         || null,
                            city:          row.city          || null,
                            position:      row.position      || null,
                            date_of_birth: row.date_of_birth || null,
                            logo_url:      resolveImageUrl(row.avatar_url, imgBucket),
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

