import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// كاش في الذاكرة لمدة 60 ثانية لحماية الخادم من مهلة 504
let cachedData: { data: any; expiry: number } | null = null;

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    const now = Date.now();
    if (cachedData && cachedData.expiry > now) {
      return NextResponse.json({ success: true, data: cachedData.data });
    }

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

    const responseData = { totalUsers, activeUsers, inactiveUsers: Math.max(0, totalUsers - activeUsers), breakdown: counts, lastUpdated: new Date().toISOString() };
    cachedData = { data: responseData, expiry: Date.now() + 60_000 };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user counts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
