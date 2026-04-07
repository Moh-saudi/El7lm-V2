import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const GROUP_NAMES = ['أ','ب','ج','د','هـ','و','ز','ح','ط','ي'];

/** GET /api/tournament-portal/groups?tournament_id=&category_id= */
export async function GET(req: NextRequest) {
    const tournament_id = req.nextUrl.searchParams.get('tournament_id');
    const category_id   = req.nextUrl.searchParams.get('category_id');
    if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });

    let q = supa.from('tournament_groups').select('id, name, sort_order')
        .eq('tournament_id', tournament_id).order('sort_order');
    if (category_id && category_id !== 'all') q = (q as any).eq('category_id', category_id);

    const { data, error } = await q;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ groups: data || [] });
}

/** POST /api/tournament-portal/groups — إنشاء مجموعات (دفعة أو واحدة) */
export async function POST(req: NextRequest) {
    const body = await req.json();
    const { tournament_id, category_id, count, name } = body;
    if (!tournament_id) return NextResponse.json({ error: 'tournament_id required' }, { status: 400 });

    // إنشاء دفعة
    if (count) {
        const n = Number(count);
        if (n < 2 || n > 16) return NextResponse.json({ error: 'العدد يجب بين 2 و 16' }, { status: 400 });

        // حذف المجموعات القديمة أولاً
        let delQ = supa.from('tournament_groups').delete().eq('tournament_id', tournament_id);
        if (category_id && category_id !== 'all') delQ = (delQ as any).eq('category_id', category_id);
        const { error: delErr } = await delQ;
        if (delErr) return NextResponse.json({ error: delErr.message }, { status: 500 });

        const created = [];
        for (let i = 0; i < n; i++) {
            const { data, error } = await supa.from('tournament_groups').insert({
                tournament_id,
                category_id: category_id && category_id !== 'all' ? category_id : null,
                name:        `المجموعة ${GROUP_NAMES[i] || (i + 1)}`,
                sort_order:  i,
            }).select('id, name, sort_order').single();
            if (error) return NextResponse.json({ error: error.message }, { status: 500 });
            created.push(data);
        }
        return NextResponse.json({ groups: created });
    }

    // إضافة مجموعة واحدة
    if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });

    // احسب sort_order
    const { data: existing } = await supa.from('tournament_groups')
        .select('id').eq('tournament_id', tournament_id);
    const sort_order = (existing || []).length;

    const { data, error } = await supa.from('tournament_groups').insert({
        tournament_id,
        category_id: category_id && category_id !== 'all' ? category_id : null,
        name: name.trim(),
        sort_order,
    }).select('id, name, sort_order').single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ group: data });
}

/** PATCH /api/tournament-portal/groups — تعديل اسم مجموعة */
export async function PATCH(req: NextRequest) {
    const { id, name } = await req.json();
    if (!id || !name?.trim()) return NextResponse.json({ error: 'id and name required' }, { status: 400 });

    const { error } = await supa.from('tournament_groups').update({ name: name.trim() }).eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}

/** DELETE /api/tournament-portal/groups?id= */
export async function DELETE(req: NextRequest) {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const { error } = await supa.from('tournament_groups').delete().eq('id', id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
}
