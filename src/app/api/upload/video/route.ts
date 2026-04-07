/**
 * POST /api/upload/video
 *
 * Uploads a video file to Cloudflare R2 AND saves the metadata record
 * to `player_videos` in Supabase — in one atomic operation via VideoService.
 *
 * FormData fields:
 *   file        — video File (required)
 *   userId      — player's Supabase UID (required)
 *   title       — video title (required)
 *   description — optional
 *   category    — skills|match|training|goalkeeper|defense|midfield|attack|other
 *   tags        — JSON array string, e.g. '["dribble","goal"]'
 *   accountType — independent|club|trainer|agent|academy (default: independent)
 *   ownerId     — uploader ID if different from player (clubs, trainers, etc.)
 *   autoAnalysis — "true" to queue for AI analysis immediately
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { VideoCategory } from '@/lib/video/types';

// ── Auth ───────────────────────────────────────────────────────────────────

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

// ── POST ───────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    const file = formData.get('file') as File | null;
    const userId = formData.get('userId') as string | null;
    const title = (formData.get('title') as string | null) ?? '';
    const description = (formData.get('description') as string | null) ?? '';
    const category = (formData.get('category') as VideoCategory | null) ?? 'other';
    const accountType = (formData.get('accountType') as string | null) ?? 'independent';
    const ownerId = (formData.get('ownerId') as string | null) ?? userId ?? '';
    const autoAnalysis = formData.get('autoAnalysis') === 'true';
    const tagsRaw = formData.get('tags') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'ملف الفيديو مطلوب' }, { status: 400 });
    }
    if (!userId) {
      return NextResponse.json({ error: 'معرف المستخدم مطلوب' }, { status: 400 });
    }
    if (!title.trim()) {
      return NextResponse.json({ error: 'عنوان الفيديو مطلوب' }, { status: 400 });
    }

    let tags: string[] = [];
    if (tagsRaw) {
      try { tags = JSON.parse(tagsRaw); } catch { /* ignore */ }
    }

    // Use VideoService for upload + DB record
    const { videoService } = await import('@/lib/video/video-service');

    const { video, uploadUrl } = await videoService.upload({
      file,
      playerId: userId,
      ownerId,
      title,
      description,
      category,
      tags,
      accountType,
      autoQueueAnalysis: autoAnalysis,
    });

    return NextResponse.json({
      success: true,
      videoId: video.id,
      url: uploadUrl,
      storagePath: video.storagePath,
      name: file.name,
      size: file.size,
      type: file.type,
      analysisStatus: video.analysisStatus,
      message: 'تم رفع الفيديو بنجاح',
    });

  } catch (error: unknown) {
    console.error('❌ خطأ في رفع الفيديو:', error);
    const msg = error instanceof Error ? error.message : 'حدث خطأ في رفع الفيديو';
    const status = msg.includes('كبير') ? 413 : msg.includes('غير مدعوم') ? 400 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
