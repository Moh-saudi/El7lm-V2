import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

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

    // Fallback: If no database results (e.g. during local dev or missing service role key), provide matching demo entities
    if (results.length === 0) {
        const queryLower = q.toLowerCase();
        const demoMatches = DEMO_ENTITIES.filter(item => {
            const matchesQuery = item.name.toLowerCase().includes(queryLower) ||
                (item.phone && item.phone.includes(q)) ||
                (item.city && item.city.toLowerCase().includes(queryLower));

            if (!matchesQuery) return false;

            if (type === 'all') return true;
            if (type === 'player') return item.type === 'player';
            if (type === 'club') return item.type === 'club';
            return true;
        });

        demoMatches.forEach(m => results.push(m));
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

const DEMO_ENTITIES = [
    // Players
    { platform_player_id: 'usr-p1', type: 'player', account_type: 'player', name: 'محمد صلاح', phone: '+966501112233', city: 'الرياض', position: 'مهاجم', date_of_birth: '1998-05-12', logo_url: null },
    { platform_player_id: 'usr-p2', type: 'player', account_type: 'player', name: 'سالم الدوسري', phone: '+966502223344', city: 'جدة', position: 'جناح أيسر', date_of_birth: '1999-08-19', logo_url: null },
    { platform_player_id: 'usr-p3', type: 'player', account_type: 'player', name: 'ياسين بونو', phone: '+966503334455', city: 'الرياض', position: 'حارس مرمى', date_of_birth: '1997-04-05', logo_url: null },
    { platform_player_id: 'usr-p4', type: 'player', account_type: 'player', name: 'أحمد حجازي', phone: '+966504445566', city: 'الدمام', position: 'مدافع', date_of_birth: '1996-01-25', logo_url: null },
    { platform_player_id: 'usr-p5', type: 'player', account_type: 'player', name: 'عبدالله الحمدان', phone: '+966505556677', city: 'الرياض', position: 'مهاجم', date_of_birth: '2000-09-13', logo_url: null },
    { platform_player_id: 'usr-p6', type: 'player', account_type: 'player', name: 'فهد المولد', phone: '+966506667788', city: 'جدة', position: 'جناح أيمن', date_of_birth: '1999-11-14', logo_url: null },
    { platform_player_id: 'usr-p7', type: 'player', account_type: 'player', name: 'علي البليهي', phone: '+966507778899', city: 'الرياض', position: 'مدافع', date_of_birth: '1995-11-21', logo_url: null },
    { platform_player_id: 'usr-p8', type: 'player', account_type: 'player', name: 'سعود عبدالحميد', phone: '+966508889900', city: 'الرياض', position: 'ظهير أيمن', date_of_birth: '2001-07-18', logo_url: null },
    // Academies
    { platform_user_id: 'usr-a1', type: 'club', account_type: 'academy', name: 'أكاديمية يوفنتوس', phone: '+966511112222', city: 'الرياض', position: null, date_of_birth: null, logo_url: null },
    { platform_user_id: 'usr-a2', type: 'club', account_type: 'academy', name: 'أكاديمية الفرسان الرياضية', phone: '+966512223333', city: 'جدة', position: null, date_of_birth: null, logo_url: null },
    { platform_user_id: 'usr-a3', type: 'club', account_type: 'academy', name: 'أكاديمية برشلونة الدولية', phone: '+966513334444', city: 'الدمام', position: null, date_of_birth: null, logo_url: null },
    { platform_user_id: 'usr-a4', type: 'club', account_type: 'academy', name: 'أكاديمية الأبطال لكرة القدم', phone: '+966514445555', city: 'مكة المكرمة', position: null, date_of_birth: null, logo_url: null },
    { platform_user_id: 'usr-a5', type: 'club', account_type: 'academy', name: 'أكاديمية النجوم الصاعدة', phone: '+966515556666', city: 'المدينة المنورة', position: null, date_of_birth: null, logo_url: null },
    // Clubs
    { platform_user_id: 'usr-c1', type: 'club', account_type: 'club', name: 'نادي الهلال السعودي', phone: '+966521112222', city: 'الرياض', position: null, date_of_birth: null, logo_url: null },
    { platform_user_id: 'usr-c2', type: 'club', account_type: 'club', name: 'نادي النصر الرياضي', phone: '+966522223333', city: 'الرياض', position: null, date_of_birth: null, logo_url: null },
    { platform_user_id: 'usr-c3', type: 'club', account_type: 'club', name: 'نادي الاتحاد الثقافي الرياضي', phone: '+966523334444', city: 'جدة', position: null, date_of_birth: null, logo_url: null },
    { platform_user_id: 'usr-c4', type: 'club', account_type: 'club', name: 'نادي الأهلي الرياضي', phone: '+966524445555', city: 'جدة', position: null, date_of_birth: null, logo_url: null },
    { platform_user_id: 'usr-c5', type: 'club', account_type: 'club', name: 'نادي الاتفاق الرياضي', phone: '+966525556666', city: 'الدمام', position: null, date_of_birth: null, logo_url: null },
    { platform_user_id: 'usr-c6', type: 'club', account_type: 'club', name: 'نادي الشباب السعودي', phone: '+966526667777', city: 'الرياض', position: null, date_of_birth: null, logo_url: null },
];
