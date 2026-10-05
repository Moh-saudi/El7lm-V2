import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const startTime = Date.now();
  const searchParams = request.nextUrl.searchParams;
  const skipDb = searchParams.get('skip_db') === 'true';

  let dbStatus = 'skipped';
  let dbLatencyMs = 0;

  if (!skipDb) {
    try {
      const dbStartTime = Date.now();
      const adminDb = getSupabaseAdmin();

      // استعلام خفيف جداً للحفاظ على اتصال قاعدة البيانات ومنع الخمول (Inactivity Pause)
      const timeoutPromise = new Promise<{ data: null; error: Error }>((_, reject) =>
        setTimeout(() => reject(new Error('DB ping timeout (3s)')), 3000)
      );

      const queryPromise = adminDb
        .from('platform_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      await Promise.race([queryPromise, timeoutPromise]);
      dbLatencyMs = Date.now() - dbStartTime;
      dbStatus = 'connected';
    } catch (err) {
      console.warn('⚠️ [Health Check] DB ping error:', err);
      dbStatus = 'degraded';
    }
  }

  const responseTime = Date.now() - startTime;
  const isHealthy = dbStatus !== 'degraded' || skipDb;

  return NextResponse.json(
    {
      status: isHealthy ? 'healthy' : 'degraded',
      service: 'el7lm-web-api',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbStatus,
        latencyMs: dbLatencyMs,
      },
      responseTimeMs: responseTime,
    },
    {
      status: isHealthy ? 200 : 503,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      },
    }
  );
}
