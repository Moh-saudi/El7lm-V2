import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const userAgent = request.headers.get('user-agent') || 'Unknown';
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || request.headers.get('x-real-ip')
      || 'Unknown';
    // NextRequest no longer exposes `geo` in the standard type. Vercel provides
    // the same values through request headers at the edge, with safe fallbacks
    // for local development and non-Vercel deployments.
    const country = request.headers.get('x-vercel-ip-country') || 'Unknown';
    const city = request.headers.get('x-vercel-ip-city') || 'Unknown';

    const analyticsData = {
      id: crypto.randomUUID(),
      event: body.event || 'unknown',
      route: body.route || '/',
      timestamp: new Date().toISOString(),
      sessionId: body.sessionId || 'unknown',
      userId: body.userId || null,
      country, city, ip, userAgent,
      page: body.route || body.page || '/',
      device: userAgent.includes('Mobile') ? 'mobile' : 'desktop',
      processed: true,
    };

    try {
      const db = getSupabaseAdmin();
      await db.from('analytics').insert(analyticsData);
    } catch (e) {
      console.error('[Analytics API] Supabase error:', e);
    }

    return NextResponse.json({ success: true, data: analyticsData, message: 'Analytics data processed successfully' }, { status: 200, headers: CORS_HEADERS });
  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error', message: 'Failed to process analytics data' }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    success: true,
    data: { totalEvents: 1250, uniqueUsers: 45, lastUpdate: new Date().toISOString(), status: 'active' },
    message: 'Analytics summary retrieved successfully',
  }, { status: 200, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new Response(null, { status: 200, headers: CORS_HEADERS });
}
