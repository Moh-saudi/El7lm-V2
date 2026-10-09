/**
 * POST /api/media/presigned-url
 *
 * Generates an S3/R2 Presigned PUT URL allowing clients (Web & Mobile)
 * to upload videos, images, and documents directly to Cloudflare R2
 * without passing through Vercel Serverless Function payload limits.
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function getR2Config() {
  const accountId =
    process.env.CLOUDFLARE_ACCOUNT_ID ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID ||
    '14521cdfec73fa908fbf7e760fae362a';

  const endpoint =
    process.env.CLOUDFLARE_R2_ENDPOINT ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT ||
    `https://${accountId}.r2.cloudflarestorage.com`;

  const accessKeyId =
    process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID;
  const secretAccessKey =
    process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY;

  let rawBucket = (
    process.env.CLOUDFLARE_R2_BUCKET ||
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET ||
    'el7lmplatform'
  ).trim();

  // Prevent invalid bucket 'assets' and default securely to 'el7lmplatform'
  if (!rawBucket || rawBucket === 'assets') {
    rawBucket = 'el7lmplatform';
  }
  const bucket = rawBucket;

  const publicUrl = (
    process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
    process.env.CLOUDFLARE_R2_PUBLIC_URL ||
    'https://assets.el7lm.com'
  ).replace(/\/$/, '');

  return { accountId, endpoint, accessKeyId, secretAccessKey, bucket, publicUrl };
}

function getS3Client() {
  const { endpoint, accessKeyId, secretAccessKey } = getR2Config();
  if (!accessKeyId || !secretAccessKey) {
    throw new Error('Cloudflare R2 credentials are not configured');
  }
  return new S3Client({
    region: 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
    forcePathStyle: true,
  });
}

// ─── Auth Verification ────────────────────────────────────────
async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '').trim();
  if (!token) return null;

  try {
    const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
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

// ─── POST Handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    const body = await request.json().catch(() => ({}));
    const {
      fileName,
      fileType = 'application/octet-stream',
      fileSize,
      userId,
      ownerId = userId,
      title = '',
      category = 'other',
    } = body;

    if (!fileName) {
      return NextResponse.json(
        { error: 'اسم الملف مطلوب' },
        { status: 400 }
      );
    }

    const targetUserId = (userId || authUser?.id || '').trim();
    const targetOwnerId = (ownerId || targetUserId || 'user').trim();

    // Verify caller has permission to upload
    let isAuthorized = false;

    if (authUser) {
      // 1. Direct ID or metadata match
      if (
        authUser.id === targetUserId ||
        authUser.id === targetOwnerId ||
        authUser.user_metadata?.db_id === targetUserId ||
        authUser.user_metadata?.db_id === targetOwnerId
      ) {
        isAuthorized = true;
      }

      // 2. Database lookup in users or players table
      if (!isAuthorized) {
        const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
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
      // Mobile client operating with legacy UID or verified player ID
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
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
        { error: 'غير مصرح لك بطلب رفع ملف لهذا الحساب' },
        { status: 403 }
      );
    }

    // 3. Validation & classification
    const isVideo =
      fileType.startsWith('video/') ||
      /\.(mp4|mov|avi|webm|mkv|3gp)$/i.test(fileName);
    const isImage =
      fileType.startsWith('image/') ||
      /\.(jpg|jpeg|png|webp|gif|svg)$/i.test(fileName);
    const isDocument =
      fileType.includes('pdf') ||
      fileType.includes('document') ||
      /\.(pdf|doc|docx)$/i.test(fileName);

    const maxBytes = isVideo ? 250 * 1024 * 1024 : 35 * 1024 * 1024;
    if (fileSize && Number(fileSize) > maxBytes) {
      const maxMb = Math.round(maxBytes / (1024 * 1024));
      return NextResponse.json(
        { error: `حجم الملف يتجاوز الحد الأقصى المسموح به (${maxMb} ميجابايت)` },
        { status: 413 }
      );
    }

    // 4. Build unique storage key
    const timestamp = Date.now();
    const ext = fileName.split('.').pop()?.toLowerCase() || (isVideo ? 'mp4' : 'jpg');
    const safeName = fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 50);

    const folder = isVideo ? 'videos' : (isDocument ? 'documents' : 'profile-images');
    const storagePath = `${folder}/${targetOwnerId}/${timestamp}_${safeName}.${ext}`;

    // 5. Generate S3/R2 Presigned PUT URL
    const { bucket, publicUrl } = getR2Config();
    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: storagePath,
      ContentType: fileType,
    });

    const expiresInSeconds = 3600; // 1 hour
    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: expiresInSeconds,
    });

    const filePublicUrl = `${publicUrl}/${storagePath}`;
    const videoId = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      videoId,
      presignedUrl,
      publicUrl: filePublicUrl,
      storagePath,
      bucket,
      expiresIn: expiresInSeconds,
      method: 'PUT',
      headers: {
        'Content-Type': fileType,
      },
      message: 'تم توليد رابط الرفع المباشر بنجاح',
    });
  } catch (error: unknown) {
    console.error('❌ [Presigned URL Error]:', error);
    const msg = error instanceof Error ? error.message : 'حدث خطأ أثناء توليد رابط الرفع';
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
