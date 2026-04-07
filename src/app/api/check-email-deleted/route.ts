import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

const TABLES = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];

async function check(email: string) {
  const db = getSupabaseAdmin();
  for (const table of TABLES) {
    const { data } = await db.from(table).select('id, isDeleted, isActive, email, uid').eq('email', email).limit(1);
    if (data?.length) {
      const row = data[0] as Record<string, unknown>;
      return { found: true, collection: table, isDeleted: row.isDeleted, isActive: row.isActive, email: row.email, uid: row.uid };
    }
  }
  return { found: false };
}

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    return NextResponse.json(await check(email));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const email = new URL(request.url).searchParams.get('email');
    if (!email) return NextResponse.json({ error: 'Email required' }, { status: 400 });
    return NextResponse.json(await check(email));
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Error' }, { status: 500 });
  }
}
