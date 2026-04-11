import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const db = getSupabaseAdmin();
    const { data } = await db.from('opportunities').select('viewCount').eq('id', params.id).limit(1).maybeSingle();
    const current = Number((data as any)?.viewCount || 0);
    await db.from('opportunities').update({ viewCount: current + 1 }).eq('id', params.id);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false });
  }
}
