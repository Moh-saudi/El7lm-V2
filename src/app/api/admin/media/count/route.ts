import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';

function emptyStats() {
  return { success: true, data: { totalVideos: 0, totalImages: 0, pendingVideos: 0, pendingImages: 0, approvedVideos: 0, approvedImages: 0, rejectedVideos: 0, rejectedImages: 0, totalMedia: 0, lastUpdated: new Date().toISOString() } };
}

export async function GET() {
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') return NextResponse.json(emptyStats());

    const db = getSupabaseAdmin();

    // Videos counts
    const { data: videos } = await db.from('videos').select('status');
    const totalVideos = (videos ?? []).length;
    const pendingVideos = (videos ?? []).filter((v: Record<string, unknown>) => v.status === 'pending').length;
    const approvedVideos = (videos ?? []).filter((v: Record<string, unknown>) => v.status === 'approved').length;
    const rejectedVideos = (videos ?? []).filter((v: Record<string, unknown>) => v.status === 'rejected').length;

    // Images counts
    let totalImages = 0, pendingImages = 0, approvedImages = 0, rejectedImages = 0;
    try {
      const { data: images } = await db.from('images').select('status');
      totalImages = (images ?? []).length;
      pendingImages = (images ?? []).filter((i: Record<string, unknown>) => i.status === 'pending').length;
      approvedImages = (images ?? []).filter((i: Record<string, unknown>) => i.status === 'approved').length;
      rejectedImages = (images ?? []).filter((i: Record<string, unknown>) => i.status === 'rejected').length;
    } catch {}

    return NextResponse.json({
      success: true,
      data: { totalVideos, totalImages, pendingVideos, pendingImages, approvedVideos, approvedImages, rejectedVideos, rejectedImages, totalMedia: totalVideos + totalImages, lastUpdated: new Date().toISOString() },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch media counts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
