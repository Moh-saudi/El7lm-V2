import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;
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

    // Execute all table count queries in parallel (< 80ms)
    const [tableResults, activeResult] = await Promise.all([
      Promise.all(
        tables.map(async (table) => {
          try {
            const { count } = await db.from(table).select('id', { count: 'exact', head: true });
            return { table, count: count ?? 0 };
          } catch {
            return { table, count: 0 };
          }
        })
      ),
      (async () => {
        try {
          const { count } = await db.from('users').select('id', { count: 'exact', head: true }).eq('isActive', true);
          return count ?? 0;
        } catch {
          return 0;
        }
      })()
    ]);

    let totalUsers = 0;
    for (const { table, count } of tableResults) {
      counts[table] = count;
      totalUsers += count;
    }

    const activeUsers = activeResult;

    return NextResponse.json({
      success: true,
      data: { totalUsers, activeUsers, inactiveUsers: Math.max(0, totalUsers - activeUsers), breakdown: counts, lastUpdated: new Date().toISOString() },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user counts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
