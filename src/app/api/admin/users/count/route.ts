import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/api/admin-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

// كاش في الذاكرة لمدة 5 دقائق لحماية الخادم وقاعدة البيانات nano من أي ضغط
let cachedData: { data: any; expiry: number } | null = null;

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;
  
  const now = Date.now();
  if (cachedData && cachedData.expiry > now) {
    return NextResponse.json({ success: true, data: cachedData.data });
  }

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

    // مهلة 3 ثوانٍ لحماية الخادم من التعليق في حالة تعافي Supabase nano
    const fetchWithTimeout = async () => {
      return await Promise.all([
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
    };

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Supabase count timeout')), 3000)
    );

    const [tableResults, activeResult] = await Promise.race([fetchWithTimeout(), timeoutPromise]);

    let totalUsers = 0;
    for (const { table, count } of tableResults) {
      counts[table] = count;
      totalUsers += count;
    }

    const activeUsers = activeResult;
    const responseData = { totalUsers, activeUsers, inactiveUsers: Math.max(0, totalUsers - activeUsers), breakdown: counts, lastUpdated: new Date().toISOString() };
    cachedData = { data: responseData, expiry: Date.now() + 300_000 };

    return NextResponse.json({
      success: true,
      data: responseData,
    });
  } catch (error) {
    console.warn('[admin/users/count] Fallback activated due to:', error instanceof Error ? error.message : error);
    if (cachedData) {
      return NextResponse.json({ success: true, data: cachedData.data, stale: true });
    }
    return NextResponse.json({
      success: true,
      data: { totalUsers: 0, activeUsers: 0, inactiveUsers: 0, breakdown: { users: 0, players: 0, clubs: 0, academies: 0, agents: 0, trainers: 0 }, lastUpdated: new Date().toISOString() },
    });
  }
}
