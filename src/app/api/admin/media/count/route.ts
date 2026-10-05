import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { NextRequest, NextResponse } from 'next/server';
import { authorizeAdmin } from '@/lib/api/admin-auth';

function emptyStats() {
  return { success: true, data: { totalVideos: 0, totalImages: 0, pendingVideos: 0, pendingImages: 0, approvedVideos: 0, approvedImages: 0, rejectedVideos: 0, rejectedImages: 0, totalMedia: 0, lastUpdated: new Date().toISOString() } };
}

export async function GET(request: NextRequest) {
  const authorization = await authorizeAdmin(request);
  if (!authorization.ok) return authorization.response;
  try {
    if (process.env.NEXT_PHASE === 'phase-production-build') return NextResponse.json(emptyStats());

    const db = getSupabaseAdmin();

    const safeCount = async (queryPromise: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> => {
      try {
        const { count, error } = await queryPromise;
        return error ? 0 : (count ?? 0);
      } catch {
        return 0;
      }
    };

    // High-performance parallel exact counts using HTTP HEAD (0 KB memory overhead)
    const [
      totalVideosRes,
      pendingVideosRes,
      approvedVideosRes,
      rejectedVideosRes,
      totalImagesRes
    ] = await Promise.all([
      safeCount(db.from('videos').select('id', { count: 'exact', head: true })),
      safeCount(db.from('videos').select('id', { count: 'exact', head: true }).eq('status', 'pending')),
      safeCount(db.from('videos').select('id', { count: 'exact', head: true }).eq('status', 'approved')),
      safeCount(db.from('videos').select('id', { count: 'exact', head: true }).eq('status', 'rejected')),
      safeCount(db.from('images').select('id', { count: 'exact', head: true })),
    ]);

    const totalVideos = totalVideosRes;
    const pendingVideos = pendingVideosRes;
    const approvedVideos = approvedVideosRes;
    const rejectedVideos = rejectedVideosRes;
    const totalImages = totalImagesRes;
    const pendingImages = 0;
    const approvedImages = totalImages;
    const rejectedImages = 0;

    return NextResponse.json({
      success: true,
      data: {
        totalVideos,
        totalImages,
        pendingVideos,
        pendingImages,
        approvedVideos,
        approvedImages,
        rejectedVideos,
        rejectedImages,
        totalMedia: totalVideos + totalImages,
        lastUpdated: new Date().toISOString()
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch media counts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
