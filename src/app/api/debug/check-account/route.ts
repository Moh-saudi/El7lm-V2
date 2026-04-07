import { supabase } from '@/lib/supabase/config';
import { NextRequest, NextResponse } from 'next/server';

const TABLES = ['employees', 'users', 'players', 'clubs', 'academies', 'agents', 'trainers'];

export async function POST(req: NextRequest) {
  try {
    const phone = String((await req.json().catch(() => ({}))).phone || '');
    if (!phone) return NextResponse.json({ error: 'phone is required' }, { status: 400 });

    const results: unknown[] = [];
    for (const table of TABLES) {
      try {
        const { data } = await supabase.from(table).select('id, email, phone, isDeleted, isActive, accountType, name, full_name').eq('phone', phone);
        (data ?? []).forEach((row: Record<string, unknown>) => {
          results.push({
            collection: table, id: row.id, email: row.email, phone: row.phone,
            isDeleted: row.isDeleted, isDeletedType: typeof row.isDeleted,
            isActive: row.isActive, isActiveType: typeof row.isActive,
            accountType: row.accountType, name: row.name ?? row.full_name,
            allFields: Object.keys(row),
          });
        });
      } catch (e) {
        console.error(`Error checking ${table}:`, e);
      }
    }

    return NextResponse.json({ phone, found: results.length > 0, count: results.length, accounts: results });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Internal error' }, { status: 500 });
  }
}
