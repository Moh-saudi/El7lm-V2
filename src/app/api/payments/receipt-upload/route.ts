import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import { authorizeUser } from '@/lib/api/user-auth';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

function endpointFor(accountId?: string) {
  return process.env.CLOUDFLARE_R2_ENDPOINT
    || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_ENDPOINT
    || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : null);
}

export async function POST(request: NextRequest) {
  const authorization = await authorizeUser(request);
  if (!authorization.ok) return authorization.response;

  try {
    const formData = await request.formData();
    const file = formData.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ success: false, error: 'Receipt file is required' }, { status: 400 });
    }
    const extension = ALLOWED_TYPES[file.type];
    if (!extension || file.size <= 0 || file.size > MAX_RECEIPT_BYTES) {
      return NextResponse.json({ success: false, error: 'Receipt must be JPG, PNG, WEBP, or PDF and at most 5 MB' }, { status: 400 });
    }

    const accessKeyId = process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_ACCESS_KEY_ID;
    const secretAccessKey = process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_SECRET_ACCESS_KEY;
    const accountId = process.env.CLOUDFLARE_ACCOUNT_ID || process.env.NEXT_PUBLIC_CLOUDFLARE_ACCOUNT_ID;
    const endpoint = endpointFor(accountId);
    const bucket = process.env.CLOUDFLARE_R2_BUCKET || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_BUCKET || 'el7lmplatform';
    const publicBase = (process.env.NEXT_PUBLIC_CLOUDFLARE_PUBLIC_URL || process.env.NEXT_PUBLIC_CLOUDFLARE_R2_PUBLIC_URL || 'https://assets.el7lm.com').replace(/\/$/, '');

    if (!accessKeyId || !secretAccessKey || !endpoint) {
      return NextResponse.json({ success: false, error: 'Receipt storage is not configured' }, { status: 503 });
    }

    const safeUserId = authorization.user.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const key = `payment-receipts/${safeUserId}/${randomUUID()}.${extension}`;
    const client = new S3Client({
      region: 'auto',
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });

    await client.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
      CacheControl: 'private, max-age=0, no-store',
    }));

    return NextResponse.json({
      success: true,
      receiptUrl: `${publicBase}/${key}`,
    }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('❌ [Receipt Upload] Failed:', error);
    return NextResponse.json({ success: false, error: 'Receipt upload failed' }, { status: 500 });
  }
}
