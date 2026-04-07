import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') {
      return NextResponse.json({ success: true, data: { totalAds: 0, activeAds: 0, inactiveAds: 0, totalViews: 0, totalClicks: 0, clickThroughRate: 0, lastUpdated: new Date().toISOString() } });
    }

    const db = getSupabaseAdmin();
    const { data } = await db.from('ads').select('isActive, views, clicks');

    const ads = data ?? [];
    const totalAds = ads.length;
    const activeAds = ads.filter((a: Record<string, unknown>) => a.isActive).length;
    const totalViews = ads.reduce((sum: number, a: Record<string, unknown>) => sum + Number(a.views || 0), 0);
    const totalClicks = ads.reduce((sum: number, a: Record<string, unknown>) => sum + Number(a.clicks || 0), 0);

    return NextResponse.json({
      success: true,
      data: { totalAds, activeAds, inactiveAds: totalAds - activeAds, totalViews, totalClicks, clickThroughRate: totalViews > 0 ? (totalClicks / totalViews * 100).toFixed(2) : 0, lastUpdated: new Date().toISOString() },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ads counts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
