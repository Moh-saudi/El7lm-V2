/**
 * POST /api/video/analyze
 * Queue a video for AI analysis, or process it immediately if provider is ready.
 *
 * Body: { videoId: string }
 *
 * GET /api/video/analyze?videoId=xxx
 * Get analysis status and result for a video.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ── Auth helper ────────────────────────────────────────────────────────────

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

// ── GET — fetch analysis status ────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const videoId = request.nextUrl.searchParams.get('videoId');
  if (!videoId) {
    return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
  }

  const { videoService } = await import('@/lib/video/video-service');
  const video = await videoService.getById(videoId);

  if (!video) {
    return NextResponse.json({ error: 'Video not found' }, { status: 404 });
  }

  return NextResponse.json({
    videoId: video.id,
    analysisStatus: video.analysisStatus,
    analysisResult: video.analysisResult ?? null,
    analysisProvider: video.analysisProvider ?? null,
    analysisRequestedAt: video.analysisRequestedAt ?? null,
    analysisCompletedAt: video.analysisCompletedAt ?? null,
  });
}

// ── POST — queue or run analysis ───────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    // Auth required
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { videoId, runNow = false } = body;

    if (!videoId) {
      return NextResponse.json({ error: 'videoId is required' }, { status: 400 });
    }

    const { videoService } = await import('@/lib/video/video-service');
    const { analysisService } = await import('@/lib/video/analysis-service');

    const video = await videoService.getById(videoId);
    if (!video) {
      return NextResponse.json({ error: 'Video not found' }, { status: 404 });
    }

    // Ownership check: player can only queue their own videos
    // Admin (checked by service role) can queue any video
    if (video.playerId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (runNow && analysisService.isReady()) {
      // Synchronous analysis (only if provider is configured)
      const result = await analysisService.analyzeVideo(videoId);
      return NextResponse.json({ success: true, mode: 'completed', result });
    } else {
      // Queue for batch processing
      await videoService.queueForAnalysis(videoId);
      return NextResponse.json({
        success: true,
        mode: 'queued',
        message: 'Video queued for analysis',
      });
    }

  } catch (error) {
    console.error('[/api/video/analyze] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal error' },
      { status: 500 }
    );
  }
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
