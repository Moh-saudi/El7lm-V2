import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
    const tables = ['players', 'clubs', 'academies', 'trainers', 'tournament_players'];
    const info: Record<string, any> = {};

    for (const t of tables) {
        const { data, error } = await supa.from(t).select('*').limit(1);
        info[t] = {
            error: error?.message || null,
            columns: data?.[0] ? Object.keys(data[0]) : [],
            sample: data?.[0] || null,
        };
    }

    return NextResponse.json(info);
}
