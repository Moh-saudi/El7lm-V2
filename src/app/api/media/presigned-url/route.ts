/**
 * POST /api/media/presigned-url
 *
 * Generates an S3/R2 Presigned PUT URL allowing clients (Web & Mobile)
 * to upload videos directly to Cloudflare R2 without passing through
 * Vercel Serverless Functions.
 *
 * This completely eliminates the Vercel 10-second timeout bottleneck
 * for large video files.
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// ─── R2 Client Setup ──────────────────────────────────────────
const CF_ENDPOINT =
  process.env.CLOUDFLARE_R2_ENDPOINT ||
  process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT ||
  `https://${process.env.CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const CF_ACCESS_KEY =
  process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID;
const CF_SECRET_KEY =
  process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
const BUCKET =
  process.env.CLOUDFLARE_R2_BUCKET ||
  process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET ||
  'el7lmplatform';
const PUBLIC_URL = (
  process.env.CLOUDFLARE_R2_PUBLIC_URL ||
  process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL ||
  'https://assets.el7lm.com'
).replace(/\/$/, '');

function getS3Client() {
  if (!CF_ACCESS_KEY || !CF_SECRET_KEY) {
    throw new Error('Cloudflare R2 credentials are not configured');
  }
  return new S3Client({
    region: 'auto',
    endpoint: CF_ENDPOINT,
    credentials: {
      accessKeyId: CF_ACCESS_KEY,
      secretAccessKey: CF_SECRET_KEY,
    },
  });
}

// ─── Auth Verification ────────────────────────────────────────
async function getAuthUser(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const {
    data: { user },
  } = await supabase.auth.getUser(token);
  return user;
}

// ─── POST Handler ─────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    // 1. Auth check
    const authUser = await getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { error: 'غير مصرح لك. يرجى تسجيل الدخول أولاً' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const {
      fileName,
      fileType,
      fileSize,
      userId,
      ownerId = userId,
      title = '',
      category = 'other',
    } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: 'اسم ونوع الملف مطلوبان' },
        { status: 400 }
      );
    }

    const targetUserId = userId || authUser.id;
    const targetOwnerId = ownerId || targetUserId;

    // 2. Ownership / Admin check
    if (authUser.id !== targetUserId && authUser.id !== targetOwnerId) {
      const { getSupabaseAdmin } = await import('@/lib/supabase/admin');
      const adminDb = getSupabaseAdmin();
      const { data: adminRecord } = await adminDb
        .from('admins')
        .select('id')
        .or(`id.eq.${authUser.id},user_id.eq.${authUser.id}`)
        .maybeSingle();

      if (!adminRecord) {
        return NextResponse.json(
          { error: 'لا تملك صلاحية طلب رفع فيديو لهذا الحساب' },
          { status: 403 }
        );
      }
    }

    // 3. Validation
    const MAX_SIZE = 100 * 1024 * 1024; // 100MB direct to R2
    if (fileSize && Number(fileSize) > MAX_SIZE) {
      return NextResponse.json(
        { error: 'حجم الملف يتجاوز الحد الأقصى المسموح به (100 ميجابايت)' },
        { status: 413 }
      );
    }

    const isValidVideo =
      fileType.startsWith('video/') ||
      /\.(mp4|mov|avi|webm|mkv)$/i.test(fileName);

    if (!isValidVideo) {
      return NextResponse.json(
        { error: 'نوع الملف غير مدعوم. يجب أن يكون ملف فيديو صالح' },
        { status: 400 }
      );
    }

    // 4. Build unique storage key
    const timestamp = Date.now();
    const ext = fileName.split('.').pop()?.toLowerCase() || 'mp4';
    const safeName = fileName
      .replace(/\.[^/.]+$/, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 50);
    const storagePath = `videos/${targetOwnerId}/${targetUserId}/${timestamp}_${safeName}.${ext}`;

    // 5. Generate S3/R2 Presigned PUT URL
    const s3 = getS3Client();
    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: storagePath,
      ContentType: fileType,
    });

    const expiresInSeconds = 3600; // 1 hour
    const presignedUrl = await getSignedUrl(s3, command, {
      expiresIn: expiresInSeconds,
    });

    const publicUrl = `${PUBLIC_URL}/${storagePath}`;
    const videoId = crypto.randomUUID();

    return NextResponse.json({
      success: true,
      videoId,
      presignedUrl,
      publicUrl,
      storagePath,
      bucket: BUCKET,
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
