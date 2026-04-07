import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json({
        success: true,
        data: { totalUsers: 0, activeUsers: 0, inactiveUsers: 0, breakdown: { users: 0, players: 0, clubs: 0, academies: 0, agents: 0, trainers: 0 }, lastUpdated: new Date().toISOString() },
      });
    }

    const db = getSupabaseAdmin();
    const tables = ['users', 'players', 'clubs', 'academies', 'agents', 'trainers'];
    const counts: Record<string, number> = {};
    let totalUsers = 0;

    for (const table of tables) {
      try {
        const { count } = await db.from(table).select('id', { count: 'exact', head: true });
        counts[table] = count ?? 0;
        totalUsers += count ?? 0;
      } catch {
        counts[table] = 0;
      }
    }

    let activeUsers = 0;
    try {
      const { count } = await db.from('users').select('id', { count: 'exact', head: true }).eq('isActive', true);
      activeUsers = count ?? 0;
    } catch {}

    return NextResponse.json({
      success: true,
      data: { totalUsers, activeUsers, inactiveUsers: totalUsers - activeUsers, breakdown: counts, lastUpdated: new Date().toISOString() },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user counts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
