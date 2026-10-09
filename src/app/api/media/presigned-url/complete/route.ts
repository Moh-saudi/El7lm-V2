/**
 * POST /api/media/presigned-url/complete
 *
 * Saves the metadata record to `player_videos` table after a successful
 * direct client upload to Cloudflare R2.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return null;

  try {
    const admin = getSupabaseAdmin();
    const { data } = await admin.auth.getUser(token);
    if (data?.user) return data.user;
  } catch {}

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const {
      data: { user },
    } = await supabase.auth.getUser(token);
    return user;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const body = await request.json().catch(() => ({}));
    const {
      videoId,
      storagePath,
      publicUrl,
      title,
      description,
      category = 'other',
      tags = [],
      userId,
      ownerId = userId,
      fileName = 'video.mp4',
      fileSize = 0,
      fileType = 'video/mp4',
      autoAnalysis = false,
    } = body;

    if (!publicUrl || !storagePath || !title) {
      return NextResponse.json(
        { error: 'البيانات الأساسية للفيديو غير مكتملة' },
        { status: 400 }
      );
    }

    const targetUserId = (userId || authUser?.id || '').trim();
    const targetOwnerId = (ownerId || targetUserId || 'user').trim();

    // Verify caller has permission to save video
    let isAuthorized = false;

    if (authUser) {
      if (
        authUser.id === targetUserId ||
        authUser.id === targetOwnerId ||
        authUser.user_metadata?.db_id === targetUserId ||
        authUser.user_metadata?.db_id === targetOwnerId
      ) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        const adminDb = getSupabaseAdmin();
        const { data: dbUser } = await adminDb
          .from('users')
          .select('id, uid, email, phone')
          .eq('id', targetUserId)
          .maybeSingle();

        if (
          dbUser &&
          (dbUser.uid === authUser.id ||
            dbUser.id === authUser.id ||
            (dbUser.email && dbUser.email === authUser.email) ||
            (dbUser.phone && dbUser.phone === authUser.phone))
        ) {
          isAuthorized = true;
        }

        if (!isAuthorized) {
          const { data: adminRecord } = await adminDb
            .from('admins')
            .select('id')
            .or(`id.eq.${authUser.id},user_id.eq.${authUser.id}`)
            .maybeSingle();

          if (adminRecord) {
            isAuthorized = true;
          }
        }
      }
    } else if (targetUserId.length >= 4) {
      const adminDb = getSupabaseAdmin();
      const { data: existingPlayer } = await adminDb
        .from('players')
        .select('id')
        .eq('id', targetUserId)
        .maybeSingle();

      if (existingPlayer) {
        isAuthorized = true;
      } else {
        const { data: existingUser } = await adminDb
          .from('users')
          .select('id')
          .eq('id', targetUserId)
          .maybeSingle();
        if (existingUser) isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json(
        { error: 'لا تملك صلاحية حفظ فيديو لهذا الحساب' },
        { status: 403 }
      );
    }

    const now = new Date().toISOString();
    const finalVideoId = videoId || crypto.randomUUID();

    const record = {
      id: finalVideoId,
      playerId: targetUserId,
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      category,
      tags: Array.isArray(tags) ? tags : [],
      videoUrl: publicUrl,
      storagePath,
      fileName,
      thumbnail: '/images/video-placeholder.png',
      fileSize: Number(fileSize) || 0,
      mimeType: fileType,
      duration: 0,
      status: 'pending',
      analysisStatus: autoAnalysis ? 'queued' : 'not_queued',
      views: 0,
      likes: 0,
      pointsEarned: 0,
      createdAt: now,
      updatedAt: now,
    };

    const adminDb = getSupabaseAdmin();
    const { error } = await adminDb.from('player_videos').insert(record);

    if (error) {
      console.error('❌ Failed to insert video record:', error);
      return NextResponse.json(
        { error: `فشل حفظ سجل الفيديو: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      videoId: finalVideoId,
      record,
      message: 'تم تسجيل الفيديو بنجاح',
    });
  } catch (error: unknown) {
    console.error('❌ [Complete Upload Error]:', error);
    const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء حفظ الفيديو';
    return NextResponse.json({ error: msg }, { status: 500 });
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
